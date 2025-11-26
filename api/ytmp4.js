/**
 * API Endpoint: /api/ytmp4
 * Download YouTube video dalam format MP4
 */

const { isValidUrl, detectPlatform } = require('../lib/utils');
const { downloadMedia } = require('../lib/ytdlp');
const { getUserFromRequest } = require('../lib/session');
const { saveDownload } = require('../lib/db');

module.exports = async (req, res) => {
    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const { url, title, platform } = req.body;

    // Validate URL
    if (!url || !isValidUrl(url)) {
        return res.status(400).json({
            success: false,
            error: 'URL tidak valid. Pastikan dimulai dengan https://'
        });
    }

    // Check if URL is YouTube
    const lowerUrl = url.toLowerCase();
    if (!lowerUrl.includes('youtube.com') && !lowerUrl.includes('youtu.be')) {
        return res.status(400).json({
            success: false,
            error: 'Endpoint ini hanya untuk YouTube. Gunakan /api/tiktok untuk TikTok'
        });
    }

    try {
        // Download video
        const result = await downloadMedia(url, 'video');

        // Get user from JWT (if logged in)
        const user = getUserFromRequest(req);

        // Save to database history
        if (user && user.id) {
            try {
                await saveDownload(
                    user.id,
                    url,
                    title || '—',
                    platform || detectPlatform(url),
                    result.fileName
                );
            } catch (dbError) {
                console.error('Failed to save history:', dbError);
            }
        }

        res.json(result);
    } catch (error) {
        console.error('❌ Download error:', error.message);
        res.json({
            success: false,
            error: 'Download gagal. Coba lagi'
        });
    }
};
