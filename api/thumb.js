/**
 * API Endpoint: /api/thumb
 * Get metadata dan thumbnail dari URL
 */

const { isValidUrl, isSupportedPlatform } = require('../lib/utils');
const { getMetadata } = require('../lib/ytdlp');

module.exports = async (req, res) => {
    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const { url } = req.body;

    // Validate URL
    if (!url || !isValidUrl(url)) {
        return res.status(400).json({
            success: false,
            error: 'URL tidak valid. Pastikan dimulai dengan https://'
        });
    }

    // Check supported platform
    if (!isSupportedPlatform(url)) {
        return res.status(400).json({
            success: false,
            error: 'Hanya YouTube, TikTok, Facebook, dan Instagram Reels yang didukung'
        });
    }

    try {
        const metadata = await getMetadata(url);

        // Store in session/cookie for later use (optional)
        // For serverless, we can pass this data in subsequent requests

        res.json(metadata);
    } catch (error) {
        console.error('❌ Metadata error:', error.message);
        res.json({
            success: false,
            error: 'Gagal ambil metadata. Cek URL valid?'
        });
    }
};
