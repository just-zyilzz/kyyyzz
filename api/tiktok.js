/**
 * API Endpoint: /api/tiktok
 * Download TikTok video menggunakan TikWM API
 * Also handles metadata-only requests via ?metadata=true
 */

const { tiktokDownloaderVideo } = require('../lib/tiktok');

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
    const title = req.method === 'POST' ? req.body.title : req.query.title;

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

    // Check if this is a metadata-only request
    const metadataOnly = req.query.metadata === 'true';

    if (metadataOnly) {
        try {
            console.log('📋 TikTok metadata request for:', url);
            const result = await tiktokDownloaderVideo(url);
            if (result.status) {
                console.log('✅ TikTok metadata success:', result.title);
                return res.json({
                    success: true,
                    title: result.title,
                    author: result.author?.nickname || 'Unknown',
                    thumbnail: result.cover,
                    thumbnailUrl: result.cover,
                    duration: result.duration,
                    stats: result.stats,
                    platform: 'TikTok'
                });
            } else {
                console.log('⚠️ TikTok API returned no data');
                return res.json({
                    success: true,
                    title: 'TikTok Video',
                    thumbnail: null,
                    platform: 'TikTok'
                });
            }
        } catch (error) {
            console.error('❌ TikTok metadata error:', error.message);
            return res.json({
                success: true,
                title: 'TikTok Video',
                thumbnail: null,
                platform: 'TikTok'
            });
        }
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
            // FIX: Improved video selection with better validation
            let videoData = result.data.find(d => d.type === 'nowatermark_hd');
            if (!videoData) {
                videoData = result.data.find(d => d.type === 'nowatermark');
            }
            if (!videoData) {
                videoData = result.data.find(d => d.url); // Any video with URL
            }
            if (!videoData || !videoData.url) {
                return res.status(500).json({
                    success: false,
                    error: 'URL video tidak tersedia'
                });
            }

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
