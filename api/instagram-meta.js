/**
 * API Endpoint: /api/instagram-meta
 * Get Instagram media metadata (thumbnail, caption)
 */

const axios = require('axios');
const cheerio = require('cheerio');

// Simple Instagram metadata extractor (no login required)
async function getInstagramMetadata(url) {
    try {
        // Method 1: Try to get OEmbed data (public posts only)
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
                console.log('Oembed failed, trying scraping...');
            }
        }

        // Method 2: Scrape Instagram page directly
        const { data: html } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        const $ = cheerio.load(html);

        // Extract from meta tags
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

        // Method 3: Basic fallback
        return {
            success: true,
            title: 'Instagram Media',
            thumbnail: null,
            platform: 'Instagram'
        };

    } catch (error) {
        throw new Error('Failed to get Instagram metadata: ' + error.message);
    }
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const { url } = req.body;

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
        const metadata = await getInstagramMetadata(url);
        res.json(metadata);
    } catch (error) {
        console.error('❌ Instagram metadata error:', error.message);

        // Always return something, even if metadata fails
        res.json({
            success: true,
            title: 'Instagram Media',
            thumbnail: null,
            platform: 'Instagram',
            note: 'Metadata limited - content might be private'
        });
    }
};
