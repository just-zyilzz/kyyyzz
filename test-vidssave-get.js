const { ytdl } = require('./lib/vidssave');

// Test with GET request
const testUrl = 'https://www.youtube.com/watch?v=jNQXAC9IVRw';

console.log(`Testing Vidssave with GET request: ${testUrl}\n`);

ytdl(testUrl)
    .then(result => {
        console.log('\n✅ SUCCESS with GET!');
        console.log('Title:', result.title);
        console.log('Thumbnail:', result.thumbnail ? 'Yes' : 'No');
        console.log('Duration:', result.duration);
        console.log('Formats available:', result.formats.length);
        console.log('\nFormats:');
        result.formats.forEach(f => {
            console.log(`  - ${f.quality}p ${f.format} (${f.type})`);
        });
    })
    .catch(error => {
        console.error('\n❌ FAILED!');
        console.error('Error:', error.message);
    });
