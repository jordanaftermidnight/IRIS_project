#!/usr/bin/env node

/**
 * IRIS Comprehensive Scenario Testing Suite
 * Tests different usage scenarios and performance characteristics
 */

import MultiAI from './src/index.js';
import fs from 'fs';
import path from 'path';

class IRISScenarioTester {
    constructor() {
        this.iris = new MultiAI();
        this.testResults = {
            scenarios: [],
            performance: {},
            errors: [],
            summary: {}
        };
        this.scenarios = [
            {
                name: "Software Development Workflow",
                description: "Code generation, debugging, and review tasks",
                tasks: [
                    "Write a Python function to calculate prime numbers",
                    "Debug this JavaScript code: const arr = [1,2,3]; arr.map(x => x * 2",
                    "Review this code for security issues: eval(userInput)",
                    "Explain how to optimize this SQL query: SELECT * FROM users WHERE id IN (SELECT user_id FROM orders)",
                    "Generate unit tests for a REST API endpoint"
                ]
            },
            {
                name: "Creative Content Creation",
                description: "Writing, brainstorming, and creative tasks",
                tasks: [
                    "Write a compelling product description for an AI coding assistant",
                    "Create a short story about AI and human collaboration",
                    "Brainstorm 10 innovative features for a voice assistant",
                    "Write a technical blog post about machine learning ethics",
                    "Create marketing copy for a developer tool launch"
                ]
            },
            {
                name: "Data Analysis & Research",
                description: "Complex analytical and reasoning tasks",
                tasks: [
                    "Analyze the pros and cons of microservices vs monolithic architecture",
                    "Explain the impact of quantum computing on current encryption methods",
                    "Compare different machine learning algorithms for fraud detection",
                    "Research current trends in edge computing and IoT",
                    "Analyze the trade-offs between different database types for real-time applications"
                ]
            },
            {
                name: "Educational & Explanatory",
                description: "Teaching and explanation-focused tasks",
                tasks: [
                    "Explain how neural networks work to a beginner",
                    "What is the difference between Docker and Kubernetes?",
                    "How does HTTPS encryption protect web traffic?",
                    "Explain the concept of Big O notation with examples",
                    "What are the key principles of clean code architecture?"
                ]
            },
            {
                name: "Fast Query & Support",
                description: "Quick answers and immediate assistance",
                tasks: [
                    "What's the syntax for a Python list comprehension?",
                    "How to fix 'npm ERR! peer dep missing' error?",
                    "Quick way to reverse a string in JavaScript?",
                    "Git command to undo last commit?",
                    "How to check disk space in Linux?"
                ]
            },
            {
                name: "Enterprise Integration",
                description: "Business and integration-focused tasks",
                tasks: [
                    "Design an API strategy for a fintech startup",
                    "Create a disaster recovery plan for cloud infrastructure",
                    "Explain GDPR compliance requirements for data processing",
                    "Design a scalable messaging architecture",
                    "Plan a CI/CD pipeline for a microservices application"
                ]
            },
            {
                name: "Multilingual & Accessibility",
                description: "International and accessibility-focused tasks",
                tasks: [
                    "Translate this error message to Spanish: 'Connection timeout occurred'",
                    "Explain WCAG accessibility guidelines for web applications",
                    "How to implement internationalization in a React application?",
                    "Best practices for right-to-left language support",
                    "Design inclusive UX patterns for users with disabilities"
                ]
            },
            {
                name: "Performance & Load Testing",
                description: "High-volume and stress testing scenarios",
                tasks: Array.from({length: 20}, (_, i) => `Rapid query ${i + 1}: What is ${Math.floor(Math.random() * 100)} + ${Math.floor(Math.random() * 100)}?`)
            }
        ];
    }

    async runAllScenarios() {
        console.log('🧪 IRIS Comprehensive Scenario Testing');
        console.log('====================================');
        console.log();

        try {
            // Initialize IRIS
            console.log('🚀 Initializing IRIS...');
            await this.iris.initializeProviders();
            console.log('✅ IRIS initialized successfully');
            console.log();

            // Test each scenario
            for (const scenario of this.scenarios) {
                await this.runScenario(scenario);
            }

            // Generate performance analysis
            this.analyzePerformance();

            // Generate final report
            this.generateReport();

        } catch (error) {
            console.error('❌ Scenario testing failed:', error);
            this.testResults.errors.push({
                type: 'initialization',
                message: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    async runScenario(scenario) {
        console.log(`📋 Testing Scenario: ${scenario.name}`);
        console.log(`📝 ${scenario.description}`);
        console.log(`📊 Tasks: ${scenario.tasks.length}`);

        const scenarioResult = {
            name: scenario.name,
            description: scenario.description,
            taskCount: scenario.tasks.length,
            tasks: [],
            startTime: Date.now(),
            endTime: null,
            duration: 0,
            successRate: 0,
            averageResponseTime: 0,
            providerDistribution: {},
            errors: []
        };

        let successCount = 0;
        let totalResponseTime = 0;
        const providerCounts = {};

        // Execute each task in the scenario
        for (let i = 0; i < scenario.tasks.length; i++) {
            const task = scenario.tasks[i];
            const taskNumber = i + 1;
            
            process.stdout.write(`   [${taskNumber}/${scenario.tasks.length}] Processing... `);

            try {
                const startTime = Date.now();
                
                // Determine optimal task type
                const taskType = this.determineTaskType(task, scenario.name);
                
                // Execute task
                const result = await this.iris.chat(task, { taskType });
                
                const responseTime = Date.now() - startTime;
                totalResponseTime += responseTime;
                
                // Track provider usage
                const provider = result.selectedProvider || result.provider || 'unknown';
                providerCounts[provider] = (providerCounts[provider] || 0) + 1;

                const taskResult = {
                    task: task.substring(0, 100) + (task.length > 100 ? '...' : ''),
                    provider,
                    responseTime,
                    success: true,
                    responseLength: result.response?.length || 0,
                    model: result.model || 'unknown'
                };

                scenarioResult.tasks.push(taskResult);
                successCount++;
                
                console.log(`✅ ${responseTime}ms (${provider})`);
                
                // Small delay to prevent overwhelming providers
                if (scenario.name === "Performance & Load Testing") {
                    await new Promise(resolve => setTimeout(resolve, 100));
                } else {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }

            } catch (error) {
                const responseTime = Date.now() - startTime;
                
                const taskResult = {
                    task: task.substring(0, 100) + (task.length > 100 ? '...' : ''),
                    provider: 'error',
                    responseTime,
                    success: false,
                    error: error.message
                };

                scenarioResult.tasks.push(taskResult);
                scenarioResult.errors.push({
                    task: task,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });

                console.log(`❌ ${responseTime}ms (${error.message.substring(0, 50)})`);
            }
        }

        // Calculate scenario metrics
        scenarioResult.endTime = Date.now();
        scenarioResult.duration = scenarioResult.endTime - scenarioResult.startTime;
        scenarioResult.successRate = (successCount / scenario.tasks.length) * 100;
        scenarioResult.averageResponseTime = totalResponseTime / scenario.tasks.length;
        scenarioResult.providerDistribution = providerCounts;

        this.testResults.scenarios.push(scenarioResult);

        // Display scenario summary
        console.log(`📈 Results:`);
        console.log(`   Success Rate: ${scenarioResult.successRate.toFixed(1)}% (${successCount}/${scenario.tasks.length})`);
        console.log(`   Avg Response Time: ${scenarioResult.averageResponseTime.toFixed(0)}ms`);
        console.log(`   Total Duration: ${(scenarioResult.duration / 1000).toFixed(1)}s`);
        console.log(`   Provider Distribution:`, Object.entries(providerCounts)
            .map(([provider, count]) => `${provider}: ${count}`)
            .join(', ') || 'None');
        console.log();
    }

    determineTaskType(task, scenarioName) {
        const taskLower = task.toLowerCase();
        const scenarioLower = scenarioName.toLowerCase();

        if (scenarioLower.includes('development') || scenarioLower.includes('software') || 
            taskLower.includes('code') || taskLower.includes('debug') || taskLower.includes('function')) {
            return 'code';
        }
        
        if (scenarioLower.includes('creative') || scenarioLower.includes('content') || 
            taskLower.includes('write') || taskLower.includes('story') || taskLower.includes('brainstorm')) {
            return 'creative';
        }
        
        if (scenarioLower.includes('fast') || scenarioLower.includes('performance') || scenarioLower.includes('load') || 
            taskLower.includes('quick') || taskLower.includes('syntax') || taskLower.includes('command')) {
            return 'fast';
        }
        
        if (scenarioLower.includes('analysis') || scenarioLower.includes('research') || scenarioLower.includes('enterprise') || 
            taskLower.includes('analyze') || taskLower.includes('compare') || taskLower.includes('explain')) {
            return 'reasoning';
        }
        
        return 'balanced';
    }

    analyzePerformance() {
        console.log('📊 Performance Analysis');
        console.log('=====================');

        const allTasks = this.testResults.scenarios.flatMap(s => s.tasks);
        const successfulTasks = allTasks.filter(t => t.success);
        
        // Overall metrics
        const overallSuccessRate = (successfulTasks.length / allTasks.length) * 100;
        const averageResponseTime = allTasks.reduce((sum, t) => sum + t.responseTime, 0) / allTasks.length;
        
        // Provider performance
        const providerStats = {};
        successfulTasks.forEach(task => {
            if (!providerStats[task.provider]) {
                providerStats[task.provider] = {
                    count: 0,
                    totalResponseTime: 0,
                    averageResponseTime: 0,
                    successRate: 100
                };
            }
            providerStats[task.provider].count++;
            providerStats[task.provider].totalResponseTime += task.responseTime;
        });

        Object.keys(providerStats).forEach(provider => {
            const stats = providerStats[provider];
            stats.averageResponseTime = stats.totalResponseTime / stats.count;
        });

        // Scenario performance
        const scenarioPerformance = this.testResults.scenarios.map(scenario => ({
            name: scenario.name,
            successRate: scenario.successRate,
            averageResponseTime: scenario.averageResponseTime,
            tasksPerSecond: (scenario.taskCount / (scenario.duration / 1000)).toFixed(2)
        }));

        this.testResults.performance = {
            overall: {
                totalTasks: allTasks.length,
                successfulTasks: successfulTasks.length,
                overallSuccessRate: overallSuccessRate.toFixed(1),
                averageResponseTime: averageResponseTime.toFixed(0)
            },
            providers: providerStats,
            scenarios: scenarioPerformance
        };

        // Display performance summary
        console.log(`📈 Overall Performance:`);
        console.log(`   Total Tasks: ${allTasks.length}`);
        console.log(`   Success Rate: ${overallSuccessRate.toFixed(1)}% (${successfulTasks.length}/${allTasks.length})`);
        console.log(`   Average Response Time: ${averageResponseTime.toFixed(0)}ms`);
        console.log();

        console.log(`🚀 Provider Performance:`);
        Object.entries(providerStats).forEach(([provider, stats]) => {
            console.log(`   ${provider}: ${stats.count} tasks, ${stats.averageResponseTime.toFixed(0)}ms avg`);
        });
        console.log();

        console.log(`🎯 Best Performing Scenarios:`);
        scenarioPerformance
            .sort((a, b) => b.successRate - a.successRate)
            .slice(0, 3)
            .forEach((scenario, i) => {
                console.log(`   ${i + 1}. ${scenario.name}: ${scenario.successRate.toFixed(1)}% success, ${scenario.averageResponseTime.toFixed(0)}ms avg`);
            });
        console.log();
    }

    generateReport() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const reportPath = `iris-scenario-test-report-${timestamp}.json`;
        
        this.testResults.summary = {
            testDate: new Date().toISOString(),
            totalScenarios: this.testResults.scenarios.length,
            totalTasks: this.testResults.scenarios.reduce((sum, s) => sum + s.taskCount, 0),
            overallSuccessRate: this.testResults.performance.overall?.overallSuccessRate || 0,
            averageResponseTime: this.testResults.performance.overall?.averageResponseTime || 0,
            recommendations: this.generateRecommendations()
        };

        // Save detailed report
        fs.writeFileSync(reportPath, JSON.stringify(this.testResults, null, 2));
        
        console.log('📄 Test Report Generated');
        console.log('========================');
        console.log(`📁 Report saved to: ${reportPath}`);
        console.log(`📊 Test Summary:`);
        console.log(`   Scenarios Tested: ${this.testResults.summary.totalScenarios}`);
        console.log(`   Total Tasks: ${this.testResults.summary.totalTasks}`);
        console.log(`   Overall Success Rate: ${this.testResults.summary.overallSuccessRate}%`);
        console.log(`   Average Response Time: ${this.testResults.summary.averageResponseTime}ms`);
        console.log();
        
        console.log(`💡 Recommendations:`);
        this.testResults.summary.recommendations.forEach((rec, i) => {
            console.log(`   ${i + 1}. ${rec}`);
        });
        console.log();
        
        return reportPath;
    }

    generateRecommendations() {
        const recommendations = [];
        const performance = this.testResults.performance;
        
        if (performance.overall) {
            const successRate = parseFloat(performance.overall.overallSuccessRate);
            const avgResponseTime = parseFloat(performance.overall.averageResponseTime);
            
            if (successRate < 90) {
                recommendations.push(`Improve system reliability - success rate is ${successRate}% (target: >95%)`);
            }
            
            if (avgResponseTime > 3000) {
                recommendations.push(`Optimize response times - current average is ${avgResponseTime}ms (target: <2000ms)`);
            }
            
            // Provider-specific recommendations
            if (performance.providers) {
                const providerEntries = Object.entries(performance.providers);
                const slowestProvider = providerEntries.reduce((slowest, [name, stats]) => 
                    stats.averageResponseTime > (slowest?.stats?.averageResponseTime || 0) ? {name, stats} : slowest, null);
                
                if (slowestProvider && slowestProvider.stats.averageResponseTime > 5000) {
                    recommendations.push(`Consider optimizing or reducing usage of ${slowestProvider.name} (avg: ${slowestProvider.stats.averageResponseTime.toFixed(0)}ms)`);
                }
            }
        }
        
        // Scenario-specific recommendations
        const failedScenarios = this.testResults.scenarios.filter(s => s.successRate < 80);
        if (failedScenarios.length > 0) {
            recommendations.push(`Review and improve handling for: ${failedScenarios.map(s => s.name).join(', ')}`);
        }
        
        if (recommendations.length === 0) {
            recommendations.push('System performing well across all scenarios');
            recommendations.push('Consider adding more complex test scenarios');
            recommendations.push('Monitor performance trends over time');
        }
        
        return recommendations;
    }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const tester = new IRISScenarioTester();
    tester.runAllScenarios().catch(console.error);
}

export default IRISScenarioTester;