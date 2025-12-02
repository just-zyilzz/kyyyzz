/**
 * API Endpoint: /api/threads-meta
 * Get Threads media metadata (for preview)
 */

const axios = require('axios');
const cheerio = require('cheerio');

// Simple Threads metadata extractor
async function getThreadsMetadata(url) {
    try {
        // Try to scrape Threads page directly
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

        if (ogImage || ogTitle) {
            return {
                success: true,
                title: ogTitle || ogDescription || 'Threads Post',
                thumbnail: ogImage,
                platform: 'Threads'
            };
        }

        // Fallback
        return {
            success: true,
            title: 'Threads Post',
            thumbnail: null,
            platform: 'Threads'
        };

    } catch (error) {
        throw new Error('Failed to get Threads metadata: ' + error.message);
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
    if (!lowerUrl.includes('threads.net') && !lowerUrl.includes('threads.com')) {
        return res.status(400).json({
            success: false,
            error: 'Endpoint ini hanya untuk Threads'
        });
    }

    try {
        const metadata = await getThreadsMetadata(url);
        res.json(metadata);
    } catch (error) {
        console.error('❌ Threads metadata error:', error.message);

        // Always return something, even if metadata fails
        res.json({
            success: true,
            title: 'Threads Post',
            thumbnail: null,
            platform: 'Threads',
            note: 'Metadata limited - content might be private'
        });
    }
};
