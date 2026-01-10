const axios = require('axios');

/**
 * Twitter/X Video Downloader
 * Using multiple fallback services for reliability
 */

// ===== Service 1: SaveTweetVid API =====
async function saveTweetVid(url) {
    try {
        const apiUrl = 'https://twitsave.com/info';

        const response = await axios.post(apiUrl,
            `url=${encodeURIComponent(url)}`,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            }
        );

        const html = response.data;

        // Extract video qualities from response
        const videoRegex = /<a href="(https:\/\/[^"]+\.mp4[^"]*)"[^>]*>(\d+x\d+)<\/a>/g;
        const videos = [];
        let match;

        while ((match = videoRegex.exec(html)) !== null) {
            const quality = match[2]; // e.g., "1280x720"
            const url = match[1];

            videos.push({
                quality: quality,
                url: url.trim()
            });
        }

        // Extract metadata
        const titleMatch = html.match(/<div class="leading-tight"><p class="m-2">([^<]+)<\/p>/);
        const title = titleMatch ? titleMatch[1].trim() : 'Twitter Video';

        if (videos.length === 0) {
            throw new Error('No video found');
        }

        return {
            status: true,
            service: 'twitsave',
            title: title,
            videos: videos,
            thumbnail: null
        };
    } catch (error) {
        throw new Error('SaveTweetVid failed: ' + error.message);
    }
}

// ===== Service 2: Twitter Video Downloader API =====
async function twitterVideoAPI(url) {
    try {
        // Extract tweet ID from URL
        const tweetIdMatch = url.match(/status\/(\d+)/);
        if (!tweetIdMatch) {
            throw new Error('Invalid Twitter URL');
        }
        const tweetId = tweetIdMatch[1];

        const apiUrl = `https://cdn.syndication.twimg.com/tweet-result?id=${tweetId}&lang=en`;

        const response = await axios.get(apiUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
            }
        });

        const data = response.data;

        if (!data || !data.mediaDetails) {
            throw new Error('No video data found');
        }

        const videos = [];

        // Extract video variants
        if (data.mediaDetails && data.mediaDetails.length > 0) {
            const videoData = data.mediaDetails[0];

            if (videoData.video_info && videoData.video_info.variants) {
                videoData.video_info.variants.forEach(variant => {
                    if (variant.content_type === 'video/mp4') {
                        // Extract quality from bitrate
                        const bitrate = variant.bitrate || 0;
                        const quality = bitrate > 2000000 ? 'HD' : bitrate > 800000 ? 'SD' : 'Low';

                        videos.push({
                            quality: quality,
                            bitrate: bitrate,
                            url: variant.url
                        });
                    }
                });
            }
        }

        // Sort by bitrate (highest first)
        videos.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));

        return {
            status: true,
            service: 'twitter-api',
            title: data.text || 'Twitter Video',
            author: data.user?.name || 'Unknown',
            thumbnail: data.mediaDetails?.[0]?.media_url_https || null,
            videos: videos
        };
    } catch (error) {
        throw new Error('Twitter API failed: ' + error.message);
    }
}

// ===== Main Download Function with Fallback =====
async function downloadTwitterVideo(url) {
    // Validate URL
    if (!url.includes('twitter.com') && !url.includes('x.com')) {
        throw new Error('Invalid Twitter/X URL');
    }

    const services = [twitterVideoAPI, saveTweetVid];
    let lastError;

    for (const service of services) {
        try {
            const result = await service(url);
            return result;
        } catch (error) {
            lastError = error;
            console.log(`Service failed: ${error.message}, trying next...`);
            continue;
        }
    }

    // All services failed
    throw new Error('All Twitter download services failed. ' + lastError?.message);
}

module.exports = {
    downloadTwitterVideo
};
