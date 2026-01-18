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

function getProxyConfig() {
    // 1. Cek environment variable untuk proxy berbayar (tetap prioritas)
    const proxyUrl = process.env.PROXY_URL || process.env.HTTP_PROXY || process.env.HTTPS_PROXY;
    if (proxyUrl) {
        try {
            const url = new URL(proxyUrl);
            return {
                protocol: url.protocol.replace(':', ''),
                host: url.hostname,
                port: parseInt(url.port) || (url.protocol === 'https:' ? 443 : 80),
                auth: (url.username && url.password) ? {
                    username: url.username,
                    password: url.password
                } : undefined
            };
        } catch (e) {
            console.error('Invalid PROXY_URL:', e.message);
        }
    }

    // 2. Fallback: Proxy gratisan untuk bypass dasar (Cloudflare Workers/Free Proxy)
    // Hati-hati: Proxy gratisan sering mati/lambat. Gunakan dengan risiko sendiri.
    // Daftar ini hanya contoh, sebaiknya diupdate berkala.
    const freeProxies = [
        // Format: { host: 'ip', port: 8080, protocol: 'http' }
        // Anda bisa menambahkan daftar proxy gratis di sini jika mau
    ];

    if (freeProxies.length > 0) {
        const randomProxy = freeProxies[Math.floor(Math.random() * freeProxies.length)];
        console.log(`Using Free Proxy: ${randomProxy.host}:${randomProxy.port}`);
        return {
            host: randomProxy.host,
            port: randomProxy.port,
            protocol: randomProxy.protocol
        };
    }

    return undefined;
}

/**
 * Helper to prepare Axios request with Proxy or Cloudflare Worker
 */
function createRequestConfig(targetUrl, axiosOptions = {}) {
    // 1. Cloudflare Worker Strategy (Highest Priority)
    const cfWorker = process.env.CF_WORKER_URL;
    if (cfWorker) {
        const workerUrl = cfWorker.endsWith('/') ? cfWorker : cfWorker + '/';
        const finalUrl = `${workerUrl}?url=${encodeURIComponent(targetUrl)}`;
        
        // Remove host header if present to avoid conflicts
        const headers = { ...(axiosOptions.headers || {}) };
        delete headers['Host'];
        delete headers['host'];

        return {
            url: finalUrl,
            config: {
                ...axiosOptions,
                headers,
                proxy: false // Disable standard proxy
            }
        };
    }

    // 2. Standard HTTP/HTTPS Proxy Strategy
    return {
        url: targetUrl,
        config: {
            ...axiosOptions,
            proxy: getProxyConfig()
        }
    };
}

module.exports = {
    isValidUrl,
    isSupportedPlatform,
    detectPlatform,
    getFormatArgs,
    getProxyConfig,
    createRequestConfig
};
