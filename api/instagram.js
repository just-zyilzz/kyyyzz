/**
 * Updated Instagram downloader using lib/instagram.js and lib/scrapers.js
 * Also handles metadata-only requests via ?metadata=true
 */

const Instagram = require('../lib/instagram');
const { instagramDownload } = require('../lib/scrapers');
const { getUserFromRequest } = require('../lib/session');
const { saveDownload } = require('../lib/db');
const axios = require('axios');
const cheerio = require('cheerio');

// Metadata extraction function
async function getInstagramMetadata(url) {
    try {
        const postId = url.match(/\/p\/([^/?]+)/)?.[1] || url.match(/\/reel\/([^/?]+)/)?.[1];

        if (postId) {
            try {
                const oembedUrl = `https://graph.instagram.com/oembed?url=https://www.instagram.com/p/${postId}/`;
                const { data } = await axios.get(oembedUrl);

                return {
                    success: true,
                    title: data.title || 'Instagram Post',
                    thumbnail: data.thumbnail_url,
                    author: data.author_name,
                    platform: 'Instagram'
                };
            } catch (oembedError) {
                // Oembed failed, trying scraping...
            }
        }

        const { data: html } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        const $ = cheerio.load(html);
        const ogImage = $('meta[property="og:image"]').attr('content');
        const ogTitle = $('meta[property="og:title"]').attr('content');
        const ogDescription = $('meta[property="og:description"]').attr('content');

        if (ogImage) {
            return {
                success: true,
                title: ogTitle || ogDescription || 'Instagram Media',
                thumbnail: ogImage,
                platform: 'Instagram'
            };
        }

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
            platform: 'Instagram',
            note: 'Metadata limited - content might be private'
        };
    }
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    // Check if this is a metadata-only request
    const metadataOnly = req.query.metadata === 'true';

    if (metadataOnly) {
        const { url } = req.body;
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
