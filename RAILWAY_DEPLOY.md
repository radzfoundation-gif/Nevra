# 🚀 Deploy API ke Railway (Alternatif cPanel)

Railway adalah platform cloud yang sangat mudah untuk deploy Node.js apps.

## Langkah-langkah:

### 1. Buat Akun Railway
- Kunjungi: https://railway.app
- Sign up dengan GitHub (gratis)

### 2. Buat Project Baru
- Klik "New Project"
- Pilih "Deploy from GitHub repo"
- Pilih repository NEVRA Anda

### 3. Set Environment Variables
Di Railway dashboard, tambahkan env vars:
```
PORT=8788
CORS_ORIGIN=https://rlabs-studio.cloud
GROQ_API_KEY=your_groq_key
DEEPSEEK_API_KEY=your_deepseek_key
OPENROUTER_API_KEY=your_openrouter_key
OPENROUTER_SITE_URL=https://rlabs-studio.cloud
OPENROUTER_SITE_NAME=Nevra
```

### 4. Set Start Command
- Di Settings → Deploy, set:
  - **Start Command**: `node server/index.js`
  - **Root Directory**: (biarkan kosong atau set ke root)

### 5. Deploy
- Railway akan otomatis detect dan deploy
- Tunggu beberapa menit
- Dapatkan URL API (contoh: `https://your-app.railway.app`)

### 6. Update Frontend
- Set `VITE_API_BASE_URL=https://your-app.railway.app/api`
- Rebuild frontend: `npm run build`
- Upload ke cPanel

## Keuntungan Railway:
✅ Gratis untuk testing
✅ Auto-deploy dari Git
✅ Support ES modules dengan baik
✅ Auto HTTPS
✅ Logs mudah diakses
✅ No server management needed

## Alternatif Platform Lain:

### Render.com
1. Sign up di https://render.com
2. New → Web Service
3. Connect GitHub repo
4. Set:
   - Build Command: `npm install`
   - Start Command: `node server/index.js`
5. Add Environment Variables
6. Deploy

### Fly.io
1. Install flyctl: `curl -L https://fly.io/install.sh | sh`
2. Login: `fly auth login`
3. Deploy: `fly launch`
4. Set secrets: `fly secrets set KEY=value`














