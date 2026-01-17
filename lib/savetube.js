const axios = require('axios');
const crypto = require('crypto');

const anu = Buffer.from('C5D58EF67A7584E4A29F6C35BBC4EB12', 'hex');

function decrypt(enc) {
    try {
        const b = Buffer.from(enc.replace(/\s/g, ''), 'base64');
        const iv = b.subarray(0, 16);
        const data = b.subarray(16);
        const d = crypto.createDecipheriv('aes-128-cbc', anu, iv);
        return JSON.parse(Buffer.concat([d.update(data), d.final()]).toString());
    } catch (error) {
        throw new Error('Failed to decrypt response: ' + error.message);
    }
}

async function savetube(url) {
    try {
        // Step 1: Get CDN
        const cdn = await axios.get('https://media.savetube.me/api/random-cdn', {
            timeout: 10000
        });

        if (!cdn.data || !cdn.data.cdn) {
            throw new Error('Failed to get CDN');
        }

        // Step 2: Get video info
        const info = await axios.post(
            `https://${cdn.data.cdn}/v2/info`,
            { url },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'origin': 'https://ytsave.savetube.me',
                    'referer': 'https://ytsave.savetube.me/',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 15000
            }
        );

        if (!info.data?.status) {
            throw new Error('Failed to get video info');
        }

        const json = decrypt(info.data.data);

        if (!json || !json.id || !json.key) {
            throw new Error('Invalid video data');
        }

        // Step 3: Download function with retry
        async function download(type, quality, retries = 2) {
            for (let attempt = 0; attempt <= retries; attempt++) {
                try {
                    const r = await axios.post(
                        `https://${cdn.data.cdn}/download`,
                        {
                            id: json.id,
                            key: json.key,
                            downloadType: type,
                            quality: String(quality)
                        },
                        {
                            headers: {
                                'Content-Type': 'application/json',
                                'User-Agent': 'Mozilla/5.0',
                                'origin': 'https://ytsave.savetube.me',
                                'referer': 'https://ytsave.savetube.me/'
                            },
                            timeout: 20000
                        }
                    );

                    if (r.data?.data?.downloadUrl) {
                        return r.data.data.downloadUrl;
                    }
                } catch (error) {
                    if (attempt === retries) {
                        console.error(`Download failed for ${type}/${quality}:`, error.message);
                        return null;
                    }
                    await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
                }
            }
            return null;
        }

        const videos = [];

        // Process video formats
        if (json.video_formats && Array.isArray(json.video_formats)) {
            for (const v of json.video_formats) {
                if (v && v.quality && v.label) {
                    const url = await download('video', v.quality);
                    if (url) {
                        videos.push({
                            quality: v.quality,
                            label: v.label,
                            url: url
                        });
                    }
                }
            }
        }

        // Process audio formats
        if (json.audio_formats && Array.isArray(json.audio_formats)) {
            for (const a of json.audio_formats) {
                if (a && a.quality && a.label) {
                    const url = await download('audio', a.quality);
                    if (url) {
                        videos.push({
                            quality: a.quality,
                            label: a.label,
                            url: url
                        });
                    }
                }
            }
        }

        if (videos.length === 0) {
            throw new Error('No download URLs available');
        }

        return {
            status: true,
            title: json.title || 'Unknown Title',
            duration: json.duration || 0,
            thumbnail: json.thumbnail || null,
            videos
        };

    } catch (e) {
        console.error('Savetube error:', e.message);
        return { 
            status: false, 
            msg: e.message || 'Unknown error occurred'
        };
    }
}

module.exports = savetube;