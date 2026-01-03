/**
 * Proxy endpoint for downloading Instagram media
 * Handles CORS issues by proxying the download through backend
 */

const axios = require('axios');

module.exports = async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ success: false, error: 'URL parameter required' });
    }

    try {
        // Fetch the media from Instagram CDN
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://www.instagram.com/',
                'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8'
            },
            timeout: 30000
        });

        // Determine content type
        const contentType = response.headers['content-type'] || 'application/octet-stream';

        // Set appropriate headers for download
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', 'attachment');
        res.setHeader('Cache-Control', 'public, max-age=86400');

        // Send the file
        res.send(Buffer.from(response.data));
    } catch (error) {
        console.error('Instagram proxy download error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to download media: ' + error.message
        });
    }
};
