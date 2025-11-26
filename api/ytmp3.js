/**
 * API Endpoint: /api/ytmp3
 * Download YouTube audio dan convert ke MP3
 */

const { isValidUrl, detectPlatform } = require('../lib/utils');
const { downloadMedia, convertToMp3 } = require('../lib/ytdlp');
const { getUserFromRequest } = require('../lib/session');
const { saveDownload, updateDownloadFilename } = require('../lib/db');

module.exports = async (req, res) => {
    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const { url, title, platform } = req.body;

    // Validate URL
    if (!url || !isValidUrl(url)) {
        return res.status(400).json({
            success: false,
            error: 'URL tidak valid. Pastikan dimulai dengan https://'
        });
    }

    // Check if URL is YouTube
    const lowerUrl = url.toLowerCase();
    if (!lowerUrl.includes('youtube.com') && !lowerUrl.includes('youtu.be')) {
        return res.status(400).json({
            success: false,
            error: 'Endpoint ini hanya untuk YouTube. Gunakan /api/tiktok untuk TikTok'
        });
    }

    try {
        // Download audio
        const downloadResult = await downloadMedia(url, 'audio');

        // Get user from JWT (if logged in)
        const user = getUserFromRequest(req);

        // Convert to MP3
        const convertResult = await convertToMp3(downloadResult.fileName);

        // Save/update database history
        if (user && user.id) {
            try {
                // Save with final MP3 filename
                await saveDownload(
                    user.id,
                    url,
                    title || '—',
                    platform || detectPlatform(url),
                    convertResult.fileName
                );
            } catch (dbError) {
                console.error('Failed to save history:', dbError);
            }
        }

        res.json(convertResult);
    } catch (error) {
        console.error('❌ Download/Convert error:', error.message);
        res.json({
            success: false,
            error: error.message.includes('FFmpeg') ? 'Konversi audio gagal' : 'Download gagal. Coba lagi'
        });
    }
};
