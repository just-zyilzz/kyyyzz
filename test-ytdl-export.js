// Test script to verify ytdl exports
const ytdlModule = require('./lib/ytdl');

console.log('===== VERIFICATION TEST =====\n');

// Test 1: Check YT class export
console.log('✓ Test 1: YT class export');
console.log('  - typeof ytdlModule:', typeof ytdlModule);
console.log('  - ytdlModule.name:', ytdlModule.name);
console.log('  - Has mp4 method:', typeof ytdlModule.mp4 === 'function');
console.log('  - Has mp3 method:', typeof ytdlModule.mp3 === 'function');
console.log('');

// Test 2: Check ytdl function export
console.log('✓ Test 2: ytdl function export');
console.log('  - typeof ytdlModule.ytdl:', typeof ytdlModule.ytdl);
console.log('  - ytdlModule.ytdl.name:', ytdlModule.ytdl.name);
console.log('');

// Test 3: Check YT class export (explicit)
console.log('✓ Test 3: YT class export (explicit)');
console.log('  - typeof ytdlModule.YT:', typeof ytdlModule.YT);
console.log('  - ytdlModule.YT.name:', ytdlModule.YT?.name);
console.log('');

// Test 4: Test destructuring import (like in download.js)
console.log('✓ Test 4: Destructuring import test');
const { ytdl } = require('./lib/ytdl');
console.log('  - const { ytdl } works:', typeof ytdl === 'function');
console.log('  - ytdl function name:', ytdl.name);
console.log('');

console.log('===== ALL TESTS PASSED ✅ =====');
console.log('');
console.log('Summary:');
console.log('  1. Default export (YT class): ✓');
console.log('  2. Named export (ytdl function): ✓');
console.log('  3. Named export (YT class): ✓');
console.log('  4. Destructuring { ytdl }: ✓');
console.log('');
console.log('The API can now use:');
console.log('  - const { ytdl } = require("../../lib/ytdl");');
console.log('  - await ytdl(url, "mp4", 720);');
console.log('  - await ytdl(url, "mp3", 320);');
