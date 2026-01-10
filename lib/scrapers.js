const axios = require('axios');
const cheerio = require('cheerio');

// ===== INSTAGRAM DOWNLOADER (Multi-Method) =====
async function instaDownloadGram(url) {
    try {
        const form = { url: url, submit: '' };
        const { data } = await axios.post('https://downloadgram.org/', form, {
            headers: {
                'content-type': 'application/x-www-form-urlencoded',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        const $ = cheerio.load(data);
        const result = [];

        $('#downloadhere > a').each(function (a, b) {
            const downloadUrl = $(b).attr('href');
            if (downloadUrl) result.push(downloadUrl);
        });

        if (result.length === 0) throw new Error('No download links found');

        return {
            status: true,
            service: 'downloadgram',
            urls: result
        };
    } catch (e) {
        throw new Error('Downloadgram failed: ' + e.message);
    }
}

async function instaStory(username) {
    return new Promise(async (resolve, reject) => {
        try {
            const { data } = await axios.get('https://www.instagramsave.com/instagram-story-downloader.php');
            const $ = cheerio.load(data);
            const token = $('#token').attr('value');

            const result = await axios.post(
                'https://www.instagramsave.com/system/action.php',
                `url=https://www.instagram.com/${username}&action=story&token=${token}`,
                {
                    headers: {
                        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
                        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                }
            );

            resolve({
                status: true,
                service: 'instagramsave',
                medias: result.data.medias
            });
        } catch (e) {
            reject(new Error('Instagram story failed: ' + e.message));
        }
    });
}

// Main Instagram function with fallback
async function instagramDownload(url) {
    const methods = [instaDownloadGram];
    let lastError;

    for (const method of methods) {
        try {
            const result = await method(url);
            return result;
        } catch (error) {
            lastError = error;
            continue;
        }
    }

    throw new Error('All Instagram download methods failed. ' + lastError?.message);
}

// ===== PINTEREST SCRAPER =====
async function pinterest(query) {
    return new Promise(async (resolve, reject) => {
        try {
            const { data } = await axios.get(
                `https://id.pinterest.com/search/pins/?autologin=true&q=${encodeURIComponent(query)}`,
                {
                    headers: {
                        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    }
                }
            );

            const $ = cheerio.load(data);
            const result = [];

            $('div > a').get().map(b => {
                const link = $(b).find('img').attr('src');
                if (link && !link.includes('undefined')) {
                    result.push(link.replace(/236/g, '736'));
                }
            });

            const filtered = result.filter(v => v !== undefined);

            if (filtered.length === 0) {
                throw new Error('No images found');
            }

            resolve({
                status: true,
                query: query,
                images: filtered
            });
        } catch (e) {
            reject(new Error('Pinterest search failed: ' + e.message));
        }
    });
}

// ===== WALLPAPER SCRAPER =====
async function wallpaper(title, page = '1') {
    return new Promise((resolve, reject) => {
        axios.get(`https://www.besthdwallpaper.com/search?CurrentPage=${page}&q=${encodeURIComponent(title)}`)
            .then(({ data }) => {
                const $ = cheerio.load(data);
                const hasil = [];

                $('div.grid-item').each(function (a, b) {
                    hasil.push({
                        title: $(b).find('div.info > a > h3').text(),
                        type: $(b).find('div.info > a:nth-child(2)').text(),
                        source: 'https://www.besthdwallpaper.com/' + $(b).find('div > a:nth-child(3)').attr('href'),
                        image: [
                            $(b).find('picture > img').attr('data-src') || $(b).find('picture > img').attr('src'),
                            $(b).find('picture > source:nth-child(1)').attr('srcset'),
                            $(b).find('picture > source:nth-child(2)').attr('srcset')
                        ].filter(v => v !== undefined)
                    });
                });

                if (hasil.length === 0) {
                    throw new Error('No wallpapers found');
                }

                resolve({
                    status: true,
                    query: title,
                    page: page,
                    results: hasil
                });
            })
            .catch(e => reject(new Error('Wallpaper search failed: ' + e.message)));
    });
}

// ===== WIKIMEDIA SEARCH =====
async function wikimedia(title) {
    return new Promise((resolve, reject) => {
        axios.get(`https://commons.wikimedia.org/w/index.php?search=${encodeURIComponent(title)}&title=Special:MediaSearch&go=Go&type=image`)
            .then((res) => {
                const $ = cheerio.load(res.data);
                const hasil = [];

                $('.sdms-search-results__list-wrapper > div > a').each(function (a, b) {
                    hasil.push({
                        title: $(b).find('img').attr('alt'),
                        source: $(b).attr('href'),
                        image: $(b).find('img').attr('data-src') || $(b).find('img').attr('src')
                    });
                });

                if (hasil.length === 0) {
                    throw new Error('No results found');
                }

                resolve({
                    status: true,
                    query: title,
                    results: hasil
                });
            })
            .catch(e => reject(new Error('Wikimedia search failed: ' + e.message)));
    });
}

module.exports = {
    instagramDownload,
    instaStory,
    pinterest,
    wallpaper,
    wikimedia
};
