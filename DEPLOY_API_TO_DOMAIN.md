# 🌐 Deploy API ke Domain Anda

Panduan deploy backend API ke subdomain Anda (contoh: `api.rlabs-studio.cloud`)

## Langkah-langkah:

### 1. Deploy API ke Railway/Render

**Railway (Disarankan):**
1. Sign up di https://railway.app
2. New Project → Deploy from GitHub
3. Set Environment Variables:
   ```
   PORT=8788
   CORS_ORIGIN=https://rlabs-studio.cloud
   GROQ_API_KEY=your_key
   DEEPSEEK_API_KEY=your_key
   OPENROUTER_API_KEY=your_key
   OPENROUTER_SITE_URL=https://rlabs-studio.cloud
   OPENROUTER_SITE_NAME=Nevra
   ```
4. Set Start Command: `node server/index.js`
5. Deploy → Dapatkan URL: `https://your-app.railway.app`

**Atau Render:**
1. Sign up di https://render.com
2. New → Web Service
3. Connect GitHub repo
4. Set Start Command: `node server/index.js`
5. Deploy → Dapatkan URL: `https://your-app.onrender.com`

---

### 2. Setup Subdomain di cPanel

**Buat Subdomain:**
1. Login ke cPanel
2. Domains → Subdomains
3. Buat subdomain: `api`
4. Document Root: `public_html/api` (atau biarkan default)
5. Klik Create

**Hasil:** Subdomain `api.rlabs-studio.cloud` akan dibuat

---

### 3. Point Subdomain ke Railway/Render

**Opsi A: CNAME Record (Paling Mudah) ⭐**

1. Di cPanel → Domains → Zone Editor (atau DNS Zone Editor)
2. Pilih domain: `rlabs-studio.cloud`
3. Add Record:
   - **Type**: `CNAME`
   - **Name**: `api`
   - **TTL**: `3600` (atau default)
   - **Record**: `your-app.railway.app` (atau `your-app.onrender.com`)
4. Save

**Opsi B: A Record (Jika Railway/Render berikan IP)**

1. Di cPanel → Zone Editor
2. Add Record:
   - **Type**: `A`
   - **Name**: `api`
   - **TTL**: `3600`
   - **Record**: `IP_ADDRESS_DARI_RAILWAY/RENDER`
3. Save

**Catatan:** 
- CNAME lebih mudah karena otomatis update jika IP berubah
- Tunggu 5-15 menit untuk DNS propagation

---

### 4. Setup Custom Domain di Railway (Opsional)

**Railway:**
1. Di Railway dashboard → Settings → Domains
2. Add Custom Domain: `api.rlabs-studio.cloud`
3. Railway akan berikan DNS records yang perlu ditambahkan
4. Tambahkan records tersebut di cPanel Zone Editor

**Render:**
1. Di Render dashboard → Settings → Custom Domain
2. Add: `api.rlabs-studio.cloud`
3. Render akan berikan DNS records
4. Tambahkan di cPanel

---

### 5. Test API

**Tunggu DNS propagation (5-15 menit), lalu test:**

```bash
# Health check
curl https://api.rlabs-studio.cloud/api/health

# Root
curl https://api.rlabs-studio.cloud/
```

**Harus return:**
- `/api/health` → `{ ok: true }`
- `/` → "Nevra API OK"

---

### 6. Update Frontend

**Set Environment Variable:**
```env
VITE_API_BASE_URL=https://api.rlabs-studio.cloud/api
```

**Rebuild Frontend:**
```bash
npm run build
```

**Upload ke cPanel:**
- Upload isi folder `dist/` ke `public_html/`
- Pastikan `.htaccess` ikut ter-upload

---

## Troubleshooting:

### DNS belum resolve
- Tunggu 15-30 menit untuk propagation
- Cek dengan: `nslookup api.rlabs-studio.cloud`
- Atau: `dig api.rlabs-studio.cloud`

### SSL/HTTPS Error
- Railway/Render otomatis provide SSL
- Jika pakai custom domain, pastikan DNS sudah benar
- Tunggu beberapa menit untuk SSL certificate generation

### CORS Error
- Pastikan `CORS_ORIGIN=https://rlabs-studio.cloud` sudah di-set
- Pastikan frontend menggunakan `https://api.rlabs-studio.cloud/api`

### API tidak bisa diakses
- Cek logs di Railway/Render dashboard
- Pastikan PORT sudah di-set
- Pastikan semua env vars sudah benar

---

## Ringkasan:

1. ✅ Deploy API ke Railway/Render → Dapatkan URL
2. ✅ Buat subdomain `api` di cPanel
3. ✅ Point subdomain ke Railway/Render (CNAME atau A record)
4. ✅ Tunggu DNS propagation
5. ✅ Test: `https://api.rlabs-studio.cloud/api/health`
6. ✅ Update frontend dengan URL baru
7. ✅ Rebuild & upload frontend ke cPanel

---

## Keuntungan Setup Ini:

✅ API terpisah dari frontend (lebih scalable)
✅ Domain custom untuk API (`api.rlabs-studio.cloud`)
✅ Auto SSL dari Railway/Render
✅ Mudah maintenance (update API tanpa affect frontend)
✅ Bisa pakai Railway/Render gratis tier untuk testing














