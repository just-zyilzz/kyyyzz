const yt2 = require('./lib/yt2');

async function test() {
    const url = 'https://www.youtube.com/watch?v=y8w6XigIEO8'; // The URL user tried
    console.log('Testing yt2 with URL:', url);
    try {
        const result = await yt2.ytdl(url);
        console.log('Result:', JSON.stringify(result, null, 2));
    } catch (e) {
        console.error('Error:', e.message);
        if (e.response) {
            console.error('Response status:', e.response.status);
            console.error('Response data:', e.response.data);
        }
    }
}

test();
