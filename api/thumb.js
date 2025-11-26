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
        // Get metadata using savetube (download with any format just to get info)
        const result = await savetube.download(url, '720');

        if (!result.status) {
            return res.status(result.code).json({
                success: false,
                error: result.error
            });
        }

        // Return metadata
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
        res.status(500).json({
            success: false,
            error: 'Gagal mengambil info video'
        });
    }
};
