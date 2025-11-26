const axios = require('axios');
const cheerio = require('cheerio');
const qs = require('qs');

// ===== TIKWM.COM (Primary) =====
async function tikwmDownload(url) {
    try {
        let data = [];

        function formatNumber(integer) {
            let numb = parseInt(integer);
            return Number(numb).toLocaleString().replace(/,/g, '.');
        }

        const domain = 'https://www.tikwm.com/api/';
        const res = await (await axios.post(domain, {}, {
            headers: {
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Origin': 'https://www.tikwm.com',
                'Referer': 'https://www.tikwm.com/',
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
            },
            params: { url, count: 12, cursor: 0, web: 1, hd: 1 }
        })).data.data;

        if (!res.size && res.images) {
            res.images.map(v => data.push({ type: 'photo', url: v }));
        } else {
            data.push(
                { type: 'watermark', url: 'https://www.tikwm.com' + res.wmplay },
                { type: 'nowatermark', url: 'https://www.tikwm.com' + res.play },
                { type: 'nowatermark_hd', url: 'https://www.tikwm.com' + res.hdplay }
            );
        }

        return {
            status: true,
            service: 'tikwm',
            title: res.title,
            id: res.id,
            duration: res.duration,
            cover: 'https://www.tikwm.com' + res.cover,
            data: data,
            music_info: {
                id: res.music_info.id,
                title: res.music_info.title,
                author: res.music_info.author,
                url: 'https://www.tikwm.com' + res.music || res.music_info.play
            },
            stats: {
                views: formatNumber(res.play_count),
                likes: formatNumber(res.digg_count),
                comment: formatNumber(res.comment_count),
                share: formatNumber(res.share_count),
            },
            author: {
                id: res.author.id,
                fullname: res.author.unique_id,
                nickname: res.author.nickname,
                avatar: 'https://www.tikwm.com' + res.author.avatar
            }
        };
    } catch (e) {
        throw new Error('TikWM failed: ' + e.message);
    }
}

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

// ===== MAIN DOWNLOAD FUNCTION WITH FALLBACK =====
async function tiktokDownloaderVideo(url) {
    const services = [tikwmDownload, ssstikDownload, tiklydownDownload];
    let lastError;

    for (const service of services) {
        try {
            console.log(`Trying ${service.name}...`);
            const result = await service(url);
            console.log(`✅ Success with ${result.service}`);
            return result;
        } catch (error) {
            console.log(`❌ ${service.name} failed:`, error.message);
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
