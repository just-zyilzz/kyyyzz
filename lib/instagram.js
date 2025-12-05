const axios = require('axios');
const cheerio = require('cheerio');

// XeonIgImg - Instagram downloader using downloadgram.org
async function XeonIgImg(url) {
    try {
        const result = [];
        const form = new URLSearchParams();
        form.append('url', url);
        form.append('submit', '');

        const { data } = await axios.post('https://downloadgram.org/', form, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 10000 // 10 second timeout
        });

        const $ = cheerio.load(data);
        $('#downloadhere > a').each(function (a, b) {
            const downloadUrl = $(b).attr('href');
            if (downloadUrl) result.push(downloadUrl);
        });

        if (result.length === 0) {
            throw new Error('No download links found');
        }

        return {
            url: result,
            metadata: {
                url: url
            }
        };
    } catch (error) {
        throw new Error('Failed to fetch Instagram media: ' + error.message);
    }
}

// Main Instagram function with fallback methods
async function Instagram(url) {
    try {
        // Try XeonIgImg first (fastest and most reliable)
        const result = await XeonIgImg(url);
        return result;
    } catch (error) {
        // Return error
        return {
            msg: 'Failed to download Instagram media. Try again later.',
            error: error.message
        };
    }
}

module.exports = Instagram;
module.exports.XeonIgImg = XeonIgImg;
