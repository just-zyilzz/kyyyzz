# Perbaikan Proxy YouTube Audio & Video (403 Forbidden)

## Analisis Masalah
1.  **Status**: User ingin **KEDUA-DUANYA** (audio & video) menggunakan proxy. Saat ini keduanya masih error 403 Forbidden.
2.  **Penyebab 403**:
    *   YouTube CDN (`googlevideo.com`) sangat ketat memeriksa header.
    *   Header `Referer: https://www.youtube.com/` yang kita set sebelumnya seringkali malah memicu blokir 403 karena link tersebut adalah *direct resource* yang tidak seharusnya diakses dari "halaman YouTube" secara langsung oleh bot, atau token URL sudah terikat IP.
    *   Library `@distube/ytdl-core` yang kita pakai di server mungkin menghasilkan URL yang terikat dengan IP server kita, tapi saat di-proxy, header request kita mungkin tidak pas.

## Rencana Implementasi

### 1. Update `src/pages/api/downloaders/_handler.js`
*   Kembalikan logika `wrapUrl` untuk membungkus **SEMUA** tipe (audio & video) ke dalam proxy `/api/utils/utility`.

### 2. Update `src/pages/api/utils/utility.js` (CRITICAL FIX)
*   **Hapus Header Referer**: Sama seperti perbaikan TikTok tadi, menghapus `Referer` seringkali adalah kunci untuk mengakses *direct media link*.
*   **User-Agent**: Pastikan User-Agent konsisten dengan browser modern.
*   **Stream Handling**: Pastikan kita meneruskan stream dengan benar tanpa buffer penuh di memori.
*   **Cookie (Opsional)**: Jika diperlukan, kita mungkin perlu meneruskan cookie, tapi untuk link `googlevideo.com` yang sudah signed (ada parameter `sig` atau `lsig`), biasanya header `Referer` dan `Origin` yang bersih sudah cukup.

### 3. Langkah Teknis
1.  Edit `_handler.js`: Hapus pengecualian `if (type === 'audio')` di fungsi `wrapUrl`.
2.  Edit `utility.js`:
    *   Di bagian `yt-proxy`, **HAPUS** `headers['Referer'] = 'https://www.youtube.com/'`.
    *   Pastikan `Range` header diteruskan (sudah ada dari fix sebelumnya, tapi kita verifikasi).
    *   Set `Sec-Fetch-Dest: video` atau `audio` dan `Sec-Fetch-Mode: no-cors` jika perlu meniru browser, tapi biasanya `User-Agent` saja cukup.

Dengan menghapus Referer palsu, proxy server kita akan bertindak seperti browser baru yang membuka link tersebut secara langsung, yang seharusnya lolos validasi 403.