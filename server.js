const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;

// MIME types mapping
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'font/otf',
    '.webm': 'video/webm',
    '.mp4': 'video/mp4',
    '.mp3': 'audio/mpeg'
};

// API route handlers
const apiHandlers = {
    '/api/auth': require('./api/auth.js'),
    '/api/user': require('./api/user.js'),
    '/api/downloaders/download': require('./api/downloaders/download.js'),
    '/api/utils/utility': require('./api/utils/utility.js'),
    '/api/pinterest-proxy': require('./api/pinterest-proxy.js')
};

const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // Handle API routes
    if (pathname.startsWith('/api/')) {
        // Find matching API handler
        for (const [route, handler] of Object.entries(apiHandlers)) {
            if (pathname === route || pathname.startsWith(route + '/')) {
                try {
                    // Create mock Vercel request/response objects
                    req.query = parsedUrl.query;

                    // Collect body for POST requests
                    if (req.method === 'POST' || req.method === 'PUT') {
                        let body = '';
                        req.on('data', chunk => {
                            body += chunk.toString();
                        });

                        await new Promise(resolve => {
                            req.on('end', () => {
                                try {
                                    req.body = JSON.parse(body);
                                } catch (e) {
                                    req.body = body;
                                }
                                resolve();
                            });
                        });
                    }

                    // Call the API handler
                    await handler(req, res);
                    return;
                } catch (error) {
                    console.error('API Error:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: error.message }));
                    return;
                }
            }
        }

        // API route not found
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'API endpoint not found' }));
        return;
    }

    // Serve static files from public directory
    let filePath = path.join(__dirname, 'public', pathname === '/' ? 'index.html' : pathname);

    // Check if file exists
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            // File not found, serve index.html for SPA routing
            filePath = path.join(__dirname, 'public', 'index.html');
        }

        // Read and serve the file
        fs.readFile(filePath, (error, content) => {
            if (error) {
                if (error.code === 'ENOENT') {
                    res.writeHead(404, { 'Content-Type': 'text/html' });
                    res.end('<h1>404 - File Not Found</h1>', 'utf-8');
                } else {
                    res.writeHead(500);
                    res.end('Server Error: ' + error.code);
                }
            } else {
                const extname = String(path.extname(filePath)).toLowerCase();
                const contentType = mimeTypes[extname] || 'application/octet-stream';

                res.writeHead(200, {
                    'Content-Type': contentType,
                    'Cache-Control': 'no-cache, no-store, must-revalidate'
                });
                res.end(content, 'utf-8');
            }
        });
    });
});

server.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}/`);
    console.log(`📁 Serving files from: ${path.join(__dirname, 'public')}`);
    console.log(`🔌 API endpoints available at /api/*`);
});
