/**
 * Consolidated Download API
 * Single endpoint for all platform downloaders
 * Replaces 7 separate endpoints to avoid Vercel's 12 function limit
 * 
 * Supported platforms:
 * - youtube (YouTube video)
 * - youtube-audio (YouTube MP3)
 * - tiktok (TikTok video/photos)
 * - instagram (Instagram posts/reels/stories)
 * - douyin (Douyin videos)
 * - twitter (Twitter/X videos)
 * - spotify (Spotify tracks)
 * - pinterest (Pinterest images/videos)
 * 
 * Usage: GET/POST /api/download?platform=youtube&url=...
 */

const savetube = require('../../lib/savetube');
const { tiktokDownloaderVideo } = require('../../lib/tiktok');
const Instagram = require('../../lib/instagram');
const { instagramDownload } = require('../../lib/scrapers');
const { getUserFromRequest } = require('../../lib/session');
const { saveDownload } = require('../../lib/db');
const { downloadDouyinVideo } = require('../../lib/douyin');
const { downloadTwitterVideo } = require('../../lib/twitter');
const { getSpotifyMetadata } = require('../../lib/spotify');
const { savePin } = require('../../lib/pinterest');
const ytSearch = require('yt-search');
const axios = require('axios');

// ======================== YOUTUBE VIDEO ========================
async function handleYouTube(req, res) {
    const url = req.method === 'POST' ? req.body.url : req.query.url;
    const quality = req.method === 'POST' ? (req.body.quality || '720') : (req.query.quality || '720');

    if (!url) {
        return res.status(400).json({ success: false, error: 'URL tidak boleh kosong' });
    }

    const lowerUrl = url.toLowerCase();
    if (!lowerUrl.includes('youtube.com') && !lowerUrl.includes('youtu.be')) {
        return res.status(400).json({ success: false, error: 'URL bukan YouTube' });
    }

    try {
        const result = await savetube.download(url, quality);

        if (!result.status || !result.result) {
            return res.status(result.code || 500).json({
                success: false,
                error: result.error || 'Download gagal'
            });
        }

        res.json({
            success: true,
            title: result.result.title || 'YouTube Video',
            thumbnail: result.result.thumbnail || null,
            downloadUrl: result.result.download,
            fileName: (result.result.id || Date.now()) + '.mp4',
            quality: result.result.quality || quality,
            duration: result.result.duration || 0
        });
    } catch (error) {
        console.error('❌ YouTube download error:', error.message);
        res.status(500).json({ success: false, error: 'Download gagal. Coba lagi' });
    }
}

// ======================== YOUTUBE AUDIO ========================
async function handleYouTubeAudio(req, res) {
    const url = req.method === 'POST' ? req.body.url : req.query.url;

    if (!url) {
        return res.status(400).json({ success: false, error: 'URL tidak boleh kosong' });
    }

    const lowerUrl = url.toLowerCase();
    if (!lowerUrl.includes('youtube.com') && !lowerUrl.includes('youtu.be')) {
        return res.status(400).json({ success: false, error: 'URL bukan YouTube' });
    }

    try {
        const result = await savetube.download(url, 'mp3');

        if (!result.status || !result.result) {
            return res.status(result.code || 500).json({
                success: false,
                error: result.error || 'Download gagal'
            });
        }

        res.json({
            success: true,
            title: result.result.title || 'YouTube Audio',
            thumbnail: result.result.thumbnail || null,
            downloadUrl: result.result.download,
            fileName: (result.result.id || Date.now()) + '.mp3',
            format: 'mp3',
            duration: result.result.duration || 0
        });
    } catch (error) {
        console.error('❌ YouTube audio download error:', error.message);
        res.status(500).json({ success: false, error: 'Download gagal. Coba lagi' });
    }
}

// ======================== TIKTOK ========================
async function handleTikTok(req, res) {
    const url = req.method === 'POST' ? req.body.url : req.query.url;
    const format = req.method === 'POST' ? (req.body.format || 'video') : (req.query.format || 'video');

    if (!url) {
        return res.status(400).json({ success: false, error: 'URL tidak boleh kosong' });
    }

    const lowerUrl = url.toLowerCase();
    if (!lowerUrl.includes('tiktok.com') && !lowerUrl.includes('vt.tiktok.com') && !lowerUrl.includes('vm.tiktok.com')) {
        return res.status(400).json({ success: false, error: 'URL bukan TikTok' });
    }

    const metadataOnly = req.query.metadata === 'true' || req.body.metadata === true;

    if (metadataOnly) {
        try {
            const result = await tiktokDownloaderVideo(url);
            if (result.status) {
                const isPhotoSlides = result.data && result.data.length > 0 && result.data[0].type === 'photo';
                const thumbnailUrl = result.cover || null;

                return res.json({
                    success: true,
                    title: result.title,
                    author: result.author?.nickname || 'Unknown',
                    thumbnail: thumbnailUrl,
                    thumbnailUrl: thumbnailUrl,
                    duration: result.duration,
                    stats: result.stats,
                    platform: 'TikTok',
                    isPhotoSlides: isPhotoSlides,
                    photoCount: isPhotoSlides ? result.data.length : 0
                });
            } else {
                return res.json({ success: true, title: 'TikTok Video', thumbnail: null, platform: 'TikTok' });
            }
        } catch (error) {
            return res.json({ success: true, title: 'TikTok Video', thumbnail: null, platform: 'TikTok' });
        }
    }

    try {
        const result = await tiktokDownloaderVideo(url);

        if (!result.status) {
            return res.status(500).json({ success: false, error: 'Download gagal' });
        }

        const isPhotoSlides = result.data && result.data.length > 0 && result.data[0].type === 'photo';

        if (isPhotoSlides) {
            const photoUrls = result.data.map(item => item.url);
            return res.json({
                success: true,
                title: result.title,
                author: result.author?.nickname || 'Unknown',
                thumbnail: result.cover,
                isPhotoSlides: true,
                photoUrls: photoUrls,
                photoCount: photoUrls.length,
                fileName: `${result.id || Date.now()}_photos`,
                duration: result.duration,
                stats: result.stats,
                musicInfo: result.music_info
            });
        }

        let downloadUrl, fileName;

        if (format === 'audio') {
            if (!result.music_info || !result.music_info.url) {
                return res.status(500).json({ success: false, error: 'Audio tidak tersedia untuk video ini' });
            }
            downloadUrl = `/api/utils/utility?action=tiktok-proxy&url=${encodeURIComponent(result.music_info.url)}&type=audio`;
            fileName = `${result.id || Date.now()}_audio.mp3`;
        } else {
            if (!result.data || !Array.isArray(result.data) || result.data.length === 0) {
                return res.status(500).json({ success: false, error: 'Video tidak tersedia' });
            }

            let videoData = result.data.find(d => d.type === 'nowatermark_hd') ||
                result.data.find(d => d.type === 'nowatermark') ||
                result.data.find(d => d.url);

            if (!videoData || !videoData.url) {
                return res.status(500).json({ success: false, error: 'URL video tidak tersedia' });
            }

            downloadUrl = videoData.url;
            fileName = `${result.id || Date.now()}.mp4`;
        }

        res.json({
            success: true,
            title: result.title,
            author: result.author?.nickname || 'Unknown',
            thumbnail: result.cover,
            downloadUrl: downloadUrl,
            fileName: fileName,
            isPhotoSlides: false,
            duration: result.duration,
            stats: result.stats,
            musicInfo: result.music_info
        });
    } catch (error) {
        console.error('❌ TikTok download error:', error.message);
        res.status(500).json({ success: false, error: 'Download gagal. Coba lagi' });
    }
}

// ======================== INSTAGRAM ========================
async function getInstagramMetadata(url) {
    try {
        const postId = url.match(/\/p\/([^/?]+)/)?.[1] || url.match(/\/reel\/([^/?]+)/)?.[1];

        if (postId) {
            try {
                const oembedUrl = `https://graph.instagram.com/oembed?url=https://www.instagram.com/p/${postId}/`;
                const { data } = await axios.get(oembedUrl, {
                    timeout: 3000,
                    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' }
                });

                return {
                    success: true,
                    title: data.title || 'Instagram Post',
                    thumbnail: data.thumbnail_url,
                    author: data.author_name,
                    platform: 'Instagram'
                };
            } catch (error) {
                console.log('Instagram oembed timeout');
            }
        }

        return { success: true, title: 'Instagram Media', thumbnail: null, platform: 'Instagram' };
    } catch (error) {
        return { success: true, title: 'Instagram Media', thumbnail: null, platform: 'Instagram' };
    }
}

async function handleInstagram(req, res) {
    const url = req.method === 'POST' ? req.body.url : req.query.url;
    const title = req.method === 'POST' ? req.body.title : req.query.title;

    if (!url) {
        return res.status(400).json({ success: false, error: 'URL tidak boleh kosong' });
    }

    const lowerUrl = url.toLowerCase();
    if (!lowerUrl.includes('instagram.com')) {
        return res.status(400).json({ success: false, error: 'URL bukan Instagram' });
    }

    const metadataOnly = req.query.metadata === 'true' || req.body.metadata === true;
    if (metadataOnly) {
        const metadata = await getInstagramMetadata(url);
        return res.json(metadata);
    }

    try {
        let result;

        try {
            result = await Instagram(url);
        } catch (e1) {
            result = await instagramDownload(url);
        }

        if (result.msg) {
            return res.status(500).json({ success: false, error: result.msg });
        }

        const user = getUserFromRequest(req);

        let allUrls = [];
        if (Array.isArray(result.url)) {
            allUrls = result.url;
        } else if (Array.isArray(result.urls)) {
            allUrls = result.urls;
        } else if (result.url) {
            allUrls = [result.url];
        }

        const downloadUrl = allUrls[0];
        const fileName = `instagram_${Date.now()}.mp4`;
        const isCarousel = allUrls.length > 1;

        if (user && user.id) {
            try {
                await saveDownload(
                    user.id,
                    url,
                    title || result.metadata?.caption || result.metadata?.username || '—',
                    'Instagram',
                    fileName
                );
            } catch (dbError) {
                console.error('Failed to save history:', dbError);
            }
        }

        res.json({
            success: true,
            downloadUrl: downloadUrl,
            urls: allUrls,
            fileName: fileName,
            isCarousel: isCarousel,
            carouselCount: allUrls.length,
            metadata: result.metadata,
            service: result.service || 'instagram'
        });
    } catch (error) {
        console.error('❌ Instagram download error:', error.message);
        res.status(500).json({ success: false, error: 'Download gagal. Pastikan konten bersifat publik dan coba lagi' });
    }
}

// ======================== DOUYIN ========================
async function handleDouyin(req, res) {
    const url = req.method === 'POST' ? req.body.url : req.query.url;

    if (!url) {
        return res.status(400).json({ success: false, error: 'URL tidak boleh kosong' });
    }

    const lowerUrl = url.toLowerCase();
    if (!lowerUrl.includes('douyin.com') && !lowerUrl.includes('v.douyin.com')) {
        return res.status(400).json({ success: false, error: 'URL bukan Douyin' });
    }

    const metadataOnly = req.query.metadata === 'true' || req.body.metadata === true;

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
                return res.json({ success: true, title: 'Douyin Video', thumbnail: null, platform: 'Douyin' });
            }
        } catch (error) {
            return res.json({ success: true, title: 'Douyin Video', thumbnail: null, platform: 'Douyin' });
        }
    }

    try {
        const result = await downloadDouyinVideo(url);

        if (!result.status || !result.downloadUrl) {
            return res.status(500).json({ success: false, error: 'Download gagal' });
        }

        const fileName = `douyin_${result.id || Date.now()}.mp4`;

        res.json({
            success: true,
            title: result.title,
            author: result.author?.nickname || 'Unknown',
            thumbnail: result.cover,
            downloadUrl: result.downloadUrl,
            fileName: fileName,
            duration: result.duration,
            stats: result.stats,
            allMedias: result.data
        });
    } catch (error) {
        console.error('❌ Douyin download error:', error.message);
        res.status(500).json({ success: false, error: 'Download gagal. Coba lagi' });
    }
}

// ======================== TWITTER ========================
async function handleTwitter(req, res) {
    const url = req.method === 'POST' ? req.body.url : req.query.url;
    const quality = req.method === 'POST' ? (req.body.quality || 'best') : (req.query.quality || 'best');

    if (!url) {
        return res.status(400).json({ success: false, error: 'URL tidak boleh kosong' });
    }

    const lowerUrl = url.toLowerCase();
    if (!lowerUrl.includes('twitter.com') && !lowerUrl.includes('x.com')) {
        return res.status(400).json({ success: false, error: 'URL bukan Twitter/X' });
    }

    const metadataOnly = req.query.metadata === 'true' || req.body.metadata === true;

    if (metadataOnly) {
        try {
            const result = await downloadTwitterVideo(url);
            if (result.status) {
                const qualities = result.videos.map(v => ({ quality: v.quality, bitrate: v.bitrate }));
                return res.json({
                    success: true,
                    title: result.title,
                    author: result.author || 'Unknown',
                    thumbnail: result.thumbnail,
                    platform: 'Twitter',
                    qualities: qualities,
                    videoCount: result.videos.length
                });
            } else {
                return res.json({ success: true, title: 'Twitter Video', platform: 'Twitter' });
            }
        } catch (error) {
            return res.json({ success: true, title: 'Twitter Video', platform: 'Twitter' });
        }
    }

    try {
        const result = await downloadTwitterVideo(url);

        if (!result.status || !result.videos || result.videos.length === 0) {
            return res.status(500).json({ success: false, error: 'Video tidak tersedia' });
        }

        let selectedVideo;
        if (quality === 'best' || quality === 'HD') {
            selectedVideo = result.videos[0];
        } else if (quality === 'SD' || quality === 'medium') {
            selectedVideo = result.videos[Math.floor(result.videos.length / 2)] || result.videos[0];
        } else if (quality === 'low') {
            selectedVideo = result.videos[result.videos.length - 1];
        } else {
            selectedVideo = result.videos[0];
        }

        const tweetIdMatch = url.match(/status\/(\d+)/);
        const tweetId = tweetIdMatch ? tweetIdMatch[1] : Date.now();

        res.json({
            success: true,
            title: result.title,
            author: result.author || 'Unknown',
            thumbnail: result.thumbnail,
            downloadUrl: selectedVideo.url,
            fileName: `twitter_${tweetId}.mp4`,
            quality: selectedVideo.quality,
            availableQualities: result.videos.map(v => v.quality),
            platform: 'Twitter'
        });
    } catch (error) {
        console.error('❌ Twitter download error:', error.message);
        res.status(500).json({ success: false, error: 'Download gagal: ' + error.message });
    }
}

// ======================== SPOTIFY ========================
async function handleSpotify(req, res) {
    const url = req.method === 'POST' ? req.body.url : req.query.url;

    if (!url) {
        return res.status(400).json({ success: false, error: 'URL tidak boleh kosong' });
    }

    try {
        const metadata = await getSpotifyMetadata(url);
        const query = `${metadata.artist} - ${metadata.title} audio`;
        const searchResults = await ytSearch(query);

        if (!searchResults || !searchResults.videos || searchResults.videos.length === 0) {
            return res.status(404).json({ success: false, error: 'Lagu tidak ditemukan di database musik' });
        }

        const video = searchResults.videos[0];

        res.json({
            success: true,
            title: metadata.title,
            artist: metadata.artist,
            thumbnail: metadata.thumbnail,
            youtubeUrl: video.url,
            duration: video.duration.seconds,
            platform: 'Spotify',
            source: 'YouTube Bridge'
        });
    } catch (error) {
        console.error('❌ Spotify error:', error.message);
        res.status(500).json({ success: false, error: error.message || 'Gagal memproses link Spotify' });
    }
}

// ======================== PINTEREST ========================
async function handlePinterest(req, res) {
    const url = req.method === 'POST' ? req.body.url : req.query.url;

    if (!url) {
        return res.status(400).json({ success: false, error: 'URL tidak boleh kosong' });
    }

    const lowerUrl = url.toLowerCase();
    if (!lowerUrl.includes('pinterest.com') && !lowerUrl.includes('pin.it')) {
        return res.status(400).json({ success: false, error: 'URL bukan Pinterest' });
    }

    const metadataOnly = req.query.metadata === 'true' || req.body.metadata === true;

    if (metadataOnly) {
        try {
            const result = await savePin(url);
            if (result.success && result.results && result.results.length > 0) {
                // Get first image/video as thumbnail
                const firstMedia = result.results[0];
                return res.json({
                    success: true,
                    title: result.title,
                    thumbnail: firstMedia.downloadLink,
                    platform: 'Pinterest',
                    mediaType: firstMedia.type,
                    format: firstMedia.format
                });
            } else {
                return res.json({ success: true, title: 'Pinterest Pin', thumbnail: null, platform: 'Pinterest' });
            }
        } catch (error) {
            return res.json({ success: true, title: 'Pinterest Pin', thumbnail: null, platform: 'Pinterest' });
        }
    }

    try {
        const result = await savePin(url);

        if (!result.success || !result.results || result.results.length === 0) {
            return res.status(500).json({
                success: false,
                error: result.error || 'Gagal mengambil data dari Pinterest'
            });
        }

        // Return the first/best quality result
        const bestResult = result.results[0];
        const isVideo = bestResult.type.toLowerCase().includes('video') || bestResult.format.toLowerCase() === 'mp4';
        const extension = isVideo ? '.mp4' : '.jpg';
        const fileName = `pinterest_${Date.now()}${extension}`;

        res.json({
            success: true,
            title: result.title,
            downloadUrl: bestResult.downloadLink,
            fileName: fileName,
            mediaType: bestResult.type,
            format: bestResult.format,
            allResults: result.results, // All available qualities/formats
            platform: 'Pinterest'
        });
    } catch (error) {
        console.error('❌ Pinterest download error:', error.message);
        res.status(500).json({ success: false, error: 'Download gagal. Coba lagi' });
    }
}


// ======================== MAIN HANDLER ========================
module.exports = async (req, res) => {
    // Allow both GET and POST
    if (req.method !== 'POST' && req.method !== 'GET') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    // Get platform parameter
    const platform = (req.method === 'POST' ? req.body.platform : req.query.platform) || '';

    // Route to appropriate handler
    switch (platform.toLowerCase()) {
        case 'youtube':
            return handleYouTube(req, res);
        case 'youtube-audio':
            return handleYouTubeAudio(req, res);
        case 'tiktok':
            return handleTikTok(req, res);
        case 'instagram':
            return handleInstagram(req, res);
        case 'douyin':
            return handleDouyin(req, res);
        case 'twitter':
            return handleTwitter(req, res);
        case 'spotify':
            return handleSpotify(req, res);
        case 'pinterest':
            return handlePinterest(req, res);
        default:
            return res.status(400).json({
                success: false,
                error: 'Platform tidak valid. Gunakan: youtube, youtube-audio, tiktok, instagram, douyin, twitter, spotify, pinterest'
            });
    }
};
