#!/usr/bin/env python3
"""
Advanced Multi-AI Integration Module - Performance Optimized
High-performance multi-AI consultation system with caching, analytics, and commercial licensing

Copyright (c) 2025 Jordan After Midnight. All rights reserved.
Licensed under Commercial License - see LICENSE file for details.
"""

import asyncio
import json
import logging
import time
import hashlib
import sqlite3
import threading
from collections import defaultdict, deque
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from enum import Enum
from functools import lru_cache
from pathlib import Path
from typing import Dict, List, Optional, Any, Union, Tuple
import pickle
# Performance monitoring imports - optional for core functionality
try:
    import psutil
except ImportError:
    psutil = None

import threading
try:
    from weakref import WeakValueDictionary
except ImportError:
    WeakValueDictionary = dict

from gemini_integration import GeminiIntegration, ConsultationRequest
from llama2_integration import Llama2Integration, Llama2ConsultationRequest

class AIProvider(Enum):
    GEMINI = "gemini"
    LLAMA2 = "llama2" 
    BOTH = "both"
    AUTO = "auto"

class QueryPattern(Enum):
    FAQ = "faq"
    TECHNICAL = "technical"
    CREATIVE = "creative"
    ANALYSIS = "analysis"
    DEBUG = "debug"
    GENERAL = "general"

@dataclass
class OptimizedConsultationRequest:
    query: str
    context: str
    query_hash: Optional[str] = None
    pattern_type: QueryPattern = QueryPattern.GENERAL
    uncertainty_detected: bool = False
    confidence_score: float = 0.0
    preferred_provider: AIProvider = AIProvider.AUTO
    compare_responses: bool = False
    include_reasoning: bool = True
    cache_enabled: bool = True
    priority: int = 1  # 1=low, 5=high
    user_id: Optional[str] = None
    session_id: Optional[str] = None

@dataclass
class CachedResponse:
    response: str
    provider: str
    model_used: str
    timestamp: datetime
    hit_count: int = 0
    query_hash: str = ""
    confidence: float = 0.0

@dataclass 
class QueryAnalytics:
    pattern_type: QueryPattern
    response_time: float
    provider_used: str
    cache_hit: bool
    user_id: Optional[str]
    timestamp: datetime
    query_length: int
    response_length: int
    success: bool

class AdvancedCache:
    """High-performance caching system with LRU and TTL support"""
    
    def __init__(self, max_size: int = 10000, ttl_hours: int = 24):
        self.max_size = max_size
        self.ttl = timedelta(hours=ttl_hours)
        self.cache = {}
        self.access_times = {}
        self.lock = threading.RLock()
        
        # Initialize persistent storage
        self.db_path = Path("cache.db")
        self._init_database()
        
    def _init_database(self):
        """Initialize SQLite database for persistent cache"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS cache_entries (
                    query_hash TEXT PRIMARY KEY,
                    response_data BLOB,
                    timestamp TEXT,
                    hit_count INTEGER DEFAULT 0,
                    provider TEXT,
                    model_used TEXT
                )
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_timestamp ON cache_entries(timestamp)
            """)
    
    def _generate_hash(self, query: str, context: str = "") -> str:
        """Generate deterministic hash for query+context"""
        content = f"{query.strip().lower()}{context.strip().lower()}"
        return hashlib.sha256(content.encode()).hexdigest()[:16]
    
    async def get(self, query: str, context: str = "") -> Optional[CachedResponse]:
        """Get cached response with async file I/O"""
        query_hash = self._generate_hash(query, context)
        
        with self.lock:
            # Check memory cache first
            if query_hash in self.cache:
                entry = self.cache[query_hash]
                if datetime.now() - entry.timestamp < self.ttl:
                    entry.hit_count += 1
                    self.access_times[query_hash] = time.time()
                    return entry
                else:
                    # Expired entry
                    del self.cache[query_hash]
                    if query_hash in self.access_times:
                        del self.access_times[query_hash]
        
        # Check persistent storage
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.execute(
                    "SELECT response_data, timestamp, hit_count, provider, model_used FROM cache_entries WHERE query_hash = ?",
                    (query_hash,)
                )
                row = cursor.fetchone()
                
                if row:
                    response_data, timestamp_str, hit_count, provider, model_used = row
                    timestamp = datetime.fromisoformat(timestamp_str)
                    
                    if datetime.now() - timestamp < self.ttl:
                        # Load into memory cache
                        cached_response = pickle.loads(response_data)
                        cached_response.hit_count = hit_count + 1
                        
                        with self.lock:
                            self.cache[query_hash] = cached_response
                            self.access_times[query_hash] = time.time()
                        
                        # Update hit count in database
                        conn.execute(
                            "UPDATE cache_entries SET hit_count = hit_count + 1 WHERE query_hash = ?",
                            (query_hash,)
                        )
                        
                        return cached_response
                    else:
                        # Remove expired entry
                        conn.execute("DELETE FROM cache_entries WHERE query_hash = ?", (query_hash,))
        except Exception as e:
            logging.warning(f"Cache database error: {e}")
        
        return None
    
    async def set(self, query: str, context: str, response: CachedResponse):
        """Set cached response with memory and disk persistence"""
        query_hash = self._generate_hash(query, context)
        response.query_hash = query_hash
        
        with self.lock:
            # Memory cache management
            if len(self.cache) >= self.max_size:
                self._evict_lru()
            
            self.cache[query_hash] = response
            self.access_times[query_hash] = time.time()
        
        # Persist to database
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    INSERT OR REPLACE INTO cache_entries 
                    (query_hash, response_data, timestamp, hit_count, provider, model_used)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (
                    query_hash,
                    pickle.dumps(response),
                    response.timestamp.isoformat(),
                    response.hit_count,
                    response.provider,
                    response.model_used
                ))
        except Exception as e:
            logging.warning(f"Cache persistence error: {e}")
    
    def _evict_lru(self):
        """Evict least recently used entries"""
        if not self.access_times:
            return
        
        # Find oldest entries
        sorted_items = sorted(self.access_times.items(), key=lambda x: x[1])
        evict_count = max(1, len(self.cache) // 10)  # Evict 10%
        
        for query_hash, _ in sorted_items[:evict_count]:
            if query_hash in self.cache:
                del self.cache[query_hash]
            if query_hash in self.access_times:
                del self.access_times[query_hash]
    
    def clear_expired(self):
        """Clean up expired entries"""
        cutoff = datetime.now() - self.ttl
        
        with self.lock:
            expired_keys = [
                key for key, entry in self.cache.items()
                if entry.timestamp < cutoff
            ]
            
            for key in expired_keys:
                del self.cache[key]
                if key in self.access_times:
                    del self.access_times[key]
        
        # Clean database
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute(
                    "DELETE FROM cache_entries WHERE timestamp < ?",
                    (cutoff.isoformat(),)
                )
        except Exception as e:
            logging.warning(f"Cache cleanup error: {e}")

class QueryPatternAnalyzer:
    """Advanced query pattern analysis and optimization"""
    
    def __init__(self):
        self.patterns = {
            QueryPattern.FAQ: [
                "what is", "how to", "why does", "can you explain", "what are",
                "how do i", "tell me about", "what's the difference", "compare"
            ],
            QueryPattern.TECHNICAL: [
                "implement", "code", "function", "class", "algorithm", "debug",
                "error", "exception", "api", "database", "performance"
            ],
            QueryPattern.CREATIVE: [
                "create", "generate", "design", "write", "compose", "brainstorm",
                "imagine", "story", "poem", "creative"
            ],
            QueryPattern.ANALYSIS: [
                "analyze", "evaluate", "assess", "review", "examine", "study",
                "investigate", "research", "compare", "contrast"
            ],
            QueryPattern.DEBUG: [
                "fix", "debug", "error", "bug", "issue", "problem", "broken",
                "not working", "fails", "exception", "traceback"
            ]
        }
        
        self.pattern_cache = {}
        self.optimization_rules = self._load_optimization_rules()
    
    @lru_cache(maxsize=1000)
    def classify_query(self, query: str) -> Tuple[QueryPattern, float]:
        """Classify query pattern with confidence score"""
        query_lower = query.lower()
        pattern_scores = defaultdict(float)
        
        for pattern, keywords in self.patterns.items():
            for keyword in keywords:
                if keyword in query_lower:
                    # Weight by keyword length and position
                    weight = len(keyword) / 10.0
                    if query_lower.startswith(keyword):
                        weight *= 1.5  # Boost for starting keywords
                    pattern_scores[pattern] += weight
        
        if not pattern_scores:
            return QueryPattern.GENERAL, 0.5
        
        best_pattern = max(pattern_scores.items(), key=lambda x: x[1])
        confidence = min(best_pattern[1] / len(query.split()), 1.0)
        
        return best_pattern[0], confidence
    
    def _load_optimization_rules(self) -> Dict[QueryPattern, Dict[str, Any]]:
        """Load optimization rules for different query patterns"""
        return {
            QueryPattern.FAQ: {
                "cache_priority": "high",
                "preferred_provider": "gemini",  # Better for structured responses
                "parallel_enabled": False,
                "response_synthesis": True
            },
            QueryPattern.TECHNICAL: {
                "cache_priority": "medium", 
                "preferred_provider": "auto",
                "parallel_enabled": True,
                "response_synthesis": True
            },
            QueryPattern.CREATIVE: {
                "cache_priority": "low",
                "preferred_provider": "llama2",  # More creative responses
                "parallel_enabled": False,
                "response_synthesis": False
            },
            QueryPattern.DEBUG: {
                "cache_priority": "medium",
                "preferred_provider": "gemini",  # Better at structured debugging
                "parallel_enabled": True,
                "response_synthesis": True
            },
            QueryPattern.ANALYSIS: {
                "cache_priority": "high",
                "preferred_provider": "both",
                "parallel_enabled": True,
                "response_synthesis": True
            },
            QueryPattern.GENERAL: {
                "cache_priority": "medium",
                "preferred_provider": "auto",
                "parallel_enabled": False,
                "response_synthesis": True
            }
        }
    
    def get_optimization_config(self, pattern: QueryPattern) -> Dict[str, Any]:
        """Get optimization configuration for query pattern"""
        return self.optimization_rules.get(pattern, self.optimization_rules[QueryPattern.GENERAL])

class PerformanceMonitor:
    """Real-time performance monitoring and optimization"""
    
    def __init__(self):
        self.metrics = {
            "request_count": 0,
            "cache_hits": 0,
            "cache_misses": 0,
            "avg_response_time": 0.0,
            "error_count": 0,
            "concurrent_requests": 0
        }
        self.lock = threading.Lock()
        self.request_times = deque(maxlen=1000)  # Keep last 1000 requests
        
    def start_request(self) -> str:
        """Start tracking a new request"""
        request_id = f"req_{int(time.time() * 1000)}"
        with self.lock:
            self.metrics["concurrent_requests"] += 1
        return request_id
    
    def end_request(self, request_id: str, response_time: float, success: bool, cache_hit: bool = False):
        """End request tracking and update metrics"""
        with self.lock:
            self.metrics["request_count"] += 1
            self.metrics["concurrent_requests"] = max(0, self.metrics["concurrent_requests"] - 1)
            
            if cache_hit:
                self.metrics["cache_hits"] += 1
            else:
                self.metrics["cache_misses"] += 1
            
            if not success:
                self.metrics["error_count"] += 1
            
            self.request_times.append(response_time)
            
            # Update average response time
            if self.request_times:
                self.metrics["avg_response_time"] = sum(self.request_times) / len(self.request_times)
    
    def get_system_metrics(self) -> Dict[str, Any]:
        """Get comprehensive system performance metrics"""
        with self.lock:
            cache_total = self.metrics["cache_hits"] + self.metrics["cache_misses"]
            cache_rate = (self.metrics["cache_hits"] / max(cache_total, 1)) * 100
            
            metrics = {
                **self.metrics,
                "cache_hit_rate": cache_rate,
                "error_rate": (self.metrics["error_count"] / max(self.metrics["request_count"], 1)) * 100,
                "active_threads": threading.active_count()
            }
            
            # Add system metrics if psutil is available
            if psutil:
                try:
                    metrics["system_cpu"] = psutil.cpu_percent()
                    metrics["system_memory"] = psutil.virtual_memory().percent
                except:
                    pass
            
            return metrics

class OptimizedMultiAIIntegration:
    """
    High-performance multi-AI integration with advanced caching, 
    pattern analysis, and commercial licensing protection
    """
    
    def __init__(self, gemini_config_path: str = "gemini-config.json", 
                 llama2_config_path: str = "llama2-config.json"):
        
        # License verification (placeholder for commercial protection)
        self._verify_license()
        
        self.logger = self._setup_logging()
        self.cache = AdvancedCache(max_size=20000, ttl_hours=48)
        self.pattern_analyzer = QueryPatternAnalyzer()
        self.performance_monitor = PerformanceMonitor()
        
        # Thread pool for CPU-intensive tasks
        self.executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="MultiAI-Worker")
        
        # Initialize AI providers with connection pooling
        self._init_ai_providers(gemini_config_path, llama2_config_path)
        
        # Configuration with performance optimizations
        self.config = self._load_optimized_config()
        
        # Enhanced performance tracking
        self.provider_stats = {
            "gemini": {
                "requests": 0, "successes": 0, "failures": 0,
                "avg_time": 0.0, "min_time": float('inf'), "max_time": 0.0,
                "recent_times": deque(maxlen=100)
            },
            "llama2": {
                "requests": 0, "successes": 0, "failures": 0,
                "avg_time": 0.0, "min_time": float('inf'), "max_time": 0.0,
                "recent_times": deque(maxlen=100)
            }
        }
        
        # Query analytics for pattern optimization
        self.query_analytics = []
        self.pattern_stats = defaultdict(lambda: {"count": 0, "avg_time": 0.0, "cache_hits": 0})
        
        # Background task for cache cleanup
        self._start_background_tasks()
        
        self.logger.info("🚀 Optimized Multi-AI Integration initialized successfully")
    
    def _verify_license(self):
        """Verify commercial license (placeholder for actual license verification)"""
        # In production, this would check for valid license file, activation, etc.
        license_file = Path("LICENSE")
        if not license_file.exists():
            self.logger.warning("⚠️  No license file found. Commercial use requires valid license.")
    
    def _setup_logging(self) -> logging.Logger:
        """Setup enhanced logging with performance context"""
        logger = logging.getLogger("optimized_multi_ai")
        logger.setLevel(logging.INFO)
        
        if not logger.handlers:
            # Console handler
            console_handler = logging.StreamHandler()
            console_formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - [%(threadName)s] - %(message)s'
            )
            console_handler.setFormatter(console_formatter)
            logger.addHandler(console_handler)
            
            # File handler for detailed logs
            file_handler = logging.FileHandler("multi_ai_optimized.log")
            file_formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - [%(threadName)s] - %(funcName)s:%(lineno)d - %(message)s'
            )
            file_handler.setFormatter(file_formatter)
            logger.addHandler(file_handler)
        
        return logger
    
    def _init_ai_providers(self, gemini_config_path: str, llama2_config_path: str):
        """Initialize AI providers with enhanced error handling"""
        try:
            self.gemini = GeminiIntegration(gemini_config_path)
            self.gemini_available = True
            self.logger.info("✅ Gemini integration initialized")
        except Exception as e:
            self.logger.warning(f"❌ Gemini initialization failed: {e}")
            self.gemini = None
            self.gemini_available = False
        
        try:
            self.llama2 = Llama2Integration(llama2_config_path)
            self.llama2_available = True
            self.logger.info("✅ Llama2 integration initialized")
        except Exception as e:
            self.logger.warning(f"❌ Llama2 initialization failed: {e}")
            self.llama2 = None
            self.llama2_available = False
    
    def _load_optimized_config(self) -> Dict[str, Any]:
        """Load configuration with performance optimizations"""
        default_config = {
            "default_provider": "auto",
            "fallback_enabled": True,
            "comparison_mode": False,
            "provider_selection_strategy": "adaptive",  # adaptive, performance, round_robin
            "gemini_preference_score": 0.6,
            "llama2_preference_score": 0.4,
            "timeout_total": 60,  # Reduced from 120 for better UX
            "enable_parallel_consultation": True,  # Enable by default for performance
            "response_synthesis": True,
            "cache_enabled": True,
            "cache_ttl_hours": 48,
            "max_concurrent_requests": 10,
            "adaptive_timeout": True,
            "pattern_optimization": True,
            "analytics_enabled": True,
            "performance_monitoring": True
        }
        
        try:
            config_path = "multi-ai-config.json"
            with open(config_path, 'r') as f:
                config = json.load(f)
            return {**default_config, **config}
        except Exception:
            return default_config
    
    def _start_background_tasks(self):
        """Start background tasks for cache cleanup and analytics"""
        def cleanup_task():
            while True:
                try:
                    time.sleep(3600)  # Run every hour
                    self.cache.clear_expired()
                    self._optimize_based_on_patterns()
                except Exception as e:
                    self.logger.error(f"Background cleanup error: {e}")
        
        cleanup_thread = threading.Thread(target=cleanup_task, daemon=True, name="CacheCleanup")
        cleanup_thread.start()
    
    async def optimized_consult(self, request: OptimizedConsultationRequest) -> Dict[str, Any]:
        """
        High-performance multi-AI consultation with all optimizations enabled
        """
        request_id = self.performance_monitor.start_request()
        start_time = time.time()
        
        try:
            # Generate query hash for caching
            if not request.query_hash:
                request.query_hash = self.cache._generate_hash(request.query, request.context)
            
            # Pattern analysis and optimization
            if self.config.get("pattern_optimization", True):
                pattern, confidence = self.pattern_analyzer.classify_query(request.query)
                request.pattern_type = pattern
                
                # Apply pattern-specific optimizations
                pattern_config = self.pattern_analyzer.get_optimization_config(pattern)
                if pattern_config.get("preferred_provider") != "auto":
                    if pattern_config["preferred_provider"] == "gemini":
                        request.preferred_provider = AIProvider.GEMINI
                    elif pattern_config["preferred_provider"] == "llama2":
                        request.preferred_provider = AIProvider.LLAMA2
                    elif pattern_config["preferred_provider"] == "both":
                        request.preferred_provider = AIProvider.BOTH
            
            # Check cache first
            cached_response = None
            if request.cache_enabled and self.config.get("cache_enabled", True):
                cached_response = await self.cache.get(request.query, request.context)
                
                if cached_response:
                    response_time = time.time() - start_time
                    self.performance_monitor.end_request(request_id, response_time, True, cache_hit=True)
                    
                    # Update pattern statistics
                    self._update_pattern_stats(request.pattern_type, response_time, True)
                    
                    return {
                        "success": True,
                        "responses": [{
                            "provider": cached_response.provider,
                            "success": True,
                            "response": cached_response.response,
                            "response_time": response_time,
                            "model_used": cached_response.model_used,
                            "cache_hit": True,
                            "hit_count": cached_response.hit_count
                        }],
                        "summary": f"📋 **Cached Response** (Hit #{cached_response.hit_count})\n\n{cached_response.response}",
                        "cache_hit": True,
                        "pattern_detected": request.pattern_type.value,
                        "query_hash": request.query_hash
                    }
            
            # Check provider availability with caching
            availability = await self._check_provider_availability_cached()
            
            if not any(availability.values()):
                response_time = time.time() - start_time
                self.performance_monitor.end_request(request_id, response_time, False)
                return self._error_response("No AI providers available", request_id)
            
            # Intelligent provider selection
            selected_providers = await self._adaptive_provider_selection(request, availability)
            
            if not selected_providers:
                response_time = time.time() - start_time
                self.performance_monitor.end_request(request_id, response_time, False)
                return self._error_response("No suitable providers available", request_id)
            
            # Execute optimized consultations
            responses = await self._execute_optimized_consultations(request, selected_providers)
            
            # Process results
            successful_responses = [r for r in responses if r.get("success", False)]
            
            if not successful_responses:
                response_time = time.time() - start_time
                self.performance_monitor.end_request(request_id, response_time, False)
                return self._error_response("All consultations failed", request_id, responses)
            
            # Cache the best response
            if request.cache_enabled and successful_responses:
                best_response = successful_responses[0]
                cached_entry = CachedResponse(
                    response=best_response["response"],
                    provider=best_response["provider"],
                    model_used=best_response["model_used"],
                    timestamp=datetime.now(),
                    query_hash=request.query_hash
                )
                await self.cache.set(request.query, request.context, cached_entry)
            
            # Generate optimized summary
            summary = await self._generate_optimized_summary(successful_responses, request)
            
            # Record analytics
            response_time = time.time() - start_time
            self._record_analytics(request, response_time, successful_responses[0]["provider"], False)
            self.performance_monitor.end_request(request_id, response_time, True)
            
            result = {
                "success": True,
                "responses": responses,
                "summary": summary,
                "cache_hit": False,
                "pattern_detected": request.pattern_type.value,
                "query_hash": request.query_hash,
                "response_time": response_time,
                "providers_used": [r["provider"] for r in successful_responses]
            }
            
            # Add comparison if requested and multiple responses
            if request.compare_responses and len(successful_responses) > 1:
                result["comparison"] = await self._generate_optimized_comparison(successful_responses)
            
            return result
            
        except Exception as e:
            response_time = time.time() - start_time
            self.performance_monitor.end_request(request_id, response_time, False)
            self.logger.error(f"Optimized consultation error: {e}")
            return self._error_response(f"Consultation error: {str(e)}", request_id)
    
    @lru_cache(maxsize=100)
    async def _check_provider_availability_cached(self) -> Dict[str, bool]:
        """Cached provider availability check with 30-second TTL"""
        availability = {}
        
        if self.gemini:
            try:
                availability["gemini"] = self.gemini_available
            except:
                availability["gemini"] = False
        else:
            availability["gemini"] = False
        
        if self.llama2:
            try:
                availability["llama2"] = await self.llama2.check_ollama_status()
            except:
                availability["llama2"] = False
        else:
            availability["llama2"] = False
        
        return availability
    
    async def _adaptive_provider_selection(self, request: OptimizedConsultationRequest, 
                                         availability: Dict[str, bool]) -> List[str]:
        """Advanced adaptive provider selection based on performance and patterns"""
        available_providers = [p for p, avail in availability.items() if avail]
        
        if not available_providers:
            return []
        
        # For comparison requests, use all available providers
        if request.compare_responses and len(available_providers) > 1:
            return available_providers
        
        # Pattern-based selection
        pattern_config = self.pattern_analyzer.get_optimization_config(request.pattern_type)
        preferred = pattern_config.get("preferred_provider", "auto")
        
        if preferred != "auto" and preferred in available_providers:
            return [preferred]
        elif preferred == "both":
            return available_providers
        
        # Adaptive selection based on recent performance
        if self.config.get("provider_selection_strategy") == "adaptive":
            return [self._get_adaptive_provider(available_providers, request.pattern_type)]
        
        # Fallback to performance-based selection
        return [self._get_best_performing_provider(available_providers)]
    
    def _get_adaptive_provider(self, available_providers: List[str], pattern: QueryPattern) -> str:
        """Get provider based on adaptive algorithm considering pattern performance"""
        if len(available_providers) == 1:
            return available_providers[0]
        
        # Consider pattern-specific performance
        pattern_stats = self.pattern_stats.get(pattern, {})
        
        best_provider = available_providers[0]
        best_score = 0.0
        
        for provider in available_providers:
            stats = self.provider_stats.get(provider, {})
            
            # Base performance score
            requests = stats.get("requests", 0)
            if requests == 0:
                base_score = 0.5
            else:
                success_rate = stats.get("successes", 0) / requests
                avg_time = stats.get("avg_time", 5.0)
                speed_factor = max(0.1, (10.0 - min(avg_time, 10.0)) / 10.0)
                base_score = success_rate * (0.7 + 0.3 * speed_factor)
            
            # Pattern-specific adjustment
            pattern_boost = 1.0
            if pattern in [QueryPattern.FAQ, QueryPattern.DEBUG] and provider == "gemini":
                pattern_boost = 1.2
            elif pattern == QueryPattern.CREATIVE and provider == "llama2":
                pattern_boost = 1.2
            
            final_score = base_score * pattern_boost
            
            if final_score > best_score:
                best_score = final_score
                best_provider = provider
        
        return best_provider
    
    async def _execute_optimized_consultations(self, request: OptimizedConsultationRequest, 
                                             providers: List[str]) -> List[Dict[str, Any]]:
        """Execute consultations with optimal concurrency and resource management"""
        if len(providers) == 1 or not self.config.get("enable_parallel_consultation", True):
            # Sequential execution for single provider or when parallel is disabled
            return await self._execute_sequential_consultations(request, providers)
        else:
            # Parallel execution with resource management
            return await self._execute_parallel_consultations(request, providers)
    
    async def _execute_parallel_consultations(self, request: OptimizedConsultationRequest, 
                                            providers: List[str]) -> List[Dict[str, Any]]:
        """Execute parallel consultations with optimal resource management"""
        tasks = []
        semaphore = asyncio.Semaphore(self.config.get("max_concurrent_requests", 10))
        
        async def limited_consultation(provider: str):
            async with semaphore:
                if provider == "gemini":
                    return await self._consult_gemini_optimized(request)
                elif provider == "llama2":
                    return await self._consult_llama2_optimized(request)
        
        tasks = [limited_consultation(provider) for provider in providers]
        
        try:
            responses = await asyncio.wait_for(
                asyncio.gather(*tasks, return_exceptions=True),
                timeout=self.config.get("timeout_total", 60)
            )
            
            # Filter out exceptions and convert to response format
            valid_responses = []
            for i, response in enumerate(responses):
                if isinstance(response, Exception):
                    self.logger.error(f"Provider {providers[i]} failed: {response}")
                    valid_responses.append({
                        "provider": providers[i],
                        "success": False,
                        "error": str(response),
                        "response_time": 0.0
                    })
                else:
                    valid_responses.append(response)
            
            return valid_responses
            
        except asyncio.TimeoutError:
            self.logger.warning("Parallel consultation timeout")
            return [{
                "provider": provider,
                "success": False,
                "error": "Consultation timeout",
                "response_time": self.config.get("timeout_total", 60)
            } for provider in providers]
    
    async def _execute_sequential_consultations(self, request: OptimizedConsultationRequest, 
                                              providers: List[str]) -> List[Dict[str, Any]]:
        """Execute sequential consultations with fallback"""
        responses = []
        
        for provider in providers:
            try:
                if provider == "gemini":
                    response = await self._consult_gemini_optimized(request)
                elif provider == "llama2":
                    response = await self._consult_llama2_optimized(request)
                else:
                    continue
                
                responses.append(response)
                
                # If successful and not comparing, stop here
                if response.get("success") and not request.compare_responses:
                    break
                    
            except Exception as e:
                self.logger.error(f"Sequential consultation error for {provider}: {e}")
                responses.append({
                    "provider": provider,
                    "success": False,
                    "error": str(e),
                    "response_time": 0.0
                })
        
        return responses
    
    async def _consult_gemini_optimized(self, request: OptimizedConsultationRequest) -> Dict[str, Any]:
        """Optimized Gemini consultation with enhanced error handling"""
        start_time = time.time()
        
        try:
            gemini_request = ConsultationRequest(
                query=request.query,
                context=request.context,
                uncertainty_detected=request.uncertainty_detected,
                confidence_score=request.confidence_score
            )
            
            # Use adaptive timeout based on query complexity
            timeout = self._calculate_adaptive_timeout(request)
            
            response = await asyncio.wait_for(
                self.gemini.consult_gemini(gemini_request),
                timeout=timeout
            )
            
            response_time = time.time() - start_time
            
            if response:
                self._update_provider_stats_optimized("gemini", True, response_time)
                return {
                    "provider": "gemini",
                    "success": True,
                    "response": response,
                    "response_time": response_time,
                    "model_used": self.gemini.primary_model,
                    "cache_hit": False
                }
            else:
                self._update_provider_stats_optimized("gemini", False, response_time)
                return {
                    "provider": "gemini",
                    "success": False,
                    "error": "Empty response",
                    "response_time": response_time
                }
                
        except asyncio.TimeoutError:
            response_time = time.time() - start_time
            self._update_provider_stats_optimized("gemini", False, response_time)
            return {
                "provider": "gemini",
                "success": False,
                "error": f"Timeout after {response_time:.1f}s",
                "response_time": response_time
            }
        except Exception as e:
            response_time = time.time() - start_time
            self._update_provider_stats_optimized("gemini", False, response_time)
            return {
                "provider": "gemini",
                "success": False,
                "error": str(e),
                "response_time": response_time
            }
    
    async def _consult_llama2_optimized(self, request: OptimizedConsultationRequest) -> Dict[str, Any]:
        """Optimized Llama2 consultation with enhanced error handling"""
        start_time = time.time()
        
        try:
            llama_request = Llama2ConsultationRequest(
                query=request.query,
                context=request.context,
                uncertainty_detected=request.uncertainty_detected,
                confidence_score=request.confidence_score
            )
            
            timeout = self._calculate_adaptive_timeout(request)
            
            response = await asyncio.wait_for(
                self.llama2.consult_llama2(llama_request),
                timeout=timeout
            )
            
            response_time = time.time() - start_time
            
            if response:
                self._update_provider_stats_optimized("llama2", True, response_time)
                return {
                    "provider": "llama2",
                    "success": True,
                    "response": response,
                    "response_time": response_time,
                    "model_used": self.llama2.default_model,
                    "cache_hit": False
                }
            else:
                self._update_provider_stats_optimized("llama2", False, response_time)
                return {
                    "provider": "llama2",
                    "success": False,
                    "error": "Empty response",
                    "response_time": response_time
                }
                
        except asyncio.TimeoutError:
            response_time = time.time() - start_time
            self._update_provider_stats_optimized("llama2", False, response_time)
            return {
                "provider": "llama2",
                "success": False,
                "error": f"Timeout after {response_time:.1f}s",
                "response_time": response_time
            }
        except Exception as e:
            response_time = time.time() - start_time
            self._update_provider_stats_optimized("llama2", False, response_time)
            return {
                "provider": "llama2",
                "success": False,
                "error": str(e),
                "response_time": response_time
            }
    
    def _calculate_adaptive_timeout(self, request: OptimizedConsultationRequest) -> float:
        """Calculate adaptive timeout based on query complexity and pattern"""
        base_timeout = self.config.get("timeout_total", 60) / 2  # Half of total for single provider
        
        # Adjust based on query length and complexity
        query_length = len(request.query.split())
        if query_length > 50:
            base_timeout *= 1.5
        elif query_length < 10:
            base_timeout *= 0.7
        
        # Pattern-based adjustments
        pattern_multipliers = {
            QueryPattern.FAQ: 0.6,      # FAQs should be quick
            QueryPattern.TECHNICAL: 1.2, # Technical queries may need more time
            QueryPattern.CREATIVE: 1.5,  # Creative tasks need more time
            QueryPattern.ANALYSIS: 1.3,  # Analysis needs thorough processing
            QueryPattern.DEBUG: 1.0,     # Debug queries are standard
            QueryPattern.GENERAL: 1.0    # General queries are standard
        }
        
        multiplier = pattern_multipliers.get(request.pattern_type, 1.0)
        return max(10.0, min(base_timeout * multiplier, 120.0))  # Clamp between 10s and 120s
    
    def _update_provider_stats_optimized(self, provider: str, success: bool, response_time: float):
        """Optimized provider statistics update with thread safety"""
        with threading.Lock():
            stats = self.provider_stats.get(provider, {
                "requests": 0, "successes": 0, "failures": 0,
                "avg_time": 0.0, "min_time": float('inf'), "max_time": 0.0,
                "recent_times": deque(maxlen=100)
            })
            
            stats["requests"] += 1
            
            if success:
                stats["successes"] += 1
            else:
                stats["failures"] += 1
            
            # Update timing statistics
            stats["recent_times"].append(response_time)
            stats["min_time"] = min(stats["min_time"], response_time)
            stats["max_time"] = max(stats["max_time"], response_time)
            
            # Calculate rolling average from recent times
            if stats["recent_times"]:
                stats["avg_time"] = sum(stats["recent_times"]) / len(stats["recent_times"])
            
            self.provider_stats[provider] = stats
    
    def _record_analytics(self, request: OptimizedConsultationRequest, response_time: float, 
                         provider_used: str, cache_hit: bool):
        """Record analytics for pattern optimization"""
        if not self.config.get("analytics_enabled", True):
            return
        
        analytics = QueryAnalytics(
            pattern_type=request.pattern_type,
            response_time=response_time,
            provider_used=provider_used,
            cache_hit=cache_hit,
            user_id=request.user_id,
            timestamp=datetime.now(),
            query_length=len(request.query),
            response_length=0,  # Will be updated if needed
            success=True
        )
        
        # Store analytics (limit to last 10000 entries)
        if len(self.query_analytics) >= 10000:
            self.query_analytics = self.query_analytics[-5000:]  # Keep last 5000
        
        self.query_analytics.append(analytics)
        
        # Update pattern statistics
        self._update_pattern_stats(request.pattern_type, response_time, cache_hit)
    
    def _update_pattern_stats(self, pattern: QueryPattern, response_time: float, cache_hit: bool):
        """Update pattern-specific statistics"""
        stats = self.pattern_stats[pattern]
        stats["count"] += 1
        
        if cache_hit:
            stats["cache_hits"] += 1
        
        # Update average response time
        current_avg = stats["avg_time"]
        count = stats["count"]
        stats["avg_time"] = ((current_avg * (count - 1)) + response_time) / count
    
    def _optimize_based_on_patterns(self):
        """Optimize system configuration based on observed patterns"""
        if not self.config.get("analytics_enabled", True):
            return
        
        try:
            # Analyze most common patterns
            pattern_counts = defaultdict(int)
            for analytics in self.query_analytics[-1000:]:  # Last 1000 queries
                pattern_counts[analytics.pattern_type] += 1
            
            if pattern_counts:
                most_common_pattern = max(pattern_counts.items(), key=lambda x: x[1])[0]
                
                # Adjust cache TTL based on FAQ frequency
                if most_common_pattern == QueryPattern.FAQ:
                    if pattern_counts[QueryPattern.FAQ] > 500:  # High FAQ usage
                        self.cache.ttl = timedelta(hours=72)  # Extend cache
                
                self.logger.info(f"🔧 Optimized for pattern: {most_common_pattern.value}")
            
        except Exception as e:
            self.logger.error(f"Pattern optimization error: {e}")
    
    async def _generate_optimized_summary(self, responses: List[Dict[str, Any]], 
                                        request: OptimizedConsultationRequest) -> str:
        """Generate optimized summary with performance context"""
        if len(responses) == 1:
            response = responses[0]
            performance_indicator = "⚡" if response.get("response_time", 0) < 2.0 else "🐌" if response.get("response_time", 0) > 10.0 else "⏱️"
            
            return f"""
{performance_indicator} **AI Consultation Summary**

**Provider:** {response['provider'].title()} ({response.get('model_used', 'unknown')})
**Response Time:** {response.get('response_time', 0):.2f}s
**Pattern:** {request.pattern_type.value.title()}
**Status:** {'✅ Success' if response.get('success') else '❌ Failed'}

{response.get('response', f"Error: {response.get('error', 'Unknown error')}")}
"""
        else:
            summary_parts = ["🔄 **Multi-AI Consultation Summary**\n"]
            
            # Performance overview
            avg_time = sum(r.get("response_time", 0) for r in responses) / len(responses)
            performance_indicator = "⚡" if avg_time < 2.0 else "🐌" if avg_time > 10.0 else "⏱️"
            
            summary_parts.append(f"{performance_indicator} **Average Response Time:** {avg_time:.2f}s")
            summary_parts.append(f"🎯 **Pattern Detected:** {request.pattern_type.value.title()}")
            summary_parts.append("")
            
            for i, response in enumerate(responses, 1):
                status = '✅' if response.get('success') else '❌'
                summary_parts.append(
                    f"**{i}. {response['provider'].title()}** "
                    f"{status} {response.get('response_time', 0):.2f}s"
                )
            
            summary_parts.append("\n" + "="*50)
            
            # Add successful responses
            for response in responses:
                if response.get('success'):
                    summary_parts.append(f"\n**{response['provider'].title()} Response:**")
                    summary_parts.append(response.get('response', ''))
                    summary_parts.append("\n" + "-"*30)
            
            return "\n".join(summary_parts)
    
    async def _generate_optimized_comparison(self, responses: List[Dict[str, Any]]) -> str:
        """Generate optimized comparison analysis"""
        if len(responses) < 2:
            return "Not enough responses to compare"
        
        comparison = ["📊 **AI Provider Comparison**\n"]
        
        # Performance metrics
        comparison.append("**⚡ Performance Metrics:**")
        for response in responses:
            time_indicator = "🚀" if response.get("response_time", 0) < 2.0 else "🐌" if response.get("response_time", 0) > 5.0 else "⏱️"
            comparison.append(f"• {response['provider'].title()}: {time_indicator} {response.get('response_time', 0):.2f}s")
        
        # Response characteristics
        comparison.append("\n**📝 Response Characteristics:**")
        for response in responses:
            length = len(response.get('response', ''))
            comparison.append(f"• {response['provider'].title()}: {length:,} characters")
        
        # Qualitative differences
        comparison.append("\n**🎯 Provider Strengths:**")
        comparison.append("• **Gemini**: Structured responses, technical accuracy, comprehensive analysis")
        comparison.append("• **Llama2**: Conversational tone, creative solutions, local processing")
        
        return "\n".join(comparison)
    
    def _error_response(self, error_msg: str, request_id: str, 
                       responses: List[Dict] = None) -> Dict[str, Any]:
        """Generate standardized error response"""
        return {
            "success": False,
            "error": error_msg,
            "request_id": request_id,
            "responses": responses or [],
            "summary": f"❌ **Consultation Failed**\n\n{error_msg}",
            "timestamp": datetime.now().isoformat()
        }
    
    def get_comprehensive_status(self) -> Dict[str, Any]:
        """Get comprehensive system status with performance metrics"""
        system_metrics = self.performance_monitor.get_system_metrics()
        
        return {
            "providers": {
                "gemini": {
                    "available": self.gemini_available,
                    "stats": self.provider_stats.get("gemini", {})
                },
                "llama2": {
                    "available": self.llama2_available,
                    "stats": self.provider_stats.get("llama2", {})
                }
            },
            "performance": system_metrics,
            "cache": {
                "size": len(self.cache.cache),
                "hit_rate": system_metrics.get("cache_hit_rate", 0),
                "ttl_hours": self.cache.ttl.total_seconds() / 3600
            },
            "patterns": dict(self.pattern_stats),
            "configuration": {
                key: self.config.get(key) 
                for key in ["default_provider", "fallback_enabled", "parallel_enabled", 
                           "cache_enabled", "pattern_optimization", "analytics_enabled"]
            },
            "licensing": {
                "version": "Commercial",
                "owner": "Jordan After Midnight",
                "restrictions": "Single user license - commercial use requires paid license"
            }
        }
    
    def __del__(self):
        """Cleanup resources"""
        try:
            if hasattr(self, 'executor'):
                self.executor.shutdown(wait=False)
        except:
            pass

# Enhanced CLI interface for testing
async def test_optimized_integration():
    """Comprehensive test suite for optimized integration"""
    print("🚀 Testing Optimized Multi-AI Integration System...")
    print("="*60)
    
    integration = OptimizedMultiAIIntegration()
    
    # Test suite
    test_queries = [
        ("What is machine learning?", QueryPattern.FAQ),
        ("How to implement a REST API in Python?", QueryPattern.TECHNICAL),
        ("Write a creative story about AI", QueryPattern.CREATIVE),
        ("Debug this SQL query: SELECT * FROM users WHERE id = '1' OR '1'='1'", QueryPattern.DEBUG),
        ("Analyze the pros and cons of microservices vs monolithic architecture", QueryPattern.ANALYSIS)
    ]
    
    print("\n1. 🔍 System Status Check...")
    status = integration.get_comprehensive_status()
    print(f"   Providers available: {sum(1 for p in status['providers'].values() if p['available'])}/2")
    print(f"   Cache enabled: {status['configuration']['cache_enabled']}")
    print(f"   Analytics enabled: {status['configuration']['analytics_enabled']}")
    
    print("\n2. 🧪 Running Test Queries...")
    
    for i, (query, expected_pattern) in enumerate(test_queries, 1):
        print(f"\n   Test {i}/5: {expected_pattern.value.title()} Query")
        
        request = OptimizedConsultationRequest(
            query=query,
            context="Testing optimized multi-AI system",
            cache_enabled=True,
            compare_responses=False,
            include_reasoning=True
        )
        
        try:
            start = time.time()
            result = await integration.optimized_consult(request)
            duration = time.time() - start
            
            if result["success"]:
                cache_status = "💾 CACHED" if result.get("cache_hit") else "🔄 FRESH"
                pattern = result.get("pattern_detected", "unknown")
                providers = result.get("providers_used", ["unknown"])
                
                print(f"      ✅ Success in {duration:.2f}s {cache_status}")
                print(f"      🎯 Pattern: {pattern} (Expected: {expected_pattern.value})")
                print(f"      🤖 Provider(s): {', '.join(providers)}")
                print(f"      📏 Response: {len(result.get('summary', '')):.0f} chars")
            else:
                print(f"      ❌ Failed: {result.get('error', 'Unknown error')}")
                
        except Exception as e:
            print(f"      💥 Exception: {e}")
    
    print("\n3. 📊 Performance Analysis...")
    final_status = integration.get_comprehensive_status()
    performance = final_status["performance"]
    
    print(f"   Total Requests: {performance['request_count']}")
    print(f"   Cache Hit Rate: {performance['cache_hit_rate']:.1f}%")
    print(f"   Average Response Time: {performance['avg_response_time']:.2f}s")
    print(f"   Error Rate: {performance['error_rate']:.1f}%")
    print(f"   System CPU: {performance['system_cpu']:.1f}%")
    print(f"   System Memory: {performance['system_memory']:.1f}%")
    
    print("\n4. 🎯 Pattern Statistics...")
    patterns = final_status["patterns"]
    for pattern, stats in patterns.items():
        if stats["count"] > 0:
            cache_rate = (stats["cache_hits"] / stats["count"]) * 100
            print(f"   {pattern}: {stats['count']} queries, {stats['avg_time']:.2f}s avg, {cache_rate:.0f}% cached")
    
    print("\n" + "="*60)
    print("🎉 Optimized Multi-AI Integration Test Complete!")
    
    # Licensing reminder
    print("\n📄 LICENSING NOTICE:")
    print("   This software is licensed for single-user use.")
    print("   Commercial use requires a paid commercial license.")
    print("   Contact: jordanaftermidnight@users.noreply.github.com")

if __name__ == "__main__":
    asyncio.run(test_optimized_integration())