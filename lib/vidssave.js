const axios = require('axios');

/**
 * YouTube downloader using Vidssave API (Direct Connection - No Proxy)
 * Uses GET requests
 * @param {string} url - YouTube video URL
 * @returns {Promise<Object>} Video metadata and download links
 */
async function ytdl(url) {
    const mirrors = [
        { domain: 'api.vidssave.com', origin: 'cache' },
        { domain: 'api-ak.vidssave.com', origin: 'cache' },
        { domain: 'api.vidssave.com', origin: 'direct' },
        { domain: 'api-ak.vidssave.com', origin: 'direct' }
    ];

    let lastError = null;

    for (const mirror of mirrors) {
        try {
            // Build URL with query parameters (GET request)
            const params = new URLSearchParams({
                auth: '20250901majwlqo',
                domain: mirror.domain,
                origin: mirror.origin,
                link: url
            });

            const apiUrl = `https://${mirror.domain}/api/contentsite_api/media/parse?${params.toString()}`;

            console.log(`[Vidssave] Trying ${mirror.domain}/${mirror.origin}...`);

            // Direct connection - no proxy
            const res = await axios.get(apiUrl, {
                headers: {
                    'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
                    'accept': 'application/json',
                    'referer': 'https://vidssave.com/'
                },
                timeout: 15000,
                validateStatus: () => true
            });

            // Check for HTTP errors
            if (res.status !== 200) {
                throw new Error(`HTTP ${res.status}`);
            }

            // Check for API error responses
            if (!res.data || res.data.status === 0 || res.data.msg) {
                throw new Error(res.data?.msg || 'API returned error');
            }

            // Validate response structure
            if (!res.data.data || !res.data.data.resources) {
                throw new Error('Invalid response structure');
            }

            const { title, thumbnail, duration, resources } = res.data.data;

            console.log(`✅ [Vidssave] Success with ${mirror.domain}/${mirror.origin}`);

            return {
                title,
                thumbnail,
                duration,
                formats: resources.map(r => ({
                    type: r.type,
                    quality: r.quality,
                    format: r.format,
                    size: r.size,
                    url: r.download_url
                }))
            };

        } catch (error) {
            console.log(`[Vidssave] Failed ${mirror.domain}/${mirror.origin}: ${error.message}`);
            lastError = error;
            // Small delay between attempts
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    // All mirrors failed
    throw new Error(`All Vidssave mirrors failed. Last error: ${lastError?.message || 'Unknown'}`);
}

module.exports = { ytdl };
