const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Scrape Spotify metadata from URL
 * @param {string} url - Spotify track URL
 * @returns {Promise<Object>} - Metadata { title, artist, thumbnail, type }
 */
async function getSpotifyMetadata(url) {
    try {
        // Validate URL
        if (!url.includes('spotify.com/track')) {
            throw new Error('Hanya mendukung link lagu Spotify (track)');
        }

        // Fetch page content
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const $ = cheerio.load(data);

        // Extract metadata from OpenGraph tags
        const title = $('meta[property="og:title"]').attr('content');
        const description = $('meta[property="og:description"]').attr('content'); // Usually "Artist · Song · Year"
        const image = $('meta[property="og:image"]').attr('content');
        const type = $('meta[property="og:type"]').attr('content');

        if (!title) {
            throw new Error('Gagal mengambil metadata Spotify');
        }

        // Parse artist from description or title
        // Description format is usually: "Song · Artist · Year" or "Artist · Song · Year"
        // Title format is usually: "Song - song by Artist | Spotify"

        let artist = 'Unknown Artist';
        let trackName = title;

        // Try to parse artist from description (common format: "Artist · Song")
        if (description) {
            const parts = description.split('·').map(s => s.trim());
            if (parts.length >= 2) {
                // Usually the first part is Artist if it's a song page
                // But sometimes it varies. Let's rely on the title which is usually just the song name
                // and description which contains the artist.

                // If title is "Song Name", and description is "Artist · Song Name · ...", then parts[0] is Artist
                artist = parts[0];
            }
        }

        return {
            title: trackName,
            artist: artist,
            thumbnail: image,
            url: url,
            platform: 'Spotify'
        };
    } catch (error) {
        console.error('Spotify scrape error:', error.message);
        throw new Error('Gagal mengambil info Spotify: ' + error.message);
    }
}

module.exports = { getSpotifyMetadata };
