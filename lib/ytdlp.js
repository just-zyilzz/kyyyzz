'--print-json',
    '--write-thumbnail',
    '--skip-download',
    '-f', formatArg,
    '-o', outputPath + '.%(ext)s'
        ].concat(YTDLP_FLAGS);

// Gunakan yt-dlp standalone atau python -m yt_dlp
const useStandalone = fs.existsSync(YTDLP_PATH);
const command = useStandalone ? YTDLP_PATH : 'python';
const finalArgs = useStandalone ? args : ['-m', 'yt_dlp'].concat(args);

const ytDlp = spawn(command, finalArgs, {
    windowsHide: true,
    stdio: 'pipe'
});

let stdout = '', stderr = '';
ytDlp.stdout.on('data', data => stdout += data);
ytDlp.stderr.on('data', data => stderr += data);

ytDlp.on('error', (err) => {
    reject(new Error(`yt-dlp error: ${err.message}`));
});

ytDlp.on('close', (code) => {
    if (code !== 0) {
        return reject(new Error(`yt-dlp failed: ${stderr}`));
    }

    try {
        const jsonStr = stdout.trim().split('\n')[0];
        const meta = JSON.parse(jsonStr);

        const { detectPlatform } = require('./utils');
        const metadata = {
            success: true,
            title: meta.title || '—',
            channel: meta.channel || meta.uploader || meta.owner_username || '—',
            like_count: meta.like_count ?? 'N/A',
            view_count: meta.view_count ?? 'N/A',
            platform: detectPlatform(url),
            thumbnailUrl: null,
            thumbnailId: id
        };

        // Find thumbnail file
        const files = fs.readdirSync(DOWNLOAD_DIR);
        const thumb = files.find(f => f.startsWith(id) && /\.(jpe?g|png|webp)$/i.test(f));
        if (thumb) {
            metadata.thumbnailUrl = `/downloads/${thumb}`;
        }

        resolve(metadata);
    } catch (e) {
        reject(new Error(`Parse error: ${e.message}`));
    }
});
    });
}

/**
 * Download video/audio
 */
function downloadMedia(url, format = 'video') {
    return new Promise((resolve, reject) => {
        const id = crypto.randomBytes(8).toString('hex');
        let outputPath = path.join(DOWNLOAD_DIR, id);
        let args = [];

        const { getFormatArgs } = require('./utils');
        const formatArg = getFormatArgs(url, format);

        if (format === 'audio') {
            outputPath += '.mp4';
            args = [
                url,
                '-f', formatArg,
                '-o', outputPath
            ].concat(YTDLP_FLAGS);
        } else if (format === 'thumb') {
            args = [
                url,
                '--write-thumbnail',
                '--skip-download',
                '-f', formatArg,
                '-o', outputPath + '.%(ext)s'
            ].concat(YTDLP_FLAGS);
        } else {
            args = [
                url,
                '-f', formatArg,
                '--merge-output-format', 'mp4',
                '-o', outputPath + '.%(ext)s'
            ].concat(YTDLP_FLAGS);
        }

        // Gunakan yt-dlp standalone atau python -m yt_dlp
        const useStandalone = fs.existsSync(YTDLP_PATH);
        const command = useStandalone ? YTDLP_PATH : 'python';
        const finalArgs = useStandalone ? args : ['-m', 'yt_dlp'].concat(args);

        const ytDlp = spawn(command, finalArgs, {
            windowsHide: true,
            stdio: 'pipe'
        });

        ytDlp.on('error', (err) => {
            reject(new Error(`yt-dlp error: ${err.message}`));
        });

        ytDlp.on('close', (code) => {
            if (code !== 0) {
                return reject(new Error('Download gagal'));
            }

            const files = fs.readdirSync(DOWNLOAD_DIR);
            const file = files.filter(f => f.startsWith(id) && !f.endsWith('.part'))[0];

            if (!file) {
                return reject(new Error('File tidak ditemukan'));
            }

            resolve({
                success: true,
                fileName: file,
                filePath: `/downloads/${file}`,
                id: id,
                needsConversion: format === 'audio'
            });
        });
    });
}

/**
 * Convert to MP3 using FFmpeg
 */
function convertToMp3(inputFileName) {
    return new Promise((resolve, reject) => {
        const inputPath = path.join(DOWNLOAD_DIR, inputFileName);
        const id = path.parse(inputFileName).name;
        const outputPath = path.join(DOWNLOAD_DIR, id + '.mp3');

        // Gunakan bundled ffmpeg atau system ffmpeg
        const useBundled = fs.existsSync(FFMPEG_PATH);
        const command = useBundled ? FFMPEG_PATH : 'ffmpeg';

        const ffmpeg = spawn(command, [
            '-i', inputPath,
            '-b:a', '128k',
            '-f', 'mp3',
            '-preset', 'fast',
            outputPath
        ], {
            windowsHide: true,
            stdio: 'pipe'
        });

        ffmpeg.on('error', (err) => {
            reject(new Error(`FFmpeg error: ${err.message}`));
        });

        ffmpeg.on('close', (code) => {
            if (code !== 0) {
                return reject(new Error('Konversi audio gagal'));
            }

            // Delete original file
            try {
                fs.unlinkSync(inputPath);
            } catch (e) {
                console.error('Failed to delete temp file:', e);
            }

            resolve({
                success: true,
                fileName: id + '.mp3',
                filePath: `/downloads/${id}.mp3`
            });
        });
    });
}

module.exports = {
    getMetadata,
    downloadMedia,
    convertToMp3
};
