/**
 * Instagram Downloader using yt-dlp
 * Supports posts, reels, stories, IGTV
 */

const youtubedl = require('youtube-dl-exec');
const path = require('path');
const fs = require('fs');

/**
 * Extract Instagram post/reel ID from URL
 */
function extractInstagramId(url) {
    if (!url) return null;
    const patterns = [
        /instagram\.com\/p\/([a-zA-Z0-9_-]+)/,      // Post
        /instagram\.com\/reel\/([a-zA-Z0-9_-]+)/,   // Reel
        /instagram\.com\/tv\/([a-zA-Z0-9_-]+)/,     // IGTV
        /instagram\.com\/stories\/([a-zA-Z0-9_.-]+)\/([0-9]+)/ // Stories
    ];
    for (let pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

/**
 * Extract CSRF token from cookies file
 */
function extractCsrfToken(cookiesPath) {
    try {
        if (!fs.existsSync(cookiesPath)) return null;
        const cookieContent = fs.readFileSync(cookiesPath, 'utf-8');
        const csrfMatch = cookieContent.match(/csrftoken\s+(\S+)/);
        return csrfMatch ? csrfMatch[1] : null;
    } catch (error) {
        console.error('[Instagram] Error reading CSRF token:', error.message);
        return null;
    }
}

/**
 * Download Instagram media
 * @param {string} url - Instagram URL (post/reel/story/IGTV)
 */
async function downloadInstagram(url) {
    try {
        const postId = extractInstagramId(url);
        if (!postId) {
            return {
                status: false,
                code: 400,
                error: 'URL Instagram tidak valid'
            };
        }

        // Path to cookies.txt in the root directory
        const cookiesPath = path.join(process.cwd(), 'cookies.txt');
        const csrfToken = extractCsrfToken(cookiesPath);

        const options = {
            dumpSingleJson: true,
            noCheckCertificates: true,
            noWarnings: true,
            preferFreeFormats: true,
            format: 'best',
            addHeader: [
                'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                'referer:https://www.instagram.com/',
                'accept:text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'accept-language:en-US,en;q=0.9',
                'accept-encoding:gzip, deflate, br',
                'sec-fetch-dest:document',
                'sec-fetch-mode:navigate',
                'sec-fetch-site:none',
                'sec-fetch-user:?1',
                'upgrade-insecure-requests:1',
                'x-ig-app-id:936619743392459',
                'x-asbd-id:129477',
                'x-ig-www-claim:0'
            ]
        };

        // Add CSRF token if available
        if (csrfToken) {
            options.addHeader.push(`x-csrftoken:${csrfToken}`);
            console.log('[Instagram] CSRF token found and added');
        }

        // Add cookies if the file exists
        if (fs.existsSync(cookiesPath)) {
            console.log('[Instagram] Using cookies.txt for authentication');
            options.cookies = cookiesPath;
        } else {
            console.warn('[Instagram] cookies.txt not found - may fail for private content');
        }

        console.log('[Instagram] Downloading:', url);
        console.log('[Instagram] Post ID:', postId);

        const output = await youtubedl(url, options);

        if (!output) {
            return {
                status: false,
                code: 500,
                error: 'Gagal mengambil data media'
            };
        }

        // Handle carousel/sidecar (multiple items)
        const mediaUrls = [];

        if (output.url) {
            // Single media
            mediaUrls.push(output.url);
        }

        // Check for entries (carousel/album)
        if (output.entries && output.entries.length > 0) {
            output.entries.forEach(entry => {
                if (entry.url) {
                    mediaUrls.push(entry.url);
                }
            });
        }

        if (mediaUrls.length === 0) {
            return {
                status: false,
                code: 404,
                error: 'URL media tidak ditemukan'
            };
        }

        const title = output.title || output.description || 'Instagram Media';
        const isVideo = output._type === 'video' || output.ext === 'mp4';

        console.log('[Instagram] Success! Found', mediaUrls.length, 'media item(s)');

        return {
            status: true,
            code: 200,
            result: {
                url: mediaUrls,
                metadata: {
                    title: title,
                    caption: output.description || null,
                    username: output.uploader || output.channel || 'Unknown',
                    uploader_id: output.uploader_id || output.channel_id || null,
                    like_count: output.like_count || 0,
                    comment_count: output.comment_count || 0,
                    view_count: output.view_count || 0,
                    duration: output.duration || 0,
                    thumbnail: output.thumbnail || `https://www.instagram.com/p/${postId}/media/?size=l`,
                    isVideo: isVideo,
                    url: url,
                    id: postId,
                    timestamp: output.timestamp || null
                }
            }
        };
    } catch (error) {
        console.error('[Instagram] Download Error:', error.message);

        // Log deep details if available (yt-dlp stderr)
        if (error.stderr) {
            console.error('[Instagram] yt-dlp stderr:', error.stderr);
        }
        if (error.stdout) {
            console.error('[Instagram] yt-dlp stdout:', error.stdout);
        }

        // Check if yt-dlp is not installed
        if (error.message.includes('spawn') || error.message.includes('ENOENT')) {
            return {
                status: false,
                code: 500,
                error: 'yt-dlp tidak terinstall di server. Hubungi administrator.'
            };
        }

        // Check for login required
        if (error.message.includes('login') || error.message.includes('private') ||
            error.message.includes('Sign in to confirm your age') ||
            error.message.includes('This content isn\'t available') ||
            error.stderr?.includes('HTTP Error 401') ||
            error.stderr?.includes('HTTP Error 403')) {
            return {
                status: false,
                code: 403,
                error: 'Konten private atau cookies tidak valid/expired. Update cookies.txt dengan yang lebih fresh.'
            };
        }

        // Check for 429 Too Many Requests
        if (error.message.includes('429') || error.message.includes('Too Many Requests') ||
            error.stderr?.includes('HTTP Error 429')) {
            return {
                status: false,
                code: 429,
                error: 'Terlalu banyak request (Rate Limit). Tunggu 10-30 menit sebelum mencoba lagi.'
            };
        }

        // Check for 404 Not Found
        if (error.message.includes('404') || error.stderr?.includes('HTTP Error 404')) {
            return {
                status: false,
                code: 404,
                error: 'Konten tidak ditemukan. Pastikan URL valid dan konten belum dihapus.'
            };
        }

        return {
            status: false,
            code: 500,
            error: 'Gagal mendownload: ' + (error.message.split('\n')[0] || 'Unknown error')
        };
    }
}

module.exports = downloadInstagram;