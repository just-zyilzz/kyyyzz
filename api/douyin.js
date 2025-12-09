/**
 * API Endpoint: /api/douyin
 * Download Douyin (Chinese TikTok) video using SnapDouyin API
 * Supports both GET and POST methods
 * Also handles metadata-only requests via ?metadata=true
 */

const { downloadDouyinVideo } = require('../lib/douyin');

module.exports = async (req, res) => {
    // Allow both GET and POST
    if (req.method !== 'POST' && req.method !== 'GET') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    // Get parameters from POST body or GET query params
    const url = req.method === 'POST' ? req.body.url : req.query.url;
    const format = req.method === 'POST'
        ? (req.body.format || 'video')
        : (req.query.format || 'video');

    // Validate URL
    if (!url) {
        return res.status(400).json({
            success: false,
            error: 'URL tidak boleh kosong'
        });
    }

    // Check if URL is Douyin
    const lowerUrl = url.toLowerCase();
    if (!lowerUrl.includes('douyin.com') && !lowerUrl.includes('v.douyin.com')) {
        return res.status(400).json({
            success: false,
            error: 'Endpoint ini hanya untuk Douyin'
        });
    }

    // Check if this is a metadata-only request
    const metadataOnly = req.query.metadata === 'true';

    if (metadataOnly) {
        try {
            const result = await downloadDouyinVideo(url);
            if (result.status) {
                return res.json({
                    success: true,
                    title: result.title,
                    author: result.author?.nickname || 'Unknown',
                    thumbnail: result.cover,
                    duration: result.duration,
                    stats: result.stats,
                    platform: 'Douyin'
                });
            } else {
                return res.json({
                    success: true,
                    title: 'Douyin Video',
                    thumbnail: null,
                    platform: 'Douyin'
                });
            }
        } catch (error) {
            return res.json({
                success: true,
                title: 'Douyin Video',
                thumbnail: null,
                platform: 'Douyin'
            });
        }
    }

    try {
        // Download Douyin video
        const result = await downloadDouyinVideo(url);

        if (!result.status) {
            return res.status(500).json({
                success: false,
                error: 'Download gagal'
            });
        }

        // Validate download URL
        if (!result.downloadUrl) {
            return res.status(500).json({
                success: false,
                error: 'URL video tidak tersedia'
            });
        }

        const fileName = `douyin_${result.id || Date.now()}.mp4`;

        // Return response
        res.json({
            success: true,
            title: result.title,
            author: result.author?.nickname || 'Unknown',
            thumbnail: result.cover,
            downloadUrl: result.downloadUrl,
            fileName: fileName,
            duration: result.duration,
            stats: result.stats,
            allMedias: result.data // All available media formats
        });
    } catch (error) {
        console.error('❌ Douyin download error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Download gagal. Coba lagi'
        });
    }
};
