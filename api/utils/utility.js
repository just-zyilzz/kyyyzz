/**
 * Consolidated Utility API
 * Single endpoint for all utility functions
 * Replaces 4 separate endpoints to avoid Vercel's 12 function limit
 * 
 * Supported actions:
 * - search (YouTube search)
 * - thumbnail (Get video thumbnail)
 * - pinterest-search (Pinterest image search)
 * - tiktok-proxy (TikTok media proxy for CORS)
 * - instagram-proxy (Instagram media proxy for CORS)
 * - youtube-proxy (YouTube media proxy for IP restriction bypass)
 * 
 * Usage: GET/POST /api/utility?action=search&query=...
 */


const ytSearch = require('yt-search');
const axios = require('axios');
const { searchPinterest } = require('../../lib/pinterest');

// ======================== YOUTUBE SEARCH ========================
async function handleSearch(req, res) {
    const query = req.method === 'POST'
        ? req.body.query || req.body.q
        : req.query.query || req.query.q;

    const limit = parseInt(req.body?.limit || req.query?.limit || 10);
    const type = req.body?.type || req.query?.type || 'video';

    if (!query) {
        return res.status(400).json({ success: false, error: 'Query parameter required' });
    }

    try {
        const results = await ytSearch(query);
        let filteredResults;

        if (type === 'video') {
            filteredResults = (results.videos || []).slice(0, limit).map(video => ({
                type: 'video',
                videoId: video.videoId,
                url: video.url,
                title: video.title,
                description: video.description,
                thumbnail: video.thumbnail,
                duration: {
                    seconds: video.seconds,
                    timestamp: video.timestamp
                },
                views: video.views,
                author: {
                    name: video.author.name,
                    url: video.author.url
                },
                ago: video.ago,
                uploadDate: video.uploadDate
            }));
        } else if (type === 'playlist') {
            filteredResults = (results.playlists || []).slice(0, limit).map(playlist => ({
                type: 'playlist',
                playlistId: playlist.listId,
                url: playlist.url,
                title: playlist.title,
                thumbnail: playlist.thumbnail,
                videoCount: playlist.videoCount,
                author: {
                    name: playlist.author.name,
                    url: playlist.author.url
                }
            }));
        } else if (type === 'channel') {
            filteredResults = (results.channels || []).slice(0, limit).map(channel => ({
                type: 'channel',
                channelId: channel.channelId,
                url: channel.url,
                name: channel.name,
                thumbnail: channel.thumbnail,
                subscribers: channel.subCountLabel,
                videoCount: channel.videoCount
            }));
        } else {
            filteredResults = {
                videos: (results.videos || []).slice(0, limit),
                playlists: (results.playlists || []).slice(0, limit),
                channels: (results.channels || []).slice(0, limit)
            };
        }

        res.json({
            success: true,
            query: query,
            type: type,
            results: filteredResults
        });
    } catch (error) {
        console.error('❌ YouTube search error:', error.message);
        res.status(500).json({ success: false, error: 'Search failed: ' + error.message });
    }
}

// ======================== YOUTUBE THUMBNAIL ========================
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

async function handleThumbnail(req, res) {
    const url = req.method === 'POST' ? req.body.url : req.query.url;

    if (!url) {
        return res.status(400).json({ success: false, error: 'URL tidak boleh kosong' });
    }

    const lowerUrl = url.toLowerCase();
    if (!lowerUrl.includes('youtube.com') && !lowerUrl.includes('youtu.be')) {
        return res.status(400).json({ success: false, error: 'URL bukan YouTube' });
    }

    try {
        const videoId = extractYouTubeId(url);

        if (!videoId) {
            throw new Error('Invalid YouTube URL');
        }

        const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;

        const { data } = await axios.get(oembedUrl, {
            timeout: 3000,
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MediaDownloader/1.0)' }
        });

        const thumbnail = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;

        res.json({
            success: true,
            title: data.title || 'YouTube Video',
            author: data.author_name || 'Unknown',
            thumbnail: thumbnail,
            thumbnailUrl: thumbnail,
            platform: 'YouTube',
            id: videoId,
            width: data.width,
            height: data.height
        });
    } catch (error) {
        console.error('❌ YouTube metadata error:', error.message);
        const videoId = extractYouTubeId(url);
        res.json({
            success: true,
            title: 'YouTube Video',
            thumbnail: videoId ? `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg` : null,
            platform: 'YouTube',
            id: videoId
        });
    }
}

// ======================== TIKTOK PROXY ========================
async function handleTikTokProxy(req, res) {
    const { url, type } = req.query;

    if (!url) {
        return res.status(400).json({ success: false, error: 'URL parameter required' });
    }

    try {
        console.log(`📡 TikTok Proxy [${type || 'media'}]: ${url}`);

        const response = await axios({
            method: 'GET',
            url: url,
            responseType: 'stream',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://www.tiktok.com/',
                'Accept': type === 'thumbnail' ? 'image/webp,image/apng,image/*,*/*;q=0.8' : '*/*',
            },
            timeout: 30000,
            maxRedirects: 5,
        });

        let contentType = response.headers['content-type'] || 'application/octet-stream';

        if (type === 'thumbnail' || type === 'image') {
            if (!contentType.includes('image')) {
                contentType = 'image/jpeg';
            }
        } else if (type === 'audio') {
            contentType = 'audio/mpeg';
            res.setHeader('Content-Disposition', 'attachment; filename="tiktok_audio.mp3"');
        } else if (type === 'video') {
            contentType = 'video/mp4';
            res.setHeader('Content-Disposition', 'attachment; filename="tiktok_video.mp4"');
        }

        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        response.data.pipe(res);
    } catch (error) {
        console.error('❌ TikTok Proxy error:', error.message);
        res.status(500).json({ success: false, error: 'Failed to fetch media: ' + error.message });
    }
}

// ======================== INSTAGRAM PROXY ========================
async function handleInstagramProxy(req, res) {
    const { url, type } = req.query;

    if (!url) {
        return res.status(400).json({ success: false, error: 'URL parameter required' });
    }

    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://www.instagram.com/',
                'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8'
            },
            timeout: 30000
        });

        const contentType = response.headers['content-type'] || 'application/octet-stream';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400');

        const disposition = type === 'preview' ? 'inline' : 'attachment';
        res.setHeader('Content-Disposition', disposition);

        res.send(Buffer.from(response.data));
    } catch (error) {
        console.error('Instagram proxy download error:', error.message);
        res.status(502).json({ success: false, error: 'Failed to download media: ' + error.message });
    }
}

// ======================== YOUTUBE PROXY ========================
async function handleYouTubeProxy(req, res) {
    const { url, type, filename } = req.query;

    if (!url) {
        return res.status(400).json({ success: false, error: 'URL parameter required' });
    }

    try {
        console.log(`📡 YouTube Proxy [${type || 'video'}]: Downloading...`);

        const response = await axios({
            method: 'GET',
            url: url,
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': '*/*',
                'Accept-Language': 'en-US,en;q=0.9',
            },
            timeout: 120000,
            maxRedirects: 5,
        });

        // Set appropriate content type
        let contentType = response.headers['content-type'] || 'application/octet-stream';
        let ext = 'mp4';

        if (type === 'audio') {
            contentType = 'audio/mpeg';
            ext = 'mp3';
        } else if (type === 'video') {
            contentType = 'video/mp4';
            ext = 'mp4';
        }

        const downloadFilename = filename || `youtube_${Date.now()}.${ext}`;

        // Set headers
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
        res.setHeader('Content-Length', response.data.length);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 'no-cache');

        // Send the buffer
        res.send(Buffer.from(response.data));

    } catch (error) {
        console.error('❌ YouTube Proxy error:', error.message);
        if (!res.headersSent) {
            res.status(500).json({ success: false, error: 'Failed to fetch media: ' + error.message });
        }
    }
}

// ======================== FACEBOOK PROXY ========================
async function handleFacebookProxy(req, res) {
    const { url, type, filename } = req.query;

    if (!url) {
        return res.status(400).json({ success: false, error: 'URL parameter required' });
    }

    // Security check: only allow facebook or fbcdn domains
    try {
        const parsedUrl = new URL(url);
        const hostname = parsedUrl.hostname.toLowerCase();
        // Allow facebook.com, fbcdn.net and all their subdomains
        const isAllowed = hostname.endsWith('facebook.com') ||
            hostname.endsWith('fbcdn.net') ||
            hostname.includes('.fbcdn.net') ||
            hostname.includes('.facebook.com');
        if (!isAllowed) {
            console.log(`❌ Facebook Proxy: Forbidden domain: ${hostname}`);
            return res.status(403).json({ success: false, error: 'Forbidden domain' });
        }
    } catch (e) {
        return res.status(400).json({ success: false, error: 'Invalid URL' });
    }

    try {
        console.log(`📡 Facebook Proxy [${type || 'media'}]: Downloading...`);

        const response = await axios({
            method: 'GET',
            url: url,
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': '*/*',
                'Referer': 'https://www.facebook.com/',
            },
            timeout: 120000,
            maxRedirects: 5,
        });

        // Set appropriate content type
        let contentType = response.headers['content-type'] || 'application/octet-stream';
        let ext = 'mp4';

        if (type === 'image') {
            contentType = contentType.includes('image') ? contentType : 'image/jpeg';
            ext = 'jpg';
        } else {
            contentType = contentType.includes('video') ? contentType : 'video/mp4';
            ext = 'mp4';
        }

        const downloadFilename = filename || `facebook_${Date.now()}.${ext}`;

        // Set headers
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
        res.setHeader('Content-Length', response.data.length);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 'no-cache');

        // Send the buffer
        res.send(Buffer.from(response.data));

    } catch (error) {
        console.error('❌ Facebook Proxy error:', error.message);
        if (!res.headersSent) {
            res.status(500).json({ success: false, error: 'Failed to fetch media: ' + error.message });
        }
    }
}

// ======================== PINTEREST SEARCH ========================
async function handlePinterestSearch(req, res) {
    const query = req.method === 'POST'
        ? req.body.query || req.body.q || req.body.keyword
        : req.query.query || req.query.q || req.query.keyword;

    const limit = parseInt(req.body?.limit || req.query?.limit || 20);

    if (!query) {
        return res.status(400).json({ success: false, error: 'Query parameter required' });
    }

    try {
        const result = await searchPinterest(query, limit);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                error: result.error || 'Pinterest search failed'
            });
        }

        res.json({
            success: true,
            keyword: query,
            count: result.count,
            pins: result.pins.map(pin => ({
                url: pin.url,
                title: pin.title,
                image: pin.image,
                thumbnail: pin.thumbnail,
                description: pin.description
            }))
        });
    } catch (error) {
        console.error('❌ Pinterest search error:', error.message);
        res.status(500).json({ success: false, error: 'Pinterest search failed: ' + error.message });
    }
}


// ======================== MAIN HANDLER ========================
module.exports = async (req, res) => {
    // Allow both GET and POST (except proxies which are GET only)
    if (req.method !== 'POST' && req.method !== 'GET') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    // Get action parameter
    const action = (req.method === 'POST' ? req.body.action : req.query.action) || '';

    // Route to appropriate handler
    switch (action.toLowerCase()) {
        case 'search':
            return handleSearch(req, res);
        case 'thumbnail':
            return handleThumbnail(req, res);
        case 'pinterest-search':
            return handlePinterestSearch(req, res);
        case 'tiktok-proxy':
            if (req.method !== 'GET') {
                return res.status(405).json({ success: false, error: 'Proxy endpoints only support GET' });
            }
            return handleTikTokProxy(req, res);
        case 'instagram-proxy':
            if (req.method !== 'GET') {
                return res.status(405).json({ success: false, error: 'Proxy endpoints only support GET' });
            }
            return handleInstagramProxy(req, res);
        case 'youtube-proxy':
            if (req.method !== 'GET') {
                return res.status(405).json({ success: false, error: 'Proxy endpoints only support GET' });
            }
            return handleYouTubeProxy(req, res);
        case 'facebook-proxy':
            if (req.method !== 'GET') {
                return res.status(405).json({ success: false, error: 'Proxy endpoints only support GET' });
            }
            return handleFacebookProxy(req, res);
        default:
            return res.status(400).json({
                success: false,
                error: 'Action tidak valid. Gunakan: search, thumbnail, pinterest-search, tiktok-proxy, instagram-proxy, youtube-proxy, facebook-proxy'
            });
    }
};
