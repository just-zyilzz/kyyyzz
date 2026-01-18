import axios from 'axios';

async function vidssave(url) {
    try {
        const res = await axios.post('https://api.vidssave.com/api/contentsite_api/media/parse',
            new URLSearchParams({
                auth: '20250901majwlqo',
                domain: 'api-ak.vidssave.com',
                origin: 'cache',
                link: url
            }).toString(),
            {
                headers: {
                    'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
                    'content-type': 'application/x-www-form-urlencoded',
                    origin: 'https://vidssave.com',
                    referer: 'https://vidssave.com/'
                }
            }
        );

        if (!res.data || !res.data.data) {
            throw new Error('Invalid response from VidsSave');
        }

        const { title, thumbnail, duration, resources } = res.data.data;

        return {
            title,
            thumbnail,
            duration,
            formats: resources.map(r => ({
                type: r.type,
                quality: r.quality,
                format: r.format,
                size: r.size,
                url: r.download_url
            }))
        };
    } catch (error) {
        throw new Error(`VidsSave Error: ${error.message}`);
    }
}

export { vidssave, vidssave as ytdl };
