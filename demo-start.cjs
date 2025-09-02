#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

class IRISDemoStarter {
    constructor() {
        this.projectPath = process.cwd();
        this.serverProcess = null;
        this.port = 8080;
    }

    async startDemo() {
        console.log('🚀 Starting IRIS AI Orchestration System Demo');
        console.log('==============================================');
        console.log('');

        try {
            // Pre-flight checks
            await this.runPreflightChecks();
            
            // Start the web server
            await this.startWebServer();
            
            // Display demo information
            this.displayDemoInfo();
            
            // Handle graceful shutdown
            this.setupGracefulShutdown();
            
        } catch (error) {
            console.error('❌ Failed to start demo:', error.message);
            process.exit(1);
        }
    }

    async runPreflightChecks() {
        console.log('🔍 Running pre-flight checks...');
        
        // Check required files
        const requiredFiles = [
            'index.html',
            'styles.css',
            'iris-dashboard.js'
        ];

        for (const file of requiredFiles) {
            const filePath = path.join(this.projectPath, file);
            if (!fs.existsSync(filePath)) {
                throw new Error(`Required file missing: ${file}`);
            }
            console.log(`   ✅ ${file}`);
        }

        // Check for available port
        const isPortAvailable = await this.checkPort(this.port);
        if (!isPortAvailable) {
            console.log(`   ⚠️  Port ${this.port} is in use, trying ${this.port + 1}`);
            this.port = this.port + 1;
        }
        console.log(`   ✅ Port ${this.port} available`);
        
        console.log('✅ Pre-flight checks complete!');
        console.log('');
    }

    async checkPort(port) {
        return new Promise((resolve) => {
            const net = require('net');
            const server = net.createServer();
            
            server.listen(port, (err) => {
                if (err) {
                    resolve(false);
                } else {
                    server.once('close', () => {
                        resolve(true);
                    });
                    server.close();
                }
            });
            
            server.on('error', () => {
                resolve(false);
            });
        });
    }

    async startWebServer() {
        console.log('🌐 Starting web server...');
        
        // Try Python first (most common), then Node.js alternatives
        const serverCommands = [
            { cmd: 'python3', args: ['-m', 'http.server', this.port.toString()], name: 'Python 3' },
            { cmd: 'python', args: ['-m', 'http.server', this.port.toString()], name: 'Python 2' },
            { cmd: 'node', args: ['-e', this.getNodeServerCode()], name: 'Node.js' }
        ];

        for (const serverCmd of serverCommands) {
            try {
                console.log(`   Trying ${serverCmd.name}...`);
                this.serverProcess = spawn(serverCmd.cmd, serverCmd.args, {
                    cwd: this.projectPath,
                    stdio: ['ignore', 'pipe', 'pipe']
                });

                // Wait a moment to see if the process starts successfully
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        if (this.serverProcess && !this.serverProcess.killed) {
                            resolve();
                        } else {
                            reject(new Error('Server failed to start'));
                        }
                    }, 1000);

                    this.serverProcess.on('error', () => {
                        clearTimeout(timeout);
                        reject(new Error('Command not found'));
                    });

                    this.serverProcess.on('exit', (code) => {
                        clearTimeout(timeout);
                        if (code !== 0) {
                            reject(new Error(`Server exited with code ${code}`));
                        }
                    });
                });

                console.log(`   ✅ Web server started with ${serverCmd.name}`);
                return;

            } catch (error) {
                if (this.serverProcess) {
                    this.serverProcess.kill();
                    this.serverProcess = null;
                }
                console.log(`   ❌ ${serverCmd.name} failed: ${error.message}`);
            }
        }

        throw new Error('Could not start web server. Please install Python 3 or Node.js.');
    }

    getNodeServerCode() {
        return `
            const http = require('http');
            const fs = require('fs');
            const path = require('path');
            const url = require('url');
            
            const mimeTypes = {
                '.html': 'text/html',
                '.css': 'text/css',
                '.js': 'text/javascript',
                '.json': 'application/json'
            };
            
            const server = http.createServer((req, res) => {
                const parsedUrl = url.parse(req.url);
                let pathname = parsedUrl.pathname === '/' ? '/index.html' : parsedUrl.pathname;
                const filePath = path.join(__dirname, pathname);
                
                fs.readFile(filePath, (err, content) => {
                    if (err) {
                        res.writeHead(404, { 'Content-Type': 'text/plain' });
                        res.end('File not found');
                        return;
                    }
                    
                    const ext = path.extname(filePath);
                    const contentType = mimeTypes[ext] || 'text/plain';
                    
                    res.writeHead(200, { 'Content-Type': contentType });
                    res.end(content);
                });
            });
            
            server.listen(${this.port}, () => {
                console.log('Server running on port ${this.port}');
            });
        `;
    }

    displayDemoInfo() {
        const platform = os.platform();
        const openCmd = platform === 'darwin' ? 'open' : 
                       platform === 'win32' ? 'start' : 
                       'xdg-open';

        console.log('🎉 IRIS Demo Server Started Successfully!');
        console.log('=====================================');
        console.log('');
        console.log('📊 Demo Dashboard:');
        console.log(`   🌐 Local URL: http://localhost:${this.port}`);
        console.log(`   🌐 Network URL: http://${this.getLocalIP()}:${this.port}`);
        console.log('');
        console.log('🎭 Demo Features Available:');
        console.log('   • Real-time system health monitoring');
        console.log('   • Interactive query interface');
        console.log('   • Provider health visualization');
        console.log('   • Neural learning demonstrations');
        console.log('   • Smart failover simulations');
        console.log('   • Security threat testing');
        console.log('   • Response time analytics');
        console.log('');
        console.log('🎯 Demo Scenarios:');
        console.log('   1. Submit queries to see AI provider routing');
        console.log('   2. Click "Run Health Check" to test system status');
        console.log('   3. Click "Simulate Failover" to see smart routing');
        console.log('   4. Click "Test Security" to demonstrate threat detection');
        console.log('   5. Click "Neural Learning" to show adaptive intelligence');
        console.log('');
        console.log('🎮 Demo Controls:');
        console.log('   • Theme toggle (light/dark mode)');
        console.log('   • Real-time metrics updates every 5 seconds');
        console.log('   • Interactive charts and visualizations');
        console.log('   • Live activity log');
        console.log('');
        console.log(`💡 To open automatically: ${openCmd} http://localhost:${this.port}`);
        console.log('');
        console.log('Press Ctrl+C to stop the demo server');
        console.log('');

        // Try to open browser automatically
        try {
            spawn(openCmd, [`http://localhost:${this.port}`], {
                detached: true,
                stdio: 'ignore'
            }).unref();
            console.log('🚀 Opening demo in your default browser...');
        } catch (error) {
            console.log('💻 Please manually open your browser and navigate to the URL above');
        }
    }

    getLocalIP() {
        const interfaces = os.networkInterfaces();
        for (const name of Object.keys(interfaces)) {
            for (const iface of interfaces[name]) {
                if (iface.family === 'IPv4' && !iface.internal) {
                    return iface.address;
                }
            }
        }
        return 'localhost';
    }

    setupGracefulShutdown() {
        const shutdown = () => {
            console.log('\n');
            console.log('🛑 Shutting down IRIS demo server...');
            
            if (this.serverProcess) {
                this.serverProcess.kill('SIGTERM');
                console.log('✅ Demo server stopped successfully');
            }
            
            console.log('👋 Thank you for trying IRIS AI Orchestration System!');
            process.exit(0);
        };

        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);
        process.on('SIGHUP', shutdown);
    }
}

// Start the demo if this script is run directly
if (require.main === module) {
    const demo = new IRISDemoStarter();
    demo.startDemo().catch(error => {
        console.error('Failed to start demo:', error);
        process.exit(1);
    });
}

module.exports = { IRISDemoStarter };