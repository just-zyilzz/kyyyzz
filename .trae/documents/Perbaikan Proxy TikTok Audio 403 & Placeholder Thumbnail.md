# Perbaikan Proxy TikTok Audio (403 Forbidden) dan Thumbnail Blank

## Analisis Masalah
1.  **Audio Proxy Error (403)**: Server `tikwm.com` menolak request proxy kita. Kemungkinan besar karena header `Referer` yang saya tambahkan sebelumnya justru memicu proteksi hotlinking, atau karena proxy tidak meneruskan header `Range` yang dibutuhkan browser untuk memutar/download media berukuran besar.
2.  **Thumbnail Blank**: Fallback gambar transparan 1x1 piksel yang saya buat sebelumnya membuat thumbnail terlihat "ada tapi kosong". User menginginkan gambar apa saja yang penting muncul.

## Rencana Implementasi

### 1. Update `src/pages/api/utils/utility.js`
Saya akan memodifikasi logika proxy di file ini:
*   **Fitur Range Request**: Menambahkan dukungan untuk meneruskan header `Range` dari browser ke server target. Ini krusial untuk streaming audio/video agar tidak diputus koneksinya (yang bisa dianggap 403/error oleh client).
*   **Hapus Header Bermasalah**: Untuk link `tikwm.com`, saya akan mencoba menghapus header `Referer` karena seringkali CDN media justru memblokir jika ada Referer dari domain utama, atau sebaliknya. Saya akan membuatnya lebih mirip akses browser langsung.
*   **Placeholder Thumbnail**: Mengganti fallback "gambar transparan" menjadi **SVG Placeholder** yang bertuliskan "No Thumbnail". Ini akan memastikan UI tetap terlihat bagus dan tidak blank putih/kosong.

### 2. Langkah Teknis
*   Edit `src/pages/api/utils/utility.js`:
    *   Di blok `tiktok-proxy`: Tambahkan logika untuk menyalin header `range` dari request masuk ke `axios`.
    *   Di blok `tiktok-proxy`: Ubah strategi header `Referer` (coba hapus atau set ke null untuk `tikwm`).
    *   Di blok `thumbnail-proxy`: Ganti `transparentGif` dengan buffer SVG sederhana berwarna abu-abu dengan teks.

Dengan perubahan ini, download audio seharusnya berjalan lancar (karena mendukung partial content/resume) dan thumbnail akan selalu tampil (entah gambar asli atau placeholder yang jelas).