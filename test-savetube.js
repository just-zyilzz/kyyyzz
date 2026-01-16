const savetube = require('./lib/savetube');

async function testSaveTube() {
    console.log('Testing SaveTube API...\n');

    const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

    console.log('Test: Rick Astley - 720p');
    console.log('URL:', testUrl);
    console.log('Quality: 720\n');

    try {
        const result = await savetube.download(testUrl, '720');

        if (result.status) {
            console.log('✅ SUCCESS!');
            console.log('Title:', result.result.title);
            console.log('Quality:', result.result.quality);
            console.log('Download URL:', result.result.download.substring(0, 80) + '...');
            console.log('ID:', result.result.id);
            console.log('Duration:', result.result.duration);
        } else {
            console.log('❌ FAILED (status: false)');
            console.log('Response:', JSON.stringify(result, null, 2));
        }
    } catch (error) {
        console.log('❌ ERROR THROWN');
        console.log('Message:', error.message);
        console.log('Stack:', error.stack);
    }
}

testSaveTube().then(() => {
    console.log('\nTest completed!');
    process.exit(0);
}).catch(err => {
    console.error('\nTest suite failed:', err);
    process.exit(1);
});
