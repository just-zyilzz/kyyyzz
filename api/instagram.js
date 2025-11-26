/**
 * Updated Instagram downloader using lib/instagram.js and lib/scrapers.js
 */

const Instagram = require('../lib/instagram');
const { instagramDownload } = require('../lib/scrapers');
const { getUserFromRequest } = require('../lib/session');
const { saveDownload } = require('../lib/db');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const { url, title } = req.body;

    if (!url) {
        return res.status(400).json({
            success: false,
            error: 'URL tidak boleh kosong'
        });
    }

    const lowerUrl = url.toLowerCase();
    if (!lowerUrl.includes('instagram.com')) {
        return res.status(400).json({
            success: false,
            error: 'Endpoint ini hanya untuk Instagram'
        });
    }

    try {
        let result;

        // Try primary method (Snapsave + GraphQL)
        try {
            result = await Instagram(url);
        } catch (e1) {
            console.log('Primary method failed, trying fallback...');
            // Fallback to downloadgram
            result = await instagramDownload(url);
        }

        if (result.msg) {
            return res.status(500).json({
                success: false,
                error: result.msg
            });
        }

        const user = getUserFromRequest(req);

        // Get first download URL
        const downloadUrl = Array.isArray(result.url)
            ? result.url[0]
            : (Array.isArray(result.urls) ? result.urls[0] : result.url);

        const fileName = `instagram_${Date.now()}.mp4`;

        // Save to database history
        if (user && user.id) {
            try {
                await saveDownload(
                    user.id,
                    url,
                    title || result.metadata?.caption || result.metadata?.username || '—',
                    'Instagram',
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
            urls: result.url || result.urls,
            fileName: fileName,
            metadata: result.metadata,
            service: result.service || 'instagram'
        });
    } catch (error) {
        console.error('❌ Instagram download error:', error.message);
        res.json({
            success: false,
            error: 'Download gagal. Pastikan konten bersifat publik dan coba lagi'
        });
    }
};
