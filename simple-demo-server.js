#!/usr/bin/env node

/**
 * Simple IRIS Demo Server
 * Serves the dashboard files for testing Phase 1 visual indicators
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;

// MIME types
const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    let filePath = req.url === '/' ? '/index.html' : req.url;
    
    // Handle test page request
    if (req.url === '/test') {
        filePath = '/test-visual-indicators.html';
    }
    
    const fullPath = path.join(__dirname, filePath);
    const ext = path.extname(fullPath);
    const contentType = mimeTypes[ext] || 'text/plain';

    fs.readFile(fullPath, (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404, {'Content-Type': 'text/html'});
                res.end(`
                    <!DOCTYPE html>
                    <html>
                    <head><title>IRIS Demo - 404</title></head>
                    <body>
                        <h1>🤖 IRIS Demo Server</h1>
                        <h2>404 - File Not Found</h2>
                        <p><strong>Requested:</strong> ${req.url}</p>
                        <p><strong>Available URLs:</strong></p>
                        <ul>
                            <li><a href="/">Main Dashboard</a> - Full IRIS demo interface</li>
                            <li><a href="/test">Test Page</a> - Phase 1 visual indicators test</li>
                        </ul>
                        <p><em>Make sure you're in the correct directory with index.html</em></p>
                    </body>
                    </html>
                `);
            } else {
                res.writeHead(500);
                res.end('Server Error');
            }
        } else {
            res.writeHead(200, {'Content-Type': contentType});
            res.end(data);
        }
    });
});

server.listen(PORT, () => {
    console.log('🚀 IRIS Demo Server Starting...');
    console.log('================================');
    console.log(`📊 Main Dashboard: http://localhost:${PORT}/`);
    console.log(`🧪 Test Page:      http://localhost:${PORT}/test`);
    console.log('================================');
    console.log('✅ Server ready! Open the URLs above in your browser.');
    console.log('');
    console.log('🎯 What to expect:');
    console.log('   • Live Provider Activity indicators');
    console.log('   • Query Flow visualization');
    console.log('   • Interactive test controls');
    console.log('   • Real-time status updates');
    console.log('');
    console.log('Press Ctrl+C to stop the server');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down IRIS Demo Server...');
    server.close(() => {
        console.log('✅ Server stopped. Goodbye!');
        process.exit(0);
    });
});