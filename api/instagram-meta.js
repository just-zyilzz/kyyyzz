/**
 * API Endpoint: /api/instagram-meta
 * Get Instagram media metadata (thumbnail, caption)
 */

const { instagramDownload } = require('../lib/scrapers');
const Instagram = require('../lib/instagram');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const { url } = req.body;

    if (!url) {
        return res.status(400).json({
            success: false,
            error: 'URL tidak boleh kosong'
        });
    }

    const lowerUrl = url.toLowerCase();
    if (!lowerUrl.includes('instagram.com')) {
        return res.status(400).json({
            success: false,
            error: 'Endpoint ini hanya untuk Instagram'
        });
    }

    try {
        // Try to get metadata
        let result;

        try {
            result = await Instagram(url);
        } catch (e) {
            console.log('Primary method failed, trying fallback...');
            result = await instagramDownload(url);
        }

        // Extract thumbnail from result
        let thumbnail = null;
        let caption = 'Instagram Media';

        if (result.metadata) {
            thumbnail = result.metadata.thumbnail;
            caption = result.metadata.caption || result.metadata.username || caption;
        } else if (result.url && Array.isArray(result.url)) {
            // Use first URL as thumbnail (usually it's the image/video)
            thumbnail = result.url[0];
        } else if (result.urls && Array.isArray(result.urls)) {
            thumbnail = result.urls[0];
        }

        res.json({
            success: true,
            title: caption,
            thumbnail: thumbnail,
            platform: 'Instagram'
        });
    } catch (error) {
        console.error('❌ Instagram metadata error:', error.message);
        res.json({
            success: false,
            error: 'Gagal mengambil metadata Instagram'
        });
    }
};
