# Olympiad Quiz Kids 🦜⭐

Latihan soal olimpiade **asli** untuk anak **TK** dan **Kelas 1 SD**: Mathematics, English, dan Science.
Semua soal diambil langsung dari file soal yang diunggah, tanpa soal buatan AI dan tanpa soal dari internet.
Lihat `LAPORAN_BANK_SOAL.md` untuk rincian per paket.

## Pasang di GitHub Pages (gratis)

1. Buat akun di github.com, lalu klik **New repository**. Beri nama misalnya `olympiad-quiz-kids`, pilih **Public**, klik **Create repository**.
2. Klik **uploading an existing file**. Seret **isi** folder ini (bukan foldernya) ke halaman itu: `index.html`, `app.js`, `style.css`, `bank.json`, `manifest.webmanifest`, `sw.js`, folder `icons`, folder `q`, dan lainnya. Klik **Commit changes**.
   - Folder `q` berisi sekitar 1.200 gambar. Jika unggahan lewat browser gagal, unggah bertahap (misalnya 300 gambar sekali unggah) atau pakai GitHub Desktop.
3. Buka **Settings → Pages**. Di *Source* pilih **Deploy from a branch**, branch **main**, folder **/ (root)**, lalu **Save**.
4. Tunggu 1–2 menit. Alamatnya: `https://NAMA-AKUN.github.io/olympiad-quiz-kids/`.

## Pasang sebagai aplikasi di iPad / iPhone

1. Buka alamat di atas dengan **Safari**.
2. Ketuk **Bagikan** (kotak dengan panah ke atas) → **Tambah ke Layar Utama** → **Tambah**.
3. Buka dari ikon di Layar Utama: tampil layar penuh seperti aplikasi.

Di Android: buka di Chrome → menu ⋮ → **Instal aplikasi** / **Tambahkan ke layar utama**.

**Offline:** setelah dibuka sekali dengan internet, aplikasi bisa dipakai tanpa internet. Gambar soal disimpan saat pertama kali dilihat, jadi buka paket yang ingin dipakai offline satu kali dulu saat ada internet.

## Untuk orang tua / pengelola

Tombol **🔒 Orang tua** (dengan soal penjumlahan sebagai kunci) membuka halaman pengelola:
- **Ringkasan:** jumlah soal per olimpiade, jenjang, dan pelajaran.
- **Bank soal:** pratinjau setiap soal, sumber file dan halaman, status, serta tombol Setujui / Perlu cek / Keluarkan; ubah jenjang atau pelajaran.
- **Sumber & kunci:** file sumber setiap paket dan asal kunci jawabannya.
- **Tambah / impor:** tambah soal dari foto/tangkapan layar soal asli (tersimpan di perangkat), serta ekspor/impor hasil verifikasi.
- **Pengaturan:** sertakan atau sembunyikan paket kategori Kelas 1–2, bahasa soal IOB (ID/EN), hapus riwayat.

Data disimpan hanya di perangkat. Tidak ada akun, iklan, papan peringkat, atau pengiriman data.

## Memperbarui bank soal dari PDF baru

Folder `tools/` berisi alat pembuat bank soal (Python):
```
pip install pdfplumber pillow
# juga perlu poppler-utils (pdftotext, pdftoppm) dan tesseract untuk PDF hasil scan
python tools/extract.py        # memotong soal dari PDF ke folder q/ dan raw.json
python tools/keys.py           # membaca kunci jawaban dari file sumber
python tools/build_bank.py     # menyusun bank.json dengan status verifikasi
```
Tambahkan file baru di `tools/sources.json` (olimpiade, jenjang, pelajaran, path file), jalankan ketiga perintah, periksa hasilnya di halaman pengelola, lalu unggah ulang `bank.json` dan folder `q/`.
Setelah mengunggah versi baru, naikkan `VERSION` di `sw.js` (misalnya `oqk-v2`) agar perangkat mengambil versi terbaru.
