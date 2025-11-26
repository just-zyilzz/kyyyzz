# Media Downloader - Vercel Deployment Guide

Panduan lengkap untuk deploy media downloader ke Vercel dengan serverless architecture.

## 📋 Prerequisites

1. **Vercel Account:** Daftar di [vercel.com](https://vercel.com)
2. **Vercel CLI:** Install dengan `npm i -g vercel`
3. **Node.js:** Version 18+ recommended
4. **Python Binaries:** Download dan setup di folder `python/`

## 🔧 Setup Python Binaries

Sebelum deploy, download binaries untuk Linux (Vercel menggunakan Amazon Linux 2):

```bash
cd python

# yt-dlp Linux
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o yt-dlp
chmod +x yt-dlp

# FFmpeg Linux
curl -L https://github.com/eugeneware/ffmpeg-static/releases/download/b6.0/ffmpeg-linux-x64 -o ffmpeg
curl -L https://github.com/eugeneware/ffmpeg-static/releases/download/b6.0/ffprobe-linux-x64 -o ffprobe
chmod +x ffmpeg ffprobe

cd ..
```

**Windows (untuk testing lokal):**
- yt-dlp: https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe
- FFmpeg: https://www.gyan.dev/ffmpeg/builds/

Lihat `python/README.md` untuk detail lengkap.

## 📦 Install Dependencies

```bash
npm install
```

Dependencies baru yang ditambahkan:
- `jsonwebtoken` - untuk JWT authentication

## 🧪 Testing Lokal

### Option 1: Vercel Dev (Recommended)

```bash
vercel dev
```

Server akan jalan di `http://localhost:3000`

### Option 2: Node.js (fallback ke server.js lama)

```bash
node server.js
```

## 🚀 Deploy ke Vercel

### 1. Login ke Vercel

```bash
vercel login
```

### 2. Deploy (First Time)

```bash
vercel
```

Vercel akan tanya beberapa pertanyaan:
- Set up and deploy? **Y**
- Which scope? Pilih account Anda
- Link to existing project? **N**
- Project name? **media-downloader** (atau nama lain)
- In which directory? **.**
- Override settings? **N**

### 3. Deploy Production

```bash
vercel --prod
```

### 4. Setup Environment Variables

Di Vercel Dashboard:
1. Buka project → Settings → Environment Variables
2. Tambahkan:
   - `JWT_SECRET` = random string (minimal 32 karakter)

Generate random secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## ⚙️ Architecture Changes

### API Endpoints

**Old (server.js):**
- `POST /metadata` → Metadata
- `POST /download` → Download video/audio
- `POST /api/register` → Register
- `POST /api/login` → Login

**New (Serverless):**
- `POST /api/thumb` → Metadata & thumbnail
- `POST /api/ytmp4` → YouTube video download
- `POST /api/ytmp3` → YouTube audio (MP3)
- `POST /api/tiktok` → TikTok video/audio
- `POST /api/facebook` → Facebook video
- `POST /api/cleanup` → Delete file
- `POST /api/auth/register` → Register
- `POST /api/auth/login` → Login
- `POST /api/auth/logout` → Logout
- `GET /api/user` → Current user
- `GET /api/history` → Download history

### Authentication

**Old:** Express sessions (tidak work di serverless)  
**New:** JWT tokens via cookies + Authorization header

Frontend perlu update untuk:
1. Simpan token di cookie (otomatis via Set-Cookie header)
2. Atau simpan di localStorage dan kirim via Authorization header

### Database

**Current:** SQLite (file-based)  
**Issue:** SQLite tidak persistent di Vercel (reset tiap deployment)

**Solutions:**
1. **Vercel Postgres** (recommended untuk production)
2. **Planetscale** (MySQL-compatible)
3. **MongoDB Atlas** (NoSQL)
4. Keep SQLite untuk development only

## 🔄 Frontend Updates

Update file `public/script.js`:

```javascript
// OLD
fetch('/metadata', { ... })
fetch('/download', { ... })

// NEW
fetch('/api/thumb', { ... })

// Untuk download, pilih endpoint sesuai platform:
// YouTube video
fetch('/api/ytmp4', { 
  method: 'POST',
  body: JSON.stringify({ url, title, platform })
})

// YouTube audio
fetch('/api/ytmp3', { 
  method: 'POST',
  body: JSON.stringify({ url, title, platform })
})

// TikTok
fetch('/api/tiktok', { 
  method: 'POST',
  body: JSON.stringify({ url, format: 'video', title, platform })
})
```

## ⚠️ Known Limitations

### 1. Timeout
- **Hobby Plan:** 10 detik max
- **Pro Plan:** 60 detik max
- **Issue:** Large video downloads might timeout
- **Solution:** Use streaming atau background jobs

### 2. Ephemeral Storage
- Files di `/tmp` hilang setelah function selesai
- **Current:** Files disimpan di `/downloads`
- **Issue:** Files tidak persistent
- **Solution:** Stream langsung ke client atau upload ke Vercel Blob/S3

### 3. Database Reset
- SQLite file reset setiap deployment
- **Solution:** Migrasi ke Vercel Postgres atau external DB

### 4. Binary Size
- Limit: 250MB per deployment
- **Current:** ~100MB (yt-dlp + ffmpeg)
- Status: ✅ OK

## 📊 Monitoring

1. **Function Logs:** Vercel Dashboard → Deployments → Function Logs
2. **Error Tracking:** Auto-tracked di Vercel Dashboard
3. **Analytics:** Vercel Analytics (optional, paid)

## 🔍 Troubleshooting

### Error: "yt-dlp not found"
- Pastikan binary ada di `python/yt-dlp`
- Check permissions: `chmod +x python/yt-dlp`
- Vercel hanya gunakan Linux binary

### Error: "FFmpeg not found"
- Pastikan binary ada di `python/ffmpeg`
- Check permissions: `chmod +x python/ffmpeg`

### Error: "Function timeout"
- Video terlalu besar (>60 detik untuk download)
- Solusi: Gunakan platform lain (Railway, Render) atau implement queue system

### Database tidak persistent
- Normal untuk SQLite di Vercel
- Migrasi ke Vercel Postgres atau external DB

## 🎯 Alternative Platforms

Jika Vercel timeout atau terlalu limitasi:

1. **Railway** - Better untuk long-running processes
2. **Render** - Free tier dengan persistent storage
3. **Fly.io** - Persistent volumes support
4. **VPS** - Full control (DigitalOcean, Linode, etc.)

## 📚 Resources

- [Vercel Serverless Functions](https://vercel.com/docs/functions/serverless-functions)
- [Vercel CLI Reference](https://vercel.com/docs/cli)
- [yt-dlp Documentation](https://github.com/yt-dlp/yt-dlp)
- [FFmpeg Static Builds](https://github.com/eugeneware/ffmpeg-static)

## 💡 Tips

1. **Use `vercel dev` untuk testing** - Lebih akurat daripada `node server.js`
2. **Monitor function duration** - Track di Vercel Dashboard
3. **Compress binaries** - Gunakan UPX jika size jadi masalah
4. **Cache yt-dlp data** - Gunakan Vercel KV untuk caching metadata

## 🆘 Support

Jika ada masalah:
1. Check Vercel function logs
2. Test locally dengan `vercel dev`
3. Verify binaries ada dan executable
4. Check environment variables sudah di-set
