/**
 * Pinterest Image Proxy
 * Bypass CORS restrictions for Pinterest thumbnail images
 * With smart fallback and retry logic
 */

module.exports = async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle OPTIONS preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({ error: 'Missing url parameter' });
        }

        // Validate Pinterest URL
        if (!url.includes('pinimg.com') && !url.includes('pinterest.com')) {
            return res.status(400).json({ error: 'Invalid Pinterest image URL' });
        }

        const axios = require('axios');

        // Build fallback URLs (try multiple quality levels)
        const fallbackUrls = [url]; // Start with original URL

        // If URL contains /originals/, try lower quality versions
        if (url.includes('/originals/')) {
            fallbackUrls.push(url.replace('/originals/', '/736x/'));
            fallbackUrls.push(url.replace('/originals/', '/564x/'));
            fallbackUrls.push(url.replace('/originals/', '/236x/'));
        }
        // If URL contains quality specifier, also try originals
        else if (url.match(/\/\d+x\//)) {
            const originalsUrl = url.replace(/\/\d+x\//, '/originals/');
            // Put originals second (after original URL)
            fallbackUrls.splice(1, 0, originalsUrl);
        }

        let lastError = null;

        // Try each URL in sequence
        for (const tryUrl of fallbackUrls) {
            try {
                const response = await axios.get(tryUrl, {
                    responseType: 'arraybuffer',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Referer': 'https://www.pinterest.com/',
                        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8'
                    },
                    timeout: 8000,
                    maxRedirects: 5,
                    validateStatus: (status) => status === 200 // Only accept 200
                });

                // Verify we got actual image data (not empty or too small)
                if (response.data && response.data.length > 100) {
                    const contentType = response.headers['content-type'] || 'image/jpeg';

                    // Set cache headers for performance
                    res.setHeader('Content-Type', contentType);
                    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
                    res.setHeader('Content-Length', response.data.length);

                    // Success! Send image data
                    return res.status(200).send(Buffer.from(response.data));
                }
            } catch (err) {
                lastError = err;
                console.log(`Failed to fetch ${tryUrl}: ${err.message}`);
                // Continue to next fallback
            }
        }

        // All attempts failed - log and return error placeholder
        console.error('Pinterest proxy - all fallbacks failed:', lastError?.message || 'Unknown error');

        // Return Pinterest-themed SVG placeholder (red/white)
        const pinterestPlaceholder = Buffer.from(`
<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
  <rect width="200" height="200" fill="#E60023"/>
  <text x="100" y="100" font-family="Arial" font-size="80" fill="white" text-anchor="middle" dominant-baseline="middle">📌</text>
  <text x="100" y="160" font-family="Arial" font-size="14" fill="white" text-anchor="middle">Image unavailable</text>
</svg>
        `.trim());

        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'no-cache, no-store');
        return res.status(200).send(pinterestPlaceholder);

    } catch (error) {
        console.error('Pinterest proxy critical error:', error.message);

        // Critical error fallback
        const errorPlaceholder = Buffer.from(`
<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
  <rect width="200" height="200" fill="#E60023"/>
  <text x="100" y="100" font-family="Arial" font-size="80" fill="white" text-anchor="middle">📌</text>
  <text x="100" y="160" font-family="Arial" font-size="14" fill="white" text-anchor="middle">Error</text>
</svg>
        `.trim());

        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'no-cache');
        return res.status(200).send(errorPlaceholder);
    }
};
