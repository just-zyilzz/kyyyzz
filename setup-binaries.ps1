# Quick Setup Script untuk Download Binaries
# Jalankan dari root folder project

Write-Host "🚀 Media Downloader - Setup Python Binaries" -ForegroundColor Cyan
Write-Host ""

# Buat folder python jika belum ada
if (-not (Test-Path "python")) {
    New-Item -ItemType Directory -Path "python" | Out-Null
    Write-Host "✅ Created python/ folder" -ForegroundColor Green
}

cd python

Write-Host "📥 Downloading binaries..." -ForegroundColor Yellow
Write-Host ""

# Download yt-dlp Windows
Write-Host "⬇️  yt-dlp (Windows)..." -ForegroundColor White
try {
    Invoke-WebRequest -Uri "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe" -OutFile "yt-dlp.exe" -ErrorAction Stop
    Write-Host "   ✅ yt-dlp.exe downloaded" -ForegroundColor Green
}
catch {
    Write-Host "   ❌ Failed to download yt-dlp.exe" -ForegroundColor Red
}

# Download yt-dlp Linux (untuk Vercel)
Write-Host "⬇️  yt-dlp (Linux)..." -ForegroundColor White
try {
    Invoke-WebRequest -Uri "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp" -OutFile "yt-dlp" -ErrorAction Stop
    Write-Host "   ✅ yt-dlp (Linux) downloaded" -ForegroundColor Green
}
catch {
    Write-Host "   ❌ Failed to download yt-dlp (Linux)" -ForegroundColor Red
}

# Download FFmpeg Linux (ffmpeg)
Write-Host "⬇️  FFmpeg (Linux)..." -ForegroundColor White
try {
    Invoke-WebRequest -Uri "https://github.com/eugeneware/ffmpeg-static/releases/download/b6.0/ffmpeg-linux-x64" -OutFile "ffmpeg" -ErrorAction Stop
    Write-Host "   ✅ ffmpeg (Linux) downloaded" -ForegroundColor Green
}
catch {
    Write-Host "   ❌ Failed to download ffmpeg" -ForegroundColor Red
}

# Download FFprobe Linux
Write-Host "⬇️  FFprobe (Linux)..." -ForegroundColor White
try {
    Invoke-WebRequest -Uri "https://github.com/eugeneware/ffmpeg-static/releases/download/b6.0/ffprobe-linux-x64" -OutFile "ffprobe" -ErrorAction Stop
    Write-Host "   ✅ ffprobe (Linux) downloaded" -ForegroundColor Green
}
catch {
    Write-Host "   ❌ Failed to download ffprobe" -ForegroundColor Red
}

cd ..

Write-Host ""
Write-Host "📦 FFmpeg Windows binaries..." -ForegroundColor Yellow
Write-Host "   ⚠️  FFmpeg untuk Windows perlu download manual:" -ForegroundColor Yellow
Write-Host "   1. Download dari: https://www.gyan.dev/ffmpeg/builds/" -ForegroundColor White
Write-Host "   2. Extract ffmpeg.exe dan ffprobe.exe" -ForegroundColor White
Write-Host "   3. Copy ke folder python/" -ForegroundColor White

Write-Host ""
Write-Host "✅ Setup selesai!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Install dependencies: npm install" -ForegroundColor White
Write-Host "   2. Test locally: vercel dev" -ForegroundColor White
Write-Host "   3. Deploy: vercel --prod" -ForegroundColor White
Write-Host ""
Write-Host "📚 Baca VERCEL_DEPLOY.md untuk detail lengkap" -ForegroundColor Cyan
