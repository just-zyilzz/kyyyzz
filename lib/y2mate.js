/**
 * Y2mate YouTube Downloader - Third Fallback
 * Using y2mate.com as third option when savetube and ytdl-core fails
 */

const { JSDOM } = require('jsdom');
const fetch = require('node-fetch');

const ytIdRegex = /(?:http(?:s|):\/\/|)(?:(?:www\.|)youtube(?:\-nocookie|)\.com\/(?:watch\?.*(?:|\&)v=|embed\/|v\/)|youtu\.be\/)([-_0-9A-Za-z]{11})/;

function post(url, formdata) {
    return fetch(url, {
        method: 'POST',
        headers: {
            accept: "*/*",
            'accept-language': "en-US,en;q=0.9",
            'content-type': "application/x-www-form-urlencoded; charset=UTF-8"
        },
        body: Object.keys(formdata).map(key => `${key}=${encodeURIComponent(formdata[key])}`).join('&')
    });
}

/**
 * Download YouTube HD Video using y2mate
 * @param {string} url - YouTube URL
 */
function ythd(url) {
    return new Promise((resolve, reject) => {
        if (ytIdRegex.test(url)) {
            let ytId = ytIdRegex.exec(url);
            url = 'https://youtu.be/' + ytId[1];

            console.log('[Y2mate] Analyzing:', url);

            post('https://www.y2mate.com/mates/en60/analyze/ajax', {
                url,
                q_auto: 0,
                ajax: 1
            })
                .then(res => res.json())
                .then(res => {
                    const document = (new JSDOM(res.result)).window.document;
                    const yaha = document.querySelectorAll('td');
                    const filesize = yaha[yaha.length - 23]?.innerHTML || '0';
                    const id = /var k__id = "(.*?)"/.exec(document.body.innerHTML) || ['', ''];
                    const thumb = document.querySelector('img')?.src || null;
                    const title = document.querySelector('b')?.innerHTML || 'YouTube Video';

                    console.log('[Y2mate] Converting video...');

                    post('https://www.y2mate.com/mates/en60/convert', {
                        type: 'youtube',
                        _id: id[1],
                        v_id: ytId[1],
                        ajax: '1',
                        token: '',
                        ftype: 'mp4',
                        fquality: 720
                    })
                        .then(res => res.json())
                        .then(res => {
                            const dlLink = /<a.+?href="(.+?)"/.exec(res.result)?.[1];

                            if (!dlLink) {
                                return reject(new Error('Download link not found'));
                            }

                            let KB = parseFloat(filesize) * (1000 * /MB$/.test(filesize));
                            resolve({
                                success: true,
                                dl_link: dlLink,
                                downloadUrl: dlLink,
                                thumb,
                                thumbnail: thumb,
                                title,
                                filesizeF: filesize,
                                filesize: KB,
                                videoId: ytId[1]
                            });
                        }).catch(reject);
                }).catch(reject);
        } else {
            reject(new Error('Invalid YouTube URL'));
        }
    });
}

/**
 * Download YouTube Audio/MP3 using y2mate
 * @param {string} url - YouTube URL
 */
function ytmp3(url) {
    return new Promise((resolve, reject) => {
        if (ytIdRegex.test(url)) {
            let ytId = ytIdRegex.exec(url);
            url = 'https://youtu.be/' + ytId[1];

            console.log('[Y2mate] Analyzing for MP3:', url);

            post('https://www.y2mate.com/mates/en60/analyze/ajax', {
                url,
                q_auto: 0,
                ajax: 1
            })
                .then(res => res.json())
                .then(res => {
                    const document = (new JSDOM(res.result)).window.document;
                    const id = /var k__id = "(.*?)"/.exec(document.body.innerHTML) || ['', ''];
                    const thumb = document.querySelector('img')?.src || null;
                    const title = document.querySelector('b')?.innerHTML || 'YouTube Audio';

                    console.log('[Y2mate] Converting to MP3...');

                    post('https://www.y2mate.com/mates/en60/convert', {
                        type: 'youtube',
                        _id: id[1],
                        v_id: ytId[1],
                        ajax: '1',
                        token: '',
                        ftype: 'mp3',
                        fquality: 128
                    })
                        .then(res => res.json())
                        .then(res => {
                            const dlLink = /<a.+?href="(.+?)"/.exec(res.result)?.[1];

                            if (!dlLink) {
                                return reject(new Error('Download link not found'));
                            }

                            resolve({
                                success: true,
                                dl_link: dlLink,
                                downloadUrl: dlLink,
                                thumb,
                                thumbnail: thumb,
                                title,
                                videoId: ytId[1],
                                format: 'mp3'
                            });
                        }).catch(reject);
                }).catch(reject);
        } else {
            reject(new Error('Invalid YouTube URL'));
        }
    });
}

module.exports = {
    ythd,
    ytmp3
};
