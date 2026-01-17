const axios = require('axios')

async function ytdl(url) {
  console.log('[yt2] Processing URL with SaveTube:', url);

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
      }
    }
  )

  // Check if data exists
  if (!res.data || !res.data.data) {
    throw new Error('Gagal mengambil data dari Vidssave')
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
}

module.exports = { ytdl }
