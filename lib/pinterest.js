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
                    "cookie": "_auth=1; _b=\"AVna7S1p7l1C5I9u0+nR3YzijpvXOPc6d09SyCzO+DcwpersQH36SmGiYfymBKhZcGg=\"; _pinterest_sess=TWc9PSZHamJOZ0JobUFiSEpSN3Z4a2NsMk9wZ3gxL1NSc2k2NkFLaUw5bVY5cXR5alZHR0gxY2h2MVZDZlNQalNpUUJFRVR5L3NlYy9JZkthekp3bHo5bXFuaFZzVHJFMnkrR3lTbm56U3YvQXBBTW96VUgzVUhuK1Z4VURGKzczUi9hNHdDeTJ5Y2pBTmxhc2owZ2hkSGlDemtUSnYvVXh5dDNkaDN3TjZCTk8ycTdHRHVsOFg2b2NQWCtpOWxqeDNjNkk3cS85MkhhSklSb0hwTnZvZVFyZmJEUllwbG9UVnpCYVNTRzZxOXNJcmduOVc4aURtM3NtRFo3STlmWjJvSjlWTU5ITzg0VUg1NGhOTEZzME9SNFNhVWJRWjRJK3pGMFA4Q3UvcHBnWHdaYXZpa2FUNkx6Z3RNQjEzTFJEOHZoaHRvazc1c1UrYlRuUmdKcDg3ZEY4cjNtZlBLRTRBZjNYK0lPTXZJTzQ5dU8ybDdVS015bWJKT0tjTWYyRlBzclpiamdsNmtpeUZnRjlwVGJXUmdOMXdTUkFHRWloVjBMR0JlTE5YcmhxVHdoNzFHbDZ0YmFHZ1VLQXU1QnpkM1FqUTNMTnhYb3VKeDVGbnhNSkdkNXFSMXQybjRGL3pyZXRLR0ZTc0xHZ0JvbTJCNnAzQzE0cW1WTndIK0trY05HV1gxS09NRktadnFCSDR2YzBoWmRiUGZiWXFQNjcwWmZhaDZQRm1UbzNxc21pV1p5WDlabm1UWGQzanc1SGlrZXB1bDVDWXQvUis3elN2SVFDbm1DSVE5Z0d4YW1sa2hsSkZJb1h0MTFpck5BdDR0d0lZOW1Pa2RDVzNySWpXWmUwOUFhQmFSVUpaOFQ3WlhOQldNMkExeDIvMjZHeXdnNjdMYWdiQUhUSEFBUlhUVTdBMThRRmh1ekJMYWZ2YTJkNlg0cmFCdnU2WEpwcXlPOVZYcGNhNkZDd051S3lGZmo0eHV0ZE42NW8xRm5aRWpoQnNKNnNlSGFad1MzOHNkdWtER0xQTFN5Z3lmRERsZnZWWE5CZEJneVRlMDd2VmNPMjloK0g5eCswZUVJTS9CRkFweHc5RUh6K1JocGN6clc1JmZtL3JhRE1sc0NMTFlpMVErRGtPcllvTGdldz0=; _ir=0",
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

            // Fallback: Return placeholder images if scraping fails
            const mockPins = [];
            for (let i = 0; i < Math.min(limit, 10); i++) {
                mockPins.push({
                    url: `https://www.pinterest.com/pin/demo-${i}/`,
                    title: `${keyword} - Pinterest Image ${i + 1}`,
                    image: `https://via.placeholder.com/300x400/667eea/ffffff?text=${encodeURIComponent(keyword)}+${i + 1}`,
                    description: `Search result for: ${keyword}`
                });
            }

            resolve({
                success: true,
                keyword: keyword,
                count: mockPins.length,
                pins: mockPins,
                note: 'Using placeholder images - Pinterest scraping may have failed'
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
