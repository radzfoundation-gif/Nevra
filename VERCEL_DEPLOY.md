# 🚀 Deploy NEVRA ke Vercel

Panduan lengkap untuk deploy aplikasi NEVRA ke Vercel.

## Prerequisites

✅ Akun Vercel (gratis di [vercel.com](https://vercel.com))
✅ Git repository (GitHub, GitLab, atau Bitbucket)
✅ Environment variables siap

---

## Langkah 1: Siapkan Environment Variables

Sebelum deploy, siapkan semua environment variables di Vercel Dashboard:

### Environment Variables yang Diperlukan:

```env
# Clerk Authentication
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...

# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_CLERK_SUPABASE_TEMPLATE=supabase

# Backend API Keys
OPENROUTER_API_KEY=sk-or-v1-...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Supabase Service (untuk backend)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Optional
CORS_ORIGIN=https://your-domain.vercel.app
OPENROUTER_SITE_URL=https://your-domain.vercel.app
OPENROUTER_SITE_NAME=NEVRA
```

---

## Langkah 2: Deploy via Vercel Dashboard

### Option A: Deploy via GitHub (Recommended)

1. **Push code ke GitHub:**
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

2. **Import Project di Vercel:**
   - Buka [vercel.com](https://vercel.com)
   - Klik "Add New..." → "Project"
   - Pilih repository GitHub Anda
   - Vercel akan auto-detect konfigurasi dari `vercel.json`

3. **Set Environment Variables:**
   - Di halaman project settings
   - Masuk ke "Environment Variables"
   - Tambahkan semua variables dari Langkah 1
   - Pastikan untuk set untuk semua environments (Production, Preview, Development)

4. **Deploy:**
   - Klik "Deploy"
   - Tunggu build selesai
   - Aplikasi akan live di `https://your-project.vercel.app`

### Option B: Deploy via Vercel CLI

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Login ke Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   # Deploy ke preview
   vercel

   # Deploy ke production
   vercel --prod
   ```

4. **Set Environment Variables:**
   ```bash
   vercel env add VITE_CLERK_PUBLISHABLE_KEY
   vercel env add OPENROUTER_API_KEY
   # ... dan seterusnya untuk semua variables
   ```

---

## Langkah 3: Konfigurasi Domain (Optional)

1. **Di Vercel Dashboard:**
   - Masuk ke project settings
   - Klik "Domains"
   - Tambahkan domain custom Anda
   - Ikuti instruksi untuk setup DNS

2. **Update Environment Variables:**
   - Update `CORS_ORIGIN` dengan domain baru
   - Update `OPENROUTER_SITE_URL` dengan domain baru

---

## Struktur Deployment

```
NEVRA/
├── dist/                    # Frontend build (Vite)
├── api/
│   └── index.js            # Backend serverless function
├── server/
│   └── index.js            # Express server (exported untuk Vercel)
├── vercel.json             # Vercel configuration
└── package.json
```

### Routing:

- **Frontend:** Semua routes (`/`, `/chat`, dll) → `dist/index.html` (SPA)
- **Backend API:** `/api/*` → `api/index.js` (serverless function)

---

## Troubleshooting

### Build Error

**Problem:** Build gagal dengan error module not found
**Solution:**
```bash
# Pastikan semua dependencies terinstall
npm install

# Test build lokal
npm run build
```

### API Routes Tidak Bekerja

**Problem:** `/api/*` routes return 404
**Solution:**
- Pastikan `api/index.js` ada dan export Express app dengan benar
- Check `vercel.json` rewrites configuration
- Pastikan environment variables sudah di-set

### Environment Variables Tidak Terbaca

**Problem:** Variables tidak ter-load di production
**Solution:**
- Pastikan variables di-set untuk "Production" environment
- Variables yang dimulai dengan `VITE_` harus di-set di Vercel
- Restart deployment setelah menambah variables

### CORS Error

**Problem:** CORS error saat akses API
**Solution:**
- Update `CORS_ORIGIN` di environment variables dengan domain Vercel
- Atau set `CORS_ORIGIN=true` untuk allow all origins (development only)

---

## Monitoring & Logs

1. **View Logs:**
   - Di Vercel Dashboard → Project → "Deployments"
   - Klik deployment → "Functions" tab
   - View real-time logs

2. **Analytics:**
   - Vercel Analytics (jika enabled)
   - Function execution time
   - Error rates

---

## Production Checklist

- [ ] Semua environment variables sudah di-set
- [ ] Domain custom sudah dikonfigurasi (jika ada)
- [ ] CORS origin sudah benar
- [ ] Stripe webhook URL sudah di-update
- [ ] Clerk redirect URLs sudah di-update
- [ ] Build berhasil tanpa error
- [ ] API routes berfungsi dengan benar
- [ ] Frontend routes berfungsi dengan benar (SPA routing)

---

## Support

Jika ada masalah, check:
- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Community](https://github.com/vercel/vercel/discussions)
- Project logs di Vercel Dashboard

---

*Last updated: $(date)*
