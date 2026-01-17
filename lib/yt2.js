const axios = require('axios')

async function ytdl(url) {
  console.log('[yt2] Processing URL with SaveTube:', url);

  const maxRetries = 3;
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      if (i > 0) console.log(`[yt2] Retry ${i + 1}/${maxRetries}...`);
      
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
          timeout: 10000 // 10s timeout per request
        }
      )

      // Check if data exists
      if (!res.data || !res.data.data) {
        throw new Error('Gagal mengambil data dari Vidssave (Empty response)')
      }

      const { title, thumbnail, duration, resources } = res.data.data

      return {
        title,
        thumbnail,
        duration,
        formats: resources.map(r => ({
          type: r.type ? r.type.toLowerCase() : 'video',
          quality: r.quality ? String(r.quality).replace(/[a-zA-Z]/g, '') : '0',
          format: r.format ? r.format.toLowerCase() : 'mp4',
          size: r.size,
          url: r.download_url
        }))
      }

    } catch (e) {
      console.error(`[yt2] Attempt ${i + 1} failed:`, e.message);
      lastError = e;
      // Wait 1s before retry
      if (i < maxRetries - 1) await new Promise(r => setTimeout(r, 1000));
    }
  }

  throw new Error('Gagal mengambil data dari Vidssave: ' + (lastError?.message || 'Unknown error'));
}

module.exports = { ytdl }
