/**
 * YouTube Downloader Fallback using ytdl-core
 * Simplified version for serverless (no ffmpeg required)
 */

const ytdl = require('@distube/ytdl-core');

class YTFallback {
    /**
     * Check if URL is valid YouTube URL
     */
    static isYTUrl(url) {
        const ytIdRegex = /(?:youtube\.com\/\S*(?:(?:\/e(?:mbed))?\/|watch\?(?:\S*?&?v\=))|youtu\.be\/)([a-zA-Z0-9_-]{6,11})/;
        return ytIdRegex.test(url);
    }

    /**
     * Get Video ID from URL
     */
    static getVideoID(url) {
        const ytIdRegex = /(?:youtube\.com\/\S*(?:(?:\/e(?:mbed))?\/|watch\?(?:\S*?&?v\=))|youtu\.be\/)([a-zA-Z0-9_-]{6,11})/;
        if (!this.isYTUrl(url)) throw new Error('Invalid YouTube URL');
        return ytIdRegex.exec(url)[1];
    }

    /**
     * Download YouTube Video (get direct URL)
     * @param {string} url - YouTube URL
     * @param {string} quality - Quality (360, 480, 720, 1080, etc)
     */
    static async mp4(url, quality = '720') {
        try {
            if (!url) throw new Error('URL is required');

            const videoId = this.isYTUrl(url) ? this.getVideoID(url) : url;
            const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

            console.log(`[YTDLFallback] Getting info for: ${videoId}`);

            const info = await ytdl.getInfo(videoUrl, {
                requestOptions: {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
                        'Accept-Language': 'en-US,en;q=0.9'
                    }
                }
            });

            // Get video+audio format with requested quality
            const qualityNumber = parseInt(quality);
            const formats = ytdl.filterFormats(info.formats, 'videoandaudio');

            let selectedFormat;
            if (formats && formats.length > 0) {
                const sorted = formats
                    .filter(f => !!f.height)
                    .sort((a, b) => (b.height || 0) - (a.height || 0));
                selectedFormat = sorted.find(f => (f.height || 0) <= qualityNumber) || sorted[0] || formats[0];
            }

            if (!selectedFormat) {
                const videoFormats = ytdl.filterFormats(info.formats, 'videoonly').sort((a, b) => (b.height || 0) - (a.height || 0));
                selectedFormat = videoFormats.find(f => (f.height || 0) <= qualityNumber) || videoFormats[0];
            }

            if (!selectedFormat) {
                throw new Error('No suitable video format found');
            }

            return {
                success: true,
                title: info.videoDetails.title,
                thumbnail: info.videoDetails.thumbnails?.[info.videoDetails.thumbnails.length - 1]?.url || null,
                duration: parseInt(info.videoDetails.lengthSeconds),
                channel: info.videoDetails.author?.name || info.videoDetails.ownerChannelName,
                quality: selectedFormat.qualityLabel || quality,
                downloadUrl: selectedFormat.url,
                videoId: videoId
            };
        } catch (error) {
            console.error('[YTDLFallback] Video error:', error.message);
            throw error;
        }
    }

    /**
     * Download YouTube Audio (get direct URL)
     * @param {string} url - YouTube URL
     */
    static async mp3(url) {
        try {
            if (!url) throw new Error('URL is required');

            const videoId = this.isYTUrl(url) ? this.getVideoID(url) : url;
            const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

            console.log(`[YTDLFallback] Getting audio for: ${videoId}`);

            const info = await ytdl.getInfo(videoUrl, {
                requestOptions: {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
                        'Accept-Language': 'en-US,en;q=0.9'
                    }
                }
            });

            // Get best audio format
            const audioFormats = ytdl.filterFormats(info.formats, 'audioonly').sort((a, b) => (b.audioBitrate || 0) - (a.audioBitrate || 0));
            const selectedFormat = audioFormats.find(f => (f.audioBitrate || 0) >= 128) || audioFormats[0];

            if (!selectedFormat) {
                throw new Error('No audio format available');
            }

            return {
                success: true,
                title: info.videoDetails.title,
                thumbnail: info.videoDetails.thumbnails?.[info.videoDetails.thumbnails.length - 1]?.url || null,
                duration: parseInt(info.videoDetails.lengthSeconds),
                channel: info.videoDetails.author?.name || info.videoDetails.ownerChannelName,
                downloadUrl: selectedFormat.url,
                videoId: videoId,
                format: 'mp3'
            };
        } catch (error) {
            console.error('[YTDLFallback] Audio error:', error.message);
            throw error;
        }
    }
}

module.exports = YTFallback;
