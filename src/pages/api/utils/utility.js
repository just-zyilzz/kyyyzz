import ytSearch from 'yt-search';
import axios from 'axios';
import http from 'node:http';
import https from 'node:https';
import { searchPinterest } from '../../../lib/pinterest';
import { createRequestConfig } from '../../../lib/utils';

export const prerender = false;

const httpAgent = new http.Agent({ keepAlive: true });
const httpsAgent = new https.Agent({ keepAlive: true });

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


async function searchInvidious(query, limit = 10) {
    const instances = [
        'https://inv.tux.pizza',
        'https://vid.puffyan.us',
        'https://yewtu.be',
        'https://invidious.drgns.space'
    ];

    for (const instance of instances) {
        try {
            const { data } = await axios.get(`${instance}/api/v1/search`, {
                params: { q: query, type: 'video' },
                timeout: 5000
            });

            if (!Array.isArray(data)) continue;

            return data.slice(0, limit).map(video => ({
                type: 'video',
                videoId: video.videoId,
                url: `https://www.youtube.com/watch?v=${video.videoId}`,
                title: video.title,
                description: video.description || '',
                thumbnail: video.videoThumbnails?.find(t => t.quality === 'maxresdefault')?.url || 
                          video.videoThumbnails?.[0]?.url || 
                          `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`,
                duration: { 
                    seconds: video.lengthSeconds, 
                    timestamp: new Date(video.lengthSeconds * 1000).toISOString().substr(11, 8).replace(/^00:/, '') 
                },
                views: video.viewCount,
                author: { name: video.author, url: `${instance}/channel/${video.authorId}` },
                ago: video.publishedText || '',
                uploadDate: new Date(video.published * 1000).toISOString()
            }));
        } catch (e) {
            console.warn(`Invidious instance ${instance} failed:`, e.message);
            continue;
        }
    }
    throw new Error('All Invidious instances failed');
}

async function handleSearch(query, limit, type) {
    // Try Invidious first as it's more reliable on Vercel (no IP scraping block)
    try {
        const results = await searchInvidious(query, limit);
        return { success: true, query, type, results };
    } catch (invidiousError) {
        console.warn('Invidious search failed, falling back to yt-search:', invidiousError.message);
        
        // Fallback to yt-search
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
                    duration: { seconds: video.seconds, timestamp: video.timestamp },
                    views: video.views,
                    author: { name: video.author.name, url: video.author.url },
                    ago: video.ago,
                    uploadDate: video.uploadDate
                }));
            } else {
                filteredResults = (results.videos || []).slice(0, limit);
            }
        
            return { success: true, query, type, results: filteredResults };
        } catch (ytSearchError) {
             throw new Error('Search failed on all providers');
        }
    }
}


async function handleThumbnail(url) {
    const videoId = extractYouTubeId(url);
    if (!videoId) throw new Error('Invalid YouTube URL');

    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const { url: finalUrl, config } = createRequestConfig(oembedUrl, {
        timeout: 3000,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MediaDownloader/1.0)' }
    });

    try {
        const { data } = await axios.get(finalUrl, config);
        const thumbnail = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
        return {
            success: true,
            title: data.title || 'YouTube Video',
            author: data.author_name || 'Unknown',
            thumbnail,
            thumbnailUrl: thumbnail,
            platform: 'YouTube',
            id: videoId,
            width: data.width,
            height: data.height
        };
    } catch (error) {
        const thumbnail = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
        return {
            success: true,
            title: 'YouTube Video',
            thumbnail,
            thumbnailUrl: thumbnail,
            platform: 'YouTube',
            id: videoId
        };
    }
}

async function handlePinterestSearch(query, limit) {
    const result = await searchPinterest(query, limit);
    if (!result.success) throw new Error(result.error || 'Pinterest search failed');

    return {
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
    };
}

async function handleProxy(url, type, platform) {
    // Logic for proxying (TikTok, Instagram, YouTube)
    // This needs to return a Response with stream
    // ...
    // Since this function is complex and varies by platform, 
    // I'll implement it inline in the main handler or helper
    return null; 
}

export async function GET({ request }) {
    return handleRequest(request);
}

export async function POST({ request }) {
    return handleRequest(request);
}

async function handleRequest(request) {
    const urlObj = new URL(request.url);
    let action = urlObj.searchParams.get('action');
    
    // Parse body if POST
    let body = {};
    if (request.method === 'POST') {
        try {
            body = await request.json();
        } catch {}
        if (!action && body.action) action = body.action;
    }

    if (!action) return new Response(JSON.stringify({ error: 'Action required' }), { status: 400 });

    try {
        switch (action.toLowerCase()) {
            case 'search': {
                const query = body.query || body.q || urlObj.searchParams.get('query') || urlObj.searchParams.get('q');
                if (!query) throw new Error('Query parameter required');
                const limit = parseInt(body.limit || urlObj.searchParams.get('limit') || 10);
                const type = body.type || urlObj.searchParams.get('type') || 'video';
                const result = await handleSearch(query, limit, type);
                return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });
            }
            case 'thumbnail': {
                const url = body.url || urlObj.searchParams.get('url');
                if (!url) throw new Error('URL parameter required');
                const result = await handleThumbnail(url);
                return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });
            }
            case 'pinterest-search': {
                const query = body.query || body.q || body.keyword || urlObj.searchParams.get('query') || urlObj.searchParams.get('q') || urlObj.searchParams.get('keyword');
                if (!query) throw new Error('Query parameter required');
                const limit = parseInt(body.limit || urlObj.searchParams.get('limit') || 20);
                const result = await handlePinterestSearch(query, limit);
                return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });
            }
            case 'thumbnail-proxy': {
                if (request.method !== 'GET') return new Response(JSON.stringify({ error: 'GET only' }), { status: 405 });
                
                const url = urlObj.searchParams.get('url');
                if (!url) throw new Error('URL parameter required');

                try {
                    const response = await axios.get(url, {
                        responseType: 'arraybuffer',
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                        },
                        httpAgent,
                        httpsAgent
                    });
                    
                    const headers = new Headers();
                    headers.set('Content-Type', response.headers['content-type'] || 'image/jpeg');
                    headers.set('Cache-Control', 'public, max-age=86400');
                    headers.set('Access-Control-Allow-Origin', '*');

                    return new Response(response.data, {
                        status: 200,
                        headers
                    });
                } catch (err) {
                     console.error('Thumbnail proxy error:', err.message);
                     // Fallback to a SVG placeholder with "No Thumbnail" text
                     const svg = `
<svg width="320" height="180" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#eee"/>
  <text x="50%" y="50%" font-family="Arial" font-size="20" fill="#555" text-anchor="middle" dy=".3em">No Thumbnail</text>
</svg>`;
                     return new Response(svg, { 
                         status: 200, 
                         headers: { 
                             'Content-Type': 'image/svg+xml',
                             'Access-Control-Allow-Origin': '*'
                         } 
                     });
                }
            }
            case 'tiktok-proxy':
            case 'instagram-proxy':
            case 'yt-proxy': {
                if (request.method !== 'GET') return new Response(JSON.stringify({ error: 'GET only' }), { status: 405 });
                
                const url = urlObj.searchParams.get('url');
                const type = urlObj.searchParams.get('type');
                if (!url) throw new Error('URL parameter required');

                // Special handling for tikwm.com
                let headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': '*/*'
                };

                // Handle Range requests (critical for audio/video playback and download)
                const range = request.headers.get('range');
                if (range) {
                    headers['Range'] = range;
                }

                if (url.includes('tikwm.com')) {
                    // Try removing Referer for tikwm media to avoid hotlink protection (403)
                    // headers['Referer'] = 'https://tikwm.com/'; 
                    delete headers['Referer'];
                } else if (action === 'tiktok-proxy') {
                    headers['Referer'] = 'https://www.tiktok.com/';
                } else if (action === 'instagram-proxy') {
                    headers['Referer'] = 'https://www.instagram.com/';
                } else if (action === 'yt-proxy') {
                    // Remove Referer for YouTube to avoid 403 Forbidden on direct video links
                    // headers['Referer'] = 'https://www.youtube.com/';
                    delete headers['Referer'];
                    // Sometimes User-Agent needs to be empty or specific for googlevideo
                    // headers['User-Agent'] = ''; 
                }

                try {
                    const response = await axios({
                        url: url,
                        method: 'GET',
                        responseType: 'stream',
                        headers: headers,
                        timeout: 30000,
                        httpAgent,
                        httpsAgent,
                        validateStatus: (status) => status < 400 || status === 206 // Allow 206 Partial Content
                    });
                    
                    const resHeaders = new Headers();
                    resHeaders.set('Content-Type', response.headers['content-type'] || 'application/octet-stream');
                    resHeaders.set('Cache-Control', 'public, max-age=86400');
                    resHeaders.set('Access-Control-Allow-Origin', '*');
                    
                    // Forward Content-Range and Content-Length if present
                    if (response.headers['content-range']) resHeaders.set('Content-Range', response.headers['content-range']);
                    if (response.headers['content-length']) resHeaders.set('Content-Length', response.headers['content-length']);
                    if (response.headers['accept-ranges']) resHeaders.set('Accept-Ranges', response.headers['accept-ranges']);

                    if (type === 'audio' || type === 'video') {
                         const ext = type === 'audio' ? 'mp3' : 'mp4';
                         const filename = `download_${Date.now()}.${ext}`;
                         resHeaders.set('Content-Disposition', `attachment; filename="${filename}"`);
                    }

                    return new Response(response.data, {
                        status: response.status,
                        headers: resHeaders
                    });
                } catch (err) {
                     console.error('Proxy error:', err.message);
                     return new Response(JSON.stringify({ error: 'Proxy failed: ' + err.message }), { status: 502 });
                }
            }
            default:
                return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 });
        }
    } catch (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}
