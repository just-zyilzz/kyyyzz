/**
 * API Endpoint: /api/yt-search
 * Search YouTube videos/music
 */

const ytSearch = require('yt-search');

module.exports = async (req, res) => {
    // Allow both GET and POST
    if (req.method !== 'POST' && req.method !== 'GET') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    // Get query from POST body or GET query params
    const query = req.method === 'POST'
        ? req.body.query || req.body.q
        : req.query.query || req.query.q;

    const limit = parseInt(req.body?.limit || req.query?.limit || 10);
    const type = req.body?.type || req.query?.type || 'video'; // video, playlist, channel, all

    if (!query) {
        return res.status(400).json({
            success: false,
            error: 'Query parameter required'
        });
    }

    try {
        // Search YouTube
        const results = await ytSearch(query);

        let filteredResults;

        if (type === 'video') {
            filteredResults = (results.videos || []).slice(0, limit).map(video => ({
                type: 'video',
                videoId: video.videoId,
                url: video.url,
                title: video.title,
                description: video.description,
                thumbnail: video.thumbnail,
                duration: {
                    seconds: video.seconds,
                    timestamp: video.timestamp
                },
                views: video.views,
                author: {
                    name: video.author.name,
                    url: video.author.url
                },
                ago: video.ago,
                uploadDate: video.uploadDate
            }));
        } else if (type === 'playlist') {
            filteredResults = (results.playlists || []).slice(0, limit).map(playlist => ({
                type: 'playlist',
                playlistId: playlist.listId,
                url: playlist.url,
                title: playlist.title,
                thumbnail: playlist.thumbnail,
                videoCount: playlist.videoCount,
                author: {
                    name: playlist.author.name,
                    url: playlist.author.url
                }
            }));
        } else if (type === 'channel') {
            filteredResults = (results.channels || []).slice(0, limit).map(channel => ({
                type: 'channel',
                channelId: channel.channelId,
                url: channel.url,
                name: channel.name,
                thumbnail: channel.thumbnail,
                subscribers: channel.subCountLabel,
                videoCount: channel.videoCount
            }));
        } else {
            // Return all types
            filteredResults = {
                videos: (results.videos || []).slice(0, limit),
                playlists: (results.playlists || []).slice(0, limit),
                channels: (results.channels || []).slice(0, limit)
            };
        }

        // Return results
        res.json({
            success: true,
            query: query,
            type: type,
            results: filteredResults
        });
    } catch (error) {
        console.error('❌ YouTube search error:', error.message);
        res.json({
            success: false,
            error: 'Search failed: ' + error.message
        });
    }
};
