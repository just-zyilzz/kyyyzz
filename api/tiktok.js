/**
 * API Endpoint: /api/tiktok
 * Download TikTok video menggunakan TikWM API
 */

const { tiktokDownloaderVideo } = require('../lib/tiktok');
const { getUserFromRequest } = require('../lib/session');
const { saveDownload } = require('../lib/db');

module.exports = async (req, res) => {
    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const { url, format = 'video', title } = req.body;

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
        // Download TikTok video
        const result = await tiktokDownloaderVideo(url);

        if (!result.status) {
            return res.status(500).json({
                success: false,
                error: 'Download gagal'
            });
        }

        // Get user from JWT (if logged in)
        const user = getUserFromRequest(req);

        // Determine download URL based on format
        let downloadUrl;
        let fileName;

        if (format === 'audio') {
            // Return music/audio URL
            downloadUrl = result.music_info.url;
            fileName = `${result.id}_audio.mp3`;
        } else {
            // Return video URL (HD no watermark by default)
            const videoData = result.data.find(d => d.type === 'nowatermark_hd') ||
                result.data.find(d => d.type === 'nowatermark') ||
                result.data[0];
            downloadUrl = videoData.url;
            fileName = `${result.id}.mp4`;
        }

        // Save to database history
        if (user && user.id) {
            try {
                await saveDownload(
                    user.id,
                    url,
                    title || result.title || '—',
                    'TikTok',
                    fileName
                );
            } catch (dbError) {
                console.error('Failed to save history:', dbError);
            }
        }

        // Return response
        res.json({
            success: true,
            title: result.title,
            author: result.author.nickname,
            thumbnail: result.cover,
            downloadUrl: downloadUrl,
            fileName: fileName,
            duration: result.duration,
            stats: result.stats,
            musicInfo: result.music_info
        });
    } catch (error) {
        console.error('❌ TikTok download error:', error.message);
        res.json({
            success: false,
            error: 'Download gagal. Coba lagi'
        });
    }
};
