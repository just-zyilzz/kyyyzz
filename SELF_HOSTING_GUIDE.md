# Panduan Lengkap: Self-Hosting di Laptop dengan Domain Sendiri (.xyz)

Panduan ini dibuat khusus untuk Anda yang ingin menjadikan laptop bekas sebagai server, menggunakan koneksi Wi-Fi rumah, dan menghubungkannya ke domain `.xyz` (atau lainnya) secara profesional menggunakan **Cloudflare Tunnel**.

**Keuntungan:**
*   ✅ **Gratis** (hanya modal beli domain).
*   ✅ **Aman** (tidak perlu buka port router / port forwarding).
*   ✅ **Stabil** (otomatis reconnect jika Wi-Fi putus nyambung).
*   ✅ **HTTPS Otomatis** (dapat gembok hijau).

---

## Tahap 1: Persiapan Laptop (Server)

Pastikan laptop Anda sudah terinstall software berikut. Jika belum, download dan install:

1.  **Node.js** (Wajib)
    *   Download: [nodejs.org](https://nodejs.org/) (Pilih versi LTS).
    *   Install seperti biasa.
2.  **Python** (Wajib untuk yt-dlp)
    *   Download: [python.org](https://www.python.org/downloads/).
    *   **PENTING**: Saat install, centang kotak **"Add Python to PATH"**.
3.  **FFmpeg** (Wajib untuk konversi audio)
    *   Download: [gyan.dev/ffmpeg/builds](https://www.gyan.dev/ffmpeg/builds/) (pilih `ffmpeg-git-full.7z`).
    *   Extract file tersebut.
    *   Copy folder `bin` (yang isinya `ffmpeg.exe`) ke `C:\ffmpeg\bin`.
    *   Buka **Edit the system environment variables** di Windows -> **Environment Variables** -> Pilih **Path** -> **Edit** -> **New** -> Masukkan `C:\ffmpeg\bin`.
4.  **Git** (Opsional, biar gampang update)
    *   Download: [git-scm.com](https://git-scm.com/).

---

## Tahap 2: Menjalankan Aplikasi

1.  Buka folder `media-downloader` Anda.
2.  Klik kanan di ruang kosong -> **Open in Terminal** (atau CMD).
3.  Install semua kebutuhan aplikasi:
    ```bash
    npm install
    ```
4.  Coba jalankan aplikasi:
    ```bash
    node server.js
    ```
5.  Buka browser di laptop, cek `http://localhost:3000`. Jika web terbuka, berarti **SUKSES**.
6.  Matikan dulu servernya (Ctrl + C) untuk lanjut ke tahap berikutnya.

---

## Tahap 3: Beli Domain & Hubungkan ke Cloudflare

1.  **Beli Domain**: Beli domain `.xyz` di Namecheap, Niagahoster, atau penyedia lain (biasanya murah, ~$2/tahun).
2.  **Daftar Cloudflare**: Buka [dash.cloudflare.com](https://dash.cloudflare.com/) dan buat akun (Gratis).
3.  **Tambahkan Site**:
    *   Klik **Add a Site**.
    *   Masukkan nama domain Anda (misal: `mediaku.xyz`).
    *   Pilih **Free Plan**.
4.  **Ganti Nameserver**:
    *   Cloudflare akan memberi 2 Nameserver (contoh: `bob.ns.cloudflare.com`).
    *   Buka panel tempat Anda beli domain (Namecheap/Niagahoster).
    *   Cari menu **Nameservers** atau **DNS Management**.
    *   Ganti nameserver lama dengan yang dari Cloudflare.
    *   Tunggu 15-30 menit sampai status di Cloudflare jadi **Active**.

---

## Tahap 4: Setting Cloudflare Tunnel (Penghubung Laptop ke Internet)

Ini adalah "jembatan ajaib" yang membuat laptop Anda bisa diakses dari internet tanpa setting router.

1.  Di Dashboard Cloudflare, buka menu **Zero Trust** (di sidebar kiri).
2.  Pilih **Networks** -> **Tunnels**.
3.  Klik **Create a Tunnel**.
    *   Pilih **Cloudflared**.
    *   Beri nama bebas (misal: `laptop-server`).
4.  **Install Connector di Laptop**:
    *   Pilih logo **Windows**.
    *   Copy perintah yang muncul di kotak hitam.
    *   Buka **PowerShell** di laptop (Run as Administrator).
    *   Paste perintah tadi dan Enter. Tunggu sampai selesai.
    *   Jika sukses, di dashboard Cloudflare akan muncul status **Connected**.
5.  **Hubungkan Domain**:
    *   Klik **Next** di dashboard Cloudflare.
    *   **Subdomain**: Kosongkan (atau isi `www` jika mau).
    *   **Domain**: Pilih domain `.xyz` Anda.
    *   **Service**:
        *   Type: `HTTP`
        *   URL: `localhost:3000`
    *   Klik **Save Tunnel**.

**SELESAI!** Sekarang coba buka domain Anda (misal `mediaku.xyz`) di HP pakai data seluler. Web di laptop Anda harusnya muncul! 🎉

---

## Tahap 5: Agar Server Jalan Terus (Auto-Start)

Supaya Anda tidak perlu membiarkan jendela CMD terbuka terus, dan agar aplikasi jalan otomatis pas laptop nyala:

1.  Install **PM2** (Process Manager):
    ```bash
    npm install -g pm2
    ```
2.  Jalankan aplikasi dengan PM2:
    ```bash
    pm2 start server.js --name "media-downloader"
    ```
3.  Simpan konfigurasi agar jalan saat restart:
    ```bash
    pm2 save
    npm install pm2-windows-startup -g
    pm2-startup install
    ```

Sekarang, setiap kali laptop Anda nyala dan connect Wi-Fi, website Anda otomatis online!

---

## Tips Perawatan Laptop Server

1.  **Power Options**: Setting laptop agar **tidak Sleep** saat layar ditutup (Lid closed).
    *   Control Panel -> Power Options -> Choose what closing the lid does -> "Do nothing".
2.  **Koneksi**: Pastikan laptop dekat dengan router Wi-Fi agar koneksi stabil saat orang mendownload.
