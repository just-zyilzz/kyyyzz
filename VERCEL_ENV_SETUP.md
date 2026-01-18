# Vercel Environment Variable Setup

## Problem
YouTube download failing on Vercel with HTTP 500 error.

## Root Cause
`CF_WORKER_URL` tidak di-set di Vercel environment variables, jadi proxy tidak aktif dan Vidssave API gagal.

## Solution

### Step 1: Set Environment Variable di Vercel

1. Buka Vercel Dashboard: https://vercel.com/zyilzzzs-projects/media-downloader
2. Go to **Settings** → **Environment Variables**
3. Add new variable:
   - **Name**: `CF_WORKER_URL`
   - **Value**: `https://super-cake-954b.enzilaja.workers.dev`
   - **Environments**: Check semua (Production, Preview, Development)
4. Click **Save**

### Step 2: Redeploy

Setelah environment variable di-set, Vercel perlu redeploy:

**Option A**: Redeploy otomatis
```bash
git commit --allow-empty -m "trigger redeploy"
git push
```

**Option B**: Manual redeploy di Vercel dashboard
- Go to **Deployments**
- Click **... menu** pada deployment terakhir
- Click **Redeploy**

### Step 3: Verify

Setelah redeploy selesai:
1. Test YouTube download di https://media-downloader-j0u0qgasc-zyilzzzs-projects.vercel.app
2. Check browser console untuk errors
3. Jika masih gagal, check Vercel logs

## Vercel Logs

Untuk lihat error details:
```bash
vercel logs <deployment-url>
```

Atau di dashboard:
- **Deployments** → Click deployment → **Functions** tab → Click function → **Logs**

## Alternative: Add Fallback

Jika Vidssave masih gagal meski sudah pakai proxy, kita bisa add ytdl-core fallback (sudah installed di package.json).

Let me know jika environment variable sudah di-set dan masih error!
