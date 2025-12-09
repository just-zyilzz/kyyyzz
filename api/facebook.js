/**
 * API Endpoint: /api/facebook
 * Download Facebook/Instagram video menggunakan Snapsave API
 */

const Instagram = require('../lib/instagram');

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
