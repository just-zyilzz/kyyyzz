/**
 * API Endpoint: /api/tiktok
 * Download TikTok video atau audio
 */

const { isValidUrl, detectPlatform } = require('../lib/utils');
const { downloadMedia, convertToMp3 } = require('../lib/ytdlp');
const { getUserFromRequest } = require('../lib/session');
const { saveDownload } = require('../lib/db');

module.exports = async (req, res) => {
    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const { url, format = 'video', title, platform } = req.body;

    // Validate URL
    if (!url || !isValidUrl(url)) {
        return res.status(400).json({
            success: false,
            error: 'URL tidak valid. Pastikan dimulai dengan https://'
        });
    }

    // Check if URL is TikTok
    const lowerUrl = url.toLowerCase();
    if (!lowerUrl.includes('tiktok.com') && !lowerUrl.includes('vt.tiktok.com') && !lowerUrl.includes('vm.tiktok.com')) {
        return res.status(400).json({
            success: false,
            error: 'Endpoint ini hanya untuk TikTok'
        });
    }

    try {
        // Download media
        const downloadResult = await downloadMedia(url, format);

        // Get user from JWT (if logged in)
        const user = getUserFromRequest(req);

        let finalResult = downloadResult;

        // Convert to MP3 if audio format
        if (format === 'audio' && downloadResult.needsConversion) {
            finalResult = await convertToMp3(downloadResult.fileName);
        }

        // Save to database history
        if (user && user.id) {
            try {
                await saveDownload(
                    user.id,
                    url,
                    title || '—',
                    platform || detectPlatform(url),
                    finalResult.fileName
                );
            } catch (dbError) {
                console.error('Failed to save history:', dbError);
            }
        }

        res.json(finalResult);
    } catch (error) {
        console.error('❌ TikTok download error:', error.message);
        res.json({
            success: false,
            error: 'Download gagal. Coba lagi'
        });
    }
};
