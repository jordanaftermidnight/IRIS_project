// IRIS AI Orchestration System - Dashboard JavaScript

class IRISDashboard {
    constructor() {
        this.systemData = {
            health: 98,
            responseTime: 156,
            activeProviders: 3,
            totalProviders: 4,
            securityStatus: 'Protected',
            providers: [
                {
                    id: 'gemini',
                    name: 'Google Gemini',
                    status: 'healthy',
                    health: 97,
                    responseTime: 145,
                    requests: 1247,
                    errors: 3
                },
                {
                    id: 'groq',
                    name: 'Groq Lightning',
                    status: 'healthy',
                    health: 99,
                    responseTime: 89,
                    requests: 2341,
                    errors: 1
                },
                {
                    id: 'ollama',
                    name: 'Ollama Local',
                    status: 'warning',
                    health: 78,
                    responseTime: 234,
                    requests: 456,
                    errors: 12
                },
                {
                    id: 'huggingface',
                    name: 'HuggingFace',
                    status: 'critical',
                    health: 45,
                    responseTime: 890,
                    requests: 123,
                    errors: 45
                }
            ]
        };

        this.activityLog = [];
        this.responseTimeHistory = [];
        this.charts = {};
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateSystemMetrics();
        this.renderProviders();
        this.setupCharts();
        this.startRealTimeUpdates();
        this.addActivity('System initialized successfully', 'success');
        
        // Show initial system status
        this.updateSystemStatus('operational', 'System Operational');
    }

    setupEventListeners() {
        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Query submission
        document.getElementById('submitQuery').addEventListener('click', () => {
            this.submitQuery();
        });

        // Enter key for query submission
        document.getElementById('queryInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                this.submitQuery();
            }
        });

        // Demo controls
        document.getElementById('runHealthCheck').addEventListener('click', () => {
            this.runHealthCheck();
        });

        document.getElementById('simulateFailover').addEventListener('click', () => {
            this.simulateFailover();
        });

        document.getElementById('testSecurity').addEventListener('click', () => {
            this.testSecurity();
        });

        document.getElementById('showNeuralLearning').addEventListener('click', () => {
            this.showNeuralLearning();
        });
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        
        const icon = document.querySelector('#themeToggle i');
        icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        
        this.addActivity(`Theme switched to ${newTheme} mode`, 'info');
    }

    updateSystemMetrics() {
        document.getElementById('systemHealth').textContent = `${this.systemData.health}%`;
        document.getElementById('avgResponseTime').textContent = `${this.systemData.responseTime}ms`;
        document.getElementById('activeProviders').textContent = 
            `${this.systemData.activeProviders}/${this.systemData.totalProviders}`;
        document.getElementById('securityStatus').textContent = this.systemData.securityStatus;
    }

    updateSystemStatus(status, message) {
        const indicator = document.getElementById('statusIndicator');
        const statusText = document.getElementById('statusText');
        
        indicator.className = `status-indicator ${status === 'operational' ? '' : status}`;
        statusText.textContent = message;
    }

    renderProviders() {
        const grid = document.getElementById('providersGrid');
        grid.innerHTML = '';

        this.systemData.providers.forEach(provider => {
            const card = document.createElement('div');
            card.className = 'provider-card';
            card.innerHTML = `
                <div class="provider-header">
                    <span class="provider-name">${provider.name}</span>
                    <span class="provider-status ${provider.status}">${provider.status.toUpperCase()}</span>
                </div>
                <div class="provider-metrics">
                    <div class="provider-metric">
                        <div class="provider-metric-label">Health</div>
                        <div class="provider-metric-value">${provider.health}%</div>
                    </div>
                    <div class="provider-metric">
                        <div class="provider-metric-label">Response Time</div>
                        <div class="provider-metric-value">${provider.responseTime}ms</div>
                    </div>
                    <div class="provider-metric">
                        <div class="provider-metric-label">Requests</div>
                        <div class="provider-metric-value">${provider.requests.toLocaleString()}</div>
                    </div>
                    <div class="provider-metric">
                        <div class="provider-metric-label">Errors</div>
                        <div class="provider-metric-value">${provider.errors}</div>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
    }

    setupCharts() {
        // Response Time Chart
        const responseCtx = document.getElementById('responseTimeChart').getContext('2d');
        this.charts.responseTime = new Chart(responseCtx, {
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
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Response Time (ms)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });

        // Provider Usage Chart
        const usageCtx = document.getElementById('providerUsageChart').getContext('2d');
        this.charts.providerUsage = new Chart(usageCtx, {
            type: 'doughnut',
            data: {
                labels: this.systemData.providers.map(p => p.name),
                datasets: [{
                    data: this.systemData.providers.map(p => p.requests),
                    backgroundColor: [
                        '#3b82f6',
                        '#10b981',
                        '#f59e0b',
                        '#ef4444'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
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
            data.push(Math.floor(Math.random() * 100) + 120);
        }
        return data;
    }

    startRealTimeUpdates() {
        setInterval(() => {
            this.updateRealTimeMetrics();
        }, 5000);
    }

    updateRealTimeMetrics() {
        // Simulate small changes in metrics
        this.systemData.health += (Math.random() - 0.5) * 2;
        this.systemData.health = Math.max(85, Math.min(100, this.systemData.health));
        
        this.systemData.responseTime += (Math.random() - 0.5) * 20;
        this.systemData.responseTime = Math.max(100, Math.min(300, this.systemData.responseTime));

        this.updateSystemMetrics();
        
        // Update charts
        if (this.charts.responseTime) {
            const newTime = new Date().toLocaleTimeString('en-US', { 
                hour12: false, 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            const newValue = Math.floor(this.systemData.responseTime);
            
            this.charts.responseTime.data.labels.push(newTime);
            this.charts.responseTime.data.datasets[0].data.push(newValue);
            
            if (this.charts.responseTime.data.labels.length > 30) {
                this.charts.responseTime.data.labels.shift();
                this.charts.responseTime.data.datasets[0].data.shift();
            }
            
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

        const query = queryInput.value.trim();
        if (!query) {
            this.showNotification('Please enter a query', 'warning');
            return;
        }

        // Show loading state
        submitBtn.disabled = true;
        loadingOverlay.classList.add('active');
        
        const startTime = Date.now();
        const selectedProvider = providerSelect.value;

        try {
            // Simulate API call
            const response = await this.simulateQuery(query, selectedProvider);
            const responseTime = Date.now() - startTime;
            
            // Update UI
            responseContent.innerHTML = `
                <div class="response-success">
                    <div class="response-provider">
                        <i class="fas fa-robot"></i> 
                        <strong>Response from ${response.provider}</strong>
                    </div>
                    <div class="response-text">${response.content}</div>
                </div>
            `;

            responseMetrics.innerHTML = `
                <span><i class="fas fa-clock"></i> ${responseTime}ms</span>
                <span><i class="fas fa-server"></i> ${response.provider}</span>
                <span><i class="fas fa-check-circle"></i> Success</span>
            `;

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

            responseMetrics.innerHTML = `
                <span><i class="fas fa-clock"></i> ${responseTime}ms</span>
                <span><i class="fas fa-exclamation-circle"></i> Error</span>
            `;

            this.addActivity(`Query failed: ${error.message}`, 'warning');
            this.showNotification('Query failed', 'error');

        } finally {
            submitBtn.disabled = false;
            loadingOverlay.classList.remove('active');
        }
    }

    async simulateQuery(query, provider) {
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 500));
        
        // Simulate occasional failures
        if (Math.random() < 0.05) {
            throw new Error('Provider temporarily unavailable');
        }

        // Select provider based on user choice or auto-select
        let selectedProvider = provider === 'auto' ? 
            this.selectOptimalProvider() : 
            this.systemData.providers.find(p => p.id === provider)?.name || 'Auto-Selected';

        // Generate simulated response
        const responses = [
            "This is a simulated response from the IRIS AI Orchestration System. The system has successfully processed your query and selected the optimal provider based on current health metrics and response times.",
            "IRIS has analyzed your request and determined the best approach. The neural learning system has optimized the provider selection for maximum efficiency and reliability.",
            "Your query has been processed through the IRIS multi-provider system. The smart failover and security detection systems ensure optimal performance and safety.",
            "The IRIS system demonstrates intelligent provider routing, real-time health monitoring, and seamless failover capabilities in this simulated response."
        ];

        return {
            provider: selectedProvider,
            content: responses[Math.floor(Math.random() * responses.length)]
        };
    }

    selectOptimalProvider() {
        const healthyProviders = this.systemData.providers
            .filter(p => p.status === 'healthy')
            .sort((a, b) => b.health - a.health);
        
        return healthyProviders.length > 0 ? healthyProviders[0].name : 'Fallback Provider';
    }

    async runHealthCheck() {
        this.showNotification('Running comprehensive health check...', 'info');
        this.addActivity('Health check initiated', 'info');

        // Simulate health check process
        await this.simulateDelay(2000);

        // Update provider statuses
        this.systemData.providers.forEach(provider => {
            provider.health = Math.max(70, Math.min(100, provider.health + (Math.random() - 0.3) * 10));
            if (provider.health >= 90) provider.status = 'healthy';
            else if (provider.health >= 70) provider.status = 'warning';
            else provider.status = 'critical';
        });

        this.renderProviders();
        this.addActivity('Health check completed - All systems nominal', 'success');
        this.showNotification('Health check completed successfully', 'success');
    }

    async simulateFailover() {
        this.showNotification('Simulating provider failover...', 'info');
        this.addActivity('Failover simulation initiated', 'info');

        // Simulate primary provider going down
        const primaryProvider = this.systemData.providers[0];
        const originalStatus = primaryProvider.status;
        primaryProvider.status = 'critical';
        primaryProvider.health = 0;

        this.renderProviders();
        this.addActivity(`Provider ${primaryProvider.name} simulated failure`, 'warning');
        
        await this.simulateDelay(1500);

        // Simulate failover to backup
        const backupProvider = this.systemData.providers[1];
        this.addActivity(`Failover to ${backupProvider.name} completed`, 'success');
        
        await this.simulateDelay(2000);

        // Restore original state
        primaryProvider.status = originalStatus;
        primaryProvider.health = 97;
        this.renderProviders();
        
        this.addActivity('Failover simulation completed - System recovered', 'success');
        this.showNotification('Failover simulation completed successfully', 'success');
    }

    async testSecurity() {
        this.showNotification('Running security threat detection test...', 'info');
        this.addActivity('Security test initiated', 'info');

        await this.simulateDelay(1500);

        // Simulate threat detection
        this.addActivity('Simulated threat detected and blocked', 'warning');
        await this.simulateDelay(1000);
        
        this.addActivity('Security protocols activated', 'success');
        await this.simulateDelay(1000);
        
        this.addActivity('All security tests passed - System secure', 'success');
        this.showNotification('Security test completed - All threats blocked', 'success');
    }

    async showNeuralLearning() {
        this.showNotification('Demonstrating neural learning adaptation...', 'info');
        this.addActivity('Neural learning demonstration started', 'info');

        await this.simulateDelay(1000);
        this.addActivity('Learning from query patterns...', 'info');
        
        await this.simulateDelay(1500);
        this.addActivity('Provider performance analysis updated', 'info');
        
        await this.simulateDelay(1000);
        this.addActivity('Neural recommendations optimized', 'success');
        
        await this.simulateDelay(500);
        this.addActivity('Learning cycle completed - System intelligence improved', 'success');
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
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.irisDashboard = new IRISDashboard();
    
    // Add some CSS for response content
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
    `;
    document.head.appendChild(style);
});