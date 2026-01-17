const axios = require('axios')

const videoquality = ['1080', '720', '480', '360', '240', '144']
const audiobitrate = ['128', '320']

async function search(q) {
    const r = await axios.get('https://yt-extractor.y2mp3.co/api/youtube/search?q=' + encodeURIComponent(q),
        {
            headers: {
                'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
                accept: 'application/json',
                origin: 'https://ytmp3.gg',
                referer: 'https://ytmp3.gg/'
            }
        }
    )
    const i = r.data.items.find(v => v.type === 'stream')
    if (!i) throw new Error('vidio tidak ditemukan')
    return i
}

async function download(url, type, quality) {
    if (type === 'mp4' && !videoquality.includes(String(quality))) throw new Error('videoquality tidak valif')
    if (type === 'mp3' && !audiobitrate.includes(String(quality))) throw new Error('audiobitrate tidak valid')

    const payload =
        type === 'mp4'
            ? {
                url,
                downloadMode: 'video',
                brandName: 'ytmp3.gg',
                videoQuality: String(quality),
                youtubeVideoContainer: 'mp4'
            }
            : {
                url,
                downloadMode: 'audio',
                brandName: 'ytmp3.gg',
                audioFormat: 'mp3',
                audioBitrate: String(quality)
            }

    const r = await axios.post('https://hub.y2mp3.co', payload, {
        headers: {
            'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
            accept: 'application/json',
            'content-type': 'application/json',
            origin: 'https://ytmp3.gg',
            referer: 'https://ytmp3.gg/'
        }
    })

    if (!r.data?.url) throw new Error('download gagal')
    return r.data
}

async function ytdl(input, type, quality) {
    let info
    let url = input

    if (!/^https?:\/\//i.test(input)) {
        info = await search(input)
        url = info.id
    }

    const dl = await download(url, type, quality)

    if (!info) {
        info = { title: null, thumbnailUrl: null, uploaderName: null, duration: null, viewCount: null, uploadDate: null }
    }

    return {
        title: info.title,
        thumbnail: info.thumbnailUrl,
        uploader: info.uploaderName,
        duration: info.duration,
        viewCount: info.viewCount,
        uploadDate: info.uploadDate,
        type,
        quality: String(quality),
        url: dl.url,
        filename: dl.filename
    }
}

module.exports = { ytdl, videoquality, audiobitrate };