const axios = require('axios');

/**
 * Scrape Spotify metadata from URL using oEmbed API
 * @param {string} url - Spotify track URL
 * @returns {Promise<Object>} - Metadata { title, artist, thumbnail, type }
 */
async function getSpotifyMetadata(url) {
    try {
        // Validate URL
        if (!url.includes('spotify.com/track')) {
            throw new Error('Hanya mendukung link lagu Spotify (track)');
        }

        // Use Spotify oEmbed API - reliable and official
        const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`;

        const { data } = await axios.get(oembedUrl);

        if (!data || !data.title) {
            throw new Error('Gagal mengambil metadata Spotify');
        }

        // oEmbed title usually format: "Song Name" (sometimes "Artist - Song Name")
        // But the thumbnail is reliable.
        // We can try to parse artist from the HTML response if needed, but let's stick to simple title first.

        // Note: Spotify oEmbed title is just the song title usually.
        // We might need to fetch the page title for "Song - Artist" format if oEmbed is too simple.
        // But oEmbed is safer. Let's try to get more info if possible.

        // Actually, let's use a backup scraping method if oEmbed doesn't give Artist clearly.
        // But for stability, let's trust oEmbed's title.

        // Refine: oEmbed title is "Song Title". 
        // We need Artist. 
        // Let's try to scrape the public page title which is usually "Song - song by Artist | Spotify"

        let artist = 'Unknown Artist';
        let title = data.title;

        // Try to fetch page title for better Artist info
        try {
            const pageRes = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });

            // Simple regex to find <title> tag
            const titleMatch = pageRes.data.match(/<title>(.*?)<\/title>/);
            if (titleMatch && titleMatch[1]) {
                const pageTitle = titleMatch[1];
                // Format: "Song - song by Artist | Spotify" or "Song - Artist | Spotify"

                if (pageTitle.includes(' - song by ')) {
                    const parts = pageTitle.split(' - song by ');
                    if (parts.length > 1) {
                        artist = parts[1].split('|')[0].trim();
                    }
                } else if (pageTitle.includes(' - ')) {
                    // Fallback
                    const parts = pageTitle.split(' - ');
                    if (parts.length > 1) {
                        artist = parts[parts.length - 1].split('|')[0].trim();
                    }
                }
            }
        } catch (e) {
            // Fallback scraping failed, using default
        }

        return {
            title: title,
            artist: artist,
            thumbnail: data.thumbnail_url,
            url: url,
            platform: 'Spotify'
        };
    } catch (error) {
        console.error('Spotify metadata error:', error.message);
        throw new Error('Gagal mengambil info Spotify: ' + error.message);
    }
}

module.exports = { getSpotifyMetadata };
