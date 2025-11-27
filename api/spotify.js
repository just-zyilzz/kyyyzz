/**
 * API Endpoint: /api/spotify
 * Resolve Spotify link to YouTube URL for frontend processing
 */

const { getSpotifyMetadata } = require('../lib/spotify');
const ytSearch = require('yt-search');

module.exports = async (req, res) => {
    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ success: false, error: 'URL tidak boleh kosong' });
    }

    try {
        // 1. Get Spotify Metadata
        const metadata = await getSpotifyMetadata(url);

        // 2. Search on YouTube
        // Query: "Artist - Title audio"
        const query = `${metadata.artist} - ${metadata.title} audio`;
        console.log('Searching YouTube for:', query);

        const searchResults = await ytSearch(query);

        if (!searchResults || !searchResults.videos || searchResults.videos.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Lagu tidak ditemukan di database musik'
            });
        }

        // Get the best match (first result)
        const video = searchResults.videos[0];
        const videoUrl = video.url;

        // 3. Return YouTube URL and Spotify Metadata
        // We do NOT download here. We let the frontend handle the download using the YouTube URL.
        // This is more robust and reuses the working YouTube downloader.

        res.json({
            success: true,
            title: metadata.title,
            artist: metadata.artist,
            thumbnail: metadata.thumbnail,
            youtubeUrl: videoUrl, // The resolved YouTube URL
            duration: video.duration.seconds,
            platform: 'Spotify',
            source: 'YouTube Bridge'
        });

    } catch (error) {
        console.error('❌ Spotify error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message || 'Gagal memproses link Spotify'
        });
    }
};
