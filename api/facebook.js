/**
 * API Endpoint: /api/facebook
 * Download Facebook/Instagram video menggunakan Snapsave API
 * Also handles metadata-only requests via ?metadata=true
 */

const Instagram = require('../lib/instagram');
const axios = require('axios');
const cheerio = require('cheerio');

// Fast metadata extraction function with timeout
async function getFacebookMetadata(url) {
    try {
        const { data: html } = await axios.get(url, {
            timeout: 3000, // 3 seconds max
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
            }
        });

        const $ = cheerio.load(html);
        const ogImage = $('meta[property="og:image"]').attr('content');
        const ogTitle = $('meta[property="og:title"]').attr('content');
        const ogDescription = $('meta[property="og:description"]').attr('content');

        if (ogImage || ogTitle) {
            return {
                success: true,
                title: ogTitle || ogDescription || 'Facebook Media',
                thumbnail: ogImage,
                thumbnailUrl: ogImage,
                platform: 'Facebook'
            };
        }

        // Fast fallback
        return {
            success: true,
            title: 'Facebook Media',
            thumbnail: null,
            platform: 'Facebook'
        };
    } catch (error) {
        // Fast fail - return minimal data immediately
        return {
            success: true,
            title: 'Facebook Media',
            thumbnail: null,
            platform: 'Facebook'
        };
    }
}

module.exports = async (req, res) => {
    // Allow both GET and POST
    if (req.method !== 'POST' && req.method !== 'GET') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    // Get parameters from POST body or GET query params
    const url = req.method === 'POST'
        ? req.body.url
        : req.query.url;
    const title = req.method === 'POST'
        ? req.body.title
        : req.query.title;

    // Validate URL
    if (!url) {
        return res.status(400).json({
            success: false,
            error: 'URL tidak boleh kosong'
        });
    }

    // Check if URL is Facebook or Instagram
    const lowerUrl = url.toLowerCase();
    const isFacebook = lowerUrl.includes('facebook.com') || lowerUrl.includes('fb.watch');
    const isInstagram = lowerUrl.includes('instagram.com');

    if (!isFacebook && !isInstagram) {
        return res.status(400).json({
            success: false,
            error: 'Endpoint ini hanya untuk Facebook atau Instagram'
        });
    }

    // Check if this is a metadata-only request (only for Facebook, Instagram uses its own endpoint)
    const metadataOnly = req.query.metadata === 'true';

    if (metadataOnly && isFacebook) {
        const metadata = await getFacebookMetadata(url);
        return res.json(metadata);
    }

    try {
        // Download using Instagram library (works for both FB and IG)
        const result = await Instagram(url);

        // Check for error response with 'msg' property (old format)
        if (result.msg) {
            return res.status(500).json({
                success: false,
                error: result.msg
            });
        }

        // Check for error response with 'success: false' (new format)
        if (result.success === false) {
            return res.status(500).json({
                success: false,
                error: result.error || 'Download gagal'
            });
        }

        // FIX: Validate that result has url property
        if (!result.url) {
            return res.status(500).json({
                success: false,
                error: 'Download URL tidak ditemukan. Pastikan konten bersifat publik.'
            });
        }

        // Get first download URL
        const downloadUrl = Array.isArray(result.url) ? result.url[0] : result.url;
        const platform = isFacebook ? 'Facebook' : 'Instagram';
        const fileName = `${platform.toLowerCase()}_${Date.now()}.mp4`;

        // Return response
        res.json({
            success: true,
            downloadUrl: downloadUrl,
            urls: result.url, // All URLs if multiple
            fileName: fileName,
            metadata: result.metadata
        });
    } catch (error) {
        console.error(`❌ ${isFacebook ? 'Facebook' : 'Instagram'} download error:`, error.message);
        res.status(500).json({
            success: false,
            error: 'Download gagal. Pastikan konten bersifat publik dan coba lagi'
        });
    }
};
