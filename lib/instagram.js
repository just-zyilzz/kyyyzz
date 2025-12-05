const axios = require('axios');
const cheerio = require('cheerio');
const vm = require('node:vm');

// XeonInstaMp4 - Instagram downloader with metadata using savefrom.net
async function XeonInstaMp4(url) {
    try {
        let body = new URLSearchParams({
            "sf_url": encodeURI(url),
            "sf_submit": "",
            "new": 2,
            "lang": "id",
            "app": "",
            "country": "id",
            "os": "Windows",
            "browser": "Chrome",
            "channel": " main",
            "sf-nomad": 1
        });

        let { data } = await axios({
            "url": "https://worker.sf-tools.com/savefrom.php",
            "method": "POST",
            "data": body,
            "headers": {
                "content-type": "application/x-www-form-urlencoded",
                "origin": "https://id.savefrom.net",
                "referer": "https://id.savefrom.net/",
                "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.74 Safari/537.36"
            },
            timeout: 10000 // 10 second timeout
        });

        let exec = '[]["filter"]["constructor"](b).call(a);';
        data = data.replace(exec, `\ntry {\ni++;\nif (i === 2) scriptResult = ${exec.split(".call")[0]}.toString();\nelse (\n${exec.replace(/;/, "")}\n);\n} catch {}`);

        let context = {
            description: result.meta?.description || '',
            thumbnail: result.thumb || null,
            duration: result.meta?.duration || null,
            source: result.meta?.source || 'Instagram'
        }
    };
} catch (error) {
    throw new Error('Failed to fetch Instagram media: ' + error.message);
}
}

// XeonIgImg - Instagram downloader using downloadgram.org (fallback)
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
        // Try XeonInstaMp4 first (has metadata & thumbnail)
        const result = await XeonInstaMp4(url);
        return result;
    } catch (error) {
        console.log('XeonInstaMp4 failed, trying XeonIgImg...', error.message);
        try {
            // Fallback to XeonIgImg
            const result = await XeonIgImg(url);
            return result;
        } catch (fallbackError) {
            // Both methods failed
            return {
                msg: 'Failed to download Instagram media. Try again later.',
                error: fallbackError.message
            };
        }
    }
}

module.exports = Instagram;
module.exports.XeonInstaMp4 = XeonInstaMp4;
module.exports.XeonIgImg = XeonIgImg;
