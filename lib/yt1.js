const axios = require('axios')

const videoquality = ['1080', '720', '480', '360', '240', '144']
const audiobitrate = ['128', '320']

async function search(q) {
  try {
    const r = await axios.get('https://yt-extractor.y2mp3.co/api/youtube/search?q=' + encodeURIComponent(q),
      {
        headers: {
          'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
          accept: 'application/json',
          origin: 'https://ytmp3.gg',
          referer: 'https://ytmp3.gg/'
        }
      }
    )
    const i = r.data.items.find(v => v.type === 'stream')
    if (!i) throw new Error('video tidak ditemukan')
    return {
      id: i.id,
      title: i.title,
      thumbnailUrl: i.thumbnail,
      uploaderName: i.uploaderName,
      duration: i.duration,
      viewCount: i.viewCount,
      uploadDate: i.uploadDate
    }
  } catch (e) {
    throw new Error('Gagal mencari video: ' + e.message)
  }
}

async function download(url, type, quality) {
  if (type === 'mp4' && !videoquality.includes(String(quality))) throw new Error('videoquality tidak valid')
  if (type === 'mp3' && !audiobitrate.includes(String(quality))) throw new Error('audiobitrate tidak valid')

  const payload =
    type === 'mp4'
      ? {
          url,
          downloadMode: 'video',
          brandName: 'ytmp3.gg',
          videoQuality: String(quality),
          youtubeVideoContainer: 'mp4'
        }
      : {
          url,
          downloadMode: 'audio',
          brandName: 'ytmp3.gg',
          audioFormat: 'mp3',
          audioBitrate: String(quality)
        }

  try {
    const r = await axios.post('https://hub.y2mp3.co', payload, {
      headers: {
        'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
        accept: 'application/json',
        'content-type': 'application/json',
        origin: 'https://ytmp3.gg',
        referer: 'https://ytmp3.gg/'
      }
    })

    if (!r.data?.url) throw new Error('download gagal - url tidak ditemukan')
    return r.data
  } catch (e) {
    throw new Error('Gagal download dari y2mp3: ' + e.message)
  }
}

async function ytdl(input, type, quality) {
  let info
  let url = input

  // If input is not a URL, search first
  if (!/^https?:\/\//i.test(input)) {
    console.log('[yt1] Searching for:', input);
    info = await search(input)
    url = `https://www.youtube.com/watch?v=${info.id}`
  } else {
    console.log('[yt1] Using direct URL:', input);
  }

  console.log('[yt1] Downloading:', { url, type, quality });
  
  try {
    const dl = await download(url, type, quality)

    // If we didn't search, we don't have metadata, try to search to get it
    if (!info) {
        try {
            info = await search(url);
        } catch (e) {
             info = { 
                title: dl.title || 'YouTube Video', 
                thumbnailUrl: dl.thumbnail || null, 
                uploaderName: null, 
                duration: null, 
                viewCount: null, 
                uploadDate: null 
            }
        }
    }

    return {
      title: info.title || dl.title || 'YouTube Video',
      thumbnail: info.thumbnailUrl || dl.thumbnail || null,
      uploader: info.uploaderName || null,
      duration: info.duration || null,
      viewCount: info.viewCount || null,
      uploadDate: info.uploadDate || null,
      type,
      quality: String(quality),
      url: dl.url,
      filename: dl.filename
    }
  } catch (e) {
    console.error('[yt1] Error:', e.message);
    throw e;
  }
}

module.exports = { ytdl, videoquality, audiobitrate }
