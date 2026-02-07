/**
 * Facebook Downloader using Apocalypse AIO API
 * Download videos and photos from Facebook (HD only)
 */

const axios = require('axios');

const facebook = {
    api: {
        base: "https://api.apocalypse.web.id/download/aio?url="
    },
    headers: {
        'accept': '*/*',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },

    /**
     * Validate Facebook URL
     * @param {string} url - URL to validate
     * @returns {boolean}
     */
    isFacebookUrl(url) {
        if (!url) return false;
        const lowerUrl = url.toLowerCase();
        return (
            lowerUrl.includes('facebook.com') ||
            lowerUrl.includes('fb.watch') ||
            lowerUrl.includes('fb.com') ||
            lowerUrl.includes('m.facebook.com')
        );
    },

    /**
     * Download Facebook video/photo (HD only)
     * @param {string} url - Facebook video/photo URL
     * @returns {Promise<Object>}
     */
    async download(url) {
        if (!url) {
            return {
                status: false,
                code: 400,
                error: "URL tidak boleh kosong"
            };
        }

        if (!this.isFacebookUrl(url)) {
            return {
                status: false,
                code: 400,
                error: "URL bukan Facebook yang valid"
            };
        }

        try {
            const apiUrl = `${this.api.base}${encodeURIComponent(url)}`;

            const { data: response } = await axios({
                method: 'get',
                url: apiUrl,
                headers: this.headers,
                timeout: 30000,
                validateStatus: false
            });

            console.log('[Facebook API] Response:', JSON.stringify(response, null, 2));

            // Check if response is empty or not as expected
            if (!response) {
                return {
                    status: false,
                    code: 500,
                    error: "Tidak ada respon dari server API"
                };
            }

            // Check for API error response
            if (response.status === false) {
                return {
                    status: false,
                    code: 500,
                    error: response.error || response.message || "Gagal mengambil data dari Facebook"
                };
            }

            const result = response.result;

            if (!result) {
                return {
                    status: false,
                    code: 404,
                    error: "Data tidak ditemukan dalam respon API"
                };
            }

            // Check for error in result
            if (result.error) {
                return {
                    status: false,
                    code: 404,
                    error: "Video tidak ditemukan atau bersifat privat"
                };
            }

            // Determine media type and get download URL
            let downloadUrl = null;
            let mediaType = 'video';
            let quality = 'HD';
            let thumbnail = null;

            // The API returns medias array with different qualities
            if (result.medias && Array.isArray(result.medias) && result.medias.length > 0) {
                // Find HD quality first
                let selectedMedia = result.medias.find(m =>
                    m.quality && m.quality.toUpperCase() === 'HD'
                );

                // Fallback to any video if no HD
                if (!selectedMedia) {
                    selectedMedia = result.medias.find(m => m.type === 'video');
                }

                // Fallback to first media
                if (!selectedMedia) {
                    selectedMedia = result.medias[0];
                }

                if (selectedMedia) {
                    downloadUrl = selectedMedia.url;
                    quality = selectedMedia.quality || 'Normal';
                    mediaType = selectedMedia.type || 'video';
                }
            }

            // Fallback: Check for direct url property
            if (!downloadUrl && result.url) {
                downloadUrl = result.url;
            }

            // Get thumbnail
            thumbnail = result.thumbnail || result.cover || null;

            // Get title
            const title = result.title || "Facebook Media";

            if (!downloadUrl) {
                return {
                    status: false,
                    code: 404,
                    error: "URL download tidak ditemukan. Pastikan link benar dan bersifat publik."
                };
            }

            return {
                status: true,
                code: 200,
                result: {
                    title: title,
                    thumbnail: thumbnail,
                    downloadUrl: downloadUrl,
                    mediaType: mediaType,
                    quality: quality,
                    duration: result.duration || null,
                    author: result.author || "Facebook User",
                    platform: 'Facebook'
                }
            };

        } catch (error) {
            console.error('Facebook download error:', error.message);
            return {
                status: false,
                code: 500,
                error: error.message || "Gagal mengambil data dari Facebook"
            };
        }
    }
};

/**
 * Download Facebook video/photo
 * @param {string} url - Facebook URL
 * @returns {Promise<Object>}
 */
async function downloadFacebook(url) {
    return facebook.download(url);
}

module.exports = {
    downloadFacebook,
    facebook
};
