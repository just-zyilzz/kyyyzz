/**
 * Hybrid Server - Works on both Vercel and Localhost
 * 
 * Vercel: Exports serverless function handler
 * Localhost: Runs HTTP server on port 3000
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// import api production

// Import API handlers
const downloadHandler = require('./downloaders/download');
const utilityHandler = require('./utils/utility');
const pinterestProxyHandler = require('./pinterest-proxy');
const spotifyProxyHandler = require('./spotify-proxy');
const authHandler = require('./auth');
const userHandler = require('./user');

// MIME types for static files
const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf'
};

// Parse request body
function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (e) {
                resolve({});
            }
        });
        req.on('error', reject);
    });
}

// Create Vercel-like request/response objects
function createVercelReq(req, parsedUrl, body) {
    return {
        method: req.method,
        url: req.url,
        headers: req.headers,
        query: Object.fromEntries(parsedUrl.searchParams),
        body: body,
        cookies: {}
    };
}

function createVercelRes(res) {
    const vercelRes = {
        statusCode: 200,
        headers: {},

        status(code) {
            this.statusCode = code;
            return this;
        },

        setHeader(key, value) {
            this.headers[key] = value;
            return this;
        },

        json(data) {
            this.setHeader('Content-Type', 'application/json');
            Object.entries(this.headers).forEach(([k, v]) => res.setHeader(k, v));
            res.writeHead(this.statusCode);
            res.end(JSON.stringify(data));
        },

        send(data) {
            Object.entries(this.headers).forEach(([k, v]) => res.setHeader(k, v));
            res.writeHead(this.statusCode);
            res.end(data);
        },

        end(data) {
            Object.entries(this.headers).forEach(([k, v]) => res.setHeader(k, v));
            res.writeHead(this.statusCode);
            res.end(data);
        },

        redirect(url) {
            res.writeHead(302, { Location: url });
            res.end();
        }
    };
    return vercelRes;
}

// Serve static files
function serveStaticFile(res, filePath) {
    const publicDir = path.join(__dirname, '..', 'public');
    let fullPath = path.join(publicDir, filePath);

    // Default to index.html
    if (filePath === '/' || filePath === '') {
        fullPath = path.join(publicDir, 'index.html');
    }

    // Handle /donate route
    if (filePath === '/donate' || filePath === '/donate/') {
        fullPath = path.join(publicDir, 'donate.html');
    }

    // Check if file exists
    if (!fs.existsSync(fullPath)) {
        // Try serving index.html for SPA routing
        fullPath = path.join(publicDir, 'index.html');
        if (!fs.existsSync(fullPath)) {
            res.writeHead(404);
            res.end('Not Found');
            return;
        }
    }

    // Check if it's a directory, serve index.html
    if (fs.statSync(fullPath).isDirectory()) {
        fullPath = path.join(fullPath, 'index.html');
    }

    const ext = path.extname(fullPath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(fullPath, (err, data) => {
        if (err) {
            res.writeHead(500);
            res.end('Internal Server Error');
            return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
}

// Route API requests
async function handleApiRequest(req, res, pathname, body) {
    const vercelReq = createVercelReq(req, new URL(req.url, `http://${req.headers.host}`), body);
    const vercelRes = createVercelRes(res);

    // Add CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    try {
        if (pathname.startsWith('/api/downloaders/download')) {
            await downloadHandler.handler(vercelReq, vercelRes);
        } else if (pathname.startsWith('/api/utils/utility')) {
            await utilityHandler(vercelReq, vercelRes);
        } else if (pathname.startsWith('/api/pinterest-proxy')) {
            await pinterestProxyHandler(vercelReq, vercelRes);
        } else if (pathname.startsWith('/api/spotify-proxy')) {
            await spotifyProxyHandler(vercelReq, vercelRes);
        } else if (pathname.startsWith('/api/youtube-proxy')) {
            await downloadHandler.proxyYouTube(vercelReq, vercelRes);
        } else if (pathname.startsWith('/api/auth')) {
            await authHandler(vercelReq, vercelRes);
        } else if (pathname.startsWith('/api/user')) {
            await userHandler(vercelReq, vercelRes);
        } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'API endpoint not found' }));
        }
    } catch (error) {
        console.error('API Error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error', message: error.message }));
    }
}

// Main request handler
async function requestHandler(req, res) {
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const pathname = parsedUrl.pathname;

    console.log(`${req.method} ${pathname}`);

    // Handle API routes
    if (pathname.startsWith('/api/')) {
        const body = await parseBody(req);
        await handleApiRequest(req, res, pathname, body);
        return;
    }

    // Serve static files
    serveStaticFile(res, pathname);
}

// Check if running directly (localhost) or imported (Vercel)
if (require.main === module) {
    // Running directly - start HTTP server
    const PORT = process.env.PORT || 3000;
    const server = http.createServer(requestHandler);

    server.listen(PORT, () => {
        console.log('');
        console.log('╔════════════════════════════════════════════════════════╗');
        console.log('║       Media Downloader - Local Development Server      ║');
        console.log('╠════════════════════════════════════════════════════════╣');
        console.log(`║  🌐 Server running at: http://localhost:${PORT}            ║`);
        console.log('║  📁 Serving static files from: /public                 ║');
        console.log('║  🔌 API endpoints available at: /api/*                 ║');
        console.log('╠════════════════════════════════════════════════════════╣');
        console.log('║  Press Ctrl+C to stop the server                       ║');
        console.log('╚════════════════════════════════════════════════════════╝');
        console.log('');
    });
} else {
    // Imported as module (Vercel)
    module.exports = async (req, res) => {
        res.setHeader('Content-Type', 'text/html');
        res.status(200).send(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta http-equiv="refresh" content="0; url=/public/index.html">
            </head>
            <body>
                Redirecting...
            </body>
            </html>
        `);
    };
}
