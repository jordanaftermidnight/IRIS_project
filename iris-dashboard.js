// IRIS AI Orchestration System - Fixed Dashboard JavaScript

class IRISDashboard {
    constructor() {
        // Performance optimization: Debouncing and caching
        this.pendingUpdates = new Set();
        this.updateCache = new Map();
        this.debouncedChartUpdate = this.debounce(this.updateChartsOptimized.bind(this), 300);
        this.lastUpdateTime = 0;
        
        // Advanced Analytics Data
        this.analyticsData = {
            predictions: {
                nextHourLoad: 85,
                peakTimeToday: '14:30',
                recommendedScaling: 'increase_by_20%',
                costProjection24h: 2.43
            },
            patterns: {
                queryTypeDistribution: { code: 35, creative: 25, fast: 25, reasoning: 15 },
                peakHours: [9, 10, 11, 14, 15, 16],
                popularProviders: ['ollama', 'groq', 'gemini'],
                avgSessionLength: 8.5,
                userRetention: 94.2
            },
            performance: {
                systemEfficiency: 94.7,
                resourceUtilization: 78.3,
                cacheHitRate: 87.2,
                errorRate: 0.8,
                throughputQPS: 23.4
            },
            costs: {
                totalCost24h: 1.87,
                costPerQuery: 0.0015,
                costByProvider: {
                    ollama: 0.00,
                    groq: 0.78,
                    gemini: 0.92,
                    openai: 0.17
                },
                costTrends: Array.from({length: 24}, (_, i) => Math.random() * 0.1 + 0.05)
            },
            insights: [
                { type: 'optimization', message: 'Ollama usage increased 23% - excellent cost efficiency', priority: 'high' },
                { type: 'performance', message: 'Response times improved 8% after neural learning cycle', priority: 'medium' },
                { type: 'usage', message: 'Creative queries peak at 2-4 PM - consider Gemini auto-scaling', priority: 'medium' },
                { type: 'cost', message: 'Projected 15% cost reduction with current optimization', priority: 'high' }
            ]
        };
        
        this.systemData = {
            health: 98,
            responseTime: 156,
            activeProviders: 3,
            totalProviders: 4,
            securityStatus: 'Protected',
            providers: [
                {
                    id: 'ollama',
                    name: 'Ollama Local',
                    status: 'healthy',
                    health: 98,
                    responseTime: 145,
                    requests: 542,
                    errors: 8,
                    successRate: 98.5,
                    avgCost: 0.00,
                    priority: 1,
                    taskTypes: { code: 45, creative: 15, fast: 25, reasoning: 15 },
                    models: ['qwen2.5:7b', 'mistral:7b', 'deepseek-coder:6.7b']
                },
                {
                    id: 'groq',
                    name: 'Groq Lightning',
                    status: 'healthy',
                    health: 96,
                    responseTime: 89,
                    requests: 389,
                    errors: 2,
                    successRate: 99.5,
                    avgCost: 0.002,
                    priority: 2,
                    taskTypes: { code: 20, creative: 10, fast: 55, reasoning: 15 },
                    models: ['llama-3.1-8b-instant', 'mixtral-8x7b-32768']
                },
                {
                    id: 'gemini',
                    name: 'Google Gemini',
                    status: 'healthy',
                    health: 94,
                    responseTime: 167,
                    requests: 234,
                    errors: 5,
                    successRate: 97.9,
                    avgCost: 0.015,
                    priority: 3,
                    taskTypes: { code: 15, creative: 50, fast: 10, reasoning: 25 },
                    models: ['gemini-1.5-flash', 'gemini-1.5-pro']
                },
                {
                    id: 'openai',
                    name: 'OpenAI GPT',
                    status: 'degraded',
                    health: 85,
                    responseTime: 234,
                    requests: 82,
                    errors: 7,
                    successRate: 91.5,
                    avgCost: 0.03,
                    priority: 4,
                    taskTypes: { code: 25, creative: 20, fast: 5, reasoning: 50 },
                    models: ['gpt-4o-mini', 'o1-preview']
                }
            ],
            usageStats: {
                totalQueries: 1247,
                queriesByHour: Array.from({length: 24}, (_, i) => {
                    // Simulate realistic usage patterns (higher during work hours)
                    const hour = i;
                    if (hour >= 9 && hour <= 17) return Math.floor(Math.random() * 60) + 40;
                    if (hour >= 18 && hour <= 22) return Math.floor(Math.random() * 40) + 20;
                    return Math.floor(Math.random() * 15) + 5;
                }),
                taskDistribution: { code: 35, creative: 25, fast: 25, reasoning: 15 }
            }
        };

        this.activityLog = [];
        this.responseTimeHistory = [];
        this.charts = {};
        this.advancedCharts = {};
        this.updateInterval = null;
        this.isUpdating = false;
        
        // Wait for DOM to be fully loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        try {
            console.log('Initializing IRIS Dashboard...');
            
            // Setup global error handling first
            this.setupGlobalErrorHandling();
            
            // Initialize components in order
            this.setupEventListeners();
            this.updateSystemMetrics();
            this.renderProviders();
            
            // Wait a bit for DOM to settle before setting up charts
            setTimeout(() => {
                this.setupCharts();
                this.setupAdvancedAnalytics();
                this.createProviderActivityPanel();
                this.renderActivityLog();
                this.startRealTimeUpdates();
            }, 500);
            
            this.addActivity('System initialized successfully', 'success');
            this.updateSystemStatus('operational', 'System Operational');
            
            console.log('✅ IRIS Dashboard initialized successfully');
        } catch (error) {
            console.error('❌ Dashboard initialization failed:', error);
            this.addActivity(`Initialization error: ${error.message}`, 'error');
        }
    }

    setupAdvancedAnalytics() {
        console.log('📈 Setting up advanced analytics dashboard...');
        
        try {
            this.createAdvancedMetricsSection();
            this.createPredictiveInsightsPanel();
            this.createCostAnalysisSection();
            this.createAdvancedCharts();
            this.addActivity('Advanced analytics dashboard initialized', 'success');
            console.log('✅ Advanced analytics setup complete');
        } catch (error) {
            console.error('❌ Advanced analytics setup failed:', error);
            this.addActivity(`Advanced analytics error: ${error.message}`, 'error');
        }
    }

    createAdvancedMetricsSection() {
        // Insert advanced metrics after the existing metric cards
        const overviewSection = document.querySelector('.overview-section');
        if (!overviewSection) return;

        const advancedSection = document.createElement('section');
        advancedSection.className = 'advanced-metrics-section';
        advancedSection.innerHTML = `
            <h2 id="advanced-metrics-heading"><i class="fas fa-chart-bar" aria-hidden="true"></i> Advanced Performance Analytics</h2>
            <div class="advanced-metrics-grid" role="region" aria-label="Advanced performance metrics">
                <div class="metric-card advanced-card" tabindex="0" role="button" aria-labelledby="efficiency-title">
                    <i class="fas fa-tachometer-alt" aria-hidden="true"></i>
                    <h3 id="efficiency-title">System Efficiency</h3>
                    <div class="metric-value" id="systemEfficiency" aria-live="polite">${this.analyticsData.performance.systemEfficiency}%</div>
                    <div class="metric-status excellent">Excellent</div>
                    <div class="metric-trend">↗ +2.3% vs yesterday</div>
                </div>
                <div class="metric-card advanced-card" tabindex="0" role="button" aria-labelledby="cache-title">
                    <i class="fas fa-database" aria-hidden="true"></i>
                    <h3 id="cache-title">Cache Hit Rate</h3>
                    <div class="metric-value" id="cacheHitRate" aria-live="polite">${this.analyticsData.performance.cacheHitRate}%</div>
                    <div class="metric-status excellent">Optimal</div>
                    <div class="metric-trend">↗ +5.1% vs yesterday</div>
                </div>
                <div class="metric-card advanced-card" tabindex="0" role="button" aria-labelledby="throughput-title">
                    <i class="fas fa-stream" aria-hidden="true"></i>
                    <h3 id="throughput-title">Throughput</h3>
                    <div class="metric-value" id="throughput" aria-live="polite">${this.analyticsData.performance.throughputQPS} QPS</div>
                    <div class="metric-status good">Good</div>
                    <div class="metric-trend">→ Stable</div>
                </div>
                <div class="metric-card advanced-card" tabindex="0" role="button" aria-labelledby="cost-title">
                    <i class="fas fa-dollar-sign" aria-hidden="true"></i>
                    <h3 id="cost-title">Cost per 1K Queries</h3>
                    <div class="metric-value" id="avgCost" aria-live="polite">$${(this.analyticsData.costs.costPerQuery * 1000).toFixed(2)}</div>
                    <div class="metric-status excellent">Low Cost</div>
                    <div class="metric-trend">↓ -15% vs yesterday</div>
                </div>
            </div>
        `;
        
        overviewSection.insertAdjacentElement('afterend', advancedSection);
    }

    createPredictiveInsightsPanel() {
        // Insert insights panel after analytics section
        const analyticsSection = document.querySelector('.analytics-section');
        if (!analyticsSection) return;

        const insightsSection = document.createElement('section');
        insightsSection.className = 'insights-section';
        insightsSection.innerHTML = `
            <h2 id="insights-heading"><i class="fas fa-lightbulb" aria-hidden="true"></i> AI-Powered Insights & Predictions</h2>
            <div class="insights-container" role="region" aria-labelledby="insights-heading">
                <div class="insights-grid">
                    <div class="insight-card prediction-card">
                        <h3><i class="fas fa-crystal-ball" aria-hidden="true"></i> Next Hour Prediction</h3>
                        <div class="prediction-content">
                            <div class="prediction-metric">
                                <span class="prediction-label">Expected Load:</span>
                                <span class="prediction-value">${this.analyticsData.predictions.nextHourLoad}%</span>
                            </div>
                            <div class="prediction-metric">
                                <span class="prediction-label">Peak Time Today:</span>
                                <span class="prediction-value">${this.analyticsData.predictions.peakTimeToday}</span>
                            </div>
                            <div class="prediction-metric">
                                <span class="prediction-label">Scaling Rec:</span>
                                <span class="prediction-value">${this.analyticsData.predictions.recommendedScaling.replace('_', ' ')}</span>
                            </div>
                        </div>
                    </div>
                    <div class="insight-card cost-projection-card">
                        <h3><i class="fas fa-chart-line" aria-hidden="true"></i> Cost Projection</h3>
                        <div class="cost-projection">
                            <div class="cost-current">
                                <span class="cost-label">24h Projection:</span>
                                <span class="cost-value">$${this.analyticsData.predictions.costProjection24h}</span>
                            </div>
                            <div class="cost-breakdown" id="costBreakdown">
                                ${Object.entries(this.analyticsData.costs.costByProvider).map(([provider, cost]) => `
                                    <div class="cost-item">
                                        <span class="provider-name">${provider}:</span>
                                        <span class="provider-cost">$${cost.toFixed(2)}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
                <div class="insights-alerts" id="insightsAlerts">
                    <h4><i class="fas fa-bell" aria-hidden="true"></i> Smart Insights</h4>
                    <div class="alerts-list" role="log" aria-live="polite">
                        ${this.analyticsData.insights.map(insight => `
                            <div class="insight-alert ${insight.type} priority-${insight.priority}">
                                <i class="fas fa-${this.getInsightIcon(insight.type)}" aria-hidden="true"></i>
                                <span class="insight-message">${insight.message}</span>
                                <span class="insight-priority">${insight.priority}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        
        analyticsSection.insertAdjacentElement('afterend', insightsSection);
    }

    createCostAnalysisSection() {
        // Insert cost analysis before activity section
        const activitySection = document.querySelector('.activity-section');
        if (!activitySection) return;

        const costSection = document.createElement('section');
        costSection.className = 'cost-analysis-section';
        costSection.innerHTML = `
            <h2 id="cost-heading"><i class="fas fa-coins" aria-hidden="true"></i> Cost Analytics & Optimization</h2>
            <div class="cost-analysis-container">
                <div class="cost-charts-grid">
                    <div class="chart-container cost-chart">
                        <h3 id="cost-trend-title"><i class="fas fa-chart-area" aria-hidden="true"></i> Cost Trends (24h)</h3>
                        <canvas id="costTrendChart" role="img" aria-labelledby="cost-trend-title"></canvas>
                    </div>
                    <div class="chart-container provider-cost-chart">
                        <h3 id="provider-cost-title"><i class="fas fa-pie-chart" aria-hidden="true"></i> Cost by Provider</h3>
                        <canvas id="providerCostChart" role="img" aria-labelledby="provider-cost-title"></canvas>
                    </div>
                </div>
                <div class="cost-optimization-panel">
                    <h4><i class="fas fa-cogs" aria-hidden="true"></i> Optimization Recommendations</h4>
                    <div class="optimization-list">
                        <div class="optimization-item high-impact">
                            <i class="fas fa-arrow-up" aria-hidden="true"></i>
                            <span>Increase Ollama usage for code tasks (potential 35% cost reduction)</span>
                        </div>
                        <div class="optimization-item medium-impact">
                            <i class="fas fa-clock" aria-hidden="true"></i>
                            <span>Schedule heavy workloads during off-peak hours (10% savings)</span>
                        </div>
                        <div class="optimization-item low-impact">
                            <i class="fas fa-memory" aria-hidden="true"></i>
                            <span>Enable response caching for repeated queries (5% efficiency gain)</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        activitySection.insertAdjacentElement('beforebegin', costSection);
    }

    // Phase 1: Visual Provider Activity Panel
    createProviderActivityPanel() {
        // Insert provider activity panel before query section
        const querySection = document.querySelector('.query-section');
        if (!querySection) {
            console.warn('Query section not found for provider activity panel');
            return;
        }

        // Check if provider activity panel already exists
        if (document.querySelector('.provider-activity-section')) {
            console.log('Provider activity panel already exists');
            return;
        }

        const providerPanel = document.createElement('section');
        providerPanel.className = 'provider-activity-section';
        providerPanel.innerHTML = `
            <h2 id="provider-activity-heading"><i class="fas fa-broadcast-tower" aria-hidden="true"></i> Live Provider Activity</h2>
            <div class="provider-activity-container" role="region" aria-labelledby="provider-activity-heading">
                <div class="provider-grid">
                    <div class="provider-card" id="ollama-activity">
                        <div class="provider-header">
                            <i class="fas fa-microchip"></i>
                            <h3>Ollama</h3>
                            <span class="provider-status" id="ollama-status">Idle</span>
                        </div>
                        <div class="activity-indicator" id="ollama-indicator">
                            <div class="pulse-dot"></div>
                            <span class="activity-text">Ready</span>
                        </div>
                        <div class="provider-details">
                            <small>Local AI • Free • Fast</small>
                        </div>
                    </div>
                    <div class="provider-card" id="groq-activity">
                        <div class="provider-header">
                            <i class="fas fa-bolt"></i>
                            <h3>Groq</h3>
                            <span class="provider-status" id="groq-status">Idle</span>
                        </div>
                        <div class="activity-indicator" id="groq-indicator">
                            <div class="pulse-dot"></div>
                            <span class="activity-text">Ready</span>
                        </div>
                        <div class="provider-details">
                            <small>Ultra-fast • API Key Required</small>
                        </div>
                    </div>
                    <div class="provider-card" id="gemini-activity">
                        <div class="provider-header">
                            <i class="fas fa-gem"></i>
                            <h3>Gemini</h3>
                            <span class="provider-status" id="gemini-status">Idle</span>
                        </div>
                        <div class="activity-indicator" id="gemini-indicator">
                            <div class="pulse-dot"></div>
                            <span class="activity-text">Ready</span>
                        </div>
                        <div class="provider-details">
                            <small>Multimodal • Creative Tasks</small>
                        </div>
                    </div>
                    <div class="provider-card" id="openai-activity">
                        <div class="provider-header">
                            <i class="fas fa-brain"></i>
                            <h3>OpenAI</h3>
                            <span class="provider-status" id="openai-status">Idle</span>
                        </div>
                        <div class="activity-indicator" id="openai-indicator">
                            <div class="pulse-dot"></div>
                            <span class="activity-text">Ready</span>
                        </div>
                        <div class="provider-details">
                            <small>Advanced Reasoning • GPT-4</small>
                        </div>
                    </div>
                    <div class="provider-card" id="claude-activity">
                        <div class="provider-header">
                            <i class="fas fa-robot"></i>
                            <h3>Claude</h3>
                            <span class="provider-status" id="claude-status">Idle</span>
                        </div>
                        <div class="activity-indicator" id="claude-indicator">
                            <div class="pulse-dot"></div>
                            <span class="activity-text">Ready</span>
                        </div>
                        <div class="provider-details">
                            <small>Analysis • Long Context</small>
                        </div>
                    </div>
                </div>
                <div class="query-flow-indicator" id="query-flow">
                    <div class="flow-step" id="flow-step-1">
                        <i class="fas fa-search"></i>
                        <span>Analyzing Query</span>
                    </div>
                    <div class="flow-arrow">→</div>
                    <div class="flow-step" id="flow-step-2">
                        <i class="fas fa-server"></i>
                        <span>Checking Providers</span>
                    </div>
                    <div class="flow-arrow">→</div>
                    <div class="flow-step" id="flow-step-3">
                        <i class="fas fa-cog"></i>
                        <span>Processing</span>
                    </div>
                    <div class="flow-arrow">→</div>
                    <div class="flow-step" id="flow-step-4">
                        <i class="fas fa-check"></i>
                        <span>Response Ready</span>
                    </div>
                </div>
            </div>
        `;
        
        querySection.insertAdjacentElement('beforebegin', providerPanel);
        console.log('✅ Provider activity panel created successfully');
    }

    // Phase 1: Visual indicator control functions
    updateProviderActivity(providerId, status, activityText = '') {
        const statusElement = document.getElementById(`${providerId}-status`);
        const indicatorElement = document.getElementById(`${providerId}-indicator`);
        const pulseElement = indicatorElement?.querySelector('.pulse-dot');
        const textElement = indicatorElement?.querySelector('.activity-text');
        
        if (!statusElement || !indicatorElement) return;
        
        // Update status
        statusElement.textContent = status;
        statusElement.className = `provider-status ${status.toLowerCase().replace(' ', '-')}`;
        
        // Update activity indicator
        if (activityText) {
            textElement.textContent = activityText;
        }
        
        // Update visual styling based on status
        indicatorElement.className = 'activity-indicator';
        pulseElement.className = 'pulse-dot';
        
        switch (status.toLowerCase()) {
            case 'active':
                indicatorElement.classList.add('active');
                pulseElement.classList.add('pulse-active');
                break;
            case 'checking':
                indicatorElement.classList.add('checking');
                pulseElement.classList.add('pulse-checking');
                break;
            case 'error':
                indicatorElement.classList.add('error');
                pulseElement.classList.add('pulse-error');
                break;
            case 'success':
                indicatorElement.classList.add('success');
                pulseElement.classList.add('pulse-success');
                break;
            default:
                indicatorElement.classList.add('idle');
                pulseElement.classList.add('pulse-idle');
        }
    }
    
    updateQueryFlowStep(stepNumber, active = false) {
        const stepElement = document.getElementById(`flow-step-${stepNumber}`);
        if (!stepElement) return;
        
        stepElement.className = 'flow-step';
        if (active) {
            stepElement.classList.add('active');
        }
    }
    
    resetProviderActivities() {
        const providers = ['ollama', 'groq', 'gemini', 'openai', 'claude'];
        providers.forEach(provider => {
            this.updateProviderActivity(provider, 'Idle', 'Ready');
        });
        
        // Reset flow indicators
        for (let i = 1; i <= 4; i++) {
            this.updateQueryFlowStep(i, false);
        }
    }

    createAdvancedCharts() {
        console.log('📊 Setting up advanced charts...');
        
        try {
            // Wait for DOM to settle
            setTimeout(() => {
                this.setupCostTrendChart();
                this.setupProviderCostChart();
            }, 300);
            console.log('✅ Advanced charts setup initiated');
        } catch (error) {
            console.error('❌ Advanced chart setup failed:', error);
        }
    }

    setupCostTrendChart() {
        const canvas = document.getElementById('costTrendChart');
        if (!canvas || !window.Chart) return;

        const ctx = canvas.getContext('2d');
        this.advancedCharts.costTrend = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array.from({length: 24}, (_, i) => `${i}:00`),
                datasets: [{
                    label: 'Cost per Hour ($)',
                    data: this.analyticsData.costs.costTrends,
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#f59e0b',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Cost ($)'
                        },
                        ticks: {
                            callback: (value) => `$${value.toFixed(3)}`
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Hour of Day'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => `Cost: $${context.raw.toFixed(3)}`
                        }
                    }
                }
            }
        });
        console.log('✅ Cost trend chart created');
    }

    setupProviderCostChart() {
        const canvas = document.getElementById('providerCostChart');
        if (!canvas || !window.Chart) return;

        const ctx = canvas.getContext('2d');
        const providers = Object.keys(this.analyticsData.costs.costByProvider);
        const costs = Object.values(this.analyticsData.costs.costByProvider);

        this.advancedCharts.providerCost = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: providers.map(p => p.charAt(0).toUpperCase() + p.slice(1)),
                datasets: [{
                    data: costs,
                    backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'],
                    borderWidth: 3,
                    borderColor: '#ffffff',
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '50%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            generateLabels: (chart) => {
                                const data = chart.data;
                                return data.labels.map((label, i) => {
                                    const cost = costs[i];
                                    const total = costs.reduce((sum, c) => sum + c, 0);
                                    const percentage = total > 0 ? ((cost / total) * 100).toFixed(1) : '0.0';
                                    return {
                                        text: `${label}: $${cost.toFixed(2)} (${percentage}%)`,
                                        fillStyle: data.datasets[0].backgroundColor[i],
                                        hidden: false,
                                        index: i
                                    };
                                });
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const provider = providers[context.dataIndex];
                                const cost = costs[context.dataIndex];
                                const total = costs.reduce((sum, c) => sum + c, 0);
                                const percentage = total > 0 ? ((cost / total) * 100).toFixed(1) : '0.0';
                                return [
                                    `${provider}: $${cost.toFixed(2)}`,
                                    `${percentage}% of total cost`
                                ];
                            }
                        }
                    }
                }
            }
        });
        console.log('✅ Provider cost chart created');
    }

    getInsightIcon(type) {
        const icons = {
            optimization: 'rocket',
            performance: 'tachometer-alt',
            usage: 'users',
            cost: 'dollar-sign',
            security: 'shield-alt'
        };
        return icons[type] || 'info-circle';
    }

    setupEventListeners() {
        console.log('⚙️ Setting up event listeners...');
        
        // Theme toggle
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }

        // Query submission
        const submitBtn = document.getElementById('submitQuery');
        if (submitBtn) {
            submitBtn.addEventListener('click', () => this.submitQuery());
        }

        // Enter key for query submission
        const queryInput = document.getElementById('queryInput');
        if (queryInput) {
            queryInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                    e.preventDefault();
                    this.submitQuery();
                }
            });
        }

        // Demo controls
        const demoButtons = [
            { id: 'runHealthCheck', handler: () => this.runHealthCheck() },
            { id: 'simulateFailover', handler: () => this.simulateFailover() },
            { id: 'testSecurity', handler: () => this.testSecurity() },
            { id: 'showNeuralLearning', handler: () => this.showNeuralLearning() }
        ];

        demoButtons.forEach(({ id, handler }) => {
            const button = document.getElementById(id);
            if (button) {
                button.addEventListener('click', handler);
            }
        });
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        
        const icon = document.querySelector('#themeToggle i');
        if (icon) {
            icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
        
        this.addActivity(`Theme switched to ${newTheme} mode`, 'info');
    }

    updateSystemMetrics() {
        const elements = {
            systemHealth: document.getElementById('systemHealth'),
            avgResponseTime: document.getElementById('avgResponseTime'),
            activeProviders: document.getElementById('activeProviders'),
            securityStatus: document.getElementById('securityStatus')
        };

        if (elements.systemHealth) {
            elements.systemHealth.textContent = `${this.systemData.health.toFixed(3)}%`;
        }
        if (elements.avgResponseTime) {
            elements.avgResponseTime.textContent = `${this.systemData.responseTime}ms`;
        }
        if (elements.activeProviders) {
            elements.activeProviders.textContent = `${this.systemData.activeProviders}/${this.systemData.totalProviders}`;
        }
        if (elements.securityStatus) {
            elements.securityStatus.textContent = this.systemData.securityStatus;
        }
    }

    updateSystemStatus(status, message) {
        const indicator = document.getElementById('statusIndicator');
        const statusText = document.getElementById('statusText');
        
        if (indicator) {
            indicator.className = `status-indicator ${status === 'operational' ? '' : status}`;
        }
        if (statusText) {
            statusText.textContent = message;
        }
    }

    renderProviders() {
        const grid = document.getElementById('providersGrid');
        if (!grid) return;

        grid.innerHTML = '';

        this.systemData.providers.forEach(provider => {
            const card = document.createElement('div');
            card.className = 'provider-card';
            
            // Calculate usage percentage
            const totalRequests = this.systemData.providers.reduce((sum, p) => sum + p.requests, 0);
            const usagePercentage = totalRequests > 0 ? ((provider.requests / totalRequests) * 100).toFixed(1) : '0.0';
            
            // Get primary task type
            const taskTypes = provider.taskTypes || {};
            const primaryTask = Object.keys(taskTypes).reduce((a, b) => taskTypes[a] > taskTypes[b] ? a : b, 'balanced');
            
            // Format last used time
            const lastUsed = provider.lastUsed ? new Date(provider.lastUsed) : new Date();
            const timeDiff = Date.now() - lastUsed.getTime();
            const lastUsedText = timeDiff < 60000 ? 'Just now' : 
                                timeDiff < 3600000 ? `${Math.floor(timeDiff/60000)}m ago` : 
                                `${Math.floor(timeDiff/3600000)}h ago`;
            
            card.innerHTML = `
                <div class="provider-header">
                    <div class="provider-title">
                        <span class="provider-name">${provider.name}</span>
                        <span class="provider-priority">Priority ${provider.priority || 'N/A'}</span>
                    </div>
                    <span class="provider-status ${provider.status}">${provider.status.toUpperCase()}</span>
                </div>
                <div class="provider-metrics">
                    <div class="provider-metric">
                        <div class="provider-metric-label">Health</div>
                        <div class="provider-metric-value">${provider.health.toFixed(3)}%</div>
                    </div>
                    <div class="provider-metric">
                        <div class="provider-metric-label">Response Time</div>
                        <div class="provider-metric-value">${Math.round(provider.responseTime)}ms</div>
                    </div>
                    <div class="provider-metric">
                        <div class="provider-metric-label">Success Rate</div>
                        <div class="provider-metric-value">${provider.successRate ? provider.successRate.toFixed(1) : '0.0'}%</div>
                    </div>
                    <div class="provider-metric">
                        <div class="provider-metric-label">Usage Share</div>
                        <div class="provider-metric-value">${usagePercentage}%</div>
                    </div>
                </div>
                <div class="provider-details">
                    <div class="provider-detail">
                        <span class="detail-label">Requests:</span>
                        <span class="detail-value">${provider.requests.toLocaleString()}</span>
                    </div>
                    <div class="provider-detail">
                        <span class="detail-label">Errors:</span>
                        <span class="detail-value">${provider.errors}</span>
                    </div>
                    <div class="provider-detail">
                        <span class="detail-label">Cost/1K:</span>
                        <span class="detail-value">$${provider.avgCost ? provider.avgCost.toFixed(3) : '0.000'}</span>
                    </div>
                    <div class="provider-detail">
                        <span class="detail-label">Primary Task:</span>
                        <span class="detail-value">${primaryTask}</span>
                    </div>
                    <div class="provider-detail">
                        <span class="detail-label">Last Used:</span>
                        <span class="detail-value">${lastUsedText}</span>
                    </div>
                    ${provider.models ? `
                        <div class="provider-detail">
                            <span class="detail-label">Models:</span>
                            <span class="detail-value">${provider.models.slice(0, 2).join(', ')}${provider.models.length > 2 ? '...' : ''}</span>
                        </div>
                    ` : ''}
                </div>
            `;
            grid.appendChild(card);
        });
    }

    setupCharts() {
        console.log('📊 Setting up charts...');
        
        try {
            // Set explicit heights for chart containers
            const chartContainers = document.querySelectorAll('.chart-container canvas');
            chartContainers.forEach(canvas => {
                canvas.style.height = '300px';
                canvas.style.maxHeight = '300px';
            });

            // Response Time Chart
            const responseCanvas = document.getElementById('responseTimeChart');
            if (responseCanvas && window.Chart) {
                const ctx = responseCanvas.getContext('2d');
                this.charts.responseTime = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: this.generateTimeLabels(),
                        datasets: [{
                            label: 'Response Time (ms)',
                            data: this.generateResponseTimeData(),
                            borderColor: '#3b82f6',
                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                            tension: 0.4,
                            fill: true
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        layout: {
                            padding: {
                                left: 10,
                                right: 10,
                                top: 10,
                                bottom: 20
                            }
                        },
                        animation: {
                            duration: 500,
                            easing: 'easeInOutCubic',
                            tension: {
                                duration: 1000,
                                easing: 'linear',
                                from: 1,
                                to: 0,
                                loop: true
                            }
                        },
                        interaction: {
                            intersect: false,
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                max: 500,
                                title: {
                                    display: true,
                                    text: 'Response Time (ms)',
                                    font: {
                                        size: 11
                                    }
                                },
                                ticks: {
                                    font: {
                                        size: 10
                                    }
                                }
                            },
                            x: {
                                title: {
                                    display: true,
                                    text: 'Time',
                                    font: {
                                        size: 11
                                    }
                                },
                                ticks: {
                                    font: {
                                        size: 10
                                    },
                                    maxTicksLimit: 8
                                }
                            }
                        },
                        plugins: {
                            legend: {
                                display: false
                            }
                        },
                        elements: {
                            point: {
                                radius: 2
                            }
                        }
                    }
                });
                console.log('✅ Response time chart created');
            }

            // Provider Usage Chart - Enhanced with better data representation
            const usageCanvas = document.getElementById('providerUsageChart');
            if (usageCanvas && window.Chart) {
                const ctx = usageCanvas.getContext('2d');
                const healthyProviders = this.systemData.providers.filter(p => p.status !== 'critical');
                
                this.charts.providerUsage = new Chart(ctx, {
                    type: 'pie',
                    data: {
                        labels: healthyProviders.map(p => `${p.name} (${p.requests})`),
                        datasets: [{
                            data: healthyProviders.map(p => p.requests),
                            backgroundColor: [
                                '#10b981', // Ollama - Green (Primary)
                                '#3b82f6', // Groq - Blue (Fast)
                                '#f59e0b', // Gemini - Orange (Creative)
                                '#8b5cf6', // OpenAI - Purple (Advanced)
                            ],
                            borderWidth: 3,
                            borderColor: '#ffffff',
                            hoverBorderWidth: 4,
                            hoverOffset: 8
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: true,
                        aspectRatio: 1,
                        layout: {
                            padding: {
                                left: 10,
                                right: 40,
                                top: 10,
                                bottom: 10
                            }
                        },
                        animation: {
                            duration: 750,
                            easing: 'easeInOutQuart',
                            animateRotate: true,
                            animateScale: false
                        },
                        plugins: {
                            legend: {
                                position: 'right',
                                align: 'center',
                                labels: {
                                    padding: 12,
                                    usePointStyle: true,
                                    pointStyle: 'circle',
                                    font: {
                                        size: 11,
                                        weight: '500'
                                    },
                                    boxWidth: 12,
                                    boxHeight: 12,
                                    generateLabels: (chart) => {
                                        const data = chart.data;
                                        return data.labels.map((label, i) => {
                                            const provider = healthyProviders[i];
                                            const percentage = ((provider.requests / healthyProviders.reduce((sum, p) => sum + p.requests, 0)) * 100).toFixed(1);
                                            return {
                                                text: `${provider.name}: ${percentage}% (${provider.requests} req)`,
                                                fillStyle: data.datasets[0].backgroundColor[i],
                                                hidden: false,
                                                index: i
                                            };
                                        });
                                    }
                                }
                            },
                            tooltip: {
                                callbacks: {
                                    label: (context) => {
                                        const provider = healthyProviders[context.dataIndex];
                                        const total = healthyProviders.reduce((sum, p) => sum + p.requests, 0);
                                        const percentage = ((provider.requests / total) * 100).toFixed(1);
                                        return [
                                            `${provider.name}: ${percentage}%`,
                                            `Requests: ${provider.requests}`,
                                            `Success Rate: ${provider.successRate}%`,
                                            `Avg Response: ${provider.responseTime}ms`,
                                            `Cost: $${provider.avgCost}/1k tokens`
                                        ];
                                    }
                                }
                            }
                        },
                        interaction: {
                            intersect: false
                        }
                    }
                });
                console.log('✅ Enhanced provider usage chart created');
            }
        } catch (error) {
            console.error('❌ Chart setup failed:', error);
            this.addActivity(`Chart initialization failed: ${error.message}`, 'error');
        }
    }

    generateTimeLabels() {
        const labels = [];
        const now = new Date();
        for (let i = 29; i >= 0; i--) {
            const time = new Date(now.getTime() - (i * 60000));
            labels.push(time.toLocaleTimeString('en-US', { 
                hour12: false, 
                hour: '2-digit', 
                minute: '2-digit' 
            }));
        }
        return labels;
    }

    generateResponseTimeData() {
        const data = [];
        for (let i = 0; i < 30; i++) {
            data.push(Math.floor(Math.random() * 200) + 120); // 120-320ms range
        }
        return data;
    }

    startRealTimeUpdates() {
        // Clear any existing interval
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        console.log('⏱️ Starting real-time updates...');
        this.updateInterval = setInterval(() => {
            if (!this.isUpdating) {
                this.performLightweightUpdate();
            }
        }, 3000); // Optimized: 3 seconds with intelligent updates
    }

    updateRealTimeMetrics() {
        if (this.isUpdating) return; // Prevent overlapping updates
        
        this.isUpdating = true;
        
        try {
            // Simulate realistic provider activity
            this.simulateProviderActivity();
            
            // Update system metrics
            this.updateSystemMetrics();
            
            // Update response time chart
            if (this.charts.responseTime) {
                const newTime = new Date().toLocaleTimeString('en-US', { 
                    hour12: false, 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
                const newValue = Math.floor(this.systemData.responseTime);
                
                this.charts.responseTime.data.labels.push(newTime);
                this.charts.responseTime.data.datasets[0].data.push(newValue);
                
                // Keep only last 30 points
                if (this.charts.responseTime.data.labels.length > 30) {
                    this.charts.responseTime.data.labels.shift();
                    this.charts.responseTime.data.datasets[0].data.shift();
                }
                
                this.charts.responseTime.update('none');
            }
            
            // Update provider usage chart with new data
            this.updateProviderUsageChart();
            
            // Update provider grid
            this.renderProviders();
            
        } catch (error) {
            console.error('Real-time update error:', error);
        } finally {
            this.isUpdating = false;
        }
    }
    
    simulateProviderActivity() {
        // Simulate realistic provider usage changes
        this.systemData.providers.forEach(provider => {
            // Small random changes in health
            provider.health += (Math.random() - 0.5) * 2;
            provider.health = Math.max(70, Math.min(100, provider.health));
            
            // Response time fluctuations based on provider type
            const baseChange = (Math.random() - 0.5) * 20;
            provider.responseTime += baseChange;
            provider.responseTime = Math.max(50, Math.min(500, provider.responseTime));
            
            // Simulate occasional new requests (background activity)
            if (Math.random() < 0.3) { // 30% chance per update
                const increment = Math.floor(Math.random() * 3) + 1;
                provider.requests += increment;
                this.systemData.usageStats.totalQueries += increment;
                
                // Update task distribution occasionally
                if (Math.random() < 0.1) {
                    const taskTypes = ['code', 'creative', 'fast', 'reasoning'];
                    const randomTask = taskTypes[Math.floor(Math.random() * taskTypes.length)];
                    provider.taskTypes[randomTask]++;
                }
            }
            
            // Update success rate slightly
            provider.successRate += (Math.random() - 0.5) * 0.5;
            provider.successRate = Math.max(85, Math.min(100, provider.successRate));
            
            // Update status based on health
            if (provider.health >= 95) provider.status = 'healthy';
            else if (provider.health >= 80) provider.status = 'warning';
            else provider.status = 'degraded';
        });
        
        // Update overall system health
        const avgHealth = this.systemData.providers.reduce((sum, p) => sum + p.health, 0) / this.systemData.providers.length;
        this.systemData.health = avgHealth;
        
        // Update average response time
        const activeProviders = this.systemData.providers.filter(p => p.status !== 'critical');
        const avgResponseTime = activeProviders.reduce((sum, p) => sum + p.responseTime, 0) / activeProviders.length;
        this.systemData.responseTime = avgResponseTime;
        
        // Update active providers count
        this.systemData.activeProviders = activeProviders.length;
    }
    
    updateProviderUsageChart() {
        if (this.charts.providerUsage) {
            const healthyProviders = this.systemData.providers.filter(p => p.status !== 'critical');
            const totalRequests = healthyProviders.reduce((sum, p) => sum + p.requests, 0);
            
            // Check if data actually changed to avoid unnecessary updates
            const newData = healthyProviders.map(p => p.requests);
            const currentData = this.charts.providerUsage.data.datasets[0].data;
            
            if (JSON.stringify(newData) === JSON.stringify(currentData)) {
                return; // No change, skip update
            }
            
            // Update data with smooth animation
            this.charts.providerUsage.data.datasets[0].data = newData;
            this.charts.providerUsage.data.labels = healthyProviders.map(p => `${p.name} (${p.requests})`);
            
            // Update legend with new percentages
            this.charts.providerUsage.options.plugins.legend.labels.generateLabels = (chart) => {
                const data = chart.data;
                return data.labels.map((label, i) => {
                    const provider = healthyProviders[i];
                    const percentage = ((provider.requests / totalRequests) * 100).toFixed(1);
                    return {
                        text: `${provider.name}: ${percentage}% (${provider.requests} req)`,
                        fillStyle: data.datasets[0].backgroundColor[i],
                        hidden: false,
                        index: i
                    };
                });
            };
            
            // Update chart with smooth animation
            this.charts.providerUsage.update('active');
        }
    }

    // Optimized response time chart update
    updateResponseTimeChart() {
        if (this.charts.responseTime) {
            const newData = this.generateResponseTimeData();
            const currentData = this.charts.responseTime.data.datasets[0].data;
            
            // Check if significant change occurred
            const avgDifference = newData.reduce((sum, val, i) => 
                sum + Math.abs(val - (currentData[i] || 0)), 0) / newData.length;
            
            if (avgDifference < 5) {
                return; // Minor changes, skip update
            }
            
            // Smooth data transition using interpolation
            const smoothedData = newData.map((newVal, i) => {
                const currentVal = currentData[i] || newVal;
                return currentVal + (newVal - currentVal) * 0.3; // 30% blend for smoothness
            });
            
            this.charts.responseTime.data.datasets[0].data = smoothedData;
            this.charts.responseTime.data.labels = this.generateTimeLabels();
            
            // Update with minimal animation for smoothness
            this.charts.responseTime.update('none');
        }
    }

    async submitQuery() {
        const queryInput = document.getElementById('queryInput');
        const submitBtn = document.getElementById('submitQuery');
        const providerSelect = document.getElementById('providerSelect');
        const responseContent = document.getElementById('responseContent');
        const responseMetrics = document.getElementById('responseMetrics');
        const loadingOverlay = document.getElementById('loadingOverlay');

        if (!queryInput || !submitBtn || !responseContent) return;

        const query = queryInput.value.trim();
        if (!query) {
            this.showNotification('Please enter a query', 'warning');
            return;
        }

        // Show loading state
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        if (loadingOverlay) loadingOverlay.classList.add('active');
        
        // Phase 1: Initialize visual provider activity indicators
        this.resetProviderActivities();
        this.updateQueryFlowStep(1, true); // Analyzing Query
        
        const startTime = Date.now();
        const selectedProvider = providerSelect ? providerSelect.value : 'auto';

        try {
            // Phase 1: Visual feedback during processing
            this.updateQueryFlowStep(2, true); // Checking Providers
            
            // Simulate API call
            const response = await this.simulateQuery(query, selectedProvider);
            const responseTime = Date.now() - startTime;
            
            // Phase 2: Enhanced UI with detailed provider information
            let aiModeIcon, aiModeText, confidenceIndicator;
            
            if (response.realAI === true) {
                aiModeIcon = '<i class="fas fa-brain" style="color: #10b981;"></i>';
                aiModeText = 'Real AI Response';
                confidenceIndicator = '<span class="confidence-high">High Confidence</span>';
            } else if (response.realAI === 'partial') {
                aiModeIcon = '<i class="fas fa-microchip" style="color: #3b82f6;"></i>';
                aiModeText = 'Hybrid AI Response';
                confidenceIndicator = '<span class="confidence-medium">Medium Confidence</span>';
            } else {
                aiModeIcon = '<i class="fas fa-flask" style="color: #f59e0b;"></i>';
                aiModeText = 'Enhanced Demo';
                confidenceIndicator = '<span class="confidence-demo">Demo Mode</span>';
            }
            
            const modelInfo = response.model ? ` • Model: ${response.model}` : '';
            const reasoningInfo = response.reasoning ? ` • Selection: ${response.reasoning}` : '';
            
            responseContent.innerHTML = `
                <div class="response-success">
                    <div class="response-provider">
                        <i class="fas fa-robot"></i> 
                        <strong>Response from ${response.provider}</strong>
                        <span class="ai-mode-badge">${aiModeIcon} ${aiModeText}</span>
                        ${confidenceIndicator}
                    </div>
                    <div class="response-metadata">
                        <small><i class="fas fa-info-circle"></i> ${reasoningInfo}${modelInfo}</small>
                    </div>
                    <div class="response-text">${this.formatResponse(response.content)}</div>
                </div>
            `;

            if (responseMetrics) {
                const realAIBadge = response.realAI === true ? 
                    '<span class="metric-real-ai"><i class="fas fa-brain"></i> Real AI</span>' : 
                    response.realAI === 'partial' ? 
                    '<span class="metric-hybrid"><i class="fas fa-microchip"></i> Hybrid</span>' : 
                    '<span class="metric-demo"><i class="fas fa-flask"></i> Demo</span>';
                
                responseMetrics.innerHTML = `
                    <span><i class="fas fa-clock"></i> ${responseTime}ms</span>
                    <span><i class="fas fa-server"></i> ${response.provider}</span>
                    <span><i class="fas fa-check-circle"></i> Success</span>
                    ${realAIBadge}
                    ${response.confidence ? '<span><i class="fas fa-chart-line"></i> ' + response.confidence + '</span>' : ''}
                `;
            }

            // Phase 1: Show successful completion
            this.updateQueryFlowStep(3, true); // Processing complete
            this.updateQueryFlowStep(4, true); // Response Ready
            this.updateProviderActivity(response.provider.toLowerCase(), 'Success', 'Response delivered');
            
            // Track usage for the selected provider
            this.trackProviderUsage(response.provider, selectedProvider, responseTime);
            
            this.addActivity(`Query processed successfully via ${response.provider}`, 'success');
            this.showNotification(`Query processed in ${responseTime}ms`, 'success');

        } catch (error) {
            const responseTime = Date.now() - startTime;
            
            responseContent.innerHTML = `
                <div class="response-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <strong>Error:</strong> ${error.message}
                </div>
            `;

            if (responseMetrics) {
                responseMetrics.innerHTML = `
                    <span><i class="fas fa-clock"></i> ${responseTime}ms</span>
                    <span><i class="fas fa-exclamation-circle"></i> Error</span>
                `;
            }

            // Phase 1: Show error state in visual indicators
            this.updateProviderActivity('ollama', 'Error', 'Connection failed');
            
            this.addActivity(`Query failed: ${error.message}`, 'error');
            this.showNotification('Query failed', 'error');

        } finally {
            // Phase 1: Reset visual indicators after completion
            setTimeout(() => {
                this.resetProviderActivities();
            }, 3000);
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Query';
            if (loadingOverlay) loadingOverlay.classList.remove('active');
        }
    }

    async simulateQuery(query, provider) {
        try {
            // Phase 2: Enhanced hybrid system with real provider detection
            console.log(`🧠 Processing query with provider: ${provider}`);
            
            // Phase 1: Show checking providers activity
            this.updateProviderActivity('ollama', 'Checking', 'Testing connection...');
            
            // First, check if we can connect to real providers
            const availableProviders = await this.checkAvailableProviders();
            console.log(`📡 Available providers:`, availableProviders);
            
            // Phase 1: Update visual feedback based on available providers
            if (availableProviders.length > 0) {
                // Show which providers are available
                availableProviders.forEach(p => {
                    this.updateProviderActivity(p.name, 'Available', 'Ready for queries');
                });
                
                this.updateQueryFlowStep(3, true); // Processing step
                const realResponse = await this.attemptRealAI(query, provider, availableProviders);
                if (realResponse) {
                    console.log(`✅ Real AI response from ${realResponse.provider}`);
                    // Show which provider was selected
                    this.updateProviderActivity(realResponse.provider.toLowerCase(), 'Active', 'Generating response...');
                    return realResponse;
                }
            } else {
                // No real providers available, show demo mode
                this.updateProviderActivity('ollama', 'Unavailable', 'Service not running');
            }
            
            // Fallback to enhanced demo with provider awareness
            console.log('🔄 Using enhanced demo mode with provider simulation');
            return await this.generateContextAwareDemo(query, provider, availableProviders);
            
        } catch (error) {
            console.warn('🔄 Falling back to basic demo mode:', error.message);
            return await this.generateBasicDemo(query, provider);
        }
    }

    determineTaskType(query) {
        const lowerQuery = query.toLowerCase();
        if (lowerQuery.includes('code') || lowerQuery.includes('function') || lowerQuery.includes('programming')) return 'code';
        if (lowerQuery.includes('write') || lowerQuery.includes('creative') || lowerQuery.includes('story')) return 'creative';
        if (lowerQuery.includes('fast') || lowerQuery.includes('quick')) return 'fast';
        if (lowerQuery.includes('analyze') || lowerQuery.includes('explain') || lowerQuery.includes('complex')) return 'reasoning';
        return 'balanced';
    }

    // Phase 2: Check for available AI providers in real-time
    async checkAvailableProviders() {
        const providers = [];
        
        try {
            // Check Ollama availability
            const ollamaResponse = await fetch('/api/health', { timeout: 2000 });
            if (ollamaResponse.ok) {
                const health = await ollamaResponse.json();
                if (health.providers && health.providers.ollama) {
                    providers.push({
                        name: 'ollama',
                        status: 'available',
                        models: health.providers.ollama.models || ['mistral:7b']
                    });
                }
            }
        } catch (error) {
            console.log('Ollama not available:', error.message);
        }
        
        return providers;
    }
    
    // Phase 2: Attempt real AI connection with intelligent routing
    async attemptRealAI(query, provider, availableProviders) {
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: query,
                    provider: provider === 'auto' ? 'auto' : provider,
                    taskType: this.determineTaskType(query),
                    availableProviders: availableProviders
                }),
                timeout: 15000
            });

            if (response.ok) {
                const data = await response.json();
                return {
                    provider: data.provider || 'ollama',
                    content: data.response,
                    model: data.model,
                    responseTime: data.responseTime,
                    metadata: data.metadata,
                    realAI: true,
                    confidence: 'high'
                };
            }
        } catch (error) {
            console.log('Real AI attempt failed:', error.message);
        }
        return null;
    }
    
    // Phase 2: Context-aware demo responses with provider simulation
    async generateContextAwareDemo(query, provider, availableProviders) {
        const taskType = this.determineTaskType(query);
        const selectedProvider = this.selectOptimalProvider(provider, taskType, availableProviders);
        
        // Realistic processing time based on query complexity and provider
        const processingTime = this.calculateRealisticDelay(query, selectedProvider.name);
        await new Promise(resolve => setTimeout(resolve, processingTime));
        
        const response = await this.generateHighQualityResponse(query, taskType, selectedProvider);
        
        return {
            provider: selectedProvider.displayName,
            content: response,
            model: selectedProvider.model,
            responseTime: processingTime,
            realAI: availableProviders.length > 0 ? 'partial' : false,
            confidence: 'demo',
            reasoning: selectedProvider.reasoning
        };
    }
    
    // Phase 2: Fallback to basic demo
    async generateBasicDemo(query, provider) {
        // Simulate realistic delay
        await new Promise(resolve => setTimeout(resolve, Math.random() * 1200 + 300));
        
        // Simulate occasional failures (reduced rate)
        if (Math.random() < 0.02) {
            throw new Error('Provider temporarily unavailable');
        }

        const providerMap = {
            'auto': 'IRIS Auto-Select',
            'gemini': 'Google Gemini',
            'groq': 'Groq Llama',
            'ollama': 'Ollama Local'
        };

        const selectedProvider = providerMap[provider] || 'IRIS System';
        const lowerQuery = query.toLowerCase();
        
        // Smart contextual responses
        let content;
        if (lowerQuery.includes('hello') || lowerQuery.includes('hi')) {
            content = `Hello! I'm the IRIS AI Orchestration System running in enhanced demo mode. I can help you with coding, creative writing, analysis, and more. How can I assist you today?`;
        } else if (lowerQuery.includes('code') || lowerQuery.includes('function')) {
            content = `I can help you with coding! Here's a simple example:\n\n\`\`\`python\ndef fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)\n\nprint(fibonacci(10))  # Output: 55\n\`\`\`\n\nThe IRIS system would typically route coding tasks to specialized models like DeepSeek-Coder or Code Llama for optimal results.`;
        } else if (lowerQuery.includes('write') || lowerQuery.includes('creative')) {
            content = `Here's a creative response tailored to your request:\n\n*The digital realm hummed with possibility as IRIS orchestrated a symphony of artificial minds, each contributing their unique strengths to solve humanity's challenges.*\n\nFor creative tasks, IRIS typically routes to models optimized for imaginative content like Gemini or Claude.`;
        } else if (lowerQuery.includes('explain') || lowerQuery.includes('what is')) {
            content = `Great question! Let me explain:\n\nThe IRIS AI Orchestration System is designed to intelligently route your queries to the most suitable AI provider based on:\n\n• **Task Type**: Code, creative, analytical, or general\n• **Provider Health**: Real-time monitoring of each AI service\n• **Response Quality**: Learning from previous interactions\n• **Cost Efficiency**: Preferring local models when possible\n\nThis ensures you get optimal responses while minimizing costs and latency.`;
        } else {
            content = `Thank you for your query! The IRIS system has processed your request: "${query}"\n\nIn full mode, this would be routed to ${selectedProvider} based on intelligent analysis of your query type and current provider health metrics. The system continuously learns and adapts to provide optimal responses.`;
        }

        return {
            provider: selectedProvider,
            content: content,
            model: this.getModelForProvider(provider),
            responseTime: Math.floor(Math.random() * 800 + 200),
            realAI: false
        };
    }

    getModelForProvider(provider) {
        const models = {
            'auto': 'Auto-Selected',
            'gemini': 'gemini-1.5-flash',
            'groq': 'llama-3.1-8b',
            'ollama': 'qwen2.5:7b'
        };
        return models[provider] || 'enhanced-demo';
    }

    // ENHANCED: High-quality response generation with proper training
    async generateHighQualityResponse(query, taskType, selectedProvider) {
        console.log(`🎯 Generating high-quality response for: ${taskType} task using ${selectedProvider.name}`);
        
        // Advanced response templates with much better quality
        const responsePatterns = {
            'code': this.generateCodeResponse(query, selectedProvider),
            'creative': this.generateCreativeResponse(query, selectedProvider),
            'fast': this.generateFastResponse(query, selectedProvider),
            'reasoning': this.generateReasoningResponse(query, selectedProvider),
            'balanced': this.generateBalancedResponse(query, selectedProvider)
        };
        
        return responsePatterns[taskType] || responsePatterns.balanced;
    }
    
    generateCodeResponse(query, provider) {
        const codePatterns = [
            () => {
                const language = this.detectLanguage(query);
                return `**Code Analysis & Solution** (via ${provider.displayName})

**Query Analysis**: "${query.substring(0, 100)}${query.length > 100 ? '...' : ''}"
**Detected Context**: ${language} development
**Provider Reasoning**: ${provider.reasoning}

\`\`\`${language}
// Example implementation based on your query
function solveQuery(input) {
    // Intelligent code solution would be generated here
    // using ${provider.model} specialized for coding tasks
    
    const analysis = analyzeRequest(input);
    const solution = generateOptimalSolution(analysis);
    
    return {
        result: solution,
        performance: 'optimized',
        provider: '${provider.name}'
    };
}

// Usage example
const result = solveQuery("${query}");
console.log('Solution:', result);
\`\`\`

**Technical Notes**:
- **Provider Selection**: ${provider.reasoning}
- **Model Capabilities**: ${provider.model} excels at ${language} code generation
- **Performance**: Optimized for accuracy and maintainability
- **Best Practices**: Follows industry standards and conventions

**Next Steps**: Would you like me to elaborate on any specific aspect or provide additional examples?`;
            },
            () => {
                return `**Advanced Coding Assistant** (${provider.displayName})

I understand you're working on: "${query}"

**Approach Analysis**:
✅ **Task Classification**: Code development/debugging
✅ **Complexity Level**: ${this.assessQueryComplexity(query)}
✅ **Provider Match**: ${provider.reasoning}
✅ **Model Selection**: ${provider.model}

**Suggested Implementation Strategy**:

1. **Architecture Planning**
   - Break down the problem into manageable components
   - Identify dependencies and potential bottlenecks
   - Consider scalability and maintainability

2. **Implementation Approach**
   - Start with a minimal viable solution
   - Implement comprehensive error handling  
   - Add thorough testing and documentation

3. **Optimization Opportunities**
   - Performance bottlenecks to address
   - Memory usage considerations
   - Code quality improvements

**Why ${provider.displayName}?**
${provider.name === 'ollama' ? 
    'Local processing ensures your code stays private and provides fast iteration cycles.' :
    provider.name === 'groq' ?
    'Ultra-fast inference perfect for rapid prototyping and iterative development.' :
    'Cloud-based processing provides access to the latest language models and coding knowledge.'
}

Would you like me to dive deeper into any specific aspect of your coding challenge?`;
            }
        ];
        
        return codePatterns[Math.floor(Math.random() * codePatterns.length)]();
    }
    
    generateCreativeResponse(query, provider) {
        const creativePatterns = [
            () => {
                return `**Creative Studio** ✨ (powered by ${provider.displayName})

**Your Creative Brief**: "${query}"

**Creative Interpretation**:
🎨 **Artistic Vision**: Your request sparks fascinating creative possibilities
🌟 **Provider Match**: ${provider.reasoning}
🎭 **Creative Style**: Tailored for ${provider.name === 'gemini' ? 'multimodal creativity' : provider.name === 'claude' ? 'sophisticated narratives' : 'innovative expression'}

**Creative Response**:

*In the realm where imagination meets technology, your request "${query}" opens doorways to infinite creative landscapes...*

**Narrative Thread**: 
The essence of creativity lies not just in the final output, but in the journey of exploration. ${provider.displayName} brings unique strengths to creative endeavors:

${provider.name === 'gemini' ? 
    '🌈 **Multimodal Understanding**: Seamlessly blends text, visual concepts, and contextual creativity' :
    provider.name === 'claude' ?
    '📚 **Sophisticated Reasoning**: Deep understanding of narrative structure and creative nuance' :
    '🏠 **Local Privacy**: Your creative ideas remain completely private during the creative process'
}

**Creative Dimensions to Explore**:
- **Thematic Elements**: Core concepts and emotional resonance
- **Stylistic Approach**: Tone, voice, and creative methodology  
- **Structural Innovation**: Unique ways to present and develop ideas
- **Interactive Elements**: Ways to engage and captivate your audience

**Next Creative Steps**: 
Would you like me to develop any of these creative directions further? I can explore specific themes, suggest alternative approaches, or help refine your creative vision.`;
            }
        ];
        
        return creativePatterns[0]();
    }
    
    generateReasoningResponse(query, provider) {
        return `**Advanced Analysis Engine** 🧠 (${provider.displayName})

**Query for Analysis**: "${query}"
**Analysis Depth**: Comprehensive reasoning mode
**Provider Rationale**: ${provider.reasoning}

**Systematic Analysis Framework**:

**1. Problem Decomposition**
   - Primary question identification
   - Sub-component analysis
   - Dependency mapping
   - Complexity assessment: ${this.assessQueryComplexity(query)}

**2. Multi-Perspective Reasoning**
   - Logical framework application
   - Evidence evaluation
   - Assumption identification
   - Alternative viewpoint consideration

**3. Solution Synthesis**
   - Pattern recognition across domains
   - Analogical reasoning
   - Systematic solution development
   - Quality validation

**Analytical Insights**:
${provider.name === 'openai' ? 
    '🎯 **Advanced Reasoning**: Leveraging cutting-edge reasoning capabilities for complex analysis' :
    provider.name === 'claude' ?
    '📊 **Structured Thinking**: Systematic approach to complex problem-solving' :
    '🔍 **Local Analysis**: Private, secure reasoning processing with full data control'
}

**Reasoning Process**:
The complexity of "${query}" requires a multi-layered analytical approach. ${provider.displayName} excels at breaking down intricate problems into manageable components while maintaining awareness of the broader context and implications.

**Key Considerations**:
- **Logical Consistency**: Ensuring conclusions follow from premises
- **Evidence Quality**: Evaluating information sources and reliability
- **Bias Recognition**: Identifying potential cognitive or systematic biases
- **Uncertainty Handling**: Acknowledging limitations and confidence levels

**Conclusion & Recommendations**:
Based on this systematic analysis, I recommend focusing on [specific actionable insights would be provided based on the actual query content].

Would you like me to dive deeper into any particular aspect of this analysis?`;
    }
    
    generateFastResponse(query, provider) {
        return `**Rapid Response System** ⚡ (${provider.displayName})

**Quick Answer for**: "${query}"
**Response Time**: Optimized for speed
**Provider Logic**: ${provider.reasoning}

${provider.name === 'groq' ? 
    '🚀 **Lightning Processing**: Ultra-fast inference with Groq\'s specialized hardware acceleration' :
    '⚡ **Speed Optimized**: Configured for rapid response delivery'
}

**Direct Response**:
${this.generateDirectAnswer(query)}

**Speed Metrics**:
- **Processing**: ${provider.name === 'groq' ? '<200ms' : '<500ms'} typical
- **Model**: ${provider.model} (speed-optimized)
- **Confidence**: High for quick queries
- **Accuracy**: Maintained despite speed optimization

**Follow-up Options**:
- **Deep Dive**: Switch to reasoning mode for detailed analysis
- **Creative Expansion**: Explore creative angles on this topic  
- **Code Implementation**: Get practical code solutions
- **More Details**: Request comprehensive information

Need more detail on any aspect? Just ask!`;
    }
    
    generateBalancedResponse(query, provider) {
        return `**IRIS Comprehensive Response** 🎯 (${provider.displayName})

**Your Query**: "${query}"
**Response Mode**: Balanced (quality + efficiency)
**Provider Selection**: ${provider.reasoning}

**Understanding Your Request**:
I've analyzed your query and identified it as requiring a balanced approach that combines accuracy, depth, and practical utility.

**Response Framework**:

**🎯 Direct Answer**:
${this.generateContextualAnswer(query, provider)}

**🔍 Context & Background**:
${provider.displayName} was selected because ${provider.reasoning.toLowerCase()}. This ensures you get:
- **Accuracy**: Reliable information and analysis
- **Relevance**: Tailored to your specific needs
- **Practicality**: Actionable insights and suggestions

**💡 Additional Insights**:
- **Provider Strengths**: ${this.getProviderStrengths(provider)}
- **Model Capabilities**: ${provider.model} specializes in balanced, comprehensive responses
- **Quality Indicators**: High confidence in accuracy and relevance

**🚀 Next Steps**:
Based on your query, you might want to:
1. **Explore Further**: Ask for more specific details on any aspect
2. **Practical Application**: Request implementation guidance or examples
3. **Alternative Approaches**: Consider different perspectives or methods
4. **Deep Dive**: Switch to reasoning mode for comprehensive analysis

**How can I help you take this further?**`;
    }
    
    // Helper functions for better response quality
    detectLanguage(query) {
        const languagePatterns = {
            'javascript': /javascript|js|node|npm|react|vue|angular/i,
            'python': /python|py|django|flask|pandas|numpy/i,
            'java': /java|spring|hibernate|maven/i,
            'csharp': /c#|csharp|\.net|dotnet/i,
            'php': /php|laravel|symfony/i,
            'go': /golang|go\s/i,
            'rust': /rust|cargo/i,
            'sql': /sql|database|mysql|postgres/i
        };
        
        for (const [lang, pattern] of Object.entries(languagePatterns)) {
            if (pattern.test(query)) return lang;
        }
        return 'javascript';
    }
    
    generateDirectAnswer(query) {
        // Simplified direct answer logic
        if (query.toLowerCase().includes('what is')) {
            return 'Based on your question, here\'s a direct answer with key information...';
        } else if (query.toLowerCase().includes('how to')) {
            return 'Here\'s a step-by-step approach to accomplish what you\'re asking...';
        } else {
            return 'Here\'s the most relevant information for your query...';
        }
    }
    
    generateContextualAnswer(query, provider) {
        const queryType = this.determineTaskType(query);
        const complexity = this.assessQueryComplexity(query);
        
        return `For your ${queryType} query with ${complexity} complexity, ${provider.displayName} provides: 
        
A comprehensive response that balances depth with clarity. The ${provider.model} model excels at understanding context and providing nuanced, accurate answers that directly address your specific needs.`;
    }
    
    getProviderStrengths(provider) {
        const strengths = {
            'ollama': 'Local processing, privacy-focused, cost-effective, customizable models',
            'groq': 'Ultra-fast inference, low latency, efficient processing, rapid iteration',
            'openai': 'Advanced reasoning, broad knowledge, sophisticated language understanding',
            'gemini': 'Multimodal capabilities, creative tasks, visual understanding, code generation',
            'claude': 'Ethical reasoning, nuanced responses, safety-focused, detailed analysis'
        };
        
        return strengths[provider.name] || 'Balanced performance across multiple capabilities';
    }
    
    // ENHANCED: Real Ollama connectivity testing
    async checkAvailableProviders() {
        const providers = [];
        
        try {
            console.log('🔍 Testing real Ollama connectivity...');
            
            // Test multiple endpoints to ensure Ollama is really available
            const ollamaTests = [
                fetch('http://localhost:11434/api/version', { 
                    timeout: 3000,
                    signal: AbortSignal.timeout(3000)
                }),
                fetch('http://localhost:11434/api/tags', { 
                    timeout: 3000,
                    signal: AbortSignal.timeout(3000)
                })
            ];
            
            const ollamaResults = await Promise.allSettled(ollamaTests);
            
            // Check if ANY Ollama endpoint responds successfully
            let ollamaAvailable = false;
            let models = [];
            
            for (const result of ollamaResults) {
                if (result.status === 'fulfilled' && result.value.ok) {
                    ollamaAvailable = true;
                    
                    // Try to get models list
                    if (result.value.url.includes('/tags')) {
                        try {
                            const data = await result.value.json();
                            models = data.models ? data.models.map(m => m.name) : ['mistral:7b'];
                        } catch (e) {
                            models = ['mistral:7b']; // fallback
                        }
                    }
                    break;
                }
            }
            
            if (ollamaAvailable) {
                providers.push({
                    name: 'ollama',
                    status: 'available',
                    models: models.length > 0 ? models : ['mistral:7b', 'qwen2.5:7b'],
                    lastChecked: new Date().toISOString(),
                    endpoint: 'http://localhost:11434'
                });
                console.log('✅ Ollama is REALLY available with models:', models);
            } else {
                console.log('❌ Ollama is NOT available - all endpoints failed');
            }
            
        } catch (error) {
            console.log('❌ Ollama connectivity test failed:', error.message);
        }
        
        return providers;
    }

    formatResponse(content) {
        // Basic formatting for better display
        return content
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>')
            .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="code-block"><code class="language-$1">$2</code></pre>')
            .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/\*([^*]+)\*/g, '<em>$1</em>')
            .replace(/^(.+)$/, '<p>$1</p>');
    }
    
    trackProviderUsage(providerName, selectedProvider, responseTime) {
        // Find the provider in our data
        let provider = this.systemData.providers.find(p => 
            p.name === providerName || 
            p.name.includes(providerName.split(' ')[0]) ||
            providerName.includes(p.name.split(' ')[0])
        );
        
        // If not found, try to map common provider names
        if (!provider) {
            const providerMap = {
                'IRIS Auto-Select': 'ollama',
                'Ollama': 'ollama',
                'Groq': 'groq', 
                'Gemini': 'gemini',
                'Google': 'gemini',
                'OpenAI': 'openai',
                'GPT': 'openai'
            };
            
            for (const [key, id] of Object.entries(providerMap)) {
                if (providerName.includes(key)) {
                    provider = this.systemData.providers.find(p => p.id === id);
                    break;
                }
            }
        }
        
        // Default to Ollama if auto-selected or not found
        if (!provider) {
            provider = this.systemData.providers.find(p => p.id === 'ollama');
        }
        
        if (provider) {
            // Update request count
            provider.requests += 1;
            this.systemData.usageStats.totalQueries += 1;
            
            // Update response time (running average)
            const weight = 0.1; // 10% weight for new data
            provider.responseTime = provider.responseTime * (1 - weight) + responseTime * weight;
            
            // Update success rate (assume success for now)
            provider.successRate = Math.min(100, provider.successRate + 0.1);
            
            // Update task type (simplified - based on query analysis)
            const taskType = this.determineTaskType(document.getElementById('queryInput')?.value || '');
            if (provider.taskTypes[taskType] !== undefined) {
                provider.taskTypes[taskType] += 1;
            }
            
            // Update last used timestamp
            provider.lastUsed = Date.now();
            
            // Immediately update the provider usage chart
            this.updateProviderUsageChart();
            
            // Update system metrics
            this.updateSystemMetrics();
            
            // Add to activity log
            this.addActivity(`Provider ${provider.name} usage tracked (+1 request)`, 'info');
        }
    }

    selectOptimalProvider() {
        const healthyProviders = this.systemData.providers
            .filter(p => p.status === 'healthy')
            .sort((a, b) => b.health - a.health);
        
        return healthyProviders.length > 0 ? healthyProviders[0].name : 'Fallback Provider';
    }

    // Demo control methods
    async runHealthCheck() {
        this.showNotification('Running comprehensive health check...', 'info');
        this.addActivity('Health check initiated', 'info');
        
        // Clear previous results and show loading
        this.showDemoResult({
            title: '🩺 Health Check in Progress...',
            content: 'Running comprehensive system diagnostics...',
            type: 'info',
            loading: true
        });

        // Simulate health check steps
        await this.simulateDelay(1000);
        this.addActivity('Checking provider health...', 'info');
        
        await this.simulateDelay(1000);
        this.addActivity('Validating system performance...', 'info');
        
        await this.simulateDelay(1000);
        this.addActivity('Testing failover capabilities...', 'info');

        // Calculate health metrics
        const providerHealth = this.systemData.providers.map(p => ({
            name: p.name,
            health: p.health,
            status: p.status,
            responseTime: p.responseTime
        }));

        const systemHealth = Math.round(this.systemData.health);
        const avgResponseTime = Math.round(
            this.systemData.providers.reduce((sum, p) => sum + p.responseTime, 0) / this.systemData.providers.length
        );

        // Show detailed results
        this.showDemoResult({
            title: '✅ Health Check Complete',
            content: 'Comprehensive system health check completed successfully. All critical systems are operational.',
            type: 'success',
            metrics: {
                'System Health': `${systemHealth}%`,
                'Avg Response': `${avgResponseTime}ms`,
                'Providers Online': `${this.systemData.providers.filter(p => p.status === 'healthy').length}/${this.systemData.providers.length}`,
                'Status': 'All Systems Nominal'
            },
            details: providerHealth.map(p => `${p.name}: ${p.health}% (${p.status})`).join('\n')
        });
        
        this.addActivity('Health check completed - All systems nominal', 'success');
        this.showNotification('Health check completed successfully', 'success');
    }

    async simulateFailover() {
        this.showNotification('Simulating provider failover...', 'info');
        this.addActivity('Failover simulation initiated', 'info');
        
        // Show initial demo result
        this.showDemoResult({
            title: '🔄 Failover Simulation in Progress...',
            content: 'Simulating primary provider failure and automatic failover...',
            type: 'info',
            loading: true
        });

        // Simulate primary provider failure
        const primaryProvider = this.systemData.providers.find(p => p.status === 'healthy');
        const backupProvider = this.systemData.providers.find(p => p.status === 'healthy' && p.id !== primaryProvider?.id);
        
        await this.simulateDelay(800);
        this.addActivity(`Simulating ${primaryProvider?.name} failure...`, 'warning');
        
        await this.simulateDelay(700);
        this.addActivity('Detecting provider failure...', 'info');
        
        await this.simulateDelay(500);
        this.addActivity(`Initiating failover to ${backupProvider?.name}...`, 'info');
        
        await this.simulateDelay(800);
        this.addActivity('Failover completed - Zero downtime achieved', 'success');

        // Show detailed results
        this.showDemoResult({
            title: '✅ Smart Failover Complete',
            content: 'Automatic failover simulation completed successfully. System maintained 100% uptime during provider transition.',
            type: 'success',
            metrics: {
                'Primary Provider': primaryProvider?.name || 'Groq Lightning',
                'Backup Provider': backupProvider?.name || 'Google Gemini', 
                'Failover Time': '1.2s',
                'Downtime': '0ms',
                'Success Rate': '100%'
            },
            details: `Failover sequence:\n1. ${primaryProvider?.name} failure detected\n2. Circuit breaker activated\n3. Traffic routed to ${backupProvider?.name}\n4. Zero service interruption`
        });
        
        this.showNotification('Failover simulation completed successfully', 'success');
    }

    async testSecurity() {
        this.showNotification('Running security threat detection test...', 'info');
        this.addActivity('Security test initiated', 'info');
        
        // Show security test in progress
        this.showDemoResult({
            title: '🛡️ Security Test in Progress...',
            content: 'Testing advanced threat detection and blocking capabilities...',
            type: 'info',
            loading: true
        });

        await this.simulateDelay(800);
        this.addActivity('Analyzing threat patterns...', 'info');
        
        await this.simulateDelay(700);
        this.addActivity('Simulated malicious query detected', 'warning');
        
        await this.simulateDelay(600);
        this.addActivity('Threat classification: High risk injection attempt', 'warning');
        
        await this.simulateDelay(500);
        this.addActivity('Security protocols activated - Threat blocked', 'success');
        
        await this.simulateDelay(400);
        this.addActivity('Testing legitimate query processing...', 'info');
        
        await this.simulateDelay(600);
        this.addActivity('All security tests passed - System secure', 'success');

        // Show detailed security results
        this.showDemoResult({
            title: '✅ Security Test Complete',
            content: 'Advanced security threat detection test completed. All malicious queries blocked while maintaining normal operation for legitimate requests.',
            type: 'success',
            metrics: {
                'Threats Detected': '3/3',
                'Threats Blocked': '100%',
                'False Positives': '0',
                'Detection Time': '<50ms',
                'System Status': 'Secure'
            },
            details: `Security test results:\n• SQL injection attempt - BLOCKED\n• Prompt injection attack - BLOCKED\n• Jailbreak attempt - BLOCKED\n• Legitimate queries - ALLOWED\n• Zero false positives`
        });

        this.showNotification('Security test completed - All threats blocked', 'success');
    }

    async showNeuralLearning() {
        this.showNotification('Demonstrating neural learning adaptation...', 'info');
        this.addActivity('Neural learning demonstration started', 'info');
        
        // Show neural learning in progress
        this.showDemoResult({
            title: '🧠 Neural Learning in Progress...',
            content: 'Demonstrating adaptive intelligence and learning capabilities...',
            type: 'info',
            loading: true
        });

        await this.simulateDelay(1000);
        this.addActivity('Analyzing query patterns from last 24 hours...', 'info');
        
        await this.simulateDelay(800);
        this.addActivity('Learning from provider response times...', 'info');
        
        await this.simulateDelay(700);
        this.addActivity('Updating neural weights for optimal routing...', 'info');
        
        await this.simulateDelay(900);
        this.addActivity('Provider performance analysis updated', 'info');
        
        await this.simulateDelay(600);
        this.addActivity('Neural recommendations optimized', 'success');
        
        await this.simulateDelay(500);
        this.addActivity('Learning cycle completed - System intelligence improved', 'success');

        // Calculate learning metrics
        const learningMetrics = {
            'Patterns Analyzed': '2,847',
            'Learning Rate': '94.3%',
            'Optimization Gain': '+12%',
            'Prediction Accuracy': '96.7%',
            'Model Confidence': 'High'
        };

        // Show detailed neural learning results
        this.showDemoResult({
            title: '✅ Neural Learning Complete',
            content: 'Neural learning demonstration completed successfully. System intelligence has been enhanced with improved provider selection and query routing.',
            type: 'success',
            metrics: learningMetrics,
            details: `Learning improvements:\n• Provider selection accuracy improved by 12%\n• Response time prediction enhanced\n• User preference patterns identified\n• Query classification optimized\n• Failover prediction improved`
        });

        this.showNotification('Neural learning demonstration completed', 'success');
    }

    simulateDelay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    addActivity(message, type = 'info') {
        const activity = {
            message,
            type,
            timestamp: new Date()
        };

        this.activityLog.unshift(activity);
        if (this.activityLog.length > 50) {
            this.activityLog.pop();
        }

        this.renderActivityLog();
    }

    renderActivityLog() {
        const logContainer = document.getElementById('activityLog');
        if (!logContainer) return;

        logContainer.innerHTML = '';

        this.activityLog.slice(0, 10).forEach(activity => {
            const entry = document.createElement('div');
            entry.className = 'activity-entry';
            entry.innerHTML = `
                <div class="activity-icon ${activity.type}">
                    <i class="fas fa-${this.getActivityIcon(activity.type)}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-message">${activity.message}</div>
                    <div class="activity-time">${activity.timestamp.toLocaleTimeString()}</div>
                </div>
            `;
            logContainer.appendChild(entry);
        });
    }

    getActivityIcon(type) {
        const icons = {
            success: 'check-circle',
            info: 'info-circle',
            warning: 'exclamation-triangle',
            error: 'times-circle'
        };
        return icons[type] || 'info-circle';
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notifications');
        if (!container) return;

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; cursor: pointer; padding: 0.25rem;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        container.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    showDemoResult(result) {
        const container = document.getElementById('demoResults');
        if (!container) return;

        // Clear previous results
        container.innerHTML = '';

        // Create result element
        const resultElement = document.createElement('div');
        resultElement.className = `demo-result ${result.type}`;
        
        let metricsHTML = '';
        if (result.metrics) {
            metricsHTML = `
                <div class="demo-result-metrics">
                    ${Object.entries(result.metrics).map(([label, value]) => `
                        <div class="demo-metric">
                            <div class="demo-metric-label">${label}</div>
                            <div class="demo-metric-value">${value}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        let detailsHTML = '';
        if (result.details) {
            detailsHTML = `
                <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color);">
                    <div style="font-weight: 600; margin-bottom: 0.5rem;">Details:</div>
                    <div style="white-space: pre-line; font-size: 0.875rem; color: var(--text-secondary);">${result.details}</div>
                </div>
            `;
        }

        const loadingHTML = result.loading ? '<i class="fas fa-spinner fa-spin" style="margin-right: 0.5rem;"></i>' : '';

        resultElement.innerHTML = `
            <div class="demo-result-header">
                ${loadingHTML}<i class="fas fa-flask"></i>
                <span>${result.title}</span>
            </div>
            <div class="demo-result-content">
                ${result.content}
            </div>
            ${metricsHTML}
            ${detailsHTML}
        `;

        container.appendChild(resultElement);
    }

    // Performance Utility Functions - moved inside class
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Optimized chart update method
    updateChartsOptimized() {
        const now = Date.now();
        if (now - this.lastUpdateTime < 200) return; // Prevent rapid-fire updates
        
        this.lastUpdateTime = now;
        
        try {
            // Batch chart updates
            if (this.pendingUpdates.has('providerUsage')) {
                this.updateProviderUsageChart();
                this.pendingUpdates.delete('providerUsage');
            }
            
            if (this.pendingUpdates.has('responseTime')) {
                this.updateResponseTimeChart();
                this.pendingUpdates.delete('responseTime');
            }
        } catch (error) {
            console.error('Chart update error:', error);
            this.handleChartError(error);
        }
    }

    // Enhanced Error Boundary System  
    setupGlobalErrorHandling() {
        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.handleError(new Error(`Unhandled promise: ${event.reason}`), 'promise');
            event.preventDefault();
        });

        // Handle general JavaScript errors
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            this.handleError(event.error, 'javascript');
        });
    }

    // Comprehensive error handling
    handleError(error, context = 'general') {
        const errorInfo = {
            message: error.message,
            stack: error.stack,
            context: context,
            timestamp: Date.now(),
            userAgent: navigator.userAgent
        };
        
        console.error('IRIS Error:', errorInfo);
        
        // Categorize error severity
        const severity = this.categorizeError(error, context);
        
        if (severity === 'critical') {
            this.handleCriticalError(error, context);
        } else if (severity === 'moderate') {
            this.handleModerateError(error, context);
        } else {
            this.handleMinorError(error, context);
        }
        
        // Store error for analytics
        this.storeError(errorInfo);
    }

    categorizeError(error, context) {
        if (context === 'initialization' || error.message.includes('Cannot read property')) {
            return 'critical';
        } else if (context === 'api' || context === 'chart') {
            return 'moderate';
        }
        return 'minor';
    }

    handleCriticalError(error, context) {
        this.showNotification(`Critical system error detected. Attempting recovery...`, 'error');
        this.addActivity(`Critical error in ${context}: ${error.message}`, 'error');
        
        // Attempt system recovery
        setTimeout(() => {
            this.attemptSystemRecovery();
        }, 1000);
    }

    handleModerateError(error, context) {
        this.showNotification(`System issue detected. Continuing with limited functionality.`, 'warning');
        this.addActivity(`Moderate error in ${context}: ${error.message}`, 'warning');
    }

    handleMinorError(error, context) {
        this.addActivity(`Minor issue in ${context}: ${error.message}`, 'info');
    }

    // Recovery mechanisms
    attemptChartRecovery() {
        try {
            console.log('🔄 Attempting chart recovery...');
            this.initializeCharts();
            this.showNotification('Charts recovered successfully', 'success');
        } catch (error) {
            console.error('Chart recovery failed:', error);
            this.showNotification('Chart recovery failed. Manual refresh may be needed.', 'warning');
        }
    }

    attemptSystemRecovery() {
        try {
            console.log('🔄 Attempting system recovery...');
            
            // Clear intervals
            if (this.updateInterval) {
                clearInterval(this.updateInterval);
            }
            
            // Reinitialize core systems
            this.init();
            this.showNotification('System recovered successfully', 'success');
        } catch (error) {
            console.error('System recovery failed:', error);
            this.showNotification('System recovery failed. Please refresh the page.', 'error');
        }
    }

    // Error storage for analytics
    storeError(errorInfo) {
        const errorLog = JSON.parse(localStorage.getItem('iris_error_log') || '[]');
        errorLog.push(errorInfo);
        
        // Keep only last 50 errors
        if (errorLog.length > 50) {
            errorLog.splice(0, errorLog.length - 50);
        }
        
        localStorage.setItem('iris_error_log', JSON.stringify(errorLog));
    }

    // Lightweight update method
    performLightweightUpdate() {
        // Only update if significant changes occurred
        const significantChange = this.hasSignificantChanges();
        if (!significantChange) return;
        
        this.updateSystemHealth();
        this.scheduleChartUpdate('providerUsage');
        this.scheduleChartUpdate('responseTime');
    }

    // Schedule chart updates for batching
    scheduleChartUpdate(chartType) {
        this.pendingUpdates.add(chartType);
        this.debouncedChartUpdate();
    }

    // Check if updates are worth processing
    hasSignificantChanges() {
        const currentHash = this.calculateDataHash();
        const lastHash = this.updateCache.get('lastDataHash');
        
        if (currentHash !== lastHash) {
            this.updateCache.set('lastDataHash', currentHash);
            return true;
        }
        return false;
    }

    // Simple data hash for change detection
    calculateDataHash() {
        const key = JSON.stringify({
            health: Math.round(this.systemData.health),
            responseTime: Math.round(this.systemData.responseTime),
            providerRequests: this.systemData.providers.map(p => p.requests)
        });
        return key;
    }

    // Loading State Management
    showLoadingState(elementId, type = 'default') {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        element.classList.add('loading-state');
        
        if (type === 'skeleton') {
            this.showSkeletonScreen(element);
        } else if (type === 'pulse') {
            element.classList.add('pulse');
        }
    }

    hideLoadingState(elementId) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        element.classList.remove('loading-state', 'pulse');
        element.classList.add('fade-in');
        
        // Remove skeleton content
        const skeletons = element.querySelectorAll('.skeleton');
        skeletons.forEach(skeleton => skeleton.remove());
        
        // Remove fade-in class after animation
        setTimeout(() => {
            element.classList.remove('fade-in');
        }, 300);
    }

    showSkeletonScreen(element) {
        const originalContent = element.innerHTML;
        element.setAttribute('data-original-content', originalContent);
        
        // Create skeleton based on element type
        if (element.classList.contains('chart-container')) {
            element.innerHTML = `
                <div class="skeleton skeleton-text large" style="width: 40%; margin-bottom: 1rem;"></div>
                <div class="skeleton skeleton-chart"></div>
            `;
        } else if (element.classList.contains('provider-card')) {
            element.innerHTML = `
                <div class="skeleton skeleton-text" style="width: 60%;"></div>
                <div class="skeleton skeleton-text small"></div>
                <div class="skeleton skeleton-text small"></div>
            `;
        } else {
            // Generic skeleton
            element.innerHTML = `
                <div class="skeleton skeleton-text"></div>
                <div class="skeleton skeleton-text" style="width: 80%;"></div>
                <div class="skeleton skeleton-text small"></div>
            `;
        }
    }

    // Enhanced initialization with loading states
    async initWithLoadingStates() {
        // Show loading for charts
        this.showLoadingState('responseTimeChart', 'skeleton');
        this.showLoadingState('providerUsageChart', 'skeleton');
        
        // Show loading for provider cards
        const providerGrid = document.querySelector('.providers-grid');
        if (providerGrid) {
            this.showLoadingState('providers-grid', 'pulse');
        }
        
        // Simulate realistic loading time
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Initialize components
        await this.init();
        
        // Hide loading states
        this.hideLoadingState('responseTimeChart');
        this.hideLoadingState('providerUsageChart');
        this.hideLoadingState('providers-grid');
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Starting IRIS Dashboard...');
    window.irisDashboard = new IRISDashboard();
    
    // Add response styling
    const style = document.createElement('style');
    style.textContent = `
        .response-success {
            color: var(--text-primary);
        }
        
        .response-provider {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-bottom: 1rem;
            padding-bottom: 0.5rem;
            border-bottom: 1px solid var(--border-color);
            color: var(--primary-color);
        }
        
        .response-text {
            line-height: 1.6;
        }
        
        .response-error {
            color: var(--danger-color);
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .chart-container {
            height: 350px;
        }
        
        .chart-container canvas {
            max-height: 300px !important;
            height: 300px !important;
        }
        
        .ai-mode-badge {
            margin-left: 1rem;
            padding: 0.25rem 0.5rem;
            background: var(--bg-secondary);
            border-radius: 12px;
            font-size: 0.75rem;
            font-weight: 500;
            border: 1px solid var(--border-color);
        }
        
        .code-block {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 1rem;
            margin: 0.5rem 0;
            overflow-x: auto;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 0.875rem;
            line-height: 1.4;
        }
        
        .inline-code {
            background: var(--bg-secondary);
            padding: 0.2rem 0.4rem;
            border-radius: 4px;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 0.875rem;
        }
        
        .response-text p {
            margin: 0.5rem 0;
            line-height: 1.6;
        }
        
        .response-text p:first-child {
            margin-top: 0;
        }
        
        .response-text p:last-child {
            margin-bottom: 0;
        }
        
        .provider-title {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
        }
        
        .provider-priority {
            font-size: 0.75rem;
            color: var(--text-secondary);
            font-weight: normal;
        }
        
        .provider-details {
            margin-top: 1rem;
            padding-top: 1rem;
            border-top: 1px solid var(--border-color);
        }
        
        .provider-detail {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.25rem 0;
            font-size: 0.875rem;
        }
        
        .detail-label {
            color: var(--text-secondary);
            font-weight: 500;
        }
        
        .detail-value {
            color: var(--text-primary);
            font-weight: 600;
        }
    `;
    document.head.appendChild(style);
});