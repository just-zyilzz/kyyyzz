const axios = require('axios')
const crypto = require('crypto')

const anu = Buffer.from('C5D58EF67A7584E4A29F6C35BBC4EB12', 'hex')

function decrypt(enc){
  const b = Buffer.from(enc.replace(/\s/g, ''), 'base64')
  const iv = b.subarray(0, 16)
  const data = b.subarray(16)
  const d = crypto.createDecipheriv('aes-128-cbc', anu, iv)
  return JSON.parse(Buffer.concat([d.update(data), d.final()]).toString())
}

async function savetube(url){
  try{
    const cdn = await axios.get('https://media.savetube.me/api/random-cdn')

    const info = await axios.post(`https://${cdn.data.cdn}/v2/info`,
      { url },
      {
        headers:{
          'Content-Type':'application/json',
          origin:'https://ytsave.savetube.me',
          referer:'https://ytsave.savetube.me/',
          'User-Agent':'Mozilla/5.0'
        }
      }
    )

    if(!info.data?.status) return { status:false }

    const json = decrypt(info.data.data)

    async function download(type, quality){
      const r = await axios.post(`https://${cdn.data.cdn}/download`,
        {
          id: json.id,
          key: json.key,
          downloadType: type,
          quality: String(quality)
        },
        {
          headers:{
            'Content-Type':'application/json',
            'User-Agent':'Mozilla/5.0',
            origin:'https://ytsave.savetube.me',
            referer:'https://ytsave.savetube.me/'
          }
        }
      )
      return r.data?.data?.downloadUrl || null
    }

    const videos = []

    for(const v of json.video_formats){
      videos.push({
        quality: v.quality,
        label: v.label,
        url: await download('video', v.quality)
      })
    }

    for(const a of json.audio_formats){
      videos.push({
        quality: a.quality,
        label: a.label,
        url: await download('audio', a.quality)
      })
    }

    return {
      status: true,
      title: json.title,
      duration: json.duration,
      thumbnail: json.thumbnail,
      videos
    }

  }catch(e){
    return { status:'eror', msg: e.message }
  }
}

module.exports = savetube
