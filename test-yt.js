const YTFallback = require('./lib/ytdl-fallback');

async function test() {
    console.log('Testing YouTube Video Download...\n');

    // Test 1: Video 720p
    console.log('Test 1: Rick Astley - Never Gonna Give You Up (720p)');
    try {
        const result = await YTFallback.mp4('https://www.youtube.com/watch?v=dQw4w9WgXcQ', '720');
        console.log('✅ SUCCESS');
        console.log('Title:', result.title);
        console.log('Quality:', result.quality);
        console.log('Video ID:', result.videoId);
        console.log('Has Download URL:', !!result.downloadUrl);
        console.log('');
    } catch (err) {
        console.log('❌ FAILED:', err.message);
        console.log('');
    }

    // Test 2: Audio
    console.log('Test 2: Rick Astley - Audio MP3');
    try {
        const result = await YTFallback.mp3('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
        console.log('✅ SUCCESS');
        console.log('Title:', result.title);
        console.log('Format:', result.format);
        console.log('Video ID:', result.videoId);
        console.log('Has Download URL:', !!result.downloadUrl);
        console.log('');
    } catch (err) {
        console.log('❌ FAILED:', err.message);
        console.log('');
    }

    // Test 3: 1080p video
    console.log('Test 3: Gangnam Style (720p)');
    try {
        const result = await YTFallback.mp4('https://youtu.be/9bZkp7q19f0', '720');
        console.log('✅ SUCCESS');
        console.log('Title:', result.title);
        console.log('Quality:', result.quality);
        console.log('Video ID:', result.videoId);
        console.log('');
    } catch (err) {
        console.log('❌ FAILED:', err.message);
        console.log('');
    }
}

test().then(() => {
    console.log('All tests completed!');
    process.exit(0);
}).catch(err => {
    console.error('Test suite failed:', err);
    process.exit(1);
});
