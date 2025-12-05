/**
 * API Endpoint: /api/threads
 * Download Threads photos and videos
 * Also handles metadata-only requests via ?metadata=true
 */

const { threadsDownload } = require('../lib/threads');
const { getUserFromRequest } = require('../lib/session');
const { saveDownload } = require('../lib/db');
const axios = require('axios');
const cheerio = require('cheerio');

// Fast metadata extraction function with timeout
async function getThreadsMetadata(url) {
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

        if (ogImage || ogTitle) {
            return {
                success: true,
                title: ogTitle || 'Threads Post',
                thumbnail: ogImage,
                platform: 'Threads'
            };
        }

        // Fast fallback
        return {
            success: true,
            title: 'Threads Post',
            thumbnail: null,
            platform: 'Threads'
        };
    } catch (error) {
        // Fast fail - return minimal data immediately
        return {
            success: true,
            title: 'Threads Post',
            thumbnail: null,
            platform: 'Threads'
        };
    }
}

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

    // Check if URL is Threads
    const lowerUrl = url.toLowerCase();
    if (!lowerUrl.includes('threads.net') && !lowerUrl.includes('threads.com')) {
        return res.status(400).json({
            success: false,
            error: 'Endpoint ini hanya untuk Threads'
        });
    }

    // Check if this is a metadata-only request
    const metadataOnly = req.query.metadata === 'true';

    if (metadataOnly) {
        const metadata = await getThreadsMetadata(url);
        return res.json(metadata);
    }

    try {
        // Download Threads media
        const result = await threadsDownload(url);

        if (!result.status) {
            return res.status(500).json({
                success: false,
                error: result.error || 'Download gagal'
            });
        }

        // Check if we have any media
        if ((!result.image || result.image.length === 0) &&
            (!result.video || result.video.length === 0)) {
            return res.status(404).json({
                success: false,
                error: 'Media tidak ditemukan. Pastikan konten bersifat publik'
            });
        }

        const user = getUserFromRequest(req);

        // Get first download URL (prioritize video, then image)
        const downloadUrl = result.video && result.video.length > 0
            ? result.video[0]
            : result.image[0];

        const fileExtension = result.video && result.video.length > 0 ? 'mp4' : 'jpg';
        const fileName = `threads_${Date.now()}.${fileExtension}`;

        // Save to database history
        if (user && user.id) {
            try {
                await saveDownload(
                    user.id,
                    url,
                    title || result.metadata?.caption || result.metadata?.username || '—',
                    'Threads',
                    fileName
                );
            } catch (dbError) {
                console.error('Failed to save history:', dbError);
            }
        }

        // Return response with all URLs for preview
        res.json({
            success: true,
            downloadUrl: downloadUrl,
            urls: result.urls,
            images: result.image,
            videos: result.video,
            fileName: fileName,
            metadata: result.metadata,
            service: 'threads'
        });
    } catch (error) {
        console.error('❌ Threads download error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Download gagal. Pastikan konten bersifat publik dan coba lagi'
        });
    }
};
