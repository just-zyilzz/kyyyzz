/**
 * YouTube Downloader using Apocalypse AIO API
 * Supports video and audio downloads
 */

const axios = require("axios");

const savetube = {
    api: {
        base: "https://api.apocalypse.web.id",
        download: "/download/aio"
    },
    headers: {
        'accept': '*/*',
        'content-type': 'application/json',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    formatVideo: ['144', '240', '360', '480', '720', '1080', '1440', '2160'],
    formatAudio: ['mp3', 'm4a', 'webm', 'aac', 'flac', 'opus', 'ogg', 'wav'],

    isUrl: str => {
        try {
            new URL(str);
            return true;
        } catch (_) {
            return false;
        }
    },

    youtube: url => {
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
    },

    request: async (url) => {
        try {
            const { data: response } = await axios({
                method: 'get',
                url: url,
                headers: savetube.headers,
                timeout: 30000
            });
            return {
                status: true,
                code: 200,
                data: response
            };
        } catch (error) {
            return {
                status: false,
                code: error.response?.status || 500,
                error: error.message
            };
        }
    },

    /**
     * Find best matching media from API response
     * @param {Array} medias - Array of media objects from API
     * @param {string} format - Requested format (quality for video, codec for audio)
     * @param {boolean} isAudio - Whether to find audio
     * @returns {Object|null} - Best matching media object
     */
    findBestMedia: (medias, format, isAudio) => {
        if (!medias || !Array.isArray(medias)) return null;

        if (isAudio) {
            // Find audio-only streams
            const audioStreams = medias.filter(m =>
                m.type === 'audio' ||
                (m.is_audio && !m.height) ||
                m.mimeType?.includes('audio')
            );

            if (audioStreams.length > 0) {
                // Prefer mp4a/m4a for better quality
                const m4a = audioStreams.find(m => m.mimeType?.includes('mp4a') || m.extension === 'm4a');
                if (m4a) return m4a;
                return audioStreams[0];
            }

            // Fallback: find video with audio (itag 18 is 360p with audio)
            const videoWithAudio = medias.filter(m => m.is_audio === true && m.type === 'video');
            if (videoWithAudio.length > 0) {
                // Get lowest quality video with audio for smaller file size
                return videoWithAudio.reduce((prev, curr) =>
                    (prev.height || 9999) < (curr.height || 9999) ? prev : curr
                );
            }

            return null;
        }

        // Video: find by quality label
        const targetHeight = parseInt(format) || 720;
        const videoStreams = medias.filter(m => m.type === 'video' && m.height);

        if (videoStreams.length === 0) return null;

        // Prefer mp4 format with audio
        const mp4WithAudio = videoStreams.filter(m =>
            m.extension === 'mp4' && m.is_audio === true
        );

        if (mp4WithAudio.length > 0) {
            // Find closest quality
            let bestMatch = mp4WithAudio.find(m => m.height === targetHeight);
            if (!bestMatch) {
                const lowerQualities = mp4WithAudio.filter(m => m.height <= targetHeight);
                if (lowerQualities.length > 0) {
                    bestMatch = lowerQualities.reduce((prev, curr) =>
                        curr.height > prev.height ? curr : prev
                    );
                } else {
                    bestMatch = mp4WithAudio[0];
                }
            }
            return bestMatch;
        }

        // Fallback to any video
        let bestMatch = videoStreams.find(m => m.height === targetHeight);

        if (!bestMatch) {
            const lowerQualities = videoStreams.filter(m => m.height <= targetHeight);
            if (lowerQualities.length > 0) {
                bestMatch = lowerQualities.reduce((prev, curr) =>
                    curr.height > prev.height ? curr : prev
                );
            } else {
                bestMatch = videoStreams.reduce((prev, curr) =>
                    curr.height < prev.height ? curr : prev
                );
            }
        }

        // Prefer mp4 format at same height
        const mp4Match = videoStreams.find(m =>
            m.height === bestMatch.height && m.extension === 'mp4'
        );

        return mp4Match || bestMatch;
    },

    download: async (link, format) => {
        if (!link) {
            return {
                status: false,
                code: 400,
                error: "Link tidak boleh kosong"
            };
        }

        if (!savetube.isUrl(link)) {
            return {
                status: false,
                code: 400,
                error: "URL tidak valid"
            };
        }

        const allFormats = [...savetube.formatVideo, ...savetube.formatAudio];
        if (!format || !allFormats.includes(format)) {
            return {
                status: false,
                code: 400,
                error: "Format tidak tersedia",
                available_fmt: allFormats
            };
        }

        const id = savetube.youtube(link);
        if (!id) {
            return {
                status: false,
                code: 400,
                error: "Link YouTube tidak valid"
            };
        }

        try {
            const youtubeUrl = `https://www.youtube.com/watch?v=${id}`;
            const apiUrl = `${savetube.api.base}${savetube.api.download}?url=${encodeURIComponent(youtubeUrl)}`;

            const result = await savetube.request(apiUrl);

            if (!result.status) {
                return result;
            }

            if (!result.data.status || !result.data.result) {
                return {
                    status: false,
                    code: 500,
                    error: "API response tidak valid"
                };
            }

            const apiResult = result.data.result;
            const isAudio = savetube.formatAudio.includes(format);

            // Find best matching media
            const bestMedia = savetube.findBestMedia(apiResult.medias, format, isAudio);

            if (!bestMedia || !bestMedia.url) {
                return {
                    status: false,
                    code: 404,
                    error: `Format ${format} tidak tersedia untuk video ini`
                };
            }

            return {
                status: true,
                code: 200,
                result: {
                    title: apiResult.title || "Unknown Title",
                    type: isAudio ? 'audio' : 'video',
                    format: format,
                    thumbnail: apiResult.thumbnail || `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
                    download: bestMedia.url,
                    id: id,
                    duration: apiResult.duration,
                    quality: bestMedia.qualityLabel || bestMedia.quality || format,
                    author: apiResult.author || "Unknown",
                    extension: bestMedia.extension || (isAudio ? 'mp3' : 'mp4')
                }
            };

        } catch (error) {
            return {
                status: false,
                code: 500,
                error: error.message
            };
        }
    }
};

module.exports = savetube;
