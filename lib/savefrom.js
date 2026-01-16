const axios = require('axios');
const savetube = require('./savetube');

const VIDEO_QUALITY = ['1080', '720', '480', '360', '240', '144'];
const AUDIO_BITRATE = ['128', '320'];

async function searchYoutube(q) {
    const res = await axios.get('https://yt-extractor.y2mp3.co/api/youtube/search', {
        params: { q: String(q || '').trim() },
        headers: {
            'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
            'accept': 'application/json',
            'origin': 'https://ytmp3.gg',
            'referer': 'https://ytmp3.gg/'
        }
    });

    const items = res.data && Array.isArray(res.data.items) ? res.data.items : [];
    const stream = items.find(v => v && v.type === 'stream');
    if (!stream) {
        throw new Error('vidio tidak ditemukan');
    }
    return stream;
}

async function createDownload(url, type, quality) {
    const q = String(quality);

    if (type === 'mp4' && !VIDEO_QUALITY.includes(q)) {
        throw new Error('videoquality tidak valif');
    }
    if (type === 'mp3' && !AUDIO_BITRATE.includes(q)) {
        throw new Error('audiobitrate tidak valid');
    }

    const payload = type === 'mp4'
        ? {
            url,
            downloadMode: 'video',
            brandName: 'ytmp3.gg',
            videoQuality: q,
            youtubeVideoContainer: 'mp4'
        }
        : {
            url,
            downloadMode: 'audio',
            brandName: 'ytmp3.gg',
            audioFormat: 'mp3',
            audioBitrate: q
        };

    const res = await axios.post('https://hub.y2mp3.co', payload, {
        headers: {
            'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
            'accept': 'application/json',
            'content-type': 'application/json',
            'origin': 'https://ytmp3.gg',
            'referer': 'https://ytmp3.gg/'
        }
    });

    const data = res.data || {};
    if (!data.url) {
        throw new Error('download gagal');
    }
    return data;
}

async function ytdlYtmp3(input, type, quality) {
    let info;
    let url = input;

    if (!/^https?:\/\//i.test(input)) {
        info = await searchYoutube(input);
        url = info.id;
    }

    const dl = await createDownload(url, type, quality);

    if (!info) {
        info = {
            title: null,
            thumbnailUrl: null,
            uploaderName: null,
            duration: null,
            viewCount: null,
            uploadDate: null
        };
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
        filename: dl.filename || null,
        source: 'ytmp3'
    };
}

async function ytdlSaveTube(input, type, quality) {
    const url = input;
    const data = await savetube(url);

    if (!data || !data.status) {
        const message = data && data.msg ? data.msg : 'savetube gagal';
        throw new Error(message);
    }

    const q = String(quality);
    let selected = null;

    if (type === 'mp4') {
        const videoItems = (data.videos || []).filter(v => v && v.label && typeof v.url === 'string' && !String(v.label).toLowerCase().includes('mp3'));
        if (videoItems.length === 0) {
            throw new Error('format video tidak tersedia di savetube');
        }

        const numericQ = parseInt(q, 10) || 0;
        const sortedVideo = videoItems.slice().sort((a, b) => (parseInt(b.quality, 10) || 0) - (parseInt(a.quality, 10) || 0));
        selected = sortedVideo.find(v => (parseInt(v.quality, 10) || 0) <= numericQ) || sortedVideo[0];
    } else if (type === 'mp3') {
        const audioItems = (data.videos || []).filter(v => v && v.label && typeof v.url === 'string' && String(v.label).toLowerCase().includes('mp3'));
        if (audioItems.length === 0) {
            throw new Error('format audio tidak tersedia di savetube');
        }

        const sortedAudio = audioItems.slice().sort((a, b) => (parseInt(b.quality, 10) || 0) - (parseInt(a.quality, 10) || 0));
        selected = sortedAudio.find(v => String(v.quality) === q) || sortedAudio[0];
    } else {
        throw new Error('tipe tidak didukung untuk savetube');
    }

    if (!selected || !selected.url) {
        throw new Error('quality tidak ditemukan di savetube');
    }

    return {
        title: data.title,
        thumbnail: data.thumbnail,
        uploader: null,
        duration: data.duration,
        viewCount: null,
        uploadDate: null,
        type,
        quality: String(selected.quality || q),
        url: selected.url,
        filename: null,
        source: 'savetube'
    };
}

async function ytdl(input, type, quality) {
    const services = [ytdlYtmp3, ytdlSaveTube];
    let lastError = null;

    for (const service of services) {
        try {
            const result = await service(input, type, quality);
            return result;
        } catch (error) {
            lastError = error;
        }
    }

    const message = lastError && lastError.message ? lastError.message : 'unknown error';
    throw new Error('All YouTube download services failed. ' + message);
}

module.exports = {
    ytdl,
    searchYoutube,
    createDownload
};
