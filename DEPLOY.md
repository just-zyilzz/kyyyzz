# Panduan Deploy Media Downloader

Aplikasi ini membutuhkan **Node.js**, **Python** (untuk yt-dlp), dan **FFmpeg**. Cara termudah dan termurah untuk deploy adalah menggunakan **Render** (bisa gratis) atau **Railway**.

## Opsi 1: Render (Gratis / Murah)

Render memiliki "Free Tier" yang cukup untuk percobaan.

1.  **Push kode ke GitHub**: Pastikan kode ini ada di repository GitHub Anda.
2.  Daftar di [render.com](https://render.com).
3.  Klik **New +** -> **Web Service**.
4.  Hubungkan akun GitHub dan pilih repository ini.
5.  **PENTING**: Di bagian "Runtime", pilih **Docker**.
    *   Karena kita butuh Python dan FFmpeg, kita harus pakai Docker (file `Dockerfile` sudah saya buatkan).
6.  Pilih "Free" instance type.
7.  Klik **Create Web Service**.

### Domain (Render)
*   Render memberikan subdomain gratis (contoh: `myapp.onrender.com`).
*   Untuk pakai domain sendiri (misal `mediaku.com`):
    1.  Beli domain di **Namecheap**, **Niagahoster**, atau **Cloudflare**.
    2.  Di Dashboard Render, masuk ke tab **Settings** -> **Custom Domains**.
    3.  Masukkan nama domain Anda.
    4.  Ikuti instruksi untuk update DNS (biasanya menambah CNAME atau A record di tempat Anda beli domain).

## Opsi 2: VPS (DigitalOcean / Hetzner) - Lebih Murah untuk Trafik Tinggi

Jika ingin performa maksimal dengan harga tetap (~$4-5/bulan), sewa VPS Ubuntu.

1.  Sewa VPS (Droplet) di DigitalOcean atau Cloud VPS di Hetzner.
2.  Masuk via SSH.
3.  Install Docker:
    ```bash
    apt update
    apt install docker.io
    ```
4.  Jalankan container:
    ```bash
    docker build -t media-downloader .
    docker run -d -p 80:3000 --restart always media-downloader
    ```
5.  Gunakan **Nginx** untuk reverse proxy domain Anda ke port 3000.

## Catatan Penting
*   **Storage**: Di Render (Free Tier), file yang didownload ke folder `downloads/` akan hilang jika server restart. Ini bagus untuk privasi dan hemat storage.
*   **Database**: File `database/app.db` (SQLite) juga akan reset jika server restart di Render Free Tier. Jika butuh data user (login/history) permanen, Anda perlu upgrade ke "Disk" (berbayar) atau gunakan database eksternal (seperti PostgreSQL).
*   **Database**: File `database/app.db` (SQLite) juga akan reset jika server restart di Render Free Tier. Jika butuh data user (login/history) permanen, Anda perlu upgrade ke "Disk" (berbayar) atau gunakan database eksternal (seperti PostgreSQL).

## FAQ: Cloudflare / Vercel / Netlify

**T: Bisakah deploy ke Cloudflare Pages, Vercel, atau Netlify?**

**J: TIDAK BISA untuk Backend-nya.**

Alasannya:
1.  Aplikasi ini menggunakan **Python** (`yt-dlp`) dan **FFmpeg** (untuk konversi audio).
2.  Cloudflare Workers, Vercel, dan Netlify adalah lingkungan "Serverless" yang hanya mendukung Node.js/Go/Rust secara terbatas dan **tidak bisa menjalankan binary eksternal** seperti Python atau FFmpeg.
3.  Mereka juga tidak memiliki **filesystem** yang bisa ditulisi (folder `downloads/` tidak akan berfungsi).

**Solusi:**
Gunakan Cloudflare hanya sebagai **DNS & CDN** (pengelola domain). Arahkan domain Cloudflare Anda ke server **Render** atau **VPS** tempat aplikasi berjalan.
