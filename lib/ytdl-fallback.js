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
            const info = await ytdl.getInfo(videoUrl);

            // Get video+audio format with requested quality
            const qualityNumber = parseInt(quality);
            const formats = ytdl.filterFormats(info.formats, 'videoandaudio');

            // Find best match for quality
            let selectedFormat = formats.find(f => f.height === qualityNumber) ||
                formats.find(f => f.qualityLabel?.includes(quality)) ||
                formats[0]; // fallback to first available

            if (!selectedFormat) {
                // Try video-only + audio-only as fallback
                const videoFormats = ytdl.filterFormats(info.formats, 'videoonly');
                selectedFormat = videoFormats.find(f => f.height === qualityNumber) || videoFormats[0];
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
            const info = await ytdl.getInfo(videoUrl);

            // Get best audio format
            const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
            const selectedFormat = audioFormats.find(f => f.audioBitrate >= 128) || audioFormats[0];

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
