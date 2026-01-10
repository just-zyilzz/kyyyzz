/**
 * Utility functions untuk validasi dan deteksi platform
 */

function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

function isSupportedPlatform(url) {
    const lowerUrl = url.toLowerCase();
    return (
        lowerUrl.includes('youtube.com') ||
        lowerUrl.includes('youtu.be') ||
        lowerUrl.includes('tiktok.com') ||
        lowerUrl.includes('vt.tiktok.com') ||
        lowerUrl.includes('vm.tiktok.com') ||
        lowerUrl.includes('facebook.com') ||
        lowerUrl.includes('fb.watch') ||
        (lowerUrl.includes('instagram.com') && lowerUrl.includes('/reel/'))
    );
}

function detectPlatform(url) {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('youtube')) return 'YouTube';
    if (lowerUrl.includes('tiktok') || lowerUrl.includes('vt.tiktok') || lowerUrl.includes('vm.tiktok')) return 'TikTok';
    if (lowerUrl.includes('facebook') || lowerUrl.includes('fb.watch')) return 'Facebook';
    if (lowerUrl.includes('instagram') && lowerUrl.includes('/reel/')) return 'Instagram Reels';
    return null;
}

function getFormatArgs(url, format) {
    const lowerUrl = url.toLowerCase();

    // Instagram Reels
    if (lowerUrl.includes('instagram.com') && lowerUrl.includes('/reel/')) {
        return 'best[ext=mp4][height<=720]/best[ext=mp4]/best';
    }

    // TikTok
    if (lowerUrl.includes('tiktok.com') || lowerUrl.includes('vt.tiktok.com') || lowerUrl.includes('vm.tiktok.com')) {
        if (format === 'video') {
            return 'best[ext=mp4][height<=720]/best[ext=mp4]/best';
        } else if (format === 'audio') {
            return 'bestaudio/best';
        } else {
            return 'best[height<=720]/best';
        }
    }

    // Facebook
    if (lowerUrl.includes('facebook.com') || lowerUrl.includes('fb.watch')) {
        return 'best[ext=mp4][height<=720]/best[ext=mp4]/best';
    }

    // YouTube (default)
    if (format === 'video') {
        return 'mp4/bestvideo[height<=480]+bestaudio/best[height<=480]/best[height<=480]';
    } else if (format === 'audio') {
        return 'bestaudio/best';
    } else {
        return 'best[height<=480]';
    }
}

module.exports = {
    isValidUrl,
    isSupportedPlatform,
    detectPlatform,
    getFormatArgs
};
