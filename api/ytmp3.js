/**
 * API Endpoint: /api/ytmp3
 * Download YouTube audio menggunakan Savetube API
 */

const savetube = require('../lib/savetube');
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

    // Check if URL is YouTube
    const lowerUrl = url.toLowerCase();
    if (!lowerUrl.includes('youtube.com') && !lowerUrl.includes('youtu.be')) {
        return res.status(400).json({
            success: false,
            error: 'Endpoint ini hanya untuk YouTube'
        });
    }

    try {
        // Download audio MP3 menggunakan savetube
        const result = await savetube.download(url, 'mp3');

        if (!result.status) {
            return res.status(result.code).json({
                success: false,
                error: result.error
            });
        }

        // Get user from JWT (if logged in)
        const user = getUserFromRequest(req);

        // Save to database history
        if (user && user.id) {
            try {
                await saveDownload(
                    user.id,
                    url,
                    title || result.result.title || '—',
                    'YouTube',
                    result.result.id + '.mp3'
                );
            } catch (dbError) {
                console.error('Failed to save history:', dbError);
            }
        }

        // Return response in expected format
        res.json({
            success: true,
            title: result.result.title,
            thumbnail: result.result.thumbnail,
            downloadUrl: result.result.download,
            fileName: result.result.id + '.mp3',
            format: 'mp3',
            duration: result.result.duration
        });
    } catch (error) {
        console.error('❌ Download error:', error.message);
        res.json({
            success: false,
            error: 'Download gagal. Coba lagi'
        });
    }
};
