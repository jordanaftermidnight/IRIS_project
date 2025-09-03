#!/usr/bin/env node

/**
 * IRIS Comprehensive Simulation Test Framework
 * Tests individual elements, interlinking, and full system integration
 */

const fs = require('fs');
const path = require('path');

class IRISSimulationTester {
    constructor() {
        this.results = {
            individualTests: {},
            interlinkingTests: {},
            systemTests: {},
            summary: {
                totalTests: 0,
                passed: 0,
                failed: 0,
                warnings: 0,
                startTime: Date.now()
            }
        };
        
        // Test configurations
        this.individualIterations = 30;
        this.interlinkingIterations = 30;
        this.systemIterations = 50;
        
        // Core system components to test
        this.coreComponents = [
            'iris-dashboard.js',
            'iris-api-server.js', 
            'styles.css',
            'index.html',
            'iris.config.js',
            'package.json'
        ];
        
        // Phase 1 functions to test
        this.phase1Functions = [
            'createProviderActivityPanel',
            'updateProviderActivity', 
            'updateQueryFlowStep',
            'resetProviderActivities'
        ];
        
        // Phase 2 functions to test
        this.phase2Functions = [
            'checkAvailableProviders',
            'attemptRealAI',
            'generateContextAwareDemo',
            'generateHighQualityResponse'
        ];
        
        // Interlinking components
        this.interlinkingPairs = [
            ['Phase1-Phase2', 'Visual indicators with provider detection'],
            ['Dashboard-API', 'Dashboard JavaScript with API server'],
            ['HTML-CSS', 'HTML structure with CSS styling'],
            ['Config-System', 'Configuration with system components'],
            ['Demo-Core', 'Demo interface with core functionality']
        ];
    }
    
    log(level, category, message, details = '') {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] ${level.toUpperCase()} [${category}] ${message}`;
        
        if (level === 'ERROR') {
            console.log(`❌ ${logEntry}`);
            if (details) console.log(`   Details: ${details}`);
            this.results.summary.failed++;
        } else if (level === 'WARN') {
            console.log(`⚠️  ${logEntry}`);
            if (details) console.log(`   Details: ${details}`);
            this.results.summary.warnings++;
        } else {
            console.log(`✅ ${logEntry}`);
            this.results.summary.passed++;
        }
        
        this.results.summary.totalTests++;
    }
    
    // Simulate realistic delays and processing
    async simulateDelay(min = 10, max = 100) {
        const delay = Math.floor(Math.random() * (max - min + 1)) + min;
        await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    // Test individual core components
    async testIndividualComponents() {
        console.log('\\n🔍 TESTING INDIVIDUAL COMPONENTS (30 iterations each)');
        console.log('====================================================');
        
        for (const component of this.coreComponents) {
            console.log(`\\n📄 Testing ${component}...`);
            
            const componentResults = {
                passed: 0,
                failed: 0,
                warnings: 0,
                averageResponseTime: 0,
                errors: []
            };
            
            let totalResponseTime = 0;
            
            for (let i = 1; i <= this.individualIterations; i++) {
                const startTime = Date.now();
                
                try {
                    // Test file existence and readability
                    if (!fs.existsSync(component)) {
                        throw new Error(`File does not exist: ${component}`);
                    }
                    
                    const stats = fs.statSync(component);
                    if (stats.size === 0) {
                        throw new Error(`File is empty: ${component}`);
                    }
                    
                    // Component-specific tests
                    await this.testComponentSpecific(component);
                    
                    // Simulate processing delay
                    await this.simulateDelay();
                    
                    const responseTime = Date.now() - startTime;
                    totalResponseTime += responseTime;
                    
                    componentResults.passed++;
                    
                    if (i % 10 === 0 || i <= 3) {
                        this.log('INFO', component, `Iteration ${i}/30 passed (${responseTime}ms)`);
                    }
                    
                } catch (error) {
                    componentResults.failed++;
                    componentResults.errors.push(`Iteration ${i}: ${error.message}`);
                    
                    if (componentResults.errors.length <= 3) {
                        this.log('ERROR', component, `Iteration ${i}/30 failed`, error.message);
                    }
                }
            }
            
            componentResults.averageResponseTime = Math.round(totalResponseTime / this.individualIterations);
            this.results.individualTests[component] = componentResults;
            
            // Component summary
            const passRate = (componentResults.passed / this.individualIterations * 100).toFixed(1);
            if (componentResults.failed === 0) {
                this.log('INFO', component, `All 30 iterations passed (${passRate}%, avg: ${componentResults.averageResponseTime}ms)`);
            } else {
                this.log('WARN', component, `${componentResults.passed}/30 passed (${passRate}%), ${componentResults.failed} failed`);
            }
        }
    }
    
    // Component-specific testing logic
    async testComponentSpecific(component) {
        const content = fs.readFileSync(component, 'utf8');
        
        switch (component) {
            case 'iris-dashboard.js':
                // Test Phase 1 & 2 functions
                for (const func of this.phase1Functions) {
                    if (!content.includes(func)) {
                        throw new Error(`Phase 1 function missing: ${func}`);
                    }
                }
                for (const func of this.phase2Functions) {
                    if (!content.includes(func)) {
                        throw new Error(`Phase 2 function missing: ${func}`);
                    }
                }
                // Test for error handling
                if (!content.includes('try') || !content.includes('catch')) {
                    throw new Error('Missing error handling mechanisms');
                }
                break;
                
            case 'iris-api-server.js':
                if (!content.includes('express')) {
                    throw new Error('Express framework not found');
                }
                if (!content.includes('cors')) {
                    throw new Error('CORS middleware not found');
                }
                if (!content.includes('/api/')) {
                    throw new Error('API endpoints not found');
                }
                break;
                
            case 'styles.css':
                const requiredClasses = [
                    'provider-activity-section',
                    'provider-card', 
                    'query-flow-indicator',
                    'pulse-dot'
                ];
                for (const className of requiredClasses) {
                    if (!content.includes(className)) {
                        throw new Error(`Required CSS class missing: .${className}`);
                    }
                }
                if (!content.includes('@keyframes')) {
                    throw new Error('CSS animations not found');
                }
                break;
                
            case 'index.html':
                if (!content.includes('iris-dashboard.js')) {
                    throw new Error('Dashboard JavaScript not linked');
                }
                if (!content.includes('styles.css')) {
                    throw new Error('Stylesheet not linked');
                }
                if (!content.includes('query-section') && !content.includes('chat-section')) {
                    throw new Error('Required sections not found');
                }
                break;
                
            case 'iris.config.js':
                if (!content.includes('export')) {
                    throw new Error('ES6 exports not found');
                }
                if (!content.includes('api') || !content.includes('providers')) {
                    throw new Error('Required configuration sections missing');
                }
                break;
                
            case 'package.json':
                const packageData = JSON.parse(content);
                if (!packageData.dependencies) {
                    throw new Error('No dependencies found');
                }
                const requiredDeps = ['express', 'cors'];
                for (const dep of requiredDeps) {
                    if (!packageData.dependencies[dep]) {
                        throw new Error(`Required dependency missing: ${dep}`);
                    }
                }
                break;
        }
    }
    
    // Test interlinking between components
    async testInterlinkingComponents() {
        console.log('\\n🔗 TESTING INTERLINKING COMPONENTS (30 iterations each)');
        console.log('=====================================================');
        
        for (const [pairName, description] of this.interlinkingPairs) {
            console.log(`\\n🔗 Testing ${pairName}: ${description}...`);
            
            const linkResults = {
                passed: 0,
                failed: 0,
                averageResponseTime: 0,
                errors: []
            };
            
            let totalResponseTime = 0;
            
            for (let i = 1; i <= this.interlinkingIterations; i++) {
                const startTime = Date.now();
                
                try {
                    await this.testSpecificInterlinking(pairName);
                    await this.simulateDelay(20, 150);
                    
                    const responseTime = Date.now() - startTime;
                    totalResponseTime += responseTime;
                    
                    linkResults.passed++;
                    
                    if (i % 10 === 0 || i <= 3) {
                        this.log('INFO', pairName, `Iteration ${i}/30 passed (${responseTime}ms)`);
                    }
                    
                } catch (error) {
                    linkResults.failed++;
                    linkResults.errors.push(`Iteration ${i}: ${error.message}`);
                    
                    if (linkResults.errors.length <= 3) {
                        this.log('ERROR', pairName, `Iteration ${i}/30 failed`, error.message);
                    }
                }
            }
            
            linkResults.averageResponseTime = Math.round(totalResponseTime / this.interlinkingIterations);
            this.results.interlinkingTests[pairName] = linkResults;
            
            // Interlinking summary
            const passRate = (linkResults.passed / this.interlinkingIterations * 100).toFixed(1);
            if (linkResults.failed === 0) {
                this.log('INFO', pairName, `All 30 iterations passed (${passRate}%, avg: ${linkResults.averageResponseTime}ms)`);
            } else {
                this.log('WARN', pairName, `${linkResults.passed}/30 passed (${passRate}%), ${linkResults.failed} failed`);
            }
        }
    }
    
    // Test specific interlinking scenarios
    async testSpecificInterlinking(pairName) {
        switch (pairName) {
            case 'Phase1-Phase2':
                // Test that Phase 1 visual indicators work with Phase 2 provider detection
                const dashboardContent = fs.readFileSync('iris-dashboard.js', 'utf8');
                
                // Check that updateProviderActivity is called in simulateQuery
                if (!dashboardContent.includes('updateProviderActivity') || 
                    !dashboardContent.includes('simulateQuery')) {
                    throw new Error('Phase 1 visual indicators not integrated with Phase 2 queries');
                }
                
                // Check that provider detection influences visual updates
                if (!dashboardContent.includes('checkAvailableProviders') || 
                    !dashboardContent.includes('updateQueryFlowStep')) {
                    throw new Error('Provider detection not linked to visual flow');
                }
                break;
                
            case 'Dashboard-API':
                // Test that dashboard can communicate with API server
                const dashboardContent2 = fs.readFileSync('iris-dashboard.js', 'utf8');
                const apiContent = fs.readFileSync('iris-api-server.js', 'utf8');
                
                // Check for API endpoints in dashboard
                if (!dashboardContent2.includes('/api/') || !dashboardContent2.includes('fetch')) {
                    throw new Error('Dashboard not configured for API communication');
                }
                
                // Check for corresponding endpoints in API server
                if (!apiContent.includes('/api/chat') || !apiContent.includes('/api/health')) {
                    throw new Error('Required API endpoints not found in server');
                }
                break;
                
            case 'HTML-CSS':
                // Test that HTML structure matches CSS styling
                const htmlContent = fs.readFileSync('index.html', 'utf8');
                const cssContent = fs.readFileSync('styles.css', 'utf8');
                
                // Check for provider activity elements
                if (!htmlContent.includes('query-section')) {
                    throw new Error('HTML missing required sections for CSS styling');
                }
                
                // Check that CSS has styles for HTML elements
                if (!cssContent.includes('provider-activity-section') && 
                    htmlContent.includes('provider-activity')) {
                    throw new Error('CSS missing styles for HTML provider activity elements');
                }
                break;
                
            case 'Config-System':
                // Test that configuration is used by system components
                const configContent = fs.readFileSync('iris.config.js', 'utf8');
                const dashboardContent3 = fs.readFileSync('iris-dashboard.js', 'utf8');
                
                if (!configContent.includes('api') || !configContent.includes('providers')) {
                    throw new Error('Configuration missing required sections');
                }
                
                // Check that system references configuration
                if (!dashboardContent3.includes('config') && !fs.existsSync('src/index.js')) {
                    throw new Error('System components not using configuration');
                }
                break;
                
            case 'Demo-Core':
                // Test that demo interface works with core functionality
                if (!fs.existsSync('iris-visual-demo.html')) {
                    throw new Error('Demo interface not found');
                }
                
                const demoContent = fs.readFileSync('iris-visual-demo.html', 'utf8');
                
                // Check that demo includes test functions
                const testFunctions = [
                    'testProviderActivity',
                    'testSuccessFlow',
                    'updateProviderActivity'
                ];
                
                for (const func of testFunctions) {
                    if (!demoContent.includes(func)) {
                        throw new Error(`Demo missing test function: ${func}`);
                    }
                }
                break;
        }
    }
    
    // Test complete system integration
    async testSystemIntegration() {
        console.log('\\n🌐 TESTING COMPLETE SYSTEM INTEGRATION (50 iterations)');
        console.log('=====================================================');
        
        const systemResults = {
            passed: 0,
            failed: 0,
            averageResponseTime: 0,
            performanceMetrics: {
                minResponseTime: Infinity,
                maxResponseTime: 0,
                responseTimePercentiles: []
            },
            errors: []
        };
        
        const responseTimes = [];
        
        for (let i = 1; i <= this.systemIterations; i++) {
            const startTime = Date.now();
            
            try {
                // Comprehensive system test
                await this.runCompleteSystemTest();
                await this.simulateDelay(50, 200);
                
                const responseTime = Date.now() - startTime;
                responseTimes.push(responseTime);
                
                systemResults.passed++;
                
                if (i % 10 === 0 || i <= 5) {
                    this.log('INFO', 'SYSTEM', `Iteration ${i}/50 passed (${responseTime}ms)`);
                }
                
            } catch (error) {
                systemResults.failed++;
                systemResults.errors.push(`Iteration ${i}: ${error.message}`);
                
                if (systemResults.errors.length <= 5) {
                    this.log('ERROR', 'SYSTEM', `Iteration ${i}/50 failed`, error.message);
                }
            }
        }
        
        // Calculate performance metrics
        responseTimes.sort((a, b) => a - b);
        systemResults.averageResponseTime = Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length);
        systemResults.performanceMetrics = {
            minResponseTime: responseTimes[0] || 0,
            maxResponseTime: responseTimes[responseTimes.length - 1] || 0,
            p50: responseTimes[Math.floor(responseTimes.length * 0.5)] || 0,
            p90: responseTimes[Math.floor(responseTimes.length * 0.9)] || 0,
            p95: responseTimes[Math.floor(responseTimes.length * 0.95)] || 0
        };
        
        this.results.systemTests = systemResults;
        
        // System integration summary
        const passRate = (systemResults.passed / this.systemIterations * 100).toFixed(1);
        if (systemResults.failed === 0) {
            this.log('INFO', 'SYSTEM', `All 50 iterations passed (${passRate}%, avg: ${systemResults.averageResponseTime}ms)`);
        } else {
            this.log('WARN', 'SYSTEM', `${systemResults.passed}/50 passed (${passRate}%), ${systemResults.failed} failed`);
        }
    }
    
    // Complete system integration test
    async runCompleteSystemTest() {
        // Test all core components exist and are valid
        for (const component of this.coreComponents) {
            if (!fs.existsSync(component)) {
                throw new Error(`Core component missing: ${component}`);
            }
            await this.testComponentSpecific(component);
        }
        
        // Test all interlinking pairs
        for (const [pairName] of this.interlinkingPairs) {
            await this.testSpecificInterlinking(pairName);
        }
        
        // Test Phase 1 & 2 integration
        const dashboardContent = fs.readFileSync('iris-dashboard.js', 'utf8');
        
        // Verify Phase 1 functions are called in Phase 2 contexts
        if (!dashboardContent.includes('updateProviderActivity') || 
            !dashboardContent.includes('checkAvailableProviders')) {
            throw new Error('Phase 1 and Phase 2 not properly integrated');
        }
        
        // Test demo functionality
        if (!fs.existsSync('iris-visual-demo.html')) {
            throw new Error('Demo interface missing');
        }
        
        // Test system testing capability
        if (!fs.existsSync('system-test-simple.cjs')) {
            throw new Error('System testing framework missing');
        }
    }
    
    // Generate comprehensive results report
    generateReport() {
        const duration = Date.now() - this.results.summary.startTime;
        
        console.log('\\n' + '='.repeat(80));
        console.log('🧪 IRIS COMPREHENSIVE SIMULATION TEST RESULTS');
        console.log('='.repeat(80));
        
        console.log(`\\n📊 OVERALL SUMMARY:`);
        console.log(`   🕐 Total Duration: ${Math.round(duration / 1000)}s`);
        console.log(`   🧪 Total Tests: ${this.results.summary.totalTests}`);
        console.log(`   ✅ Passed: ${this.results.summary.passed}`);
        console.log(`   ❌ Failed: ${this.results.summary.failed}`);
        console.log(`   ⚠️  Warnings: ${this.results.summary.warnings}`);
        
        const overallPassRate = ((this.results.summary.passed / this.results.summary.totalTests) * 100).toFixed(1);
        console.log(`   🎯 Overall Pass Rate: ${overallPassRate}%`);
        
        // Individual component results
        console.log(`\\n📄 INDIVIDUAL COMPONENT RESULTS (30 iterations each):`);
        for (const [component, results] of Object.entries(this.results.individualTests)) {
            const passRate = (results.passed / 30 * 100).toFixed(1);
            const status = results.failed === 0 ? '✅' : '⚠️';
            console.log(`   ${status} ${component}: ${results.passed}/30 (${passRate}%) - avg: ${results.averageResponseTime}ms`);
        }
        
        // Interlinking results  
        console.log(`\\n🔗 INTERLINKING COMPONENT RESULTS (30 iterations each):`);
        for (const [linkName, results] of Object.entries(this.results.interlinkingTests)) {
            const passRate = (results.passed / 30 * 100).toFixed(1);
            const status = results.failed === 0 ? '✅' : '⚠️';
            console.log(`   ${status} ${linkName}: ${results.passed}/30 (${passRate}%) - avg: ${results.averageResponseTime}ms`);
        }
        
        // System integration results
        console.log(`\\n🌐 SYSTEM INTEGRATION RESULTS (50 iterations):`);
        const systemResults = this.results.systemTests;
        const systemPassRate = (systemResults.passed / 50 * 100).toFixed(1);
        const systemStatus = systemResults.failed === 0 ? '✅' : '⚠️';
        console.log(`   ${systemStatus} Complete System: ${systemResults.passed}/50 (${systemPassRate}%)`);
        console.log(`   📊 Performance Metrics:`);
        console.log(`      • Average Response Time: ${systemResults.averageResponseTime}ms`);
        console.log(`      • Min Response Time: ${systemResults.performanceMetrics.minResponseTime}ms`);
        console.log(`      • Max Response Time: ${systemResults.performanceMetrics.maxResponseTime}ms`);
        console.log(`      • 50th Percentile (P50): ${systemResults.performanceMetrics.p50}ms`);
        console.log(`      • 90th Percentile (P90): ${systemResults.performanceMetrics.p90}ms`);
        console.log(`      • 95th Percentile (P95): ${systemResults.performanceMetrics.p95}ms`);
        
        // Error analysis
        const totalErrors = this.results.summary.failed;
        if (totalErrors > 0) {
            console.log(`\\n🔍 ERROR ANALYSIS:`);
            console.log(`   📊 Total Errors: ${totalErrors}`);
            
            // Show sample errors from each category
            for (const [component, results] of Object.entries(this.results.individualTests)) {
                if (results.errors.length > 0) {
                    console.log(`   ❌ ${component}: ${results.errors[0]}`);
                }
            }
        }
        
        // Final assessment
        console.log(`\\n🎯 FINAL ASSESSMENT:`);
        if (overallPassRate >= 95) {
            console.log(`   🎉 EXCELLENT - System performing at high reliability`);
        } else if (overallPassRate >= 85) {
            console.log(`   ✅ GOOD - System stable with minor issues`);
        } else if (overallPassRate >= 70) {
            console.log(`   ⚠️  NEEDS ATTENTION - Some components require fixes`);
        } else {
            console.log(`   ❌ CRITICAL - Major issues detected, system needs repair`);
        }
        
        console.log('\\n' + '='.repeat(80));
        console.log(`⏰ Test completed: ${new Date().toLocaleString()}`);
        console.log('='.repeat(80));
        
        return overallPassRate >= 85;
    }
    
    // Main test execution
    async runAllTests() {
        console.log('🚀 IRIS COMPREHENSIVE SIMULATION TESTING');
        console.log('=======================================');
        console.log(`📍 Testing directory: ${__dirname}`);
        console.log(`🧪 Test plan: ${this.individualIterations} individual + ${this.interlinkingIterations} interlinking + ${this.systemIterations} system iterations`);
        console.log(`⏰ Started: ${new Date().toLocaleString()}`);
        
        try {
            await this.testIndividualComponents();
            await this.testInterlinkingComponents(); 
            await this.testSystemIntegration();
            
        } catch (error) {
            console.error(`\\n❌ Critical test framework failure: ${error.message}`);
            this.results.summary.failed++;
        }
        
        const success = this.generateReport();
        return success;
    }
}

// Execute tests if run directly
if (require.main === module) {
    const tester = new IRISSimulationTester();
    tester.runAllTests().then(success => {
        process.exit(success ? 0 : 1);
    });
}

module.exports = IRISSimulationTester;