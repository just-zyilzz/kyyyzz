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
 * 
 * Usage: GET/POST /api/utility?action=search&query=...
 */


const ytSearch = require('yt-search');
const axios = require('axios');
const http = require('node:http');
const https = require('node:https');
const { searchPinterest } = require('../../lib/pinterest');

const httpAgent = new http.Agent({ keepAlive: true });
const httpsAgent = new https.Agent({ keepAlive: true });

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

// ======================== YOUTUBE PROXY ========================
async function handleYouTubeProxy(req, res) {
    const { url, type, download, filename } = req.query;

    if (!url) {
        return res.status(400).json({ success: false, error: 'URL parameter required' });
    }

    try {
        let target;
        try {
            target = new URL(url);
        } catch {
            return res.status(400).json({ success: false, error: 'Invalid url parameter' });
        }

        if (target.protocol !== 'https:' && target.protocol !== 'http:') {
            return res.status(400).json({ success: false, error: 'Invalid url protocol' });
        }

        const host = (target.hostname || '').toLowerCase();
        const allowed = (
            host === 'googlevideo.com' || host.endsWith('.googlevideo.com') ||
            host === 'youtube.com' || host.endsWith('.youtube.com') ||
            host === 'ytimg.com' || host.endsWith('.ytimg.com') ||
            host === 'savetube.me' || host.endsWith('.savetube.me') ||
            host === 'savetube.vip' || host.endsWith('.savetube.vip') ||
            host === 'vidssave.com' || host.endsWith('.vidssave.com') ||
            host === 'api.vidssave.com'
        );

        if (!allowed) {
            return res.status(400).json({ success: false, error: 'URL host not allowed' });
        }

        const upstreamHeaders = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://www.youtube.com/',
            'Origin': 'https://www.youtube.com',
            'Accept': '*/*',
            'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'identity'
        };

        if (req.headers.range) upstreamHeaders.Range = req.headers.range;
        if (req.headers['if-range']) upstreamHeaders['If-Range'] = req.headers['if-range'];
        if (req.headers['if-none-match']) upstreamHeaders['If-None-Match'] = req.headers['if-none-match'];
        if (req.headers['if-modified-since']) upstreamHeaders['If-Modified-Since'] = req.headers['if-modified-since'];

        const shouldDownload = download === 'true' || download === '1' || download === 'yes';
        const safeNameRaw = filename || (type === 'audio' ? 'audio.mp3' : 'video.mp4');
        const safeName = String(safeNameRaw)
            .replace(/[\r\n]/g, ' ')
            .replace(/[\\/?%*:|"<>]/g, '_')
            .slice(0, 180)
            .trim() || (type === 'audio' ? 'audio.mp3' : 'video.mp4');

        const requestConfig = {
            method: 'GET',
            url: target.toString(),
            responseType: 'stream',
            headers: upstreamHeaders,
            timeout: 0,
            maxRedirects: 5,
            validateStatus: () => true,
            decompress: false,
            httpAgent,
            httpsAgent
        };

        const wait = (ms) => new Promise((r) => setTimeout(r, ms));
        
        // Single attempt, no complex retry logic
        try {
            upstreamResponse = await axios(requestConfig);
        } catch (err) {
            console.error('[Proxy] Upstream error:', err.message);
            
            // If it's a 4xx/5xx response from upstream, we can still forward it (optional)
            // or just throw to let the catch block handle it
            if (err.response) {
                upstreamResponse = err.response;
            } else {
                throw err;
            }
        }

        if (!upstreamResponse) throw lastError || new Error('Upstream request failed');

        if (upstreamResponse.status >= 400) {
            if (upstreamResponse.data?.destroy) upstreamResponse.data.destroy();
            return res.status(upstreamResponse.status).json({
                success: false,
                error: 'Failed to fetch media'
            });
        }

        const cleanup = () => {
            if (upstreamResponse?.data?.destroy) {
                upstreamResponse.data.destroy();
            }
        };

        req.on('aborted', cleanup);
        req.on('close', cleanup);
        res.on('close', cleanup);

        res.statusCode = upstreamResponse.status;

        const passthroughHeaders = [
            'accept-ranges',
            'content-length',
            'content-range',
            'etag',
            'last-modified'
        ];

        for (const h of passthroughHeaders) {
            const v = upstreamResponse.headers[h];
            if (v) res.setHeader(h, v);
        }

        let contentType = upstreamResponse.headers['content-type'] || 'application/octet-stream';
        if (type === 'audio' && !String(contentType).includes('audio')) contentType = 'audio/mpeg';
        if (type === 'video' && !String(contentType).includes('video')) contentType = 'video/mp4';
        res.setHeader('Content-Type', contentType);

        res.setHeader('Content-Disposition', shouldDownload ? `attachment; filename="${safeName}"` : 'inline');
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
        res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges, Content-Type, Content-Disposition');

        upstreamResponse.data.on('error', () => {
            if (!res.headersSent) {
                res.statusCode = 502;
            }
            res.destroy();
        });

        upstreamResponse.data.pipe(res);
    } catch (error) {
        res.status(500).json({ success: false, error: 'YouTube proxy error: ' + error.message });
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
        case 'yt-proxy':
            if (req.method !== 'GET') {
                return res.status(405).json({ success: false, error: 'Proxy endpoints only support GET' });
            }
            return handleYouTubeProxy(req, res);
        default:
            return res.status(400).json({
                success: false,
                error: 'Action tidak valid. Gunakan: search, thumbnail, pinterest-search, tiktok-proxy, instagram-proxy, yt-proxy'
            });
    }
};
