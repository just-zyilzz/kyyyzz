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

// Default cookies (can be updated by user)
const DEFAULT_COOKIE = '_auth=1; _pinterest_sess=TWc9PSZzN1VKRTV1cGczQ1ZMRStzVE4xZ2pCd1JzV3JGeUVrblBteVJRMnBZajVIWGpRMmdIOEJmRDhhc0JuSXNKaGU5YUJrTzZMOFdmMmhHSW81aEI5dWd6Vk8rQU43S0IxTVpiRFIraE11MElyRlQzeHFnQXRNNEhZRWNzOHlLeThkVVU0bFRWSC95d2gyb2pDOXR1SXA5TjBNWFpsVmczYUZRdDQreDV2Ukc3ZG5MSHliemlmTGtVTlQxdVVqLzNOYUFoNUlHWk5ReUt1UEpLZ0poSFE2SzgzZVB5R202UjAvRXJUbE1vUEhzWVIvMXhwQ0orSVQrMzJ0RVo0d1cxN2pUdExzVU55dU5JbzhzMVpweEs4bWZ6ZGFaUHpaMS9RdVVsRVNySVFGbVBpRmFJc2hLT3NYek16WXMzYkUvZSt4Z09LMW9NVHJCTmxweUdLcUxWU0ZNNElxOTFwYkRGK1E5WDRRR3RYeFdOa0grUDUwT2txS2xUaHhibk5FdHJxSi9kTzBDeHJyZXhkY3A5RzBXVElMVndML3cyZG16bzdzOGZIVDVRRjZITnZIbThjb1djR1pUeEg0Vk53V0w1TVZjQ3N1UnozQnF0TGVuNFV2OVlTN2lzQkppR1h1SVZtR25Lb2ozTlZRYkowSnMwMkdhZ0tsaytXbTVSS29VdVNiNzRaRmJEbTNOTEFDSGk2dFlVNkNOckJzblVIQWdHSW9kdzd0QWV0SFdSOSt5ZEI4THZ1U2ViNThZcGFobnNXdFc3U0I3Tjh1ZG5hL29wWlRCSjhjeTcxZEdUdk51Y3czbThjcjhpYldOa3krZysrWmp4WC9SMWNRbnZwSDNHeWRiQzIxZk5Bajc5VVRFYTdtL3FFaUhXRm12b2RWN2EydGFlbVltalFEQkMvYzk1Yk8wOXFxQjhYdFEvOSsyV3R2bkd6c0Y5eVNUclFKWTROajg5SnVVbWdyT0IwWWh3QlFXeGZFQURKTmRvNm9ZekdLdGQrZFJ4TWhRMEFaNFRQWnNpeFRwR2luYzhsM1FsUUczUE0vUEo5YXowbWk1Mno5RHZZUTdYOCtERlhTdEhnenRmQTdvQ1REbDJxSlNrMjZvanhPVnlDbnZycGk4ZVUxRC9yUmNnMm5Fc0F3eGl5L1V3OW5kREN3RFNLcEVhTXkvRnJDQ2ZMNnFEc3k4WjJqWHcxVk04TmVqNnNzTTM0RXBJQnVWaEFTcHBvK0VpekVpai8wRHBsbHBWYjBETFZOayttZnhRMytUY0gyOTkxOEZNTXJWb3g0bTJQbHJoUDlNZnNDZFN0QmtZZG4xVlkyaHpXTk5DajE1WVJ6WFFKY1ZrU2NPUHdZV1VBRGlOZEJic2pyaWxINndTbTRZcmR4cHdEL0hudDBUaElZZEx5emU0V3huWGQ4QW9NNVhoczY3VHZoQ2pDUjM0TENrRC9nbGRoSGN3RnY4ZUU3dnBTYUhFUWJCL0dUTWhVN2pobTVONkN6alpDN2liN0FFelgvZjNxWXlwRmxXNUJtVUYzLy9LaGVwVmZ0TzhMWmFuMk5zUlhQazlDbjRhcUpTVXBnSVRGVnVZZnVwWkhmUnU0YzJiT2U2VVBKSm4zWFNkUzZWQ2FoWTVSb0J0WHczN1dXMFoxUHN2Y2l1K1ZDWEQ1aElic0Z1cEwybkNibWZvdk0vakNFRGJHaUNQUFRHZEJac0xsc3lacjJnVVRIZGFVSXF0bVBwaEZCbEJvODhzeTdtdE92Ly9jY1VFNnR1UGY1YTRIdEhHMERLQVQ3Q1hmZHAmZkVNZDQ5bmNBbGk2YW5uSkQ1bDYvSkE3WWVFPQ==; _b="AY/QYeBYT05JO4DuinNfKY/vtdPx4HIzqArBwrO1rHKKQl3k4hSQZa8jHO92YUn4dN4="; _ir=0';

/**
 * Utility: Sleep function
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
    return isValidUrl(url) && (url.includes('pinterest.com') || url.includes('pin.it'));
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
    // Replace size parameters with originals for best quality
    // Handles /236x/, /564x/, /736x/, etc.
    return url.replace(/\/\d+x\//, '/originals/');
}

/**
 * Search Pinterest for images by keyword
 */
async function searchPinterest(keyword, limit = 4, cookie = null) {
    if (!keyword || typeof keyword !== 'string' || keyword.trim().length === 0) {
        throw new Error('Invalid keyword: must be a non-empty string');
    }

    const searchKeyword = encodeURIComponent(keyword.trim());
    const searchUrl = `https://id.pinterest.com/search/pins/?q=${searchKeyword}`;
    const cookieToUse = cookie || DEFAULT_COOKIE;

    let lastError = null;

    for (let attempt = 1; attempt <= CONFIG.maxRetries; attempt++) {
        try {
            const headers = {
                'User-Agent': CONFIG.userAgent,
                'Cookie': cookieToUse,
                'Referer': 'https://www.pinterest.com/'
            };

            const response = await axios.get(searchUrl, {
                headers,
                timeout: CONFIG.timeout,
                maxRedirects: 5
            });

            const $ = cheerio.load(response.data);
            const imageUrls = new Set();

            // Collect all unique images
            $('img').each((i, el) => {
                const src = $(el).attr('src') || $(el).attr('data-src');
                if (src && src.includes('pinimg.com')) imageUrls.add(src);
            });

            const uniqueImages = Array.from(imageUrls);
            const pins = [];
            const processedUrls = new Set();

            // Strategy 1: Find valid Pin links
            $('a[href*="/pin/"]').each((i, el) => {
                const href = $(el).attr('href');
                if (href && !processedUrls.has(href)) {
                    const pinId = extractPinId(href);
                    if (pinId) {
                        const img = $(el).find('img');
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

            // Strategy 2: Fallback to raw images if few pins found
            if (pins.length < limit && uniqueImages.length > 0) {
                uniqueImages.forEach((imageUrl, index) => {
                    if (pins.length >= limit) return;

                    const highQualityUrl = upgradeImageQuality(imageUrl);
                    const isDuplicate = pins.some(p => p.image === highQualityUrl);

                    if (!isDuplicate) {
                        pins.push({
                            id: `img_${Date.now()}_${index}`,
                            url: searchUrl,
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
                    metadata: { timestamp: new Date().toISOString() }
                };
            }

            throw new Error('No pins found');

        } catch (error) {
            lastError = error;
            if (attempt < CONFIG.maxRetries) await sleep(CONFIG.retryDelay * attempt);
        }
    }

    // Return empty on failure to prevent crash
    return {
        success: false,
        error: lastError.message,
        pins: [],
        count: 0
    };
}

/**
 * Get Pin Data (Robust Download Logic)
 * Tries direct parsing first, then fallback to savepin
 */
async function getPinData(url) {
    if (!isValidPinterestUrl(url)) {
        throw new Error('Invalid Pinterest URL');
    }

    try {
        // Method 1: Direct Parsing (Fastest & cleanest)
        return await getPinDirectly(url);
    } catch (e1) {
        console.log(`Direct parse failed for ${url}: ${e1.message}`);
        try {
            // Method 2: SavePin Service (Fallback)
            return await getPinViaSavePin(url);
        } catch (e2) {
            throw new Error(`Failed to download pin: ${e2.message}`);
        }
    }
}

/**
 * Direct scraping implementation
 */
async function getPinDirectly(url) {
    const response = await axios.get(url, {
        headers: {
            'User-Agent': CONFIG.userAgent,
            'Cookie': DEFAULT_COOKIE,
            'Referer': 'https://www.pinterest.com/'
        },
        timeout: CONFIG.timeout
    });

    const html = response.data;
    const $ = cheerio.load(html);

    const ogVideo = $('meta[property="og:video"]').attr('content');
    const ogImage = $('meta[property="og:image"]').attr('content');
    const ogTitle = $('meta[property="og:title"]').attr('content') || $('title').text();
    const ogDesc = $('meta[property="og:description"]').attr('content');

    const results = [];

    if (ogVideo) {
        results.push({
            type: 'video',
            format: 'MP4',
            url: ogVideo,
            downloadLink: ogVideo // Compatibility alias
        });
    }

    if (ogImage) {
        const hqImage = upgradeImageQuality(ogImage);
        results.push({
            type: 'image',
            format: 'JPG',
            url: hqImage,
            downloadLink: hqImage // Compatibility alias
        });
    }

    // Try finding video tag directly
    if (results.length === 0) {
        const videoSrc = $('video').attr('src');
        if (videoSrc) {
            results.push({
                type: 'video',
                format: 'MP4',
                url: videoSrc,
                downloadLink: videoSrc
            });
        }
    }

    if (results.length === 0) throw new Error("No media found in page metadata");

    return {
        success: true,
        title: ogTitle || 'Pinterest Pin',
        description: ogDesc || '',
        url: url,
        results: results
    };
}

/**
 * Fallback scraping via savepin.app
 */
async function getPinViaSavePin(url) {
    const response = await axios.get(`https://www.savepin.app/download.php?url=${encodeURIComponent(url)}&lang=en&type=redirect`, {
        timeout: CONFIG.timeout,
        headers: { 'User-Agent': CONFIG.userAgent }
    });

    const $ = cheerio.load(response.data);
    const results = [];

    // Parse video table
    $('td.video-quality').each((i, el) => {
        const typeLabel = $(el).text().trim().toLowerCase(); // e.g. "1080p" or "720p"
        const link = $(el).nextAll().find('a').attr('href');

        if (link) {
            // Decode force-save links
            let finalLink = link;
            if (link.includes('force-save.php?url=')) {
                finalLink = decodeURIComponent(link.split('force-save.php?url=')[1]);
            }

            results.push({
                type: 'video',
                format: 'MP4',
                quality: typeLabel,
                url: finalLink,
                downloadLink: finalLink
            });
        }
    });

    // Parse image download buttons
    if (results.length === 0) {
        $('a[download], .download-link').each((i, el) => {
            const href = $(el).attr('href');
            if (href && !href.startsWith('#')) {
                results.push({
                    type: href.includes('.mp4') ? 'video' : 'image',
                    format: href.includes('.mp4') ? 'MP4' : 'JPG',
                    url: href,
                    downloadLink: href
                });
            }
        });
    }

    if (results.length === 0) throw new Error("No download links found on SavePin");

    const title = $('h1').text().trim() || 'Pinterest Pin';

    return {
        success: true,
        title: title,
        url: url,
        results: results
    };
}

// Map savePin to getPinData for backward compatibility
const savePin = getPinData;

module.exports = {
    searchPinterest,
    getPinData,
    savePin,
    getPinDirectly,
    DEFAULT_COOKIE
};