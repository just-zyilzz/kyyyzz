/**
 * YouTube Proxy Download API
 * Fetches video/audio from googlevideo.com CDN and streams to user
 * with proper headers to force auto-download
 */

const https = require('https');
const http = require('http');

/**
 * Sanitize filename for Content-Disposition header
 */
function sanitizeFilename(filename) {
    return filename
        .replace(/[<>:"/\\|?*]/g, '') // Remove invalid chars
        .replace(/\s+/g, '_')         // Replace spaces with underscore
        .substring(0, 200);           // Limit length
}

/**
 * Main proxy handler
 * Query params:
 * - url: googlevideo.com URL (required)
 * - title: video title for filename (optional)
 * - type: 'video' or 'audio' (default: video)
 */
async function handler(req, res) {
    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({
            success: false,
            error: 'Method not allowed'
        });
    }

    const { url, title, type } = req.query;

    // Validate URL parameter
    if (!url) {
        return res.status(400).json({
            success: false,
            error: 'URL parameter is required'
        });
    }

    // Validate URL is from Google CDN
    try {
        const parsedUrl = new URL(url);
        const validHosts = [
            'googlevideo.com',
            'youtube.com',
            'ytimg.com',
            'ggpht.com'
        ];

        const isValidHost = validHosts.some(host =>
            parsedUrl.hostname.endsWith(host)
        );

        if (!isValidHost) {
            return res.status(400).json({
                success: false,
                error: 'Invalid URL: Only Google CDN URLs are allowed'
            });
        }
    } catch (e) {
        return res.status(400).json({
            success: false,
            error: 'Invalid URL format'
        });
    }

    // Determine file extension and content type
    const isAudio = type === 'audio';
    const extension = isAudio ? 'mp3' : 'mp4';
    const contentType = isAudio ? 'audio/mpeg' : 'video/mp4';

    // Create filename
    const baseTitle = title || 'download';
    const filename = sanitizeFilename(baseTitle) + '.' + extension;

    console.log(`[YouTube Proxy] Downloading: ${filename}`);
    console.log(`[YouTube Proxy] URL: ${url.substring(0, 100)}...`);

    return new Promise((resolve, reject) => {
        // Choose http or https based on URL
        const protocol = url.startsWith('https') ? https : http;

        // Fetch from CDN and stream to user
        const proxyRequest = protocol.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://www.youtube.com/',
                'Origin': 'https://www.youtube.com',
                'Accept': '*/*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Connection': 'keep-alive'
            }
        }, (proxyResponse) => {
            // Check if CDN returned success
            if (proxyResponse.statusCode !== 200) {
                console.error(`[YouTube Proxy] CDN returned: ${proxyResponse.statusCode}`);

                // If redirect, follow it
                if (proxyResponse.statusCode === 302 || proxyResponse.statusCode === 301) {
                    const redirectUrl = proxyResponse.headers.location;
                    console.log(`[YouTube Proxy] Following redirect to: ${redirectUrl}`);
                    proxyRequest.destroy();

                    // Recursive call to follow redirect
                    req.query.url = redirectUrl;
                    handler(req, res).then(resolve).catch(reject);
                    return;
                }

                res.status(502).json({
                    success: false,
                    error: `CDN returned status ${proxyResponse.statusCode}`
                });
                resolve();
                return;
            }

            // Set headers for auto-download
            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);

            // Forward content-length if available
            if (proxyResponse.headers['content-length']) {
                res.setHeader('Content-Length', proxyResponse.headers['content-length']);
            }

            // Allow range requests for video seeking
            res.setHeader('Accept-Ranges', 'bytes');

            // CORS headers
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

            console.log(`[YouTube Proxy] Streaming ${proxyResponse.headers['content-length'] || 'unknown'} bytes...`);

            // Pipe the response stream directly to client
            proxyResponse.pipe(res);

            // Handle stream end
            proxyResponse.on('end', () => {
                console.log(`[YouTube Proxy] Download complete: ${filename}`);
                resolve();
            });

            // Handle stream error
            proxyResponse.on('error', (error) => {
                console.error('[YouTube Proxy] Stream error:', error.message);
                reject(error);
            });
        });

        // Handle proxy request errors
        proxyRequest.on('error', (error) => {
            console.error('[YouTube Proxy] Request error:', error.message);

            if (!res.headersSent) {
                res.status(502).json({
                    success: false,
                    error: 'Failed to fetch from CDN: ' + error.message
                });
            }
            resolve();
        });

        // Set timeout (2 minutes for large files)
        proxyRequest.setTimeout(120000, () => {
            proxyRequest.destroy();
            if (!res.headersSent) {
                res.status(504).json({
                    success: false,
                    error: 'Request timeout'
                });
            }
            resolve();
        });
    });
}

module.exports = handler;
