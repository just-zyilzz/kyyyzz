const yt1 = require('./lib/yt1');

(async () => {
    try {
        const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
        console.log('Testing yt1 video...');
        const video = await yt1.ytdl(url, 'mp4', '720');
        console.log('Video Result:', video ? 'Success' : 'Fail');
        console.log(video);

        console.log('Testing yt1 audio...');
        const audio = await yt1.ytdl(url, 'mp3', '128');
        console.log('Audio Result:', audio ? 'Success' : 'Fail');
        console.log(audio);

    } catch (e) {
        console.error('Test Failed:', e);
    }
})();
