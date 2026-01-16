const axios = require('axios');

/**
 * Cobalt.tools Downloader
 * A reliable, no-BS downloader service that supports multiple platforms.
 */
async function cobalt(url, type = 'auto', quality = '720') {
    try {
        const headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Origin': 'https://cobalt.tools',
            'Referer': 'https://cobalt.tools/'
        };

        const payload = {
            url: url,
            vCodec: 'h264',
            vQuality: quality.replace('p', ''),
            aFormat: 'mp3',
            filenamePattern: 'classic',
            isAudioOnly: type === 'audio'
        };

        // Cobalt API instances (official and backups)
        const instances = [
            'https://api.cobalt.tools/api/json',
            'https://co.wuk.sh/api/json',
            'https://api.cobalt.tools' // fallback without /api/json for some versions
        ];

        let lastError;

        for (const instance of instances) {
            try {
                // Adjust endpoint based on instance format
                const endpoint = instance.endsWith('/json') ? instance : `${instance}/api/json`;
                
                console.log(`[Cobalt] Trying instance: ${endpoint}`);
                
                const response = await axios.post(endpoint, payload, { 
                    headers,
                    timeout: 15000 
                });

                const data = response.data;

                if (data.status === 'error') {
                    throw new Error(data.text || 'Unknown cobalt error');
                }

                if (data.url) {
                    return {
                        success: true,
                        downloadUrl: data.url,
                        filename: data.filename || `cobalt_${Date.now()}.${type === 'audio' ? 'mp3' : 'mp4'}`,
                        title: 'Cobalt Download',
                        thumbnail: null
                    };
                }
                
                if (data.picker) {
                    // If multiple items (playlist/picker), pick the first one
                    const firstItem = data.picker[0];
                    return {
                        success: true,
                        downloadUrl: firstItem.url,
                        filename: `${Date.now()}.${type === 'audio' ? 'mp3' : 'mp4'}`,
                        title: 'Cobalt Download',
                        thumbnail: firstItem.thumb
                    };
                }

            } catch (e) {
                console.log(`[Cobalt] Instance ${instance} failed: ${e.message}`);
                lastError = e;
                continue;
            }
        }

        throw lastError || new Error('All cobalt instances failed');

    } catch (error) {
        console.error('[Cobalt] Error:', error.message);
        throw new Error('Cobalt download failed: ' + error.message);
    }
}

module.exports = { cobalt };
