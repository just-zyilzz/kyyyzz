/**
 * Pinterest Image Proxy
 * Bypass CORS restrictions for Pinterest thumbnail images
 */

module.exports = async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle OPTIONS preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({ error: 'Missing url parameter' });
        }

        // Validate Pinterest URL
        if (!url.includes('pinimg.com') && !url.includes('pinterest.com')) {
            return res.status(400).json({ error: 'Invalid Pinterest image URL' });
        }

        // Fetch image from Pinterest
        const axios = require('axios');
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://www.pinterest.com/',
                'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8'
            },
            timeout: 10000,
            maxRedirects: 5
        });

        // Determine content type
        const contentType = response.headers['content-type'] || 'image/jpeg';

        // Set cache headers for performance
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
        res.setHeader('Content-Length', response.data.length);

        // Send image data
        return res.status(200).send(Buffer.from(response.data));

    } catch (error) {
        console.error('Pinterest proxy error:', error.message);

        // Return transparent 1x1 pixel as fallback
        const transparentPixel = Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            'base64'
        );

        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'no-cache');
        return res.status(200).send(transparentPixel);
    }
};
