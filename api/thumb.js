/**
 * API Endpoint: /api/thumb
 * Get YouTube video thumbnail and metadata
 */

const savetube = require('../lib/savetube');

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

    // Check if URL is YouTube
    const lowerUrl = url.toLowerCase();
    if (!lowerUrl.includes('youtube.com') && !lowerUrl.includes('youtu.be')) {
        return res.status(400).json({
            success: false,
            error: 'Endpoint ini hanya untuk YouTube'
        });
    }

    try {
        // Use lightweight metadata extraction (don't download full quality)
        // Using lowest quality for speed - we only need metadata
        const result = await savetube.download(url, '144');

        if (!result.status) {
            return res.status(result.code || 500).json({
                success: false,
                error: result.error || 'Gagal mengambil info video'
            });
        }

        // Return metadata quickly
        res.json({
            success: true,
            title: result.result.title,
            thumbnail: result.result.thumbnail,
            thumbnailUrl: result.result.thumbnail,
            duration: result.result.duration,
            platform: 'YouTube',
            id: result.result.id
        });
    } catch (error) {
        console.error('❌ Thumbnail error:', error.message);
        // Fast fail
        res.json({
            success: true,
            title: 'YouTube Video',
            thumbnail: null,
            platform: 'YouTube'
        });
    }
};
