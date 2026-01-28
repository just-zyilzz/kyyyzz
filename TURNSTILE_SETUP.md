# Cloudflare Turnstile Integration Guide

## Overview
Aplikasi media-downloader telah diintegrasikan dengan Cloudflare Turnstile untuk verifikasi keamanan sebelum download. Ini membantu mencegah akses bot dan memastikan bahwa pengguna adalah manusia.

## Konfigurasi

### 1. Daftar di Cloudflare
1. Kunjungi [Cloudflare Turnstile](https://www.cloudflare.com/products/turnstile/)
2. Daftar akun Cloudflare jika belum memiliki
3. Tambahkan situs Anda di dashboard Turnstile
4. Dapatkan **Site Key** dan **Secret Key**

### 2. Set Environment Variables
Tambahkan kunci ke environment variables:

```bash
# Untuk Vercel deployment
CLOUDFLARE_SITE_KEY=your_site_key_here
CLOUDFLARE_SECRET_KEY=your_secret_key_here

# Untuk local development, buat file .env
CLOUDFLARE_SITE_KEY=0x4AAAAAA...
CLOUDFLARE_SECRET_KEY=0x4AAAAAA...
```

### 3. Update Kunci di Kode

#### Frontend (public/script.js)
Kunci situs akan dimuat otomatis dari API `/api/turnstile-config`.

#### Backend (api/downloaders/download.js)
Kunci rahasia akan diambil dari environment variable:
```javascript
const secretKey = process.env.CLOUDFLARE_SECRET_KEY || 'YOUR_SECRET_KEY';
```

## Cara Kerja

### 1. Verifikasi Otomatis
- Saat pengguna mengklik tombol download, sistem akan memeriksa apakah sudah ada token verifikasi
- Jika belum, popup verifikasi akan muncul
- Setelah verifikasi berhasil, download akan dilanjutkan

### 2. Token Management
- Token disimpan di `turnstileToken` variable
- Token memiliki masa berlaku (biasanya 5 menit)
- Token akan diperbarui setiap kali verifikasi dilakukan

### 3. Error Handling
- Jika verifikasi gagal, pesan error akan ditampilkan
- Pengguna dapat mencoba verifikasi ulang
- Sistem akan memblokir download jika verifikasi gagal

## Testing

### Test Case 1: Verifikasi Berhasil
1. Masukkan URL YouTube
2. Klik tombol download
3. Selesaikan verifikasi Turnstile
4. Download harus berhasil

### Test Case 2: Verifikasi Gagal
1. Gunakan tools automation/bot
2. Coba download tanpa verifikasi
3. Sistem harus memblokir download

### Test Case 3: Token Expired
1. Tunggu hingga token kedaluwarsa (5 menit)
2. Coba download lagi
3. Sistem harus meminta verifikasi ulang

## Troubleshooting

### Widget Tidak Muncul
- Periksa koneksi internet
- Pastikan JavaScript diizinkan di browser
- Cek console untuk error messages

### Verifikasi Selalu Gagal
- Pastikan Site Key dan Secret Key benar
- Cek domain whitelist di dashboard Cloudflare
- Pastikan tidak menggunakan VPN/proxy

### Download Tetap Diblokir
- Cek network tab untuk response dari API
- Pastikan token dikirim dengan benar
- Verifikasi Secret Key di backend

## Security Best Practices

1. **Jangan commit kunci rahasia** ke repository
2. **Gunakan environment variables** untuk kunci
3. **Validasi token di backend** untuk setiap request
4. **Gunakan HTTPS** untuk semua komunikasi
5. **Monitor dashboard Cloudflare** untuk aktivitas mencurigakan

## Referensi

- [Cloudflare Turnstile Documentation](https://developers.cloudflare.com/turnstile/)
- [Turnstile API Reference](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/)
- [Best Practices](https://developers.cloudflare.com/turnstile/reference/)