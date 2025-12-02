/**
 * Threads downloader library
 * Downloads photos and videos from Threads posts
 */

const axios = require('axios');

/**
 * Download media from Threads URL
 * @param {string} url - Threads post URL
 * @returns {Promise<Object>} Download result with image and video arrays
 */
async function threadsDownload(url) {
    try {
        const { data } = await axios.get(
            `https://threadsphotodownloader.com/download?url=${encodeURIComponent(url)}`,
            {
                headers: {
                    'authority': 'threadsphotodownloader.com',
                    'accept': '*/*',
                    'next-url': '/en',
                    'referer': 'https://threadsphotodownloader.com/',
                    'rsc': '1',
                    'sec-ch-ua': '"Chromium";v="139", "Not;A=Brand";v="99"',
                    'sec-ch-ua-mobile': '?1',
                    'sec-ch-ua-platform': '"Android"',
                    'sec-fetch-dest': 'empty',
                    'sec-fetch-mode': 'cors',
                    'sec-fetch-site': 'same-origin',
                    'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36'
                },
                responseType: 'text'
            }
        );

        const html = data.toString();

        // Extract images
        const imgMatch = html.match(/"imageUrl":\[(.*?)\]/s);
        const image = imgMatch ? (imgMatch[1].match(/"([^"]+)"/g) || []).map(v => v.replace(/"/g, '')) : [];

        // Extract videos
        const vidMatch = html.match(/"videoUrl":\[(.*?)\]/s);
        let video = [];

        if (vidMatch) {
            const raw = vidMatch[1];
            const str = raw.match(/"([^"]+\.mp4[^"]*)"/g);
            if (str) video = str.map(v => v.replace(/"/g, ''));
            const obj = raw.match(/"download_url":"([^"]+)"/);
            if (obj) video.push(obj[1]);
        }

        // Extract metadata from HTML
        let username = '';
        let caption = '';

        const usernameMatch = html.match(/"username":"([^"]+)"/);
        if (usernameMatch) username = usernameMatch[1];

        const captionMatch = html.match(/"caption":"([^"]+)"/);
        if (captionMatch) caption = captionMatch[1];

        // Return structured result
        return {
            status: true,
            image,
            video,
            urls: [...image, ...video],
            metadata: {
                username,
                caption,
                imageCount: image.length,
                videoCount: video.length
            }
        };
    } catch (error) {
        console.error('Threads download error:', error.message);
        return {
            status: false,
            error: error.message || 'Download gagal'
        };
    }
}

module.exports = {
    threadsDownload
};
