const axios = require('axios');
const cheerio = require('cheerio');
const qs = require('qs');

// ===== SSSTIK.IO (Fallback 1) =====
async function ssstikDownload(url) {
    return new Promise(async (resolve, reject) => {
        try {
            const BASEurl = 'https://ssstik.io';
            const { data: homepage } = await axios.get(BASEurl, {
                headers: {
                    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.90 Safari/537.36',
                }
            });

            const $ = cheerio.load(homepage);
            const urlPost = $('form[hx-target="#target"]').attr('hx-post');
            const tokenJSON = $('form[hx-target="#target"]').attr('include-vals');
            const tt = tokenJSON.replace(/'/g, '').replace('tt:', '').split(',')[0];
            const ts = tokenJSON.split('ts:')[1];

            const { data } = await axios.post(BASEurl + urlPost, qs.stringify({
                id: url,
                locale: 'en',
                tt: tt,
                ts: ts
            }), {
                headers: {
                    'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.90 Safari/537.36',
                }
            });

            const $$ = cheerio.load(data);
            const videoUrl = $$('div > a.without_watermark_direct').attr('href') ||
                BASEurl + $$('div > a.without_watermark').attr('href');

            if (!videoUrl) throw new Error('No video URL found');

            resolve({
                status: true,
                service: 'ssstik',
                data: [{ type: 'nowatermark', url: videoUrl }],
                music_info: { url: $$('div > a.music').attr('href') }
            });
        } catch (e) {
            reject(new Error('SSSt failed: ' + e.message));
        }
    });
}

// ===== TIKLYDOWN (Fallback 2) =====
async function tiklydownDownload(url) {
    try {
        const { data } = await axios.get(`https://api.tiklydown.eu.org/api/download?url=${encodeURIComponent(url)}`);

        if (!data.video || !data.video.noWatermark) {
            throw new Error('No video found');
        }

        return {
            status: true,
            service: 'tiklydown',
            data: [{ type: 'nowatermark', url: data.video.noWatermark }],
            music_info: { url: data.music?.play_url }
        };
    } catch (e) {
        throw new Error('Tiklydown failed: ' + e.message);
    }
}

// ===== APOCALYPSE AIO API (Primary) =====
async function apocalypseDownload(url) {
    try {
        const { data: response } = await axios.get(`https://api.apocalypse.web.id/download/tiktok?url=${encodeURIComponent(url)}`);

        if (!response.status || !response.result) {
            throw new Error(response.message || 'API error');
        }

        const res = response.result;

        // Check for error in result
        if (res.error) {
            throw new Error(res.message || 'Video not found');
        }

        let data = [];
        let audioUrl = null;

        // Parse medias array (new API format)
        if (res.medias && Array.isArray(res.medias)) {
            res.medias.forEach(media => {
                if (media.type === 'video') {
                    // Map quality names
                    let type = 'nowatermark';
                    if (media.quality === 'hd_no_watermark') type = 'nowatermark_hd';
                    else if (media.quality === 'no_watermark') type = 'nowatermark';
                    else if (media.quality === 'watermark') type = 'watermark';

                    data.push({ type: type, url: media.url });
                } else if (media.type === 'audio') {
                    audioUrl = media.url;
                } else if (media.type === 'image') {
                    data.push({ type: 'photo', url: media.url });
                }
            });
        }

        // Fallback: check for direct url (old API format)
        if (data.length === 0 && res.url && !res.url.includes('tiktok.com')) {
            data.push({ type: 'nowatermark', url: res.url });
        }

        // Handle images array if present
        if (res.images && Array.isArray(res.images)) {
            res.images.forEach(img => {
                data.push({ type: 'photo', url: img });
            });
        }

        return {
            status: true,
            service: 'apocalypse',
            title: res.title || 'TikTok Media',
            id: res.id || Date.now().toString(),
            duration: res.duration || 0,
            cover: res.thumbnail || res.cover || null,
            data: data,
            music_info: audioUrl ? {
                title: 'TikTok Audio',
                author: res.author || 'Unknown',
                url: audioUrl
            } : null,
            stats: {
                views: res.play_count || '0',
                likes: res.digg_count || '0',
                comment: res.comment_count || '0',
                share: res.share_count || '0',
            },
            author: res.author ? {
                fullname: typeof res.author === 'string' ? res.author : res.author.unique_id,
                nickname: typeof res.author === 'string' ? res.author : res.author.nickname,
                avatar: typeof res.author === 'object' ? res.author.avatar : null
            } : null
        };
    } catch (e) {
        throw new Error('Apocalypse failed: ' + e.message);
    }
}

// ===== MAIN DOWNLOAD FUNCTION WITH FALLBACK =====
async function tiktokDownloaderVideo(url) {
    const services = [apocalypseDownload, ssstikDownload, tiklydownDownload];
    let lastError;

    for (const service of services) {
        try {
            const result = await service(url);
            return result;
        } catch (error) {
            lastError = error;
            continue;
        }
    }

    // All services failed
    throw new Error('All TikTok download services failed. ' + lastError?.message);
}

// Search function (unchanged)
async function tiktokSearchVideo(query) {
    return new Promise(async (resolve, reject) => {
        try {
            const { data } = await axios("https://tikwm.com/api/feed/search", {
                headers: {
                    "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
                    cookie: "current_language=en",
                    "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36",
                },
                data: {
                    keywords: query,
                    count: 12,
                    cursor: 0,
                    web: 1,
                    hd: 1,
                },
                method: "POST",
            });
            resolve(data.data);
        } catch (e) {
            reject(e);
        }
    });
}

module.exports = {
    tiktokSearchVideo,
    tiktokDownloaderVideo
};
