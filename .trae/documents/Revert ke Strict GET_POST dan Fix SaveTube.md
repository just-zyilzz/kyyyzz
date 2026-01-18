Saya akan mengembalikan kode di `c:\Users\USER\Documents\media-downloader\api\downloaders\download.js` ke metode strict `GET` dan `POST` sesuai permintaan Anda, agar tidak "merembet" ke masalah lain.

Rencana perbaikan:
1.  **Revert Logic Parameter**: Mengembalikan pengecekan `req.method === 'POST'` untuk semua handler (`YouTube`, `TikTok`, `Instagram`, dll) seperti semula. Kode fleksibel `req.body?.url || req.query?.url` akan dihapus.
2.  **Perbaiki Bug SaveTube (Case Sensitive)**: Memperbaiki file `lib/savetube.js` agar method HTTP tidak case-sensitive, untuk mencegah error saat request menggunakan method "POST" (huruf besar).
3.  **Pastikan Integrasi SaveFrom Aman**: Memastikan fallback SaveFrom tetap ada di `handleYouTube` namun dengan logika parameter yang sudah dikembalikan ke strict mode.

Langkah ini akan memulihkan perilaku API sebelumnya sekaligus menjaga perbaikan SaveFrom yang Anda minta.