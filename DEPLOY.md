# Panduan Deploy Media Downloader

Aplikasi ini membutuhkan **Node.js**, **Python** (untuk yt-dlp), dan **FFmpeg**.
Karena dependensi sistem ini, aplikasi **TIDAK BISA** dideploy ke Vercel/Netlify (Serverless) secara langsung.
Solusi terbaik dan termudah adalah menggunakan **Render (Docker)**.

## Cara Deploy ke Render (Gratis)

1.  **Push ke GitHub**: Pastikan kode ini sudah ada di repository GitHub Anda.
2.  Buka [dashboard.render.com](https://dashboard.render.com).
3.  Klik **New +** -> **Web Service**.
4.  Pilih **Build and deploy from a Git repository**.
5.  Hubungkan akun GitHub dan pilih repository ini.
6.  **PENTING**:
    *   **Runtime**: Pilih **Docker**.
    *   **Instance Type**: Pilih **Free**.
7.  Klik **Create Web Service**.

Render akan membaca file `Dockerfile` dan otomatis menginstall Node.js, Python, dan FFmpeg.

### Catatan (Free Tier)
*   **Cold Start**: Server akan "tidur" jika tidak diakses selama 15 menit. Akses pertama kali akan butuh waktu ~1 menit.
*   **Storage**: File yang didownload akan **hilang** jika server restart/tidur. Ini normal untuk layanan gratis.

## FAQ

**Q: Kenapa tidak bisa Vercel?**
A: Vercel didesain untuk Frontend/Serverless. Backend kita butuh `ffmpeg` (binary besar) dan `python` yang berjalan terus menerus (long-running process) untuk download video. Vercel akan mematikan proses setelah 10 detik (timeout), sehingga download pasti gagal.

**Q: Saya tetap ingin pakai domain sendiri?**
A: Bisa. Di Render, masuk ke **Settings -> Custom Domains**, lalu tambahkan domain Anda (misal `dl.namasaya.com`). Atur DNS sesuai instruksi Render.
