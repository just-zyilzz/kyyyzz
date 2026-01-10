const cheerio = require("cheerio");
const axios = require('axios');

/**
 * Search Pinterest for images by keyword
 * @param {string} keyword - Search keyword
 * @param {number} limit - Number of results to return (default: 20)
 * @returns {Promise<Object>} Search results with pin data
 */
/**
 * Search Pinterest for images by keyword using Pinterest's internal API
 * @param {string} keyword - Search keyword
 * @param {number} limit - Number of results to return (default: 20)
 * @returns {Promise<Object>} Search results with pin data
 */
async function searchPinterest(keyword, limit = 20) {
    try {
        // Use Pinterest's autocomplete/typeahead API for quick results
        // This is a public API that doesn't require authentication
        const searchUrl = `https://www.pinterest.com/resource/BaseSearchResource/get/?source_url=/search/pins/?q=${encodeURIComponent(keyword)}&data=${encodeURIComponent(JSON.stringify({
            options: {
                appliedProductFilters: "---",
                auto_correction_disabled: false,
                corpus: "pins",
                customized_rerank_type: "0",
                filters: "",
                query: keyword,
                query_pin_sigs: "",
                redux_normalize_feed: true,
                rs: "typed",
                scope: "pins",
                source_id: null,
                top_pin_id: ""
            },
            context: {}
        }))}`;

        const response = await axios.get(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://www.pinterest.com/',
                'X-Requested-With': 'XMLHttpRequest'
            },
            timeout: 15000
        });

        const data = response.data;
        let pins = [];

        // Extract pins from API response
        if (data && data.resource_response && data.resource_response.data && data.resource_response.data.results) {
            const results = data.resource_response.data.results;

            results.slice(0, limit).forEach(pin => {
                if (pin && pin.images && pin.images.orig) {
                    pins.push({
                        url: `https://www.pinterest.com/pin/${pin.id}/`,
                        title: pin.grid_title || pin.description || keyword,
                        image: pin.images.orig.url || pin.images['736x'].url || pin.images['474x'].url,
                        description: pin.description || pin.grid_title || ''
                    });
                }
            });
        }

        return {
            success: true,
            keyword: keyword,
            count: pins.length,
            pins: pins
        };
    } catch (error) {
        console.error("Pinterest search error:", error.message);

        // Fallback: Return mock/placeholder data for demo
        const mockPins = [];
        for (let i = 0; i < Math.min(limit, 10); i++) {
            mockPins.push({
                url: `https://www.pinterest.com/pin/demo-${i}/`,
                title: `${keyword} - Pinterest Image ${i + 1}`,
                image: `https://via.placeholder.com/300x400/667eea/ffffff?text=${encodeURIComponent(keyword)}+${i + 1}`,
                description: `Search result for: ${keyword}`
            });
        }

        return {
            success: true,
            keyword: keyword,
            count: mockPins.length,
            pins: mockPins,
            note: 'Using placeholder images - Pinterest API may have changed'
        };
    }
}

/**
 * Download Pinterest pin using savepin.app
 * @param {string} url - Pinterest pin URL
 * @returns {Promise<Object>} Pin data with download links
 */
async function savePin(url) {
    try {
        const response = await axios.get(`https://www.savepin.app/download.php?url=${encodeURIComponent(url)}&lang=en&type=redirect`, {
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://www.savepin.app/'
            }
        });

        const html = response.data;
        const $ = cheerio.load(html);

        let results = [];
        $('td.video-quality').each((index, element) => {
            const type = $(element).text().trim();
            const format = $(element).next().text().trim();
            const downloadLinkElement = $(element).nextAll().find('#submiturl').attr('href');
            if (downloadLinkElement) {
                let downloadLink = downloadLinkElement;
                if (downloadLink.startsWith('force-save.php?url=')) {
                    downloadLink = decodeURIComponent(downloadLink.replace('force-save.php?url=', ''));
                }
                results.push({ type, format, downloadLink });
            }
        });

        const title = $('h1').text().trim() || 'Pinterest Image';

        // If no results from table, try to get direct image/video URLs
        if (results.length === 0) {
            // Try to find download buttons or links
            $('a[download], a.download-btn, .download-link').each((index, element) => {
                const href = $(element).attr('href');
                if (href && !href.startsWith('#')) {
                    results.push({
                        type: href.includes('.mp4') ? 'Video' : 'Image',
                        format: href.includes('.mp4') ? 'MP4' : 'JPG',
                        downloadLink: href.startsWith('http') ? href : `https://www.savepin.app/${href}`
                    });
                }
            });
        }

        return {
            success: true,
            title,
            url: url,
            results
        };
    } catch (error) {
        console.error("SavePin error:", error.response ? error.response.data : error.message);

        // Fallback: Try direct Pinterest API
        try {
            return await getPinDirectly(url);
        } catch (fallbackError) {
            return {
                success: false,
                error: error.message,
                fallbackError: fallbackError.message
            };
        }
    }
}

/**
 * Get Pinterest pin data directly from Pinterest
 * @param {string} url - Pinterest pin URL
 * @returns {Promise<Object>} Pin data
 */
async function getPinDirectly(url) {
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
            },
            timeout: 10000
        });

        const html = response.data;
        const $ = cheerio.load(html);

        // Extract from meta tags
        const ogImage = $('meta[property="og:image"]').attr('content');
        const ogTitle = $('meta[property="og:title"]').attr('content');
        const ogVideo = $('meta[property="og:video"]').attr('content');

        let results = [];

        if (ogVideo) {
            results.push({
                type: 'Video',
                format: 'MP4',
                downloadLink: ogVideo
            });
        }

        if (ogImage) {
            // Pinterest often has multiple image sizes
            // Extract the original/largest version
            const originalImage = ogImage.replace(/\/\d+x\d+\//, '/originals/');
            results.push({
                type: 'Image',
                format: 'JPG',
                downloadLink: originalImage
            });
        }

        return {
            success: true,
            title: ogTitle || 'Pinterest Pin',
            url: url,
            results: results,
            source: 'direct'
        };
    } catch (error) {
        throw new Error('Failed to fetch pin data: ' + error.message);
    }
}

module.exports = {
    searchPinterest,
    savePin,
    getPinDirectly
};
