/**
 * Spotify Image Proxy
 * Bypass CORS restrictions for Spotify CDN thumbnail images (i.scdn.co)
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

        // Validate Spotify CDN URL
        if (!url.includes('i.scdn.co') && !url.includes('scdn.co')) {
            return res.status(400).json({ error: 'Invalid Spotify image URL' });
        }

        const axios = require('axios');

        try {
            const response = await axios.get(url, {
                responseType: 'arraybuffer',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8'
                },
                timeout: 8000,
                maxRedirects: 5,
                validateStatus: (status) => status === 200
            });

            // Verify we got actual image data
            if (response.data && response.data.length > 100) {
                const contentType = response.headers['content-type'] || 'image/jpeg';

                res.setHeader('Content-Type', contentType);
                res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
                res.setHeader('Content-Length', response.data.length);

                return res.status(200).send(Buffer.from(response.data));
            }
        } catch (err) {
            console.error('Spotify proxy fetch error:', err.message);
        }

        // Return Spotify-themed SVG placeholder (green)
        const spotifyPlaceholder = Buffer.from(`
<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="spotifyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1DB954;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#191414;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="200" height="200" fill="url(#spotifyGrad)"/>
  <text x="100" y="100" font-family="Arial" font-size="60" fill="white" text-anchor="middle" dominant-baseline="middle">🎵</text>
  <text x="100" y="160" font-family="Arial" font-size="12" fill="white" text-anchor="middle">Image unavailable</text>
</svg>
        `.trim());

        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'no-cache, no-store');
        return res.status(200).send(spotifyPlaceholder);

    } catch (error) {
        console.error('Spotify proxy critical error:', error.message);

        const errorPlaceholder = Buffer.from(`
<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
  <rect width="200" height="200" fill="#1DB954"/>
  <text x="100" y="100" font-family="Arial" font-size="60" fill="white" text-anchor="middle">🎵</text>
</svg>
        `.trim());

        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'no-cache');
        return res.status(200).send(errorPlaceholder);
    }
};
