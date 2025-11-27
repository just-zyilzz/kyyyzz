/**
 * API Endpoint: /api/tiktok
 * Download TikTok video menggunakan TikWM API
 */

const { tiktokDownloaderVideo } = require('../lib/tiktok');

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

        // Determine download URL based on format
        let downloadUrl;
        let fileName;

        if (format === 'audio') {
            // FIX: Add null check for music_info
            if (!result.music_info || !result.music_info.url) {
                return res.status(500).json({
                    success: false,
                    error: 'Audio tidak tersedia untuk video ini'
                });
            }
            downloadUrl = result.music_info.url;
            fileName = `${result.id || Date.now()}_audio.mp3`;
        } else {
            // FIX: Add null check for data array
            if (!result.data || !Array.isArray(result.data) || result.data.length === 0) {
                return res.status(500).json({
                    success: false,
                    error: 'Video tidak tersedia'
                });
            }

            // Return video URL (HD no watermark by default)
            const videoData = result.data.find(d => d.type === 'nowatermark_hd') ||
                result.data.find(d => d.type === 'nowatermark') ||
                result.data[0];
            downloadUrl = videoData.url;
            fileName = `${result.id || Date.now()}.mp4`;
        }

        // Return response
        res.json({
            success: true,
            title: result.title,
            author: result.author?.nickname || 'Unknown',
            thumbnail: result.cover,
            downloadUrl: downloadUrl,
            fileName: fileName,
            duration: result.duration,
            stats: result.stats,
            musicInfo: result.music_info
        });
    } catch (error) {
        console.error('❌ TikTok download error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Download gagal. Coba lagi'
        });
    }
};
