#!/usr/bin/env node

/**
 * Enhanced IRIS Demo Launcher
 * Starts both API server and serves the dashboard with real AI integration
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

async function checkPrerequisites() {
    log('Checking prerequisites...', 'cyan');
    
    const requiredFiles = [
        'index.html',
        'iris-dashboard.js', 
        'styles.css',
        'iris-api-server.js',
        'src/index.js',
        'package.json'
    ];
    
    let allGood = true;
    
    for (const file of requiredFiles) {
        if (fs.existsSync(file)) {
            log(`   ✅ ${file}`, 'green');
        } else {
            log(`   ❌ ${file} (missing)`, 'red');
            allGood = false;
        }
    }
    
    // Check if node_modules exists
    if (fs.existsSync('node_modules')) {
        log('   ✅ node_modules', 'green');
    } else {
        log('   ⚠️  node_modules (missing - installing dependencies)', 'yellow');
        await installDependencies();
    }
    
    return allGood;
}

function installDependencies() {
    return new Promise((resolve, reject) => {
        log('📦 Installing dependencies...', 'cyan');
        const npm = spawn('npm', ['install'], { stdio: 'pipe' });
        
        npm.on('close', (code) => {
            if (code === 0) {
                log('   ✅ Dependencies installed', 'green');
                resolve();
            } else {
                log('   ❌ Failed to install dependencies', 'red');
                reject(new Error('npm install failed'));
            }
        });
        
        npm.on('error', (err) => {
            log('   ❌ npm not found or error occurred', 'red');
            reject(err);
        });
    });
}

function findAvailablePort(startPort = 3001) {
    return new Promise((resolve) => {
        const net = require('net');
        const server = net.createServer();
        
        server.listen(startPort, () => {
            const port = server.address().port;
            server.close(() => resolve(port));
        });
        
        server.on('error', () => {
            resolve(findAvailablePort(startPort + 1));
        });
    });
}

async function startAPIServer() {
    log('Starting IRIS API Server...', 'cyan');
    
    const apiPort = await findAvailablePort(3001);
    process.env.API_PORT = apiPort;
    
    return new Promise((resolve, reject) => {
        const apiServer = spawn('node', ['iris-api-server.js'], {
            stdio: ['ignore', 'pipe', 'pipe'],
            env: { ...process.env, API_PORT: apiPort }
        });
        
        let serverReady = false;
        
        apiServer.stdout.on('data', (data) => {
            const output = data.toString();
            if (output.includes('IRIS API Server running')) {
                if (!serverReady) {
                    serverReady = true;
                    log(`   ✅ API Server started on port ${apiPort}`, 'green');
                    resolve({ process: apiServer, port: apiPort });
                }
            }
            // Optional: show server logs
            // console.log('API:', output.trim());
        });
        
        apiServer.stderr.on('data', (data) => {
            const error = data.toString();
            if (!serverReady) {
                log(`   ⚠️  API Server: ${error.trim()}`, 'yellow');
            }
        });
        
        apiServer.on('error', (err) => {
            if (!serverReady) {
                reject(err);
            }
        });
        
        // Timeout after 10 seconds
        setTimeout(() => {
            if (!serverReady) {
                reject(new Error('API Server startup timeout'));
            }
        }, 10000);
    });
}

function startWebServer(apiPort) {
    return new Promise(async (resolve, reject) => {
        log('🌐 Starting web server...', 'cyan');
        
        const webPort = await findAvailablePort(8081);
        
        // Try Python first
        const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
        
        const webServer = spawn(pythonCmd, [
            '-m', 'http.server', webPort.toString()
        ], {
            stdio: ['ignore', 'pipe', 'pipe'],
            cwd: __dirname
        });
        
        let serverReady = false;
        
        webServer.stdout.on('data', (data) => {
            const output = data.toString();
            if (output.includes('Serving HTTP') || !serverReady) {
                if (!serverReady) {
                    serverReady = true;
                    log(`   ✅ Web server started on port ${webPort}`, 'green');
                    resolve({ process: webServer, port: webPort });
                }
            }
        });
        
        webServer.stderr.on('data', (data) => {
            // Python http.server outputs to stderr
            const output = data.toString();
            if (output.includes('Serving HTTP') && !serverReady) {
                serverReady = true;
                log(`   ✅ Web server started on port ${webPort}`, 'green');
                resolve({ process: webServer, port: webPort });
            }
        });
        
        webServer.on('error', (err) => {
            if (!serverReady) {
                reject(err);
            }
        });
        
        // Give Python server more time and assume it starts
        setTimeout(() => {
            if (!serverReady) {
                serverReady = true;
                log(`   ✅ Web server started on port ${webPort} (assumed)`, 'green');
                resolve({ process: webServer, port: webPort });
            }
        }, 2000);
    });
}

function openBrowser(url) {
    const platform = process.platform;
    let cmd;
    
    if (platform === 'darwin') {
        cmd = 'open';
    } else if (platform === 'win32') {
        cmd = 'start';
    } else {
        cmd = 'xdg-open';
    }
    
    exec(`${cmd} ${url}`, (error) => {
        if (error) {
            log(`   ⚠️  Could not open browser automatically. Please visit: ${url}`, 'yellow');
        } else {
            log(`   ✅ Opened browser at ${url}`, 'green');
        }
    });
}

async function main() {
    try {
        log('🧠 IRIS Enhanced Demo Launcher', 'bright');
        log('=====================================', 'bright');
        
        // Check prerequisites
        const prereqsOK = await checkPrerequisites();
        if (!prereqsOK) {
            log('❌ Prerequisites check failed. Please fix the missing files.', 'red');
            process.exit(1);
        }
        
        log('✅ Prerequisites check complete!', 'green');
        log('');
        
        // Start API server
        const apiServer = await startAPIServer();
        
        // Start web server
        const webServer = await startWebServer(apiServer.port);
        
        // Success message
        log('IRIS Enhanced Demo Started Successfully', 'bright');
        log('==========================================', 'bright');
        log('');
        log('📊 Demo Dashboard:', 'cyan');
        log(`   🌐 Local URL: http://localhost:${webServer.port}`, 'green');
        log(`   🌐 API Server: http://localhost:${apiServer.port}`, 'green');
        log('');
        log('🤖 AI Features:', 'cyan');
        log('   ✅ Real AI responses (when available)', 'green');
        log('   ✅ Enhanced demo fallback', 'green');
        log('   ✅ Smart provider routing', 'green');
        log('   ✅ Context-aware responses', 'green');
        log('');
        log('🎭 Try These Queries:', 'cyan');
        log('   • "Hello, how are you?"', 'yellow');
        log('   • "Write a Python function to calculate fibonacci"', 'yellow');
        log('   • "Explain how machine learning works"', 'yellow');
        log('   • "Create a creative story about AI"', 'yellow');
        log('');
        log('🎮 Demo Controls:', 'cyan');
        log('   • Theme toggle (light/dark mode)', 'yellow');
        log('   • Real-time metrics and charts', 'yellow');
        log('   • Health check, failover, and security demos', 'yellow');
        log('');
        log('💡 The interface will show whether responses are from:', 'cyan');
        log('   🧠 Real AI (when IRIS providers are available)', 'green');
        log('   🧪 Enhanced Demo (intelligent fallback)', 'yellow');
        log('');
        
        // Open browser
        const dashboardUrl = `http://localhost:${webServer.port}`;
        log('Opening demo in your default browser...', 'cyan');
        setTimeout(() => openBrowser(dashboardUrl), 1000);
        
        log('');
        log('Press Ctrl+C to stop both servers', 'bright');
        log('');
        
        // Graceful shutdown
        const cleanup = () => {
            log('\\n🛑 Shutting down servers...', 'yellow');
            apiServer.process.kill();
            webServer.process.kill();
            log('✅ Servers stopped. Goodbye!', 'green');
            process.exit(0);
        };
        
        process.on('SIGINT', cleanup);
        process.on('SIGTERM', cleanup);
        
        // Keep process alive
        setInterval(() => {}, 1000);
        
    } catch (error) {
        log(`❌ Failed to start enhanced demo: ${error.message}`, 'red');
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { main };