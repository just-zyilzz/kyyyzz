# Setup Python Binaries untuk Vercel

Folder ini berisi bundled binaries untuk yt-dlp dan ffmpeg agar bisa jalan di Vercel tanpa perlu install.

## Download Binaries

### 1. yt-dlp
Download dari: https://github.com/yt-dlp/yt-dlp/releases

**Untuk Vercel (Linux x64):**
```bash
# Download yt-dlp Linux binary
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o python/yt-dlp
chmod +x python/yt-dlp
```

**Untuk Windows (testing lokal):**
```bash
# Download yt-dlp Windows binary
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe -o python/yt-dlp.exe
```

### 2. FFmpeg
Download dari: https://johnvansickle.com/ffmpeg/

**Untuk Vercel (Linux x64):**
```bash
# Download FFmpeg static build
curl -L https://github.com/eugeneware/ffmpeg-static/releases/download/b6.0/ffmpeg-linux-x64 -o python/ffmpeg
curl -L https://github.com/eugeneware/ffmpeg-static/releases/download/b6.0/ffprobe-linux-x64 -o python/ffprobe
chmod +x python/ffmpeg
chmod +x python/ffprobe
```

**Untuk Windows (testing lokal):**
- Download dari https://www.gyan.dev/ffmpeg/builds/
- Extract `ffmpeg.exe` dan `ffprobe.exe` ke folder `python/`

## Struktur Folder

```
python/
├── yt-dlp          # yt-dlp binary (Linux)
├── yt-dlp.exe      # yt-dlp binary (Windows)
├── ffmpeg          # ffmpeg binary (Linux)
├── ffmpeg.exe      # ffmpeg binary (Windows)
├── ffprobe         # ffprobe binary (Linux)
└── ffprobe.exe     # ffprobe binary (Windows)
```

## Auto-Detection

File `lib/ytdlp.js` sudah configured untuk:
1. Auto-detect OS (Windows vs Linux)
2. Gunakan bundled binaries jika ada
3. Fallback ke system-installed (`python -m yt_dlp` atau `ffmpeg`)

## One-Click Setup (PowerShell)

```powershell
# Download semua binaries
cd python

# yt-dlp Windows
Invoke-WebRequest -Uri "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe" -OutFile "yt-dlp.exe"

# yt-dlp Linux
Invoke-WebRequest -Uri "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp" -OutFile "yt-dlp"

# FFmpeg Windows (requires manual download and extraction)
Write-Host "Download FFmpeg for Windows from: https://www.gyan.dev/ffmpeg/builds/"
Write-Host "Extract ffmpeg.exe and ffprobe.exe to this folder"

cd ..
```

## Notes

- **Vercel deployment:** Hanya butuh Linux binaries
- **Local testing:** Gunakan Windows binaries atau system-installed
- Binary size: ~100MB total (Vercel limit adalah 250MB)
