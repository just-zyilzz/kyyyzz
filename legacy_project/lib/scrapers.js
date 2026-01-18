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

const DEFAULT_COOKIE = '_auth=1; _pinterest_sess=TWc9PSZzN1VKRTV1cGczQ1ZMRStzVE4xZ2pCd1JzV3JGeUVrblBteVJRMnBZajVIWGpRMmdIOEJmRDhhc0JuSXNKaGU5YUJrTzZMOFdmMmhHSW81aEI5dWd6Vk8rQU43S0IxTVpiRFIraE11MElyRlQzeHFnQXRNNEhZRWNzOHlLeThkVVU0bFRWSC95d2gyb2pDOXR1SXA5TjBNWFpsVmczYUZRdDQreDV2Ukc3ZG5MSHliemlmTGtVTlQxdVVqLzNOYUFoNUlHWk5ReUt1UEpLZ0poSFE2SzgzZVB5R202UjAvRXJUbE1vUEhzWVIvMXhwQ0orSVQrMzJ0RVo0d1cxN2pUdExzVU55dU5JbzhzMVpweEs4bWZ6ZGFaUHpaMS9RdVVsRVNySVFGbVBpRmFJc2hLT3NYek16WXMzYkUvZSt4Z09LMW9NVHJCTmxweUdLcUxWU0ZNNElxOTFwYkRGK1E5WDRRR3RYeFdOa0grUDUwT2txS2xUaHhibk5FdHJxSi9kTzBDeHJyZXhkY3A5RzBXVElMVndML3cyZG16bzdzOGZIVDVRRjZITnZIbThjb1djR1pUeEg0Vk53V0w1TVZjQ3N1UnozQnF0TGVuNFV2OVlTN2lzQkppR1h1SVZtR25Lb2ozTlZRYkowSnMwMkdhZ0tsaytXbTVSS29VdVNiNzRaRmJEbTNOTEFDSGk2dFlVNkNOckJzblVIQWdHSW9kdzd0QWV0SFdSOSt5ZEI4THZ1U2ViNThZcGFobnNXdFc3U0I3Tjh1ZG5hL29wWlRCSjhjeTcxZEdUdk51Y3czbThjcjhpYldOa3krZysrWmp4WC9SMWNRbnZwSDNHeWRiQzIxZk5Bajc5VVRFYTdtL3FFaUhXRm12b2RWN2EydGFlbVltalFEQkMvYzk1Yk8wOXFxQjhYdFEvOSsyV3R2bkd6c0Y5eVNUclFKWTROajg5SnVVbWdyT0IwWWh3QlFXeGZFQURKTmRvNm9ZekdLdGQrZFJ4TWhRMEFaNFRQWnNpeFRwR2luYzhsM1FsUUczUE0vUEo5YXowbWk1Mno5RHZZUTdYOCtERlhTdEhnenRmQTdvQ1REbDJxSlNrMjZvanhPVnlDbnZycGk4ZVUxRC9yUmNnMm5Fc0F3eGl5L1V3OW5kREN3RFNLcEVhTXkvRnJDQ2ZMNnFEc3k4WjJqWHcxVk04TmVqNnNzTTM0RXBJQnVWaEFTcHBvK0VpekVpai8wRHBsbHBWYjBETFZOayttZnhRMytUY0gyOTkxOEZNTXJWb3g0bTJQbHJoUDlNZnNDZFN0QmtZZG4xVlkyaHpXTk5DajE1WVJ6WFFKY1ZrU2NPUHdZV1VBRGlOZEJic2pyaWxINndTbTRZcmR4cHdEL0hudDBUaElZZEx5emU0V3huWGQ4QW9NNVhoczY3VHZoQ2pDUjM0TENrRC9nbGRoSGN3RnY4ZUU3dnBTYUhFUWJCL0dUTWhVN2pobTVONkN6alpDN2liN0FFelgvZjNxWXlwRmxXNUJtVUYzLy9LaGVwVmZ0TzhMWmFuMk5zUlhQazlDbjRhcUpTVXBnSVRGVnVZZnVwWkhmUnU0YzJiT2U2VVBKSm4zWFNkUzZWQ2FoWTVSb0J0WHczN1dXMFoxUHN2Y2l1K1ZDWEQ1aElic0Z1cEwybkNibWZvdk0vakNFRGJHaUNQUFRHZEJac0xsc3lacjJnVVRIZGFVSXF0bVBwaEZCbEJvODhzeTdtdE92Ly9jY1VFNnR1UGY1YTRIdEhHMERLQVQ3Q1hmZHAmZkVNZDQ5bmNBbGk2YW5uSkQ1bDYvSkE3WWVFPQ==; _b="AY/QYeBYT05JO4DuinNfKY/vtdPx4HIzqArBwrO1rHKKQl3k4hSQZa8jHO92YUn4dN4="; _ir=0';

// ===== PINTEREST SCRAPER =====
async function pinterest(query) {
    return new Promise(async (resolve, reject) => {
        try {
            const { data } = await axios.get(
                `https://id.pinterest.com/search/pins/?autologin=true&q=${encodeURIComponent(query)}`,
                {
                    headers: {
                        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'referer': 'https://www.pinterest.com/',
                        'Cookie': DEFAULT_COOKIE
                    }
                }
            );

            const $ = cheerio.load(data);
            const result = [];

            // Method 1: Try finding images in standard grid
            $('div[data-test-id="pin-visual-wrapper"] img').each((i, el) => {
                const src = $(el).attr('src');
                if (src) result.push(src.replace(/236x/, '736x'));
            });

            // Method 2: Fallback to generic image search if Method 1 fails
            if (result.length === 0) {
                $('img[src*="pinimg.com/236x/"]').each((i, el) => {
                    const src = $(el).attr('src');
                    if (src) result.push(src.replace(/236x/, '736x'));
                });
            }
            
            // Method 3: Fallback to original selector
            if (result.length === 0) {
                $('div > a').each((i, b) => {
                    const link = $(b).find('img').attr('src');
                    if (link && !link.includes('undefined')) {
                        result.push(link.replace(/236x/g, '736x').replace(/236/g, '736'));
                    }
                });
            }

            // Remove duplicates and undefined
            const uniqueResults = [...new Set(result.filter(v => v !== undefined && v.includes('pinimg.com')))];

            if (uniqueResults.length === 0) {
                throw new Error('No images found on Pinterest for this query');
            }

            resolve({
                status: true,
                query: query,
                images: uniqueResults
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
