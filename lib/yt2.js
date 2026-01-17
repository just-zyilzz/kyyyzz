const axios = require('axios')

async function ytdl(url) {
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
    )

    const { title, thumbnail, duration, resources } = res.data.data

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
    }
}

module.exports = { ytdl };