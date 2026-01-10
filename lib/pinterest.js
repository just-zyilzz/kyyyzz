const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Configuration
 */
const CONFIG = {
    timeout: 15000,
    maxRetries: 3,
    retryDelay: 1000,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

// Ganti cookie di sini
const DEFAULT_COOKIE = '_auth=1; _pinterest_sess=TWc9PSZzN1VKRTV1cGczQ1ZMRStzVE4xZ2pCd1JzV3JGeUVrblBteVJRMnBZajVIWGpRMmdIOEJmRDhhc0JuSXNKaGU5YUJrTzZMOFdmMmhHSW81aEI5dWd6Vk8rQU43S0IxTVpiRFIraE11MElyRlQzeHFnQXRNNEhZRWNzOHlLeThkVVU0bFRWSC95d2gyb2pDOXR1SXA5TjBNWFpsVmczYUZRdDQreDV2Ukc3ZG5MSHliemlmTGtVTlQxdVVqLzNOYUFoNUlHWk5ReUt1UEpLZ0poSFE2SzgzZVB5R202UjAvRXJUbE1vUEhzWVIvMXhwQ0orSVQrMzJ0RVo0d1cxN2pUdExzVU55dU5JbzhzMVpweEs4bWZ6ZGFaUHpaMS9RdVVsRVNySVFGbVBpRmFJc2hLT3NYek16WXMzYkUvZSt4Z09LMW9NVHJCTmxweUdLcUxWU0ZNNElxOTFwYkRGK1E5WDRRR3RYeFdOa0grUDUwT2txS2xUaHhibk5FdHJxSi9kTzBDeHJyZXhkY3A5RzBXVElMVndML3cyZG16bzdzOGZIVDVRRjZITnZIbThjb1djR1pUeEg0Vk53V0w1TVZjQ3N1UnozQnF0TGVuNFV2OVlTN2lzQkppR1h1SVZtR25Lb2ozTlZRYkowSnMwMkdhZ0tsaytXbTVSS29VdVNiNzRaRmJEbTNOTEFDSGk2dFlVNkNOckJzblVIQWdHSW9kdzd0QWV0SFdSOSt5ZEI4THZ1U2ViNThZcGFobnNXdFc3U0I3Tjh1ZG5hL29wWlRCSjhjeTcxZEdUdk51Y3czbThjcjhpYldOa3krZysrWmp4WC9SMWNRbnZwSDNHeWRiQzIxZk5Bajc5VVRFYTdtL3FFaUhXRm12b2RWN2EydGFlbVltalFEQkMvYzk1Yk8wOXFxQjhYdFEvOSsyV3R2bkd6c0Y5eVNUclFKWTROajg5SnVVbWdyT0IwWWh3QlFXeGZFQURKTmRvNm9ZekdLdGQrZFJ4TWhRMEFaNFRQWnNpeFRwR2luYzhsM1FsUUczUE0vUEo5YXowbWk1Mno5RHZZUTdYOCtERlhTdEhnenRmQTdvQ1REbDJxSlNrMjZvanhPVnlDbnZycGk4ZVUxRC9yUmNnMm5Fc0F3eGl5L1V3OW5kREN3RFNLcEVhTXkvRnJDQ2ZMNnFEc3k4WjJqWHcxVk04TmVqNnNzTTM0RXBJQnVWaEFTcHBvK0VpekVpai8wRHBsbHBWYjBETFZOayttZnhRMytUY0gyOTkxOEZNTXJWb3g0bTJQbHJoUDlNZnNDZFN0QmtZZG4xVlkyaHpXTk5DajE1WVJ6WFFKY1ZrU2NPUHdZV1VBRGlOZEJic2pyaWxINndTbTRZcmR4cHdEL0hudDBUaElZZEx5emU0V3huWGQ4QW9NNVhoczY3VHZoQ2pDUjM0TENrRC9nbGRoSGN3RnY4ZUU3dnBTYUhFUWJCL0dUTWhVN2pobTVONkN6alpDN2liN0FFelgvZjNxWXlwRmxXNUJtVUYzLy9LaGVwVmZ0TzhMWmFuMk5zUlhQazlDbjRhcUpTVXBnSVRGVnVZZnVwWkhmUnU0YzJiT2U2VVBKSm4zWFNkUzZWQ2FoWTVSb0J0WHczN1dXMFoxUHN2Y2l1K1ZDWEQ1aElic0Z1cEwybkNibWZvdk0vakNFRGJHaUNQUFRHZEJac0xsc3lacjJnVVRIZGFVSXF0bVBwaEZCbEJvODhzeTdtdE92Ly9jY1VFNnR1UGY1YTRIdEhHMERLQVQ3Q1hmZHAmZkVNZDQ5bmNBbGk2YW5uSkQ1bDYvSkE3WWVFPQ==; _b="AY/QYeBYT05JO4DuinNfKY/vtdPx4HIzqArBwrO1rHKKQl3k4hSQZa8jHO92YUn4dN4="; _ir=0';

/**
 * Utility: Sleep function for retry delays
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Utility: Validate URL
 */
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

/**
 * Utility: Validate Pinterest URL
 */
function isValidPinterestUrl(url) {
    return isValidUrl(url) && url.includes('pinterest.com');
}

/**
 * Utility: Extract Pin ID from URL
 */
function extractPinId(url) {
    const match = url.match(/pin\/(\d+)/);
    return match ? match[1] : null;
}

/**
 * Utility: Upgrade image quality
 */
function upgradeImageQuality(url) {
    if (!url) return url;

    // Replace size parameters with higher quality
    return url
        .replace(/\/\d+x\d+\//, '/originals/')
        .replace(/236x/g, '736x')
        .replace(/474x/g, '736x');
}

/**
 * Search Pinterest for images by keyword
 * @param {string} keyword - Search keyword
 * @param {number} limit - Number of results to return (default: 20)
 * @param {string} cookie - Optional: Custom Pinterest session cookie
 * @returns {Promise<Object>} Search results with pin data
 */
async function searchPinterest(keyword, limit = 20, cookie = null) {
    // Input validation
    if (!keyword || typeof keyword !== 'string' || keyword.trim().length === 0) {
        throw new Error('Invalid keyword: must be a non-empty string');
    }

    if (limit < 1 || limit > 100) {
        throw new Error('Invalid limit: must be between 1 and 100');
    }

    const searchKeyword = encodeURIComponent(keyword.trim());
    // Use id.pinterest.com which often has lighter checks than www
    const searchUrl = `https://id.pinterest.com/search/pins/?q=${searchKeyword}`;

    let lastError = null;
    const cookieToUse = cookie || DEFAULT_COOKIE;

    // Retry logic
    for (let attempt = 1; attempt <= CONFIG.maxRetries; attempt++) {
        try {
            const headers = {
                'User-Agent': CONFIG.userAgent,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate, br',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Cookie': cookieToUse
            };

            const response = await axios.get(searchUrl, {
                headers,
                timeout: CONFIG.timeout,
                maxRedirects: 5
            });

            const $ = cheerio.load(response.data);
            const imageUrls = new Set(); // Use Set to avoid duplicates

            // Try multiple selectors as Pinterest structure can vary
            const selectors = [
                'img[src*="pinimg.com"]',
                'img[srcset*="pinimg.com"]',
                'div[data-test-id="pin"] img',
                'a[href*="/pin/"] img'
            ];

            selectors.forEach(selector => {
                $(selector).each((index, element) => {
                    const src = $(element).attr('src') || $(element).attr('data-src');
                    if (src && src.includes('pinimg.com')) {
                        imageUrls.add(src);
                    }
                });
            });

            // Convert Set to Array and process
            const uniqueImages = Array.from(imageUrls);

            if (uniqueImages.length === 0) {
                // If no images found, maybe auth failed or structure changed
                // Don't throw immediately, let retry logic handle if needed, or assume empty result
            }

            // Extract pin IDs and create proper URLs
            const pins = [];
            const processedUrls = new Set();

            // Strategy 1: Find pins via links
            $('a[href*="/pin/"]').each((index, element) => {
                const href = $(element).attr('href');
                if (href && !processedUrls.has(href)) {
                    const pinId = extractPinId(href);
                    if (pinId) {
                        const img = $(element).find('img');
                        const imgSrc = img.attr('src') || img.attr('data-src');

                        if (imgSrc) {
                            pins.push({
                                id: pinId,
                                url: `https://www.pinterest.com/pin/${pinId}/`,
                                title: img.attr('alt') || `${keyword}`,
                                image: upgradeImageQuality(imgSrc),
                                thumbnail: imgSrc,
                                description: img.attr('alt') || `Pinterest search result for: ${keyword}`
                            });
                            processedUrls.add(href);
                        }
                    }
                }
                if (pins.length >= limit) return false;
            });

            // Strategy 2: If Strategy 1 yielded too few results, use raw images
            if (pins.length < limit && uniqueImages.length > 0) {
                uniqueImages.forEach((imageUrl, index) => {
                    if (pins.length >= limit) return;

                    // Avoid duplicates
                    const highQualityUrl = upgradeImageQuality(imageUrl);
                    const isDuplicate = pins.some(p => p.image === highQualityUrl);

                    if (!isDuplicate) {
                        pins.push({
                            id: `img_${Date.now()}_${index}`,
                            url: searchUrl, // Fallback URL
                            title: `${keyword} - Image ${pins.length + 1}`,
                            image: highQualityUrl,
                            thumbnail: imageUrl,
                            description: `Pinterest search result for: ${keyword}`
                        });
                    }
                });
            }

            if (pins.length > 0) {
                return {
                    success: true,
                    keyword: keyword,
                    count: pins.length,
                    pins: pins.slice(0, limit),
                    metadata: {
                        timestamp: new Date().toISOString(),
                        attempt: attempt
                    }
                };
            }

            throw new Error('No pins found');

        } catch (error) {
            lastError = error;
            console.error`Attempt ${attempt}/${CONFIG.maxRetries} failed: ${error.message}`;

            if (attempt < CONFIG.maxRetries) {
                await sleep(CONFIG.retryDelay * attempt);
            }
        }
    }

    // If we reach here, all retries failed
    console.error("Pinterest scraper final error:", lastError.message);

    // Return empty result instead of throwing to avoid crashing frontend
    return {
        success: false,
        keyword: keyword,
        count: 0,
        pins: [],
        error: lastError.message
    };
}

/**
 * Download Pinterest pin data
 * @param {string} url - Pinterest pin URL
 * @returns {Promise<Object>} Pin data with download links
 */
async function savePin(url) {
    // Input validation
    if (!isValidPinterestUrl(url)) {
        throw new Error('Invalid Pinterest URL');
    }

    try {
        // First try getting data directly (fastest)
        return await getPinDirectly(url);
    } catch (e) {
        console.log("Direct method failed, using SavePin fallback");
        // Fallback to external tool if direct parsing fails
        return await getPinViaSavePin(url);
    }
}

/**
 * Get Pin via Direct Parsing
 */
async function getPinDirectly(url) {
    const response = await axios.get(url, {
        headers: {
            'User-Agent': CONFIG.userAgent,
            'Cookie': DEFAULT_COOKIE
        },
        timeout: CONFIG.timeout
    });

    const html = response.data;
    const $ = cheerio.load(html);

    const ogVideo = $('meta[property="og:video"]').attr('content');
    const ogImage = $('meta[property="og:image"]').attr('content');
    const ogTitle = $('meta[property="og:title"]').attr('content');

    const results = [];

    if (ogVideo) {
        results.push({ type: 'video', format: 'MP4', url: ogVideo });
    }

    if (ogImage) {
        results.push({ type: 'image', format: 'JPG', url: upgradeImageQuality(ogImage) });
    }

    if (results.length === 0) throw new Error("No media found");

    return {
        success: true,
        title: ogTitle || 'Pinterest Pin',
        url: url,
        results: results
    };
}

/**
 * Get Pin via SavePin (Fallback)
 */
async function getPinViaSavePin(url) {
    const response = await axios.get(`https://www.savepin.app/download.php?url=${encodeURIComponent(url)}&lang=en&type=redirect`, {
        timeout: CONFIG.timeout,
        headers: { 'User-Agent': CONFIG.userAgent }
    });

    const $ = cheerio.load(response.data);
    const results = [];

    $('td.video-quality').each((i, el) => {
        const type = $(el).text().trim().toLowerCase();
        const link = $(el).nextAll().find('a').attr('href');
        if (link) results.push({ type, format: 'MP4', url: link });
    });

    // If no table results, check for direct download links
    if (results.length === 0) {
        $('a[download]').each((i, el) => {
            const href = $(el).attr('href');
            if (href) results.push({ type: 'media', format: 'unknown', url: href });
        });
    }

    return {
        success: true,
        title: $('h1').text().trim(),
        url: url,
        results: results
    };
}

module.exports = {
    searchPinterest,
    savePin,
    getPinDirectly
};