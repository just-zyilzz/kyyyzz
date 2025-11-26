/**
 * API Endpoint: /api/facebook
 * Download Facebook/Instagram video menggunakan Snapsave API
 */

const Instagram = require('../lib/instagram');
const { getUserFromRequest } = require('../lib/session');
const { saveDownload } = require('../lib/db');

module.exports = async (req, res) => {
    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const { url, title } = req.body;

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

        if (result.msg) {
            return res.status(500).json({
                success: false,
                error: result.msg
            });
        }

        // Get user from JWT (if logged in)
        const user = getUserFromRequest(req);

        // Get first download URL
        const downloadUrl = Array.isArray(result.url) ? result.url[0] : result.url;
        const platform = isFacebook ? 'Facebook' : 'Instagram';
        const fileName = `${platform.toLowerCase()}_${Date.now()}.mp4`;

        // Save to database history
        if (user && user.id) {
            try {
                await saveDownload(
                    user.id,
                    url,
                    title || result.metadata?.caption || result.metadata?.username || '—',
                    platform,
                    fileName
                );
            } catch (dbError) {
                console.error('Failed to save history:', dbError);
            }
        }

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
        res.json({
            success: false,
            error: 'Download gagal. Pastikan konten bersifat publik dan coba lagi'
        });
    }
};
