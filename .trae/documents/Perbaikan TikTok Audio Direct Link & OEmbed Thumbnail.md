# Perbaikan TikTok Audio (Tanpa Proxy) dan Thumbnail (OEmbed Metadata)

## Analisis Masalah
1.  **Audio Error**: Penggunaan proxy internal untuk TikTok audio ternyata masih bermasalah (mungkin karena CDN TikTok yang sangat ketat terhadap request non-browser atau rotating IP). User meminta **menghapus proxy** dan menggunakan link langsung.
2.  **Thumbnail Blank**: Penggunaan placeholder SVG "No Thumbnail" tidak diinginkan. User ingin thumbnail asli muncul. Masalah sebelumnya (CORS/Blocked) terjadi karena kita mencoba me-load URL gambar TikTok langsung di browser atau lewat proxy yang gagal.

## Solusi: OEmbed Metadata
TikTok menyediakan endpoint **OEmbed** resmi yang bisa memberikan metadata video (termasuk thumbnail) yang valid dan biasanya lebih ramah CORS atau setidaknya URL-nya stabil.

## Rencana Implementasi

### 1. Modifikasi `src/pages/api/downloaders/_handler.js`
*   **Hapus Proxy Wrapper**: Menghapus fungsi helper `wrapThumbnail` yang membungkus URL thumbnail dengan `/api/utils/utility...`. Kita akan gunakan URL asli dari hasil scraper atau OEmbed.
*   **Hapus Proxy Audio**: Memastikan URL audio yang dikembalikan ke frontend adalah URL asli dari `tikwm` atau `tiktok`, tanpa dibungkus proxy.
*   **Integrasi OEmbed (Fallback)**: Jika scraper utama (`tiktokDownloaderVideo`) gagal mendapatkan thumbnail yang valid, kita akan melakukan request ke `https://www.tiktok.com/oembed?url=URL_VIDEO` untuk mendapatkan thumbnail cadangan yang pasti valid.

### 2. Modifikasi `src/lib/tiktok.js` (Opsional tapi disarankan)
*   Memastikan library scraper mengembalikan URL cover/thumbnail yang paling resolusi tinggi dan tidak expired jika memungkinkan.

### 3. Langkah Eksekusi
1.  Edit `src/pages/api/downloaders/_handler.js`:
    *   Hapus penggunaan `wrapThumbnail`.
    *   Hapus pembungkusan URL audio dengan proxy.
    *   Tambahkan logika fallback OEmbed untuk thumbnail jika `result.cover` kosong atau bermasalah.
2.  Verifikasi dengan URL yang diberikan user.

Dengan cara ini, kita mengandalkan browser user untuk mengakses link audio/thumbnail secara langsung (direct link), yang seringkali lebih sukses daripada server-side proxy untuk platform seperti TikTok yang memiliki proteksi bot canggih. OEmbed akan menjadi penyelamat untuk thumbnail yang valid.