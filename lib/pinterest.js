const cheerio = require("cheerio");
const axios = require('axios');

/**
 * Search Pinterest for images by keyword using cookie-based scraping
 * @param {string} keyword - Search keyword
 * @param {number} limit - Number of results to return (default: 20)
 * @returns {Promise<Object>} Search results with pin data
 */
async function searchPinterest(keyword, limit = 20) {
    return new Promise(async (resolve, reject) => {
        try {
            const response = await axios.get('https://id.pinterest.com/search/pins/?autologin=true&q=' + keyword, {
                headers: {
                    "cookie": '_auth=1; _pinterest_sess=TWc9PSZzN1VKRTV1cGczQ1ZMRStzVE4xZ2pCd1JzV3JGeUVrblBteVJRMnBZajVIWGpRMmdIOEJmRDhhc0JuSXNKaGU5YUJrTzZMOFdmMmhHSW81aEI5dWd6Vk8rQU43S0IxTVpiRFIraE11MElyRlQzeHFnQXRNNEhZRWNzOHlLeThkVVU0bFRWSC95d2gyb2pDOXR1SXA5TjBNWFpsVmczYUZRdDQreDV2Ukc3ZG5MSHliemlmTGtVTlQxdVVqLzNOYUFoNUlHWk5ReUt1UEpLZ0poSFE2SzgzZVB5R202UjAvRXJUbE1vUEhzWVIvMXhwQ0orSVQrMzJ0RVo0d1cxN2pUdExzVU55dU5JbzhzMVpweEs4bWZ6ZGFaUHpaMS9RdVVsRVNySVFGbVBpRmFJc2hLT3NYek16WXMzYkUvZSt4Z09LMW9NVHJCTmxweUdLcUxWU0ZNNElxOTFwYkRGK1E5WDRRR3RYeFdOa0grUDUwT2txS2xUaHhibk5FdHJxSi9kTzBDeHJyZXhkY3A5RzBXVElMVndML3cyZG16bzdzOGZIVDVRRjZITnZIbThjb1djR1pUeEg0Vk53V0w1TVZjQ3N1UnozQnF0TGVuNFV2OVlTN2lzQkppR1h1SVZtR25Lb2ozTlZRYkowSnMwMkdhZ0tsaytXbTVSS29VdVNiNzRaRmJEbTNOTEFDSGk2dFlVNkNOckJzblVIQWdHSW9kdzd0QWV0SFdSOSt5ZEI4THZ1U2ViNThZcGFobnNXdFc3U0I3Tjh1ZG5hL29wWlRCSjhjeTcxZEdUdk51Y3czbThjcjhpYldOa3krZysrWmp4WC9SMWNRbnZwSDNHeWRiQzIxZk5Bajc5VVRFYTdtL3FFaUhXRm12b2RWN2EydGFlbVltalFEQkMvYzk1Yk8wOXFxQjhYdFEvOSsyV3R2bkd6c0Y5eVNUclFKWTROajg5SnVVbWdyT0IwWWh3QlFXeGZFQURKTmRvNm9ZekdLdGQrZFJ4TWhRMEFaNFRQWnNpeFRwR2luYzhsM1FsUUczUE0vUEo5YXowbWk1Mno5RHZZUTdYOCtERlhTdEhnenRmQTdvQ1REbDJxSlNrMjZvanhPVnlDbnZycGk4ZVUxRC9yUmNnMm5Fc0F3eGl5L1V3OW5kREN3RFNLcEVhTXkvRnJDQ2ZMNnFEc3k4WjJqWHcxVk04TmVqNnNzTTM0RXBJQnVWaEFTcHBvK0VpekVpai8wRHBsbHBWYjBETFZOayttZnhRMytUY0gyOTkxOEZNTXJWb3g0bTJQbHJoUDlNZnNDZFN0QmtZZG4xVlkyaHpXTk5DajE1WVJ6WFFKY1ZrU2NPUHdZV1VBRGlOZEJic2pyaWxINndTbTRZcmR4cHdEL0hudDBUaElZZEx5emU0V3huWGQ4QW9NNVhoczY3VHZoQ2pDUjM0TENrRC9nbGRoSGN3RnY4ZUU3dnBTYUhFUWJCL0dUTWhVN2pobTVONkN6alpDN2liN0FFelgvZjNxWXlwRmxXNUJtVUYzLy9LaGVwVmZ0TzhMWmFuMk5zUlhQazlDbjRhcUpTVXBnSVRGVnVZZnVwWkhmUnU0YzJiT2U2VVBKSm4zWFNkUzZWQ2FoWTVSb0J0WHczN1dXMFoxUHN2Y2l1K1ZDWEQ1aElic0Z1cEwybkNibWZvdk0vakNFRGJHaUNQUFRHZEJac0xsc3lacjJnVVRIZGFVSXF0bVBwaEZCbEJvODhzeTdtdE92Ly9jY1VFNnR1UGY1YTRIdEhHMERLQVQ3Q1hmZHAmZkVNZDQ5bmNBbGk2YW5uSkQ1bDYvSkE3WWVFPQ==; _b="AY/QYeBYT05JO4DuinNfKY/vtdPx4HIzqArBwrO1rHKKQl3k4hSQZa8jHO92YUn4dN4="; _ir=0',
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                },
                timeout: 15000
            });

            const $ = cheerio.load(response.data);
            const result = [];
            const hasil = [];

            // Extract image URLs
            $('div > a').get().map(b => {
                const link = $(b).find('img').attr('src');
                result.push(link);
            });

            // Filter and upgrade image quality
            result.forEach(v => {
                if (v == undefined) return;
                hasil.push(v.replace(/236/g, '736')); // Upgrade to higher resolution
            });

            hasil.shift(); // Remove first element (usually Pinterest logo)

            // Format results for our API
            const pins = hasil.slice(0, limit).map((imageUrl, index) => ({
                url: `https://www.pinterest.com/pin/${index}/`,
                title: `${keyword} - Image ${index + 1}`,
                image: imageUrl,
                description: `Pinterest search result for: ${keyword}`
            }));

            resolve({
                success: true,
                keyword: keyword,
                count: pins.length,
                pins: pins
            });

        } catch (error) {
            console.error("Pinterest scraper error:", error.message);

            resolve({
                success: false,
                keyword: keyword,
                count: 0,
                pins: [],
                error: error.message
            });
        }
    });
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
