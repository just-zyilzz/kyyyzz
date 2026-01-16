const ytdl = require('@distube/ytdl-core');
const fs = require('fs');
const path = require('path');

class YTFallback {
    static loadCookies() {
        try {
            const envCookies = process.env.YT_COOKIES && process.env.YT_COOKIES.trim();
            if (envCookies) {
                console.log('[YTDLFallback] Loaded cookies from environment variable YT_COOKIES');
                return envCookies;
            }

            const possiblePaths = [
                path.resolve(process.cwd(), 'cookies.txt'),
                path.resolve(process.cwd(), 'yt-cookies.txt'),
                path.join(__dirname, '..', 'cookies.txt'),
                path.join(__dirname, '..', 'yt-cookies.txt')
            ];

            for (const p of possiblePaths) {
                if (!fs.existsSync(p)) continue;
                const content = fs.readFileSync(p, 'utf-8').trim();
                // If file looks like a raw cookie header ("name=value; name2=value2; ..."), use it directly
                if (content && !content.includes('\t') && content.includes('=')) {
                    console.log(`[YTDLFallback] Loaded cookies from file: ${p}`);
                    return content;
                }
                // Otherwise parse Netscape format
                const lines = content
                    .split('\n')
                    .filter(line => line.trim() && !line.startsWith('#'))
                    .map(line => {
                        const parts = line.split('\t');
                        if (parts.length >= 7) {
                            const name = parts[5];
                            const value = parts[6];
                            return `${name}=${value}`;
                        }
                        return null;
                    })
                    .filter(Boolean);
                if (lines.length > 0) {
                    console.log(`[YTDLFallback] Loaded ${lines.length} cookies from Netscape file: ${p}`);
                    return lines.join('; ');
                }
            }
        } catch (err) {
            // ignore
        }
        return null;
    }

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
            const videoUrl = `https://www.youtube.com/watch?v=${videoId}&gl=ID&hl=id`;

            // Load cookies if available
            const cookies = this.loadCookies();

            console.log(`[YTDLFallback] Getting info for: ${videoId}${cookies ? ' (with cookies)' : ' (no cookies)'}`);

            const requestOptions = {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
                    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
                    'Origin': 'https://www.youtube.com',
                    'Referer': 'https://www.youtube.com/'
                }
            };

            // Add cookies to headers if available
            if (cookies) {
                requestOptions.headers['Cookie'] = cookies;
            }

            const info = await ytdl.getInfo(videoUrl, { requestOptions });

            // Get video+audio format with requested quality
            const qualityNumber = parseInt(quality);

            // Try to get combined video+audio format first (best for direct playback)
            let formats = ytdl.filterFormats(info.formats, 'videoandaudio');
            console.log(`[YTDLFallback] Found ${formats.length} video+audio formats`);

            let selectedFormat;
            if (formats && formats.length > 0) {
                const sorted = formats
                    .filter(f => !!f.height)
                    .sort((a, b) => (b.height || 0) - (a.height || 0));

                console.log(`[YTDLFallback] Available qualities: ${sorted.map(f => f.qualityLabel || f.height + 'p').join(', ')}`);

                selectedFormat = sorted.find(f => (f.height || 0) <= qualityNumber) || sorted[0] || formats[0];
            }

            // Fallback to video-only if no combined format available
            if (!selectedFormat) {
                console.log('[YTDLFallback] No combined format, trying video-only');
                const videoFormats = ytdl.filterFormats(info.formats, 'videoonly')
                    .filter(f => !!f.height)
                    .sort((a, b) => (b.height || 0) - (a.height || 0));

                console.log(`[YTDLFallback] Video-only qualities: ${videoFormats.map(f => f.qualityLabel || f.height + 'p').join(', ')}`);

                selectedFormat = videoFormats.find(f => (f.height || 0) <= qualityNumber) || videoFormats[0];
            }

            if (!selectedFormat) {
                throw new Error('No suitable video format found');
            }

            console.log(`[YTDLFallback] Selected format: ${selectedFormat.qualityLabel || selectedFormat.height + 'p'}`);

            return {
                success: true,
                title: info.videoDetails.title,
                thumbnail: info.videoDetails.thumbnails?.[info.videoDetails.thumbnails.length - 1]?.url || null,
                duration: parseInt(info.videoDetails.lengthSeconds),
                channel: info.videoDetails.author?.name || info.videoDetails.ownerChannelName,
                quality: selectedFormat.qualityLabel || selectedFormat.height + 'p',
                downloadUrl: selectedFormat.url,
                videoId: videoId,
                hasCookies: !!cookies
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
            const videoUrl = `https://www.youtube.com/watch?v=${videoId}&gl=ID&hl=id`;

            // Load cookies if available
            const cookies = this.loadCookies();

            console.log(`[YTDLFallback] Getting audio for: ${videoId}${cookies ? ' (with cookies)' : ''}`);

            const requestOptions = {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
                    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
                    'Origin': 'https://www.youtube.com',
                    'Referer': 'https://www.youtube.com/'
                }
            };

            // Add cookies to headers if available
            if (cookies) {
                requestOptions.headers['Cookie'] = cookies;
            }

            const info = await ytdl.getInfo(videoUrl, { requestOptions });

            // Get best audio format
            const audioFormats = ytdl.filterFormats(info.formats, 'audioonly')
                .sort((a, b) => (b.audioBitrate || 0) - (a.audioBitrate || 0));

            console.log(`[YTDLFallback] Found ${audioFormats.length} audio formats`);

            const selectedFormat = audioFormats.find(f => (f.audioBitrate || 0) >= 128) || audioFormats[0];

            if (!selectedFormat) {
                throw new Error('No audio format available');
            }

            console.log(`[YTDLFallback] Selected audio bitrate: ${selectedFormat.audioBitrate}kbps`);

            return {
                success: true,
                title: info.videoDetails.title,
                thumbnail: info.videoDetails.thumbnails?.[info.videoDetails.thumbnails.length - 1]?.url || null,
                duration: parseInt(info.videoDetails.lengthSeconds),
                channel: info.videoDetails.author?.name || info.videoDetails.ownerChannelName,
                downloadUrl: selectedFormat.url,
                videoId: videoId,
                format: 'mp3',
                hasCookies: !!cookies
            };
        } catch (error) {
            console.error('[YTDLFallback] Audio error:', error.message);
            throw error;
        }
    }
}

module.exports = YTFallback;
