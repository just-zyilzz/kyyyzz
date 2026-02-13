/**
 * Generic Downloader using yt-dlp
 * Supports video and audio downloads from various platforms
 */

const youtubedl = require('youtube-dl-exec');

/**
 * Download media from generic URL
 * @param {string} url - Media URL
 */
async function downloadGeneric(url) {
    try {
        // Get best format
        const output = await youtubedl(url, {
            dumpSingleJson: true,
            noCheckCertificates: true,
            noWarnings: true,
            preferFreeFormats: true,
            addHeader: [
                'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            ]
        });

        if (!output) {
            return {
                status: false,
                code: 500,
                error: 'Gagal mengambil data'
            };
        }

        // Get the best format URL
        let downloadUrl = output.url;
        if (!downloadUrl && output.requested_downloads && output.requested_downloads.length > 0) {
            downloadUrl = output.requested_downloads[0].url;
        }

        if (!downloadUrl) {
            // Some sites might not give direct URL in JSON, check formats
            if (output.formats && output.formats.length > 0) {
                // Get last format (usually best quality)
                downloadUrl = output.formats[output.formats.length - 1].url;
            }
        }

        if (!downloadUrl) {
            return {
                status: false,
                code: 404,
                error: 'URL download tidak ditemukan'
            };
        }

        const title = output.title || 'Video';
        const hostname = new URL(url).hostname;
        const ext = output.ext || 'mp4';

        // Create proxy URL for auto-download
        // We use a new generic-proxy action in utility
        const proxyUrl = `/api/utils/utility?action=generic-proxy&url=${encodeURIComponent(downloadUrl)}&filename=${encodeURIComponent(title)}.${ext}`;

        return {
            status: true,
            code: 200,
            result: {
                title: title,
                thumbnail: output.thumbnail,
                download: proxyUrl,
                directDownload: downloadUrl,
                id: output.id,
                duration: output.duration || 0,
                source: hostname,
                platform: 'Generic',
                extension: ext
            }
        };
    } catch (error) {
        console.error('Generic download error:', error.message);

        // Check if yt-dlp is not installed
        if (error.message.includes('spawn') || error.message.includes('ENOENT')) {
            return {
                status: false,
                code: 500,
                error: 'yt-dlp tidak terinstall di server.'
            };
        }

        return {
            status: false,
            code: 500,
            error: 'Download gagal: ' + (error.message.split('\n')[0] || 'Unknown error')
        };
    }
}

module.exports = {
    downloadGeneric
};
