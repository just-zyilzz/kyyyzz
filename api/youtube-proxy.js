/**
 * YouTube Proxy Download API
 * Fetches video/audio from googlevideo.com CDN and streams to user
 * with proper headers to force auto-download
 */

const axios = require('axios');

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
module.exports = async (req, res) => {
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

    try {
        // Fetch from CDN with axios stream
        const response = await axios({
            method: 'GET',
            url: url,
            responseType: 'stream',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://www.youtube.com/',
                'Accept': '*/*'
            },
            maxRedirects: 5,
            timeout: 30000
        });

        // Set headers for auto-download
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        // Forward content-length if available
        if (response.headers['content-length']) {
            res.setHeader('Content-Length', response.headers['content-length']);
        }

        // CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

        console.log(`[YouTube Proxy] Streaming ${response.headers['content-length'] || 'unknown'} bytes...`);

        // Manually handle stream chunks (Vercel doesn't support .pipe())
        response.data.on('data', (chunk) => {
            res.write(chunk);
        });

        response.data.on('end', () => {
            res.end();
            console.log(`[YouTube Proxy] Download complete: ${filename}`);
        });

        response.data.on('error', (error) => {
            console.error('[YouTube Proxy] Stream error:', error.message);
            if (!res.headersSent) {
                res.status(502).json({
                    success: false,
                    error: 'Stream error: ' + error.message
                });
            }
        });

    } catch (error) {
        console.error('[YouTube Proxy] Error:', error.message);

        if (!res.headersSent) {
            return res.status(502).json({
                success: false,
                error: 'Failed to fetch video: ' + error.message
            });
        }
    }
};
