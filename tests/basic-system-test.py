#!/usr/bin/env python3
"""
Basic Test Suite for Optimized Multi-AI Integration
Tests core functionality without external dependencies

Copyright (c) 2025 Jordan After Midnight. All rights reserved.
"""

import asyncio
import time
import tempfile
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path
from unittest.mock import Mock, AsyncMock, patch

# Import our optimized system
try:
    from optimized_multi_ai_integration import (
        OptimizedMultiAIIntegration,
        OptimizedConsultationRequest,
        QueryPattern,
        AIProvider,
        AdvancedCache,
        QueryPatternAnalyzer,
        PerformanceMonitor,
        CachedResponse
    )
    print("✅ Successfully imported optimized multi-AI integration")
except Exception as e:
    print(f"❌ Import error: {e}")
    exit(1)

def test_basic_cache_operations():
    """Test basic cache functionality"""
    print("\n🧪 Testing Basic Cache Operations...")
    
    # Create temporary cache
    with tempfile.TemporaryDirectory() as temp_dir:
        cache = AdvancedCache(max_size=100, ttl_hours=1)
        cache.db_path = Path(temp_dir) / "test_cache.db"
        cache._init_database()
        
        # Test hash generation
        hash1 = cache._generate_hash("test query", "context")
        hash2 = cache._generate_hash("test query", "context")
        assert hash1 == hash2, "Hash generation should be consistent"
        print("   ✅ Hash generation working")
        
        # Test cache miss
        result = asyncio.run(cache.get("test query", "context"))
        assert result is None, "Cache should miss for non-existent entries"
        print("   ✅ Cache miss working")
        
        # Test cache set and hit
        cached_response = CachedResponse(
            response="Test response",
            provider="gemini",
            model_used="gemini-pro",
            timestamp=datetime.now()
        )
        
        asyncio.run(cache.set("test query", "context", cached_response))
        result = asyncio.run(cache.get("test query", "context"))
        
        assert result is not None, "Cache should hit after setting"
        assert result.response == "Test response", "Cached response should match"
        assert result.hit_count == 1, "Hit count should increment"
        print("   ✅ Cache set/get working")

def test_pattern_analyzer():
    """Test query pattern analysis"""
    print("\n🧪 Testing Pattern Analysis...")
    
    analyzer = QueryPatternAnalyzer()
    
    # Test FAQ detection
    faq_queries = [
        "What is machine learning?",
        "How to install Python?",
        "Can you explain neural networks?"
    ]
    
    for query in faq_queries:
        pattern, confidence = analyzer.classify_query(query)
        assert pattern == QueryPattern.FAQ, f"Should detect FAQ pattern for: {query}"
        assert confidence > 0.2, f"Should have reasonable confidence for: {query}"
    
    print("   ✅ FAQ pattern detection working")
    
    # Test technical detection
    technical_queries = [
        "Implement a REST API in Python",
        "Debug this code error",
        "Optimize algorithm performance"
    ]
    
    for query in technical_queries:
        pattern, confidence = analyzer.classify_query(query)
        assert pattern == QueryPattern.TECHNICAL, f"Should detect technical pattern for: {query}"
    
    print("   ✅ Technical pattern detection working")
    
    # Test optimization configs
    faq_config = analyzer.get_optimization_config(QueryPattern.FAQ)
    assert faq_config["cache_priority"] == "high"
    assert faq_config["preferred_provider"] == "gemini"
    print("   ✅ Pattern optimization configs working")

def test_performance_monitor():
    """Test performance monitoring"""
    print("\n🧪 Testing Performance Monitor...")
    
    monitor = PerformanceMonitor()
    
    # Test request tracking
    request_id = monitor.start_request()
    assert request_id.startswith("req_"), "Request ID should have proper prefix"
    assert monitor.metrics["concurrent_requests"] == 1, "Should track concurrent requests"
    
    # End request
    monitor.end_request(request_id, 1.5, True, cache_hit=False)
    assert monitor.metrics["concurrent_requests"] == 0, "Should decrement concurrent requests"
    assert monitor.metrics["request_count"] == 1, "Should increment total requests"
    assert monitor.metrics["cache_misses"] == 1, "Should track cache misses"
    
    print("   ✅ Request tracking working")
    
    # Test cache metrics
    req2 = monitor.start_request()
    monitor.end_request(req2, 0.5, True, cache_hit=True)
    
    metrics = monitor.get_system_metrics()
    assert metrics["cache_hits"] == 1, "Should track cache hits"
    assert metrics["cache_hit_rate"] == 50.0, "Should calculate hit rate correctly"
    
    print("   ✅ Cache metrics working")

def test_integration_initialization():
    """Test optimized integration initialization"""
    print("\n🧪 Testing Integration Initialization...")
    
    # Mock the AI providers to avoid actual API calls
    with patch('optimized_multi_ai_integration.GeminiIntegration') as mock_gemini, \
         patch('optimized_multi_ai_integration.Llama2Integration') as mock_llama2:
        
        # Mock successful initialization
        mock_gemini.return_value.primary_model = "gemini-pro-test"
        mock_llama2.return_value.default_model = "llama2:7b-test"
        mock_llama2.return_value.check_ollama_status = AsyncMock(return_value=True)
        
        integration = OptimizedMultiAIIntegration()
        
        # Test initialization
        assert integration is not None, "Integration should initialize"
        assert hasattr(integration, 'cache'), "Should have cache"
        assert hasattr(integration, 'pattern_analyzer'), "Should have pattern analyzer"
        assert hasattr(integration, 'performance_monitor'), "Should have performance monitor"
        
        print("   ✅ Integration initialization working")
        
        # Test timeout calculation
        faq_request = OptimizedConsultationRequest(
            query="What is AI?",
            context="",
            pattern_type=QueryPattern.FAQ
        )
        timeout = integration._calculate_adaptive_timeout(faq_request)
        assert timeout < 30, "FAQ should have shorter timeout"
        
        creative_request = OptimizedConsultationRequest(
            query="Write a detailed story about futuristic cities",
            context="Creative writing",
            pattern_type=QueryPattern.CREATIVE
        )
        timeout = integration._calculate_adaptive_timeout(creative_request)
        assert timeout > 30, "Creative should have longer timeout"
        
        print("   ✅ Adaptive timeout calculation working")

def test_provider_stats():
    """Test provider statistics tracking"""
    print("\n🧪 Testing Provider Statistics...")
    
    with patch('optimized_multi_ai_integration.GeminiIntegration'), \
         patch('optimized_multi_ai_integration.Llama2Integration'):
        
        integration = OptimizedMultiAIIntegration()
        
        # Update stats for successful request
        integration._update_provider_stats_optimized("gemini", True, 2.5)
        
        stats = integration.provider_stats["gemini"]
        assert stats["requests"] == 1, "Should track requests"
        assert stats["successes"] == 1, "Should track successes"
        assert stats["avg_time"] == 2.5, "Should track average time"
        assert stats["min_time"] == 2.5, "Should track min time"
        assert stats["max_time"] == 2.5, "Should track max time"
        
        # Update with another request
        integration._update_provider_stats_optimized("gemini", False, 1.0)
        
        stats = integration.provider_stats["gemini"]
        assert stats["requests"] == 2, "Should increment requests"
        assert stats["failures"] == 1, "Should track failures"
        assert stats["avg_time"] == 1.75, "Should update average time"
        
        print("   ✅ Provider statistics working")

def test_comprehensive_status():
    """Test comprehensive status reporting"""
    print("\n🧪 Testing Comprehensive Status...")
    
    with patch('optimized_multi_ai_integration.GeminiIntegration'), \
         patch('optimized_multi_ai_integration.Llama2Integration'):
        
        integration = OptimizedMultiAIIntegration()
        status = integration.get_comprehensive_status()
        
        # Check all required sections
        required_sections = ["providers", "performance", "cache", "patterns", "configuration", "licensing"]
        for section in required_sections:
            assert section in status, f"Status should include {section} section"
        
        # Check licensing information
        licensing = status["licensing"]
        assert licensing["owner"] == "Jordan After Midnight", "Should have correct owner"
        assert "commercial use" in licensing["restrictions"].lower(), "Should mention commercial restrictions"
        
        print("   ✅ Comprehensive status working")

def test_license_verification():
    """Test license file and verification"""
    print("\n🧪 Testing License Verification...")
    
    # Check if license file exists
    license_path = Path(__file__).parent / "LICENSE"
    assert license_path.exists(), "LICENSE file must exist"
    
    license_content = license_path.read_text()
    required_terms = [
        "Jordan After Midnight",
        "Commercial License",
        "commercial use",
        "jordanaftermidnight@users.noreply.github.com"
    ]
    
    for term in required_terms:
        assert term in license_content, f"License should contain: {term}"
    
    print("   ✅ License verification working")

def run_performance_benchmark():
    """Run basic performance benchmarks"""
    print("\n🏃‍♂️ Running Performance Benchmarks...")
    print("="*50)
    
    # Test cache performance
    print("\n1. Cache Performance Test")
    with tempfile.TemporaryDirectory() as temp_dir:
        cache = AdvancedCache(max_size=1000, ttl_hours=24)
        cache.db_path = Path(temp_dir) / "bench_cache.db"
        cache._init_database()
        
        # Benchmark cache operations
        start = time.time()
        for i in range(100):  # Smaller test for basic version
            asyncio.run(cache.set(
                f"bench_query_{i}",
                f"bench_context_{i}",
                CachedResponse(
                    response=f"benchmark response {i}",
                    provider="gemini",
                    model_used="gemini-pro",
                    timestamp=datetime.now()
                )
            ))
        
        set_duration = time.time() - start
        print(f"   ✅ 100 cache sets: {set_duration:.2f}s ({100/set_duration:.0f} ops/sec)")
        
        start = time.time()
        hits = 0
        for i in range(100):
            result = asyncio.run(cache.get(f"bench_query_{i}", f"bench_context_{i}"))
            if result:
                hits += 1
        
        get_duration = time.time() - start
        print(f"   ✅ 100 cache gets: {get_duration:.2f}s ({100/get_duration:.0f} ops/sec)")
        print(f"   ✅ Cache hit rate: {hits/100*100:.1f}%")
    
    # Test pattern analysis performance
    print("\n2. Pattern Analysis Performance")
    analyzer = QueryPatternAnalyzer()
    
    test_queries = [
        "What is artificial intelligence?",
        "How to implement a neural network?", 
        "Create a story about robots",
        "Debug this Python code",
        "Analyze market trends"
    ] * 20  # 100 total queries
    
    start = time.time()
    for query in test_queries:
        pattern, confidence = analyzer.classify_query(query)
    
    analysis_duration = time.time() - start
    print(f"   ✅ 100 pattern analyses: {analysis_duration:.2f}s ({100/analysis_duration:.0f} ops/sec)")
    
    print("\n" + "="*50)
    print("🎯 Performance Benchmark Complete!")

def main():
    """Run all basic tests"""
    print("🚀 Multi-AI Integration CLI - Optimized Edition")
    print("🧪 Running Basic Test Suite...")
    print("="*60)
    
    try:
        # Core functionality tests
        test_basic_cache_operations()
        test_pattern_analyzer()
        test_performance_monitor()
        test_integration_initialization()
        test_provider_stats()
        test_comprehensive_status()
        test_license_verification()
        
        print("\n✅ All Core Tests Passed!")
        
        # Performance benchmarks
        run_performance_benchmark()
        
        print("\n" + "="*60)
        print("🎉 All Tests Completed Successfully!")
        
        print("\n📄 Commercial License Notice:")
        print("   This software is protected by commercial licensing.")
        print("   Single-user personal use is permitted at no charge.")
        print("   Commercial use requires a paid license.")
        print("   Contact: jordanaftermidnight@users.noreply.github.com")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)