/**
 * YouTube Downloader using yt-dlp
 * Supports video (MP4) and audio (MP3) downloads
 */

const youtubedl = require('youtube-dl-exec');

/**
 * Extract YouTube video ID from URL
 */
function extractVideoId(url) {
    if (!url) return null;
    const patterns = [
        /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
        /youtu\.be\/([a-zA-Z0-9_-]{11})/
    ];
    for (let pattern of patterns) {
        if (pattern.test(url)) return url.match(pattern)[1];
    }
    return null;
}

/**
 * Download YouTube video (MP4)
 * @param {string} url - YouTube URL
 * @param {string} quality - Video quality (144, 240, 360, 480, 720, 1080, 1440, 2160)
 */
async function downloadVideo(url, quality = '720') {
    try {
        const videoId = extractVideoId(url);
        if (!videoId) {
            return {
                status: false,
                code: 400,
                error: 'URL YouTube tidak valid'
            };
        }

        // Determine format selector based on quality
        const height = parseInt(quality);
        let formatSelector;

        if (height >= 1080) {
            // For HD and above, get best video+audio or best overall
            formatSelector = 'bestvideo[ext=mp4][height<=?1080]+bestaudio[ext=m4a]/best[ext=mp4][height<=?1080]/best';
        } else {
            // For lower qualities, prefer combined formats
            formatSelector = `best[ext=mp4][height<=?${height}]/bestvideo[ext=mp4][height<=?${height}]+bestaudio[ext=m4a]/best`;
        }

        const output = await youtubedl(url, {
            dumpSingleJson: true,
            noCheckCertificates: true,
            noWarnings: true,
            preferFreeFormats: true,
            format: formatSelector,
            addHeader: [
                'referer:youtube.com',
                'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            ]
        });

        if (!output) {
            return {
                status: false,
                code: 500,
                error: 'Gagal mengambil data video'
            };
        }

        // Get the best format URL
        let downloadUrl;
        if (output.requested_downloads && output.requested_downloads.length > 0) {
            downloadUrl = output.requested_downloads[0].url;
        } else if (output.url) {
            downloadUrl = output.url;
        } else {
            return {
                status: false,
                code: 404,
                error: 'URL download tidak ditemukan'
            };
        }

        // Return direct URL for blob download
        const title = output.title || 'YouTube Video';

        return {
            status: true,
            code: 200,
            result: {
                title: title,
                type: 'video',
                format: quality,
                thumbnail: output.thumbnail || `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
                download: downloadUrl,
                id: videoId,
                duration: output.duration || 0,
                quality: output.format_note || quality + 'p',
                author: output.uploader || output.channel || 'Unknown',
                extension: 'mp4'
            }
        };
    } catch (error) {
        console.error('YouTube download error:', error.message);

        // Check if yt-dlp is not installed
        if (error.message.includes('spawn') || error.message.includes('ENOENT')) {
            return {
                status: false,
                code: 500,
                error: 'yt-dlp tidak terinstall di server. Hubungi administrator.'
            };
        }

        return {
            status: false,
            code: 500,
            error: error.message || 'Download gagal'
        };
    }
}

/**
 * Download YouTube audio (MP3)
 * @param {string} url - YouTube URL
 */
async function downloadAudio(url) {
    try {
        const videoId = extractVideoId(url);
        if (!videoId) {
            return {
                status: false,
                code: 400,
                error: 'URL YouTube tidak valid'
            };
        }

        const output = await youtubedl(url, {
            dumpSingleJson: true,
            noCheckCertificates: true,
            noWarnings: true,
            preferFreeFormats: true,
            extractAudio: true,
            audioFormat: 'mp3',
            audioQuality: 0, // Best quality
            format: 'bestaudio[ext=m4a]/bestaudio/best',
            addHeader: [
                'referer:youtube.com',
                'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            ]
        });

        if (!output) {
            return {
                status: false,
                code: 500,
                error: 'Gagal mengambil data audio'
            };
        }

        // Get the audio URL
        let downloadUrl;
        if (output.requested_downloads && output.requested_downloads.length > 0) {
            downloadUrl = output.requested_downloads[0].url;
        } else if (output.url) {
            downloadUrl = output.url;
        } else {
            return {
                status: false,
                code: 404,
                error: 'URL download tidak ditemukan'
            };
        }

        // Return direct URL for blob download
        const title = output.title || 'YouTube Audio';

        return {
            status: true,
            code: 200,
            result: {
                title: title,
                type: 'audio',
                format: 'mp3',
                thumbnail: output.thumbnail || `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
                download: downloadUrl,
                id: videoId,
                duration: output.duration || 0,
                quality: 'Best',
                author: output.uploader || output.channel || 'Unknown',
                extension: 'mp3'
            }
        };
    } catch (error) {
        console.error('YouTube audio download error:', error.message);

        // Check if yt-dlp is not installed
        if (error.message.includes('spawn') || error.message.includes('ENOENT')) {
            return {
                status: false,
                code: 500,
                error: 'yt-dlp tidak terinstall di server. Hubungi administrator.'
            };
        }

        return {
            status: false,
            code: 500,
            error: error.message || 'Download gagal'
        };
    }
}

module.exports = {
    downloadVideo,
    downloadAudio,
    extractVideoId
};
