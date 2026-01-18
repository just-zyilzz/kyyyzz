import { tiktokDownloaderVideo } from '../../../lib/tiktok';
import Instagram from '../../../lib/instagram';
import { instagramDownload } from '../../../lib/scrapers';
import { getUserFromRequest } from '../../../lib/session';
import { saveDownload } from '../../../lib/db';
import { downloadDouyinVideo } from '../../../lib/douyin';
import { downloadTwitterVideo } from '../../../lib/twitter';
import { getSpotifyMetadata } from '../../../lib/spotify';
import { savePin } from '../../../lib/pinterest';
import { createRequestConfig } from '../../../lib/utils';
import ytSearch from 'yt-search';
import axios from 'axios';
import { vidssave, ytdl as vidssaveYtdl } from '../../../lib/vidssave';
import ytdlCore from '@distube/ytdl-core'; // Fallback

// Simple wrapper around vidssave module with fallback
async function youtubeVidssaveYtdl(url) {
    try {
        const result = await vidssaveYtdl(url);
        
        // Helper to wrap URL with proxy
        const wrapUrl = (directUrl, type) => {
             // Encode URL to avoid query param issues
             const encoded = encodeURIComponent(directUrl);
             // Always use proxy for YouTube to support range requests and avoid CORS in browser
             return `/api/utils/utility?action=yt-proxy&url=${encoded}&type=${type}`;
        };

        return {
            ...result,
            formats: result.formats.map(f => ({
                ...f,
                type: typeof f.type === 'string' ? f.type.toLowerCase() : f.type,
                format: typeof f.format === 'string' ? f.format.toLowerCase() : f.format,
                url: wrapUrl(f.url, (typeof f.type === 'string' ? f.type.toLowerCase() : f.type) === 'video' ? 'video' : 'audio')
            }))
        };
    } catch (error) {
        console.error('Vidssave failed, trying @distube/ytdl-core fallback:', error.message);
        // Fallback to @distube/ytdl-core
        const info = await ytdlCore.getInfo(url);
        
        // Helper to wrap URL with proxy
        const wrapUrl = (directUrl, type) => {
            // Encode URL to avoid query param issues
            const encoded = encodeURIComponent(directUrl);
            // Always use proxy for YouTube to support range requests and avoid CORS in browser
            return `/api/utils/utility?action=yt-proxy&url=${encoded}&type=${type}`;
        };

        return {
            title: info.videoDetails.title,
            thumbnail: info.videoDetails.thumbnails[0]?.url,
            duration: info.videoDetails.lengthSeconds,
            formats: info.formats.map(f => {
                const type = f.hasVideo ? 'video' : 'audio';
                return {
                    type,
                    quality: f.qualityLabel || 'unknown',
                    format: f.container,
                    size: f.contentLength,
                    url: wrapUrl(f.url, type) // Wrap raw URL in proxy
                };
            })
        };
    }
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
    if (!videoId) throw new Error('Invalid YouTube URL');

    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    try {
        const { url: finalUrl, config } = createRequestConfig(oembedUrl, {
            timeout: 3000,
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MediaDownloader/1.0)' }
        });
        const { data } = await axios.get(finalUrl, config);
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

async function handleYouTube(request, url, method, body, query) {
    const metadataOnly = query.get('metadata') === 'true' || body?.metadata === true;
    if (metadataOnly && method !== 'GET') throw { status: 405, message: 'Metadata requests must use GET method' };

    let quality = method === 'POST' ? (body.quality || '720') : (query.get('quality') || '720');
    if (quality) quality = quality.toString().replace('p', '');

    if (!url) throw { status: 400, message: 'URL tidak boleh kosong' };
    const lowerUrl = url.toLowerCase();
    if (!lowerUrl.includes('youtube.com') && !lowerUrl.includes('youtu.be')) throw { status: 400, message: 'URL bukan YouTube' };

    // Helper to wrap thumbnail URL with proxy
    const wrapThumbnail = (thumbUrl) => {
        if (!thumbUrl) return null;
        // Don't proxy thumbnails for YouTube either if requested
        return thumbUrl;
        // return `/api/utils/utility?action=thumbnail-proxy&url=${encodeURIComponent(thumbUrl)}`;
    };

    if (metadataOnly) return await getYouTubePreviewMetadata(url).then(m => ({ ...m, thumbnail: wrapThumbnail(m.thumbnail), thumbnailUrl: wrapThumbnail(m.thumbnail) }));

    const targetQuality = quality || '720';
    const ytData = await youtubeVidssaveYtdl(url);

    if (!ytData.formats || !Array.isArray(ytData.formats)) throw new Error('No formats available from VidsSave');

    const mp4Formats = ytData.formats.filter(f => f.type === 'video' && f.format === 'mp4' && f.url);
    if (mp4Formats.length === 0) throw new Error('MP4 format tidak tersedia');

    mp4Formats.sort((a, b) => (parseInt(b.quality) || 0) - (parseInt(a.quality) || 0));

    let selectedFormat = mp4Formats.find(f => f.quality === targetQuality);
    if (!selectedFormat) {
        const targetNum = parseInt(targetQuality);
        selectedFormat = mp4Formats.reduce((prev, curr) => {
            return Math.abs(parseInt(curr.quality) - targetNum) < Math.abs(parseInt(prev.quality) - targetNum) ? curr : prev;
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

    await saveHistory(request, url, info.title, 'YouTube', info.filename);

    return {
        success: true,
        title: info.title,
        thumbnail: wrapThumbnail(info.thumbnail),
        duration: info.duration,
        quality: info.quality,
        downloadUrl: info.url,
        fileName: info.filename,
        platform: 'YouTube'
    };
}

async function handleYouTubeAudio(request, url, method, body, query) {
    const metadataOnly = query.get('metadata') === 'true' || body?.metadata === true;
    if (metadataOnly && method !== 'GET') throw { status: 405, message: 'Metadata requests must use GET method' };

    if (!url) throw { status: 400, message: 'URL tidak boleh kosong' };
    const lowerUrl = url.toLowerCase();
    if (!lowerUrl.includes('youtube.com') && !lowerUrl.includes('youtu.be')) throw { status: 400, message: 'URL bukan YouTube' };

    const ytData = await youtubeVidssaveYtdl(url);
    if (!ytData.formats || !Array.isArray(ytData.formats)) throw new Error('No formats available from VidsSave');

    const audioFormats = ytData.formats.filter(f => (f.type === 'audio' || f.format === 'mp3' || f.format === 'm4a') && f.url);
    if (audioFormats.length === 0) throw new Error('Format audio tidak tersedia');

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

    await saveHistory(request, url, info.title, 'YouTube Audio', info.filename);

    return {
        success: true,
        title: info.title,
        thumbnail: info.thumbnail,
        duration: info.duration,
        quality: info.quality,
        downloadUrl: info.url,
        fileName: info.filename,
        platform: 'YouTube'
    };
}

async function handleTikTok(request, url, method, body, query) {
    const metadataOnly = query.get('metadata') === 'true' || body?.metadata === true;
    if (metadataOnly && method !== 'GET') throw { status: 405, message: 'Metadata requests must use GET method' };
    if (!metadataOnly && method !== 'POST') throw { status: 405, message: 'Download requests must use POST method' };

    const format = method === 'POST' ? (body.format || 'video') : (query.get('format') || 'video');

    if (!url) throw { status: 400, message: 'URL tidak boleh kosong' };
    const lowerUrl = url.toLowerCase();
    if (!lowerUrl.includes('tiktok.com') && !lowerUrl.includes('vt.tiktok.com') && !lowerUrl.includes('vm.tiktok.com')) throw { status: 400, message: 'URL bukan TikTok' };

    // Helper to get OEmbed thumbnail as fallback
    const getOEmbedThumbnail = async (videoUrl) => {
        try {
            const oembedApi = `https://www.tiktok.com/oembed?url=${encodeURIComponent(videoUrl)}`;
            const { data } = await axios.get(oembedApi);
            return data.thumbnail_url;
        } catch (e) {
            console.error('TikTok OEmbed failed:', e.message);
            return null;
        }
    };

    const result = await tiktokDownloaderVideo(url);
    
    // Resolve thumbnail: use result.cover or fallback to OEmbed
    let thumbnail = result.cover;
    if (!thumbnail || thumbnail === 'undefined') {
        thumbnail = await getOEmbedThumbnail(url);
    }

    if (metadataOnly) {
        if (result.status) {
            const isPhotoSlides = result.data && result.data.length > 0 && result.data[0].type === 'photo';
            return {
                success: true,
                title: result.title,
                author: result.author?.nickname || 'Unknown',
                thumbnail: thumbnail || null,
                thumbnailUrl: thumbnail || null,
                duration: result.duration,
                stats: result.stats,
                platform: 'TikTok',
                isPhotoSlides,
                photoCount: isPhotoSlides ? result.data.length : 0
            };
        }
        return { success: true, title: 'TikTok Video', thumbnail: thumbnail || null, platform: 'TikTok' };
    }

    if (!result.status) throw new Error('Download gagal');

    const isPhotoSlides = result.data && result.data.length > 0 && result.data[0].type === 'photo';
    if (isPhotoSlides) {
        const photoUrls = result.data.map(item => item.url);
        return {
            success: true,
            title: result.title,
            author: result.author?.nickname || 'Unknown',
            thumbnail: thumbnail,
            isPhotoSlides: true,
            photoUrls: photoUrls,
            photoCount: photoUrls.length,
            fileName: `${result.id || Date.now()}_photos`,
            duration: result.duration,
            stats: result.stats,
            musicInfo: result.music_info
        };
    }

    let downloadUrl, fileName;
    if (format === 'audio') {
        if (!result.music_info || !result.music_info.url) throw new Error('Audio tidak tersedia');
        // Use direct URL, no proxy wrapper
        downloadUrl = result.music_info.url;
        fileName = `${result.id || Date.now()}_audio.mp3`;
    } else {
        if (!result.data || !result.data.length) throw new Error('Video tidak tersedia');
        const videoData = result.data.find(d => d.type === 'nowatermark_hd') || result.data.find(d => d.type === 'nowatermark') || result.data.find(d => d.url);
        if (!videoData || !videoData.url) throw new Error('URL video tidak tersedia');
        
        // Use direct URL, no proxy wrapper
        downloadUrl = videoData.url;
        fileName = `${result.id || Date.now()}.mp4`;
    }

    await saveHistory(request, url, result.title || 'TikTok Video', 'TikTok', fileName);

    return {
        success: true,
        title: result.title,
        author: result.author?.nickname || 'Unknown',
        thumbnail: thumbnail,
        downloadUrl,
        fileName,
        isPhotoSlides: false,
        duration: result.duration,
        stats: result.stats,
        musicInfo: result.music_info
    };
}

async function handleInstagram(request, url, method, body, query) {
    const metadataOnly = query.get('metadata') === 'true' || body?.metadata === true;
    
    // Allow POST for metadata if body contains metadata flag, otherwise prefer GET
    if (metadataOnly && method !== 'GET' && !body?.metadata) throw { status: 405, message: 'Metadata requests must use GET method' };
    if (!metadataOnly && method !== 'POST') throw { status: 405, message: 'Download requests must use POST method' };

    const title = method === 'POST' ? body.title : query.get('title');
    if (!url) throw { status: 400, message: 'URL tidak boleh kosong' };
    if (!url.toLowerCase().includes('instagram.com')) throw { status: 400, message: 'URL bukan Instagram' };

    if (metadataOnly) {
        // ... simplified metadata logic ...
        return { success: true, title: 'Instagram Media', thumbnail: null, platform: 'Instagram' };
    }

    let result;
    try {
        result = await Instagram(url);
    } catch (e) {
        try {
            result = await instagramDownload(url);
        } catch (e2) {
             // Fallback to Vidssave
             try {
                const vidssaveData = await vidssave(url);
                if (!vidssaveData.formats || !vidssaveData.formats.length) throw new Error('Vidssave no formats');
                
                // Vidssave format to Instagram result format
                const bestFormat = vidssaveData.formats[0]; // Assuming first is best or use logic
                result = {
                    url: bestFormat.url,
                    metadata: {
                        caption: vidssaveData.title,
                        username: 'Instagram User',
                        isVideo: bestFormat.type === 'video' || bestFormat.format === 'mp4'
                    },
                    service: 'vidssave'
                };
             } catch (e3) {
                 result = { msg: 'All Instagram download methods failed. ' + (e3.message || e2.message || e.message) };
             }
        }
    }

    if (result.msg || result.error) throw new Error(result.msg || result.error);

    let allUrls = [];
    if (Array.isArray(result.url)) allUrls = result.url;
    else if (Array.isArray(result.urls)) allUrls = result.urls;
    else if (result.url) allUrls = [result.url];

    if (allUrls.length === 0) throw new Error('No download URLs found');

    const downloadUrl = allUrls[0];
    const fileName = `instagram_${Date.now()}.mp4`;
    const isCarousel = allUrls.length > 1;

    await saveHistory(request, url, title || result.metadata?.caption || result.metadata?.username || 'Instagram Post', 'Instagram', fileName);

    return {
        success: true,
        downloadUrl,
        urls: allUrls,
        fileName,
        isCarousel,
        carouselCount: allUrls.length,
        metadata: result.metadata,
        service: result.service || 'instagram'
    };
}

async function handleSpotify(request, url, method, body, query) {
    if (method !== 'POST') throw { status: 405, message: 'Spotify requests must use POST method' };
    if (!url) throw { status: 400, message: 'URL tidak boleh kosong' };

    const metadata = await getSpotifyMetadata(url);
    const searchResults = await ytSearch(`${metadata.artist} - ${metadata.title} audio`);
    if (!searchResults?.videos?.length) throw new Error('Lagu tidak ditemukan');

    const video = searchResults.videos[0];
    return {
        success: true,
        title: metadata.title,
        artist: metadata.artist,
        thumbnail: metadata.thumbnail,
        youtubeUrl: video.url,
        duration: video.duration.seconds,
        platform: 'Spotify',
        source: 'YouTube Bridge'
    };
}

async function handlePinterest(request, url, method, body, query) {
    const metadataOnly = query.get('metadata') === 'true' || body?.metadata === true;
    if (metadataOnly && method !== 'GET') throw { status: 405, message: 'Metadata requests must use GET method' };
    if (!metadataOnly && method !== 'POST') throw { status: 405, message: 'Download requests must use POST method' };

    if (!url) throw { status: 400, message: 'URL tidak boleh kosong' };
    if (!url.toLowerCase().includes('pinterest.com') && !url.toLowerCase().includes('pin.it')) throw { status: 400, message: 'URL bukan Pinterest' };

    const result = await savePin(url);
    if (metadataOnly) {
        if (result.success && result.results?.length > 0) {
            const firstMedia = result.results[0];
            return {
                success: true,
                title: result.title,
                thumbnail: firstMedia.downloadLink,
                downloadUrl: firstMedia.downloadLink,
                platform: 'Pinterest',
                mediaType: firstMedia.type,
                format: firstMedia.format
            };
        }
        return { success: true, title: 'Pinterest Pin', thumbnail: null, platform: 'Pinterest' };
    }

    if (!result.success || !result.results?.length) throw new Error(result.error || 'Gagal mengambil data dari Pinterest');

    const bestResult = result.results[0];
    const isVideo = bestResult.type.toLowerCase().includes('video') || bestResult.format.toLowerCase() === 'mp4';
    const fileName = `pinterest_${Date.now()}${isVideo ? '.mp4' : '.jpg'}`;

    return {
        success: true,
        title: result.title,
        downloadUrl: bestResult.downloadLink,
        fileName,
        mediaType: bestResult.type,
        format: bestResult.format,
        allResults: result.results,
        platform: 'Pinterest'
    };
}

export async function processRequest(request, platformOverride = null) {
    try {
        const urlObj = new URL(request.url);
        let body = {};
        if (request.method === 'POST') {
            try { body = await request.json(); } catch {}
        }

        const platform = platformOverride || (request.method === 'POST' ? body.platform : urlObj.searchParams.get('platform'));
        const url = sanitizeUrl(request.method === 'POST' ? body.url : urlObj.searchParams.get('url'));

        let result;
        switch (platform?.toLowerCase()) {
            case 'youtube': result = await handleYouTube(request, url, request.method, body, urlObj.searchParams); break;
            case 'youtube-audio': result = await handleYouTubeAudio(request, url, request.method, body, urlObj.searchParams); break;
            case 'tiktok': result = await handleTikTok(request, url, request.method, body, urlObj.searchParams); break;
            case 'instagram': result = await handleInstagram(request, url, request.method, body, urlObj.searchParams); break;
            case 'spotify': result = await handleSpotify(request, url, request.method, body, urlObj.searchParams); break;
            case 'pinterest': result = await handlePinterest(request, url, request.method, body, urlObj.searchParams); break;
            // Add other platforms as needed...
            default:
                throw { status: 400, message: 'Platform tidak valid atau belum didukung' };
        }

        return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });

    } catch (error) {
        console.error(`Error in downloader:`, error);
        const status = error.status || 500;
        return new Response(JSON.stringify({ success: false, error: error.message || 'Internal Server Error' }), { status, headers: { 'Content-Type': 'application/json' } });
    }
}
