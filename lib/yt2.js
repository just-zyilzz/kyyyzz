const axios = require('axios')

async function ytdl(url) {
  console.log('[yt2] Processing URL with SaveTube:', url);

  const maxRetries = 2;
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      if (i > 0) {
        console.log(`[yt2] Retry ${i + 1}/${maxRetries}...`);
        await new Promise(r => setTimeout(r, 1000 * i)); // Progressive delay
      }
      
      const res = await axios.post('https://api.vidssave.com/api/contentsite_api/media/parse',
        new URLSearchParams({
          auth: '20250901majwlqo',
          domain: 'api-ak.vidssave.com',
          origin: 'cache',
          link: url
        }).toString(),
        {
          headers: {
            'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
            'content-type': 'application/x-www-form-urlencoded',
            origin: 'https://vidssave.com',
            referer: 'https://vidssave.com/'
          },
          timeout: 15000 // Increased to 15s
        }
      )

      // Enhanced validation
      if (!res || !res.data) {
        throw new Error('Empty response from Vidssave API')
      }

      if (!res.data.data) {
        console.error('[yt2] API Response:', JSON.stringify(res.data));
        throw new Error('Invalid API response structure')
      }

      const { title, thumbnail, duration, resources } = res.data.data

      if (!resources || !Array.isArray(resources) || resources.length === 0) {
        throw new Error('No download resources available')
      }

      return {
        title: title || 'YouTube Video',
        thumbnail: thumbnail || null,
        duration: duration || 0,
        formats: resources.map(r => ({
          type: r.type ? r.type.toLowerCase() : 'video',
          quality: r.quality ? String(r.quality).replace(/[a-zA-Z]/g, '') : '0',
          format: r.format ? r.format.toLowerCase() : 'mp4',
          size: r.size,
          url: r.download_url
        })).filter(f => f.url) // Only keep formats with valid URLs
      }

    } catch (e) {
      console.error(`[yt2] Attempt ${i + 1} failed:`, e.message);
      lastError = e;
      
      // Check if it's a timeout or network error
      if (e.code === 'ECONNABORTED' || e.code === 'ETIMEDOUT') {
        console.log('[yt2] Timeout detected, will retry...');
      }
    }
  }

  // All retries failed
  const errorMsg = lastError?.message || 'Unknown error';
  throw new Error(`Vidssave API gagal setelah ${maxRetries} percobaan: ${errorMsg}`);
}

module.exports = { ytdl }