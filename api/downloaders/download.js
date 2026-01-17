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

async function youtubeVidssaveYtdl(url) {
    const attempts = [
        { domain: 'api-ak.vidssave.com', origin: 'cache' },
        { domain: 'api.vidssave.com', origin: 'cache' },
        { domain: 'api-ak.vidssave.com', origin: 'direct' },
        { domain: 'api.vidssave.com', origin: 'direct' }
    ];

    let lastError;

    for (const attempt of attempts) {
        for (let i = 0; i < 2; i++) {
            try {
                // Generate a random auth token-like string to avoid potential caching/blocking
                const randomAuth = '2025' + Math.random().toString(36).substring(2, 15);
                
                const res = await axios.post(
                    `https://${attempt.domain}/api/contentsite_api/media/parse`,
                    new URLSearchParams({
                        auth: '20250901majwlqo', // Keep original auth as fallback/primary
                        domain: attempt.domain,
                        origin: attempt.origin,
                        link: url
                    }).toString(),
                    {
                        headers: {
                            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                            'content-type': 'application/x-www-form-urlencoded',
                            'accept': 'application/json, text/plain, */*',
                            'origin': 'https://vidssave.com',
                            'referer': 'https://vidssave.com/'
                        },
                        timeout: 25000, // Increased timeout
                        validateStatus: () => true
                    }
                );

                if (res.status < 200 || res.status >= 300) {
                    const msg = (res.data && (res.data.msg || res.data.message)) || `VidsSave HTTP ${res.status}`;
                    // Only throw if it's a server error (5xx) or rate limit (429), otherwise it might be invalid URL
                    if (res.status >= 500 || res.status === 429) {
                         throw new Error(msg);
                    }
                    // For 400 errors, return empty result to trigger next attempt
                    if (res.status === 400) throw new Error(msg);
                }

                const data = res.data && res.data.data;
                if (!data || !Array.isArray(data.resources)) {
                    const msg = res.data && res.data.msg ? res.data.msg : 'Gagal mengambil data dari Vidssave';
                    throw new Error(msg);
                }

                return {
                    title: data.title,
                    thumbnail: data.thumbnail,
                    duration: data.duration,
                    formats: data.resources.map(r => ({
                        type: typeof r.type === 'string' ? r.type.toLowerCase() : r.type,
                        quality: r.quality,
                        format: typeof r.format === 'string' ? r.format.toLowerCase() : r.format,
                        size: r.size,
                        url: r.download_url
                    }))
                };
            } catch (err) {
                console.log(`[Vidssave] Attempt failed (${attempt.domain}/${attempt.origin}): ${err.message}`);
                lastError = err;
                const waitMs = 1000 * (i + 1);
                await new Promise(r => setTimeout(r, waitMs));
            }
        }
    }

    throw lastError || new Error('Gagal mengambil data dari Vidssave (All mirrors failed)');
}

async function saveHistory(req, url, title, platform, filename) {
    try {
        const user = getUserFromRequest(req);
        if (user && user.id) {
            await saveDownload(user.id, url, title, platform, filename);
        }
    } catch (err) {
        console.error('Failed to save history:', err.message);
    }
}

function sanitizeUrl(url) {
    if (!url) return url;
    let u = String(url).trim();
    u = u.replace(/^[`'"]+|[`'"]+$/g, '');
    u = u.replace(/[),.;>\s]+$/g, '');
    return u;
}

function extractYouTubeId(url) {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

async function getYouTubePreviewMetadata(url) {
    const videoId = extractYouTubeId(url);
    if (!videoId) {
        throw new Error('Invalid YouTube URL');
    }

    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;

    try {
        const { data } = await axios.get(oembedUrl, {
            timeout: 3000,
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MediaDownloader/1.0)' }
        });

        const thumbnail = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;

        return {
            success: true,
            title: data.title || 'YouTube Video',
            thumbnail,
            thumbnailUrl: thumbnail,
            platform: 'YouTube'
        };
    } catch (error) {
        const thumbnail = videoId ? `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg` : null;
        return {
            success: true,
            title: 'YouTube Video',
            thumbnail,
            thumbnailUrl: thumbnail,
            platform: 'YouTube'
        };
    }
}

// ======================== YOUTUBE VIDEO - IMPROVED ========================
async function handleYouTube(req, res) {
    const metadataOnly = req.query.metadata === 'true' || req.body?.metadata === true;

    // Allow both GET and POST for downloads (more flexible)
    // Only enforce GET for metadata requests
    if (metadataOnly && req.method !== 'GET') {
        return res.status(405).json({ success: false, error: 'Metadata requests must use GET method' });
    }

    let url = req.method === 'POST' ? req.body.url : req.query.url;
    url = sanitizeUrl(url);
    let quality = req.method === 'POST' ? (req.body.quality || '720') : (req.query.quality || '720');

    if (quality) quality = quality.toString().replace('p', '');

    if (!url) {
        return res.status(400).json({ success: false, error: 'URL tidak boleh kosong' });
    }

    const lowerUrl = url.toLowerCase();
    if (!lowerUrl.includes('youtube.com') && !lowerUrl.includes('youtu.be')) {
        return res.status(400).json({ success: false, error: 'URL bukan YouTube' });
    }

    // Add request timestamp for debugging
    const startTime = Date.now();
    console.log(`[YouTube Video] Request started at ${new Date().toISOString()}`);
    console.log(`[YouTube Video] URL: ${url}, Quality: ${quality}`);

    try {
        if (metadataOnly) {
            const meta = await getYouTubePreviewMetadata(url);
            return res.json(meta);
        }

        const targetQuality = quality || '720';
        console.log('[YouTube Video] Calling VidsSave API...');
        const ytData = await youtubeVidssaveYtdl(url);

        if (!ytData.formats || !Array.isArray(ytData.formats)) {
            throw new Error('No formats available from VidsSave');
        }

        const mp4Formats = ytData.formats.filter(f =>
            f.type === 'video' &&
            f.format === 'mp4' &&
            f.url
        );

        if (mp4Formats.length === 0) {
            throw new Error('MP4 format tidak tersedia');
        }

        mp4Formats.sort((a, b) => {
            const qA = parseInt(a.quality) || 0;
            const qB = parseInt(b.quality) || 0;
            return qB - qA;
        });

        let selectedFormat = mp4Formats.find(f => f.quality === targetQuality);
        if (!selectedFormat) {
            const targetNum = parseInt(targetQuality);
            selectedFormat = mp4Formats.reduce((prev, curr) => {
                const prevDiff = Math.abs(parseInt(prev.quality) - targetNum);
                const currDiff = Math.abs(parseInt(curr.quality) - targetNum);
                return currDiff < prevDiff ? curr : prev;
            });
        }

        const info = {
            title: ytData.title || 'YouTube Video',
            thumbnail: ytData.thumbnail || null,
            duration: ytData.duration || 0,
            quality: selectedFormat.quality,
            url: selectedFormat.url,
            filename: `${(ytData.title || Date.now()).replace(/[/\\?%*:|"<>]/g, '_')}.mp4`
        };
        console.log('✅ [YouTube Video] VidsSave success');

        await saveHistory(req, url, info.title, 'YouTube', info.filename);

        return res.json({
            success: true,
            title: info.title,
            thumbnail: info.thumbnail,
            duration: info.duration,
            quality: info.quality,
            downloadUrl: info.url,
            fileName: info.filename,
            platform: 'YouTube'
        });

    } catch (error) {
        console.error(`❌ [YouTube Video] Critical error in ${Date.now() - startTime}ms:`, error.message);
        return res.status(500).json({
            success: false,
            error: 'Download gagal. Server sibuk atau video tidak didukung.',
            debug: { error: error.message }
        });
    }
}
// ======================== YOUTUBE AUDIO - IMPROVED ========================
async function handleYouTubeAudio(req, res) {
    const metadataOnly = req.query.metadata === 'true' || req.body?.metadata === true;

    if (metadataOnly && req.method !== 'GET') {
        return res.status(405).json({ success: false, error: 'Metadata requests must use GET method' });
    }

    let url = req.method === 'POST' ? req.body.url : req.query.url;
    url = sanitizeUrl(url);

    if (!url) {
        return res.status(400).json({ success: false, error: 'URL tidak boleh kosong' });
    }

    const lowerUrl = url.toLowerCase();
    if (!lowerUrl.includes('youtube.com') && !lowerUrl.includes('youtu.be')) {
        return res.status(400).json({ success: false, error: 'URL bukan YouTube' });
    }

    try {
        console.log('[YouTube Audio] Calling VidsSave API...');
        const ytData = await youtubeVidssaveYtdl(url);

        if (!ytData.formats || !Array.isArray(ytData.formats)) {
            throw new Error('No formats available from VidsSave');
        }

        const audioFormats = ytData.formats.filter(f =>
            (f.type === 'audio' || f.format === 'mp3' || f.format === 'm4a') &&
            f.url
        );

        if (audioFormats.length === 0) {
            throw new Error('Format audio tidak tersedia');
        }

        audioFormats.sort((a, b) => (b.size || 0) - (a.size || 0));
        const selectedFormat = audioFormats[0];

        const info = {
            title: ytData.title || 'YouTube Audio',
            thumbnail: ytData.thumbnail || null,
            duration: ytData.duration || 0,
            quality: '128kbps',
            url: selectedFormat.url,
            filename: `${(ytData.title || Date.now()).replace(/[/\\?%*:|"<>]/g, '_')}.mp3`
        };
        console.log('✅ [YouTube Audio] VidsSave success');

        await saveHistory(req, url, info.title, 'YouTube Audio', info.filename);

        return res.json({
            success: true,
            title: info.title,
            thumbnail: info.thumbnail,
            duration: info.duration,
            quality: info.quality,
            downloadUrl: info.url,
            fileName: info.filename,
            platform: 'YouTube'
        });

    } catch (error) {
        console.error('❌ YouTube Audio download error:', error.message);
        return res.status(500).json({
            success: false,
            error: 'Download audio gagal. Coba lagi nanti.',
            debug: { error: error.message }
        });
    }
}

// ======================== TIKTOK ========================
async function handleTikTok(req, res) {
    // Enforce: GET for metadata, POST for download
    const metadataOnly = req.query.metadata === 'true' || req.body?.metadata === true;

    if (metadataOnly && req.method !== 'GET') {
        return res.status(405).json({ success: false, error: 'Metadata requests must use GET method' });
    }
    if (!metadataOnly && req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Download requests must use POST method' });
    }

    const url = req.method === 'POST' ? req.body.url : req.query.url;
    const format = req.method === 'POST' ? (req.body.format || 'video') : (req.query.format || 'video');

    if (!url) {
        return res.status(400).json({ success: false, error: 'URL tidak boleh kosong' });
    }

    const lowerUrl = url.toLowerCase();
    if (!lowerUrl.includes('tiktok.com') && !lowerUrl.includes('vt.tiktok.com') && !lowerUrl.includes('vm.tiktok.com')) {
        return res.status(400).json({ success: false, error: 'URL bukan TikTok' });
    }

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

        await saveHistory(req, url, result.title || 'TikTok Video', 'TikTok', fileName);

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
    // Enforce: GET for metadata, POST for download
    const metadataOnly = req.query.metadata === 'true' || req.body?.metadata === true;

    if (metadataOnly && req.method !== 'GET') {
        return res.status(405).json({ success: false, error: 'Metadata requests must use GET method' });
    }
    if (!metadataOnly && req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Download requests must use POST method' });
    }

    const url = req.method === 'POST' ? req.body.url : req.query.url;
    const title = req.method === 'POST' ? req.body.title : req.query.title;

    if (!url) {
        return res.status(400).json({ success: false, error: 'URL tidak boleh kosong' });
    }

    const lowerUrl = url.toLowerCase();
    if (!lowerUrl.includes('instagram.com')) {
        return res.status(400).json({ success: false, error: 'URL bukan Instagram' });
    }

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

        await saveHistory(req, url, title || result.metadata?.caption || result.metadata?.username || 'Instagram Post', 'Instagram', fileName);

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
    // Enforce: GET for metadata, POST for download
    const metadataOnly = req.query.metadata === 'true' || req.body?.metadata === true;

    if (metadataOnly && req.method !== 'GET') {
        return res.status(405).json({ success: false, error: 'Metadata requests must use GET method' });
    }
    if (!metadataOnly && req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Download requests must use POST method' });
    }

    const url = req.method === 'POST' ? req.body.url : req.query.url;

    if (!url) {
        return res.status(400).json({ success: false, error: 'URL tidak boleh kosong' });
    }

    const lowerUrl = url.toLowerCase();
    if (!lowerUrl.includes('douyin.com') && !lowerUrl.includes('v.douyin.com')) {
        return res.status(400).json({ success: false, error: 'URL bukan Douyin' });
    }

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
    // Enforce: GET for metadata, POST for download
    const metadataOnly = req.query.metadata === 'true' || req.body?.metadata === true;

    if (metadataOnly && req.method !== 'GET') {
        return res.status(405).json({ success: false, error: 'Metadata requests must use GET method' });
    }
    if (!metadataOnly && req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Download requests must use POST method' });
    }

    const url = req.method === 'POST' ? req.body.url : req.query.url;
    const quality = req.method === 'POST' ? (req.body.quality || 'best') : (req.query.quality || 'best');

    if (!url) {
        return res.status(400).json({ success: false, error: 'URL tidak boleh kosong' });
    }

    const lowerUrl = url.toLowerCase();
    if (!lowerUrl.includes('twitter.com') && !lowerUrl.includes('x.com')) {
        return res.status(400).json({ success: false, error: 'URL bukan Twitter/X' });
    }

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
        const fileName = `twitter_${tweetId}.mp4`;

        await saveHistory(req, url, result.title || 'Twitter Video', 'Twitter', fileName);

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
    // Spotify only supports POST (no separate metadata endpoint)
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Spotify requests must use POST method' });
    }

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
    // Enforce: GET for metadata, POST for download
    const metadataOnly = req.query.metadata === 'true' || req.body?.metadata === true;

    if (metadataOnly && req.method !== 'GET') {
        return res.status(405).json({ success: false, error: 'Metadata requests must use GET method' });
    }
    if (!metadataOnly && req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Download requests must use POST method' });
    }

    const url = req.method === 'POST' ? req.body.url : req.query.url;

    if (!url) {
        return res.status(400).json({ success: false, error: 'URL tidak boleh kosong' });
    }

    const lowerUrl = url.toLowerCase();
    if (!lowerUrl.includes('pinterest.com') && !lowerUrl.includes('pin.it')) {
        return res.status(400).json({ success: false, error: 'URL bukan Pinterest' });
    }

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
                    downloadUrl: firstMedia.downloadLink,
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

    if (req.method === 'POST' && typeof req.body === 'string') {
        try {
            req.body = JSON.parse(req.body);
        } catch { }
    }

    // Get platform parameter
    const platform = (
        (req.method === 'POST' ? (req.body && req.body.platform) : undefined) ||
        (req.query && req.query.platform) ||
        ''
    );

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
