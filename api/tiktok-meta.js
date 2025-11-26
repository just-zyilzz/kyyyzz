/**
 * API Endpoint: /api/tiktok/meta
 * Get TikTok video metadata (thumbnail, title, stats)
 */

const { tiktokDownloaderVideo } = require('../lib/tiktok');

module.exports = async (req, res) => {
    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const { url } = req.body;

    // Validate URL
    if (!url) {
        return res.status(400).json({
            success: false,
            error: 'URL tidak boleh kosong'
        });
    }

    // Check if URL is TikTok
    const lowerUrl = url.toLowerCase();
    if (!lowerUrl.includes('tiktok.com') && !lowerUrl.includes('vt.tiktok.com') && !lowerUrl.includes('vm.tiktok.com')) {
        return res.status(400).json({
            success: false,
            error: 'Endpoint ini hanya untuk TikTok'
        });
    }

    try {
        // Get TikTok metadata
        const result = await tiktokDownloaderVideo(url);

        if (!result.status) {
            return res.status(500).json({
                success: false,
                error: 'Gagal mengambil metadata'
            });
        }

        // Return metadata only
        res.json({
            success: true,
            title: result.title,
            author: result.author.nickname,
            thumbnail: result.cover,
            duration: result.durations,
            stats: result.stats,
            platform: 'TikTok'
        });
    } catch (error) {
        console.error('❌ TikTok metadata error:', error.message);
        res.json({
            success: false,
            error: 'Gagal mengambil metadata TikTok'
        });
    }
};
