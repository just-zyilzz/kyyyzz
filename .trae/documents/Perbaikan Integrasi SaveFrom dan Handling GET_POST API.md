Saya akan melakukan perbaikan berikut sesuai instruksi Anda:

1. **Optimasi Penanganan GET & POST di** **`api/downloaders/download.js`**:

   * Mengubah logika pengambilan parameter (`url`, `quality`, `platform`) agar lebih fleksibel.

   * Saat ini kode membatasi: jika `POST` hanya baca `body`, jika `GET` hanya baca `query`.

   * Saya akan mengubahnya menjadi prioritas: Cek `body` dulu, jika tidak ada baru cek `query` (`req.body?.url || req.query?.url`). Ini akan memastikan API tetap berjalan meskipun frontend mengirim POST tapi parameter ada di URL, atau sebaliknya.

2. **Verifikasi Integrasi SaveFrom**:

   * Memastikan `savefrom` sudah terpasang dengan benar di fungsi `handleYouTube` (Video) dan `handleYouTubeAudio` (Audio) di `download.js` sebagai fallback prioritas ke-2.

3. **Perbaikan Lib SaveTube (`lib/savetube.js`)**:

   * Memperbaiki fungsi `request` agar pemeriksaan method (`post`/`get`) tidak case-sensitive (`toLowerCase()`), untuk mencegah error jika ada pemanggilan dengan "POST" (huruf besar).

Rencana Implementasi:

1. Edit `api/downloaders/download.js` untuk fleksibilitas parameter.
2. Edit `lib/savetube.js` untuk perbaikan case-sensitivity.
3. Verifikasi ulang file `lib/savefrom.js` yang sudah dibuat.

