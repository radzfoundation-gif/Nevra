# Stripe Integration Guide

## Overview
NEVRA sekarang terintegrasi dengan Stripe untuk mengatur subscription premium. Sistem ini menggunakan Stripe Checkout untuk pembayaran dan Stripe Billing Portal untuk mengelola subscription.

## Environment Variables

Tambahkan variabel berikut ke file `.env` di root project:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_... # atau sk_test_... untuk testing
STRIPE_WEBHOOK_SECRET=whsec_... # Webhook secret dari Stripe Dashboard

# Supabase Configuration (untuk update subscription)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ... # Service role key (bukan anon key)

# Frontend URL (untuk redirect setelah checkout)
FRONTEND_URL=https://your-domain.com # atau http://localhost:5173 untuk development
```

## Setup Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Stripe Account
1. Buat akun di [Stripe Dashboard](https://dashboard.stripe.com)
2. Dapatkan API keys:
   - **Test Mode**: `sk_test_...` dan `pk_test_...`
   - **Live Mode**: `sk_live_...` dan `pk_live_...`
3. Copy Secret Key ke `STRIPE_SECRET_KEY` di `.env`

### 3. Setup Stripe Webhook
1. Di Stripe Dashboard, buka **Developers > Webhooks**
2. Klik **Add endpoint**
3. URL endpoint: `https://your-domain.com/api/payment/webhook`
4. Events to listen:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copy **Signing secret** ke `STRIPE_WEBHOOK_SECRET` di `.env`

### 4. Setup Supabase
1. Dapatkan **Service Role Key** dari Supabase Dashboard (Settings > API)
2. Copy ke `SUPABASE_SERVICE_ROLE_KEY` di `.env`
3. Pastikan tabel `user_preferences` sudah ada dengan kolom:
   - `user_id` (text)
   - `preferences` (jsonb)

## API Endpoints

### POST `/api/payment/checkout`
Membuat Stripe Checkout Session untuk subscription.

**Request:**
```json
{
  "plan": "premium",
  "currency": "USD",
  "amount": 3.00,
  "userId": "user_xxx"
}
```

**Response:**
```json
{
  "checkout_url": "https://checkout.stripe.com/...",
  "session_id": "cs_xxx"
}
```

### POST `/api/payment/webhook`
Webhook endpoint untuk handle Stripe events. **Tidak perlu dipanggil manual** - Stripe akan memanggil endpoint ini secara otomatis.

### GET `/api/payment/subscription?userId=xxx`
Mendapatkan status subscription user.

**Response:**
```json
{
  "subscription": "premium",
  "isActive": true,
  "subscribedAt": "2024-01-01T00:00:00Z"
}
```

### POST `/api/payment/portal`
Membuat session untuk Stripe Customer Portal (manage subscription, cancel, update payment method).

**Request:**
```json
{
  "userId": "user_xxx"
}
```

**Response:**
```json
{
  "url": "https://billing.stripe.com/..."
}
```

## Flow Subscription

1. **User klik "Get Premium"** di PricingPage
2. Frontend memanggil `/api/payment/checkout` dengan userId dari Clerk
3. Backend membuat Stripe Checkout Session
4. User di-redirect ke Stripe Checkout untuk pembayaran
5. Setelah pembayaran berhasil, Stripe mengirim webhook ke `/api/payment/webhook`
6. Backend update `user_preferences` di Supabase dengan status `premium`
7. User di-redirect kembali ke `/pricing?success=true`
8. Frontend refresh subscription status

## Testing

### Test Mode
1. Gunakan `sk_test_...` untuk `STRIPE_SECRET_KEY`
2. Gunakan test card dari [Stripe Testing](https://stripe.com/docs/testing):
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
3. Install Stripe CLI untuk test webhook lokal:
   ```bash
   stripe listen --forward-to localhost:8788/api/payment/webhook
   ```
4. Copy webhook signing secret yang ditampilkan ke `STRIPE_WEBHOOK_SECRET`

### Live Mode
1. Ganti ke `sk_live_...` untuk `STRIPE_SECRET_KEY`
2. Setup webhook di Stripe Dashboard dengan URL production
3. Pastikan `FRONTEND_URL` mengarah ke domain production

## Troubleshooting

### Webhook tidak terpanggil
- Pastikan `STRIPE_WEBHOOK_SECRET` sudah benar
- Pastikan endpoint webhook bisa diakses dari internet (gunakan ngrok untuk local testing)
- Check Stripe Dashboard > Webhooks untuk melihat log events

### Subscription tidak terupdate
- Check Supabase credentials (`SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY`)
- Pastikan tabel `user_preferences` ada dan bisa diakses
- Check server logs untuk error messages

### Checkout redirect tidak bekerja
- Pastikan `FRONTEND_URL` sudah benar
- Check CORS settings di server
- Pastikan user sudah sign in (userId harus ada)

## Security Notes

- **JANGAN** commit `.env` file ke git
- **JANGAN** expose `STRIPE_SECRET_KEY` atau `SUPABASE_SERVICE_ROLE_KEY` di frontend
- Gunakan Service Role Key hanya di backend
- Selalu verify webhook signature sebelum memproses events
- Gunakan HTTPS di production
