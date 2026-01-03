/**
 * Updated Instagram downloader using lib/instagram.js and lib/scrapers.js
 * Also handles metadata-only requests via ?metadata=true
 */

const Instagram = require('../lib/instagram');
const { instagramDownload } = require('../lib/scrapers');
const { getUserFromRequest } = require('../lib/session');
const { saveDownload } = require('../lib/db');
const axios = require('axios');

// Fast metadata extraction function with timeout
async function getInstagramMetadata(url) {
    try {
        const postId = url.match(/\/p\/([^/?]+)/)?.[1] || url.match(/\/reel\/([^/?]+)/)?.[1];

        if (postId) {
            try {
                // Use oembed API with 3-second timeout
                const oembedUrl = `https://graph.instagram.com/oembed?url=https://www.instagram.com/p/${postId}/`;
                const { data } = await axios.get(oembedUrl, {
                    timeout: 3000, // 3 seconds max
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
                    }
                });

                return {
                    success: true,
                    title: data.title || 'Instagram Post',
                    thumbnail: data.thumbnail_url,
                    author: data.author_name,
                    platform: 'Instagram'
                };
            } catch (error) {
                // Fast fail - don't scrape HTML
                console.log('Instagram oembed timeout');
            }
        }

        // Fast fallback - return minimal data
        return {
            success: true,
            title: 'Instagram Media',
            thumbnail: null,
            platform: 'Instagram'
        };
    } catch (error) {
        return {
            success: true,
            title: 'Instagram Media',
            thumbnail: null,
            platform: 'Instagram'
        };
    }
}

module.exports = async (req, res) => {
    // Allow both GET and POST
    if (req.method !== 'POST' && req.method !== 'GET') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    // Check if this is a metadata-only request
    const metadataOnly = req.query.metadata === 'true';

    if (metadataOnly) {
        const url = req.method === 'POST' ? req.body.url : req.query.url;
        if (!url) {
            return res.status(400).json({ success: false, error: 'URL tidak boleh kosong' });
        }
        const lowerUrl = url.toLowerCase();
        if (!lowerUrl.includes('instagram.com')) {
            return res.status(400).json({ success: false, error: 'Endpoint ini hanya untuk Instagram' });
        }
        const metadata = await getInstagramMetadata(url);
        return res.json(metadata);
    }

    // Get parameters from POST body or GET query params
    const url = req.method === 'POST' ? req.body.url : req.query.url;
    const title = req.method === 'POST' ? req.body.title : req.query.title;

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
            // Primary method failed, trying fallback...
            result = await instagramDownload(url);
        }

        if (result.msg) {
            return res.status(500).json({
                success: false,
                error: result.msg
            });
        }

        const user = getUserFromRequest(req);

        // Handle both single and carousel posts
        let allUrls = [];
        if (Array.isArray(result.url)) {
            allUrls = result.url;
        } else if (Array.isArray(result.urls)) {
            allUrls = result.urls;
        } else if (result.url) {
            allUrls = [result.url];
        }

        // Get first download URL for backward compatibility
        const downloadUrl = allUrls[0];
        const fileName = `instagram_${Date.now()}.mp4`;
        const isCarousel = allUrls.length > 1;

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

        // Return response with all URLs for carousel support
        console.log(`[Instagram API] Returning ${allUrls.length} URLs for carousel: ${isCarousel}`);
        res.json({
            success: true,
            downloadUrl: downloadUrl,
            urls: allUrls,
            fileName: fileName,
            isCarousel: isCarousel,
            carouselCount: allUrls.length,
            metadata: result.metadata,
            service: result.service || 'instagram'
        });
    } catch (error) {
        console.error('❌ Instagram download error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Download gagal. Pastikan konten bersifat publik dan coba lagi'
        });
    }
};
