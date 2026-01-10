const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Douyin (Chinese TikTok) Video Downloader
 * Author: anabot.my.id 
 * Channel: https://whatsapp.com/channel/0029VaEo7EqH5JM74UhNHi2c
 */

/**
 * Calculate hash for API request
 * @param {string} url - Video URL
 * @param {string} salt - Salt string
 * @returns {string} Hash
 */
function calculateHash(url, salt) {
    const urlBase64 = Buffer.from(url, 'utf-8').toString('base64');
    const saltBase64 = Buffer.from(salt, 'utf-8').toString('base64');
    return urlBase64 + (url.length + 1000) + saltBase64;
}

/**
 * Get download token from snapdouyin.app
 * @returns {Promise<string>} Token
 */
async function getDownloadToken() {
    try {
        const response = await axios.get('https://snapdouyin.app/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 10000
        });
        const $ = cheerio.load(response.data);

        const tokenInput = $('input#token');
        if (tokenInput.length > 0) {
            return tokenInput.attr('value');
        } else {
            throw new Error('Token not found in the webpage');
        }
    } catch (error) {
        console.error('Error fetching download token:', error.message);
        throw new Error('Failed to get download token: ' + error.message);
    }
}

/**
 * Download Douyin video
 * @param {string} videoUrl - Douyin video URL
 * @returns {Promise<Object>} Video data with metadata
 */
async function downloadDouyinVideo(videoUrl) {
    try {
        const token = await getDownloadToken();

        const hash = calculateHash(videoUrl, 'aio-dl');

        const formData = new URLSearchParams();
        formData.append('url', videoUrl);
        formData.append('token', token);
        formData.append('hash', hash);

        const response = await axios.post(
            'https://snapdouyin.app/wp-json/mx-downloader/video-data/',
            formData,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Origin': 'https://snapdouyin.app',
                    'Referer': 'https://snapdouyin.app/'
                },
                timeout: 30000 // 30 second timeout
            }
        );

        const data = response.data;

        // Validate response
        if (!data || !data.medias || !Array.isArray(data.medias) || data.medias.length === 0) {
            throw new Error('Invalid response from Douyin API - no media found');
        }

        // Extract video data (usually first media is the video)
        const videoData = data.medias[0];

        // Format response similar to TikTok format for consistency
        return {
            status: true,
            service: 'snapdouyin',
            title: data.title || 'Douyin Video',
            id: data.id || Date.now().toString(),
            duration: data.duration || 0,
            cover: data.thumbnail || videoData.thumb || null,
            downloadUrl: videoData.url || null,
            data: data.medias.map(media => ({
                type: media.quality || 'video',
                url: media.url,
                quality: media.quality,
                extension: media.extension
            })),
            stats: {
                views: data.digg_count || '0',
                likes: data.like_count || '0',
                comment: data.comment_count || '0',
                share: data.share_count || '0'
            },
            author: {
                nickname: data.author || 'Unknown',
                username: data.author_id || 'unknown'
            }
        };
    } catch (error) {
        console.error('Error downloading Douyin video:', error.message);
        throw new Error('Douyin download failed: ' + error.message);
    }
}

module.exports = {
    downloadDouyinVideo,
    calculateHash,
    getDownloadToken
};
