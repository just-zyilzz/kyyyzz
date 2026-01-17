const yt2 = require('./lib/yt2');

const url = 'https://youtu.be/gvunApwKIiY?si=chZvUhH78wR28uKx';

async function test() {
    console.log('Testing YT2 (SaveTube) - Metadata extraction');
    try {
        const data = await yt2.ytdl(url);
        
        // Simulate Logic from download.js for MP4
        console.log('\n[MP4 Logic Check]');
        const mp4Formats = data.formats.filter(f => f.type === 'video' && f.format === 'mp4');
        mp4Formats.sort((a, b) => (parseInt(a.quality) || 0) - (parseInt(b.quality) || 0)).reverse();
        
        if (mp4Formats.length > 0) {
            console.log('Best MP4 found:', mp4Formats[0]);
        } else {
            console.log('No MP4 found');
        }

        // Simulate Logic from download.js for MP3
        console.log('\n[MP3/Audio Logic Check]');
        const audioFormats = data.formats.filter(f => f.type === 'audio');
        audioFormats.sort((a, b) => (parseInt(a.quality) || 0) - (parseInt(b.quality) || 0)).reverse();
        
        if (audioFormats.length > 0) {
            console.log('Best Audio found:', audioFormats[0]);
        } else {
            console.log('No Audio found');
        }

    } catch (e) {
        console.error('YT2 Error:', e.message);
    }
}

test();
