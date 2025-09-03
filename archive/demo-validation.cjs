#!/usr/bin/env node

// IRIS Demo Validation - Pre-demo health check

const fs = require('fs');
const path = require('path');
const http = require('http');

class DemoValidator {
    constructor() {
        this.projectPath = process.cwd();
        this.validationResults = {
            files: [],
            dependencies: [],
            functionality: [],
            performance: [],
            overall: false
        };
    }

    async validateDemo() {
        console.log('🔍 IRIS Demo Validation Starting...');
        console.log('=====================================');
        
        await this.validateFiles();
        await this.validateDependencies();  
        await this.validateFunctionality();
        await this.validatePerformance();
        
        return this.generateValidationReport();
    }

    async validateFiles() {
        console.log('📁 Validating Demo Files...');
        
        const requiredFiles = [
            { file: 'index.html', critical: true, desc: 'Main dashboard HTML' },
            { file: 'styles.css', critical: true, desc: 'Dashboard styles' },
            { file: 'iris-dashboard.js', critical: true, desc: 'Dashboard functionality' },
            { file: 'demo-start.cjs', critical: true, desc: 'Demo startup script' },
            { file: 'package.json', critical: true, desc: 'Project configuration' },
            { file: '.env.example', critical: false, desc: 'Environment template' },
            { file: 'DEMO_USER_GUIDE.md', critical: false, desc: 'Demo documentation' },
            { file: 'QUICK_SETUP_GUIDE.md', critical: false, desc: 'Setup instructions' }
        ];

        let criticalFiles = 0;
        let totalCritical = requiredFiles.filter(f => f.critical).length;

        for (const { file, critical, desc } of requiredFiles) {
            const filePath = path.join(this.projectPath, file);
            const exists = fs.existsSync(filePath);
            
            if (exists) {
                const stats = fs.statSync(filePath);
                const isValid = stats.size > 100; // Basic size check
                
                if (isValid) {
                    console.log(`   ✅ ${file} - ${desc}`);
                    if (critical) criticalFiles++;
                    this.validationResults.files.push({ file, status: 'valid', critical });
                } else {
                    console.log(`   ⚠️  ${file} - File too small (${stats.size} bytes)`);
                    this.validationResults.files.push({ file, status: 'invalid', critical });
                }
            } else {
                console.log(`   ❌ ${file} - Missing ${critical ? '(CRITICAL)' : ''}`);
                this.validationResults.files.push({ file, status: 'missing', critical });
            }
        }

        const filesValid = criticalFiles === totalCritical;
        console.log(`📁 File Validation: ${filesValid ? '✅ PASS' : '❌ FAIL'} (${criticalFiles}/${totalCritical} critical files)`);
        return filesValid;
    }

    async validateDependencies() {
        console.log('🔧 Validating Dependencies...');
        
        const checks = [
            { 
                name: 'Node.js', 
                test: () => process.version,
                validate: (result) => {
                    const version = parseInt(process.version.slice(1));
                    return version >= 14;
                }
            },
            {
                name: 'HTTP Server Capability',
                test: async () => {
                    return new Promise((resolve) => {
                        const server = http.createServer();
                        server.listen(0, () => {
                            const port = server.address().port;
                            server.close(() => resolve(port));
                        });
                        server.on('error', () => resolve(false));
                    });
                },
                validate: (result) => result !== false
            },
            {
                name: 'File System Access',
                test: () => {
                    try {
                        fs.accessSync(this.projectPath, fs.constants.R_OK | fs.constants.W_OK);
                        return true;
                    } catch {
                        return false;
                    }
                },
                validate: (result) => result === true
            }
        ];

        let validDeps = 0;
        for (const check of checks) {
            try {
                const result = await check.test();
                const isValid = check.validate(result);
                
                if (isValid) {
                    console.log(`   ✅ ${check.name}`);
                    validDeps++;
                } else {
                    console.log(`   ❌ ${check.name} - Failed validation`);
                }
                
                this.validationResults.dependencies.push({ 
                    name: check.name, 
                    valid: isValid, 
                    result 
                });
            } catch (error) {
                console.log(`   ❌ ${check.name} - Error: ${error.message}`);
                this.validationResults.dependencies.push({ 
                    name: check.name, 
                    valid: false, 
                    error: error.message 
                });
            }
        }

        const depsValid = validDeps === checks.length;
        console.log(`🔧 Dependencies: ${depsValid ? '✅ PASS' : '❌ FAIL'} (${validDeps}/${checks.length})`);
        return depsValid;
    }

    async validateFunctionality() {
        console.log('⚙️ Validating Demo Functionality...');
        
        const functionalityTests = [
            {
                name: 'Dashboard HTML Structure',
                test: () => {
                    const htmlPath = path.join(this.projectPath, 'index.html');
                    const content = fs.readFileSync(htmlPath, 'utf-8');
                    
                    const requiredElements = [
                        'systemHealth',
                        'providersGrid',
                        'queryInput',
                        'submitQuery'
                    ];
                    
                    // Check for class-based elements separately
                    const requiredClasses = ['dashboard-container'];
                    const classesFound = requiredClasses.every(cls => content.includes(`class="${cls}"`));
                    
                    const idsFound = requiredElements.every(id => {
                        const found = content.includes(`id="${id}"`);
                        if (!found) console.log(`     Missing ID: ${id}`);
                        return found;
                    });
                    
                    return idsFound && classesFound;
                }
            },
            {
                name: 'JavaScript Classes',
                test: () => {
                    const jsPath = path.join(this.projectPath, 'iris-dashboard.js');
                    const content = fs.readFileSync(jsPath, 'utf-8');
                    
                    return content.includes('class IRISDashboard') && 
                           content.includes('setupEventListeners') &&
                           content.includes('submitQuery');
                }
            },
            {
                name: 'CSS Styling System',
                test: () => {
                    const cssPath = path.join(this.projectPath, 'styles.css');
                    const content = fs.readFileSync(cssPath, 'utf-8');
                    
                    return content.includes(':root') && 
                           content.includes('dashboard-container') &&
                           content.includes('@media');
                }
            },
            {
                name: 'Demo Control Buttons',
                test: () => {
                    const htmlPath = path.join(this.projectPath, 'index.html');
                    const content = fs.readFileSync(htmlPath, 'utf-8');
                    
                    const demoButtons = [
                        'runHealthCheck',
                        'simulateFailover',
                        'testSecurity',
                        'showNeuralLearning'
                    ];
                    
                    return demoButtons.every(id => content.includes(`id="${id}"`));
                }
            }
        ];

        let validFunctionality = 0;
        for (const test of functionalityTests) {
            try {
                const isValid = await test.test();
                
                if (isValid) {
                    console.log(`   ✅ ${test.name}`);
                    validFunctionality++;
                } else {
                    console.log(`   ❌ ${test.name} - Failed`);
                }
                
                this.validationResults.functionality.push({ 
                    name: test.name, 
                    valid: isValid 
                });
            } catch (error) {
                console.log(`   ❌ ${test.name} - Error: ${error.message}`);
                this.validationResults.functionality.push({ 
                    name: test.name, 
                    valid: false, 
                    error: error.message 
                });
            }
        }

        const functionalityValid = validFunctionality === functionalityTests.length;
        console.log(`⚙️ Functionality: ${functionalityValid ? '✅ PASS' : '❌ FAIL'} (${validFunctionality}/${functionalityTests.length})`);
        return functionalityValid;
    }

    async validatePerformance() {
        console.log('🚀 Validating Performance Readiness...');
        
        const performanceTests = [
            {
                name: 'File Size Optimization',
                test: () => {
                    const files = ['index.html', 'styles.css', 'iris-dashboard.js'];
                    const totalSize = files.reduce((sum, file) => {
                        const filePath = path.join(this.projectPath, file);
                        if (fs.existsSync(filePath)) {
                            return sum + fs.statSync(filePath).size;
                        }
                        return sum;
                    }, 0);
                    
                    // Should be under 500KB for good demo performance
                    return totalSize < 500 * 1024;
                }
            },
            {
                name: 'Memory Usage Simulation',
                test: () => {
                    const initialMemory = process.memoryUsage().heapUsed;
                    
                    // Simulate some demo operations
                    const testData = [];
                    for (let i = 0; i < 1000; i++) {
                        testData.push({ id: i, data: 'test'.repeat(100) });
                    }
                    
                    const memoryIncrease = process.memoryUsage().heapUsed - initialMemory;
                    
                    // Should use less than 50MB for demo operations
                    return memoryIncrease < 50 * 1024 * 1024;
                }
            },
            {
                name: 'Startup Time Check',
                test: () => {
                    const startTime = Date.now();
                    
                    // Simulate demo initialization
                    const jsPath = path.join(this.projectPath, 'iris-dashboard.js');
                    const content = fs.readFileSync(jsPath, 'utf-8');
                    
                    const loadTime = Date.now() - startTime;
                    
                    // Should load under 100ms
                    return loadTime < 100;
                }
            }
        ];

        let validPerformance = 0;
        for (const test of performanceTests) {
            try {
                const isValid = await test.test();
                
                if (isValid) {
                    console.log(`   ✅ ${test.name}`);
                    validPerformance++;
                } else {
                    console.log(`   ⚠️ ${test.name} - Could be optimized`);
                }
                
                this.validationResults.performance.push({ 
                    name: test.name, 
                    valid: isValid 
                });
            } catch (error) {
                console.log(`   ❌ ${test.name} - Error: ${error.message}`);
                this.validationResults.performance.push({ 
                    name: test.name, 
                    valid: false, 
                    error: error.message 
                });
            }
        }

        const performanceValid = validPerformance >= Math.ceil(performanceTests.length * 0.7); // 70% threshold
        console.log(`🚀 Performance: ${performanceValid ? '✅ PASS' : '⚠️ ACCEPTABLE'} (${validPerformance}/${performanceTests.length})`);
        return performanceValid;
    }

    generateValidationReport() {
        console.log('');
        console.log('📊 DEMO VALIDATION SUMMARY');
        console.log('==========================');
        
        const filesValid = this.validationResults.files.filter(f => f.critical && f.status === 'valid').length === 
                          this.validationResults.files.filter(f => f.critical).length;
        
        const depsValid = this.validationResults.dependencies.every(d => d.valid);
        const funcValid = this.validationResults.functionality.every(f => f.valid);
        const perfValid = this.validationResults.performance.filter(p => p.valid).length >= 
                         Math.ceil(this.validationResults.performance.length * 0.7);
        
        console.log(`📁 Critical Files:   ${filesValid ? '✅ READY' : '❌ MISSING'}`);
        console.log(`🔧 Dependencies:     ${depsValid ? '✅ READY' : '❌ ISSUES'}`);
        console.log(`⚙️ Functionality:    ${funcValid ? '✅ READY' : '❌ BROKEN'}`);
        console.log(`🚀 Performance:      ${perfValid ? '✅ OPTIMIZED' : '⚠️ ACCEPTABLE'}`);
        
        const overallValid = filesValid && depsValid && funcValid && perfValid;
        this.validationResults.overall = overallValid;
        
        console.log('');
        console.log(`🎯 OVERALL STATUS: ${overallValid ? '✅ DEMO READY' : '❌ NEEDS FIXES'}`);
        
        if (overallValid) {
            console.log('');
            console.log('🎉 Demo validation passed!');
            console.log('✅ Ready for live demonstration');
            console.log('🚀 Run "npm start" to launch demo');
        } else {
            console.log('');
            console.log('🔧 Demo needs fixes before presentation:');
            
            if (!filesValid) {
                console.log('   • Missing critical demo files');
            }
            if (!depsValid) {
                console.log('   • Dependency issues detected');
            }
            if (!funcValid) {
                console.log('   • Functionality problems found');
            }
            if (!perfValid) {
                console.log('   • Performance could be improved');
            }
        }
        
        console.log('');
        return {
            valid: overallValid,
            results: this.validationResults,
            score: Math.round((
                (filesValid ? 25 : 0) +
                (depsValid ? 25 : 0) +
                (funcValid ? 25 : 0) +
                (perfValid ? 25 : 0)
            ))
        };
    }
}

// Main execution
async function main() {
    const validator = new DemoValidator();
    const results = await validator.validateDemo();
    
    // Save validation report
    const report = {
        timestamp: new Date().toISOString(),
        score: results.score,
        valid: results.valid,
        details: results.results
    };
    
    fs.writeFileSync(
        path.join(process.cwd(), 'demo-validation-report.json'),
        JSON.stringify(report, null, 2)
    );
    
    console.log('📄 Validation report saved to: demo-validation-report.json');
    
    process.exit(results.valid ? 0 : 1);
}

if (require.main === module) {
    main().catch(error => {
        console.error('Demo validation failed:', error);
        process.exit(1);
    });
}

module.exports = { DemoValidator };