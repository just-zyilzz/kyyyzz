const cheerio = require("cheerio");
const axios = require('axios');

/**
 * Search Pinterest for images by keyword
 * @param {string} keyword - Search keyword
 * @param {number} limit - Number of results to return (default: 20)
 * @returns {Promise<Object>} Search results with pin data
 */
async function searchPinterest(keyword, limit = 20) {
    try {
        // Using Pinterest's public search page
        const searchUrl = `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(keyword)}`;

        const response = await axios.get(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Referer': 'https://www.pinterest.com/'
            },
            timeout: 10000
        });

        const html = response.data;
        const $ = cheerio.load(html);

        let pins = [];

        // Try to extract pins from meta tags and structured data
        // Pinterest uses JSON-LD structured data
        $('script[type="application/ld+json"]').each((index, element) => {
            try {
                const jsonData = JSON.parse($(element).html());
                if (jsonData && jsonData['@type'] === 'ItemList' && jsonData.itemListElement) {
                    jsonData.itemListElement.forEach(item => {
                        if (item.url && pins.length < limit) {
                            pins.push({
                                url: item.url,
                                title: item.name || keyword,
                                image: item.image || null,
                                description: item.description || ''
                            });
                        }
                    });
                }
            } catch (e) {
                // Skip invalid JSON
            }
        });

        // Fallback: Try to extract from page structure
        if (pins.length === 0) {
            // Extract pin URLs from links
            $('a[href*="/pin/"]').slice(0, limit).each((index, element) => {
                const href = $(element).attr('href');
                const img = $(element).find('img').first();

                if (href) {
                    const pinUrl = href.startsWith('http') ? href : `https://www.pinterest.com${href}`;
                    const imageUrl = img.attr('src') || img.attr('data-src') || null;
                    const altText = img.attr('alt') || keyword;

                    pins.push({
                        url: pinUrl,
                        title: altText,
                        image: imageUrl,
                        description: altText
                    });
                }
            });
        }

        // Remove duplicates
        const uniquePins = [];
        const seenUrls = new Set();

        for (const pin of pins) {
            if (!seenUrls.has(pin.url)) {
                seenUrls.add(pin.url);
                uniquePins.push(pin);
            }
        }

        return {
            success: true,
            keyword: keyword,
            count: uniquePins.length,
            pins: uniquePins.slice(0, limit)
        };
    } catch (error) {
        console.error("Pinterest search error:", error.message);
        return {
            success: false,
            error: error.message,
            keyword: keyword,
            pins: []
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
