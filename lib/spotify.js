/**
 * Spotify Downloader using Apocalypse API
 * Direct download support for Spotify tracks
 */

const axios = require('axios');

const spotify = {
    api: {
        base: "https://api.apocalypse.web.id",
        download: "/download/spotify",
        search: "/search/spotify"
    },
    headers: {
        'accept': '*/*',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },

    /**
     * Validate Spotify URL
     * @param {string} url - URL to validate
     * @returns {boolean}
     */
    isSpotifyUrl(url) {
        return url && (
            url.includes('spotify.com/track') ||
            url.includes('spotify.com/album') ||
            url.includes('spotify.com/playlist')
        );
    },

    /**
     * Search Spotify tracks
     * @param {string} query - Search keywords
     * @returns {Promise<Object>}
     */
    async search(query) {
        if (!query || query.trim() === '') {
            return {
                status: false,
                code: 400,
                error: "Query tidak boleh kosong"
            };
        }

        try {
            const apiUrl = `${this.api.base}${this.api.search}?q=${encodeURIComponent(query)}`;

            const { data: response } = await axios({
                method: 'get',
                url: apiUrl,
                headers: this.headers,
                timeout: 15000
            });

            if (!response.status || !response.result) {
                return {
                    status: false,
                    code: 500,
                    error: "Tidak ada hasil ditemukan"
                };
            }

            return {
                status: true,
                code: 200,
                total: response.total || response.result.length,
                results: response.result.map(item => ({
                    no: item.no,
                    title: item.title,
                    artist: item.artist,
                    duration: item.duration,
                    spotifyUrl: item.spotify_url,
                    thumbnail: item.thumbnail
                }))
            };

        } catch (error) {
            console.error('Spotify search error:', error.message);
            return {
                status: false,
                code: 500,
                error: error.message
            };
        }
    },

    /**
     * Get Spotify metadata using oEmbed (fallback)
     * @param {string} url - Spotify URL
     * @returns {Promise<Object>}
     */
    async getMetadata(url) {
        try {
            const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`;
            const { data } = await axios.get(oembedUrl, { timeout: 5000 });

            return {
                success: true,
                title: data.title || 'Spotify Track',
                thumbnail: data.thumbnail_url,
                platform: 'Spotify'
            };
        } catch (error) {
            return {
                success: true,
                title: 'Spotify Track',
                thumbnail: null,
                platform: 'Spotify'
            };
        }
    },

    /**
     * Download Spotify track using Apocalypse API
     * @param {string} url - Spotify track URL
     * @returns {Promise<Object>} - Download result
     */
    async download(url) {
        if (!url) {
            return {
                status: false,
                code: 400,
                error: "URL tidak boleh kosong"
            };
        }

        if (!this.isSpotifyUrl(url)) {
            return {
                status: false,
                code: 400,
                error: "URL bukan Spotify yang valid"
            };
        }

        try {
            const apiUrl = `${this.api.base}${this.api.download}?url=${encodeURIComponent(url)}`;

            const { data: response } = await axios({
                method: 'get',
                url: apiUrl,
                headers: this.headers,
                timeout: 30000
            });

            if (!response.status || !response.result) {
                return {
                    status: false,
                    code: 500,
                    error: "API response tidak valid"
                };
            }

            const result = response.result;

            // Find audio media
            const audioMedia = result.medias?.find(m => m.type === 'audio') || result.medias?.[0];

            if (!audioMedia || !audioMedia.url) {
                return {
                    status: false,
                    code: 404,
                    error: "Download tidak tersedia untuk lagu ini"
                };
            }

            return {
                status: true,
                code: 200,
                result: {
                    title: result.title || "Unknown Title",
                    artist: result.author || "Unknown Artist",
                    thumbnail: result.thumbnail,
                    downloadUrl: audioMedia.url,
                    duration: result.duration,
                    quality: audioMedia.quality || "HQ",
                    extension: audioMedia.extension || "mp3",
                    type: result.type || "single",
                    platform: 'Spotify'
                }
            };

        } catch (error) {
            console.error('Spotify download error:', error.message);
            return {
                status: false,
                code: 500,
                error: error.message
            };
        }
    }
};

/**
 * Legacy function for backward compatibility
 * @param {string} url - Spotify URL
 * @returns {Promise<Object>}
 */
async function getSpotifyMetadata(url) {
    return spotify.getMetadata(url);
}

/**
 * Download Spotify track
 * @param {string} url - Spotify URL
 * @returns {Promise<Object>}
 */
async function downloadSpotify(url) {
    return spotify.download(url);
}

/**
 * Search Spotify tracks
 * @param {string} query - Search keywords
 * @returns {Promise<Object>}
 */
async function searchSpotify(query) {
    return spotify.search(query);
}

module.exports = {
    getSpotifyMetadata,
    downloadSpotify,
    searchSpotify,
    spotify
};
