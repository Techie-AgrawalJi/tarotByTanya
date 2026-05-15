# Deployment Guide: Vercel + Render

## Prerequisites
- GitHub account with your code pushed
- Vercel account (free, sign up with GitHub)
- Render account (free, sign up with GitHub)

---

## Step 1: Deploy Frontend to Vercel

### 1.1 Connect GitHub Repository
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Select your GitHub repository (`tarotByTanya`)
4. Click "Import"

### 1.2 Configure Project Settings
1. **Framework Preset**: Select "Vite"
2. **Root Directory**: Set to `artifacts/astrology-site`
3. **Build Command**: Already set to `npm run build` (from vercel.json)
4. **Output Directory**: Already set to `dist` (from vercel.json)

### 1.3 Set Environment Variables
In Vercel dashboard, go to Settings → Environment Variables and add:

```
VITE_API_BASE_URL = https://tarot-api.onrender.com
```

### 1.4 Deploy
Click "Deploy" and wait ~2-3 minutes. Your frontend will be live at `https://<project>.vercel.app`

---

## Step 2: Deploy Backend to Render

### 2.1 Connect GitHub Repository
1. Go to [render.com](https://render.com)
2. Click "New +"
3. Select "Web Service"
4. Connect your GitHub repository (`tarotByTanya`)

### 2.2 Configure Web Service
1. **Name**: `tarot-api`
2. **Environment**: `Node`
3. **Region**: `Oregon` (closest to you)
4. **Build Command**: `npm install && npm run build`
5. **Start Command**: `npm start`
6. **Plan**: Start with "Free" (upgrade to "Standard" $7/mo after testing)

### 2.3 Set Environment Variables
In Render dashboard, go to Environment and add all these:

```
NODE_ENV=production
PORT=10000
LOG_LEVEL=info
MONGODB_URI=<your-mongodb-connection-string>
MONGODB_DB_NAME=tarotByTanya
CLOUDINARY_CLOUD_NAME=<your-cloudinary-name>
CLOUDINARY_API_KEY=<your-cloudinary-api-key>
CLOUDINARY_API_SECRET=<your-cloudinary-api-secret>
```

**Where to find these:**
- `MONGODB_URI`: MongoDB Atlas cluster connection string
- `CLOUDINARY_*`: From your Cloudinary dashboard

### 2.4 Deploy
Click "Create Web Service". Render will auto-deploy. Once live, your API will be at `https://tarot-api.onrender.com`

---

## Step 3: Verify Deployment

### Test Frontend
1. Open your Vercel URL in browser
2. Navigate to Reviews section
3. Try submitting a review

### Test API
```bash
curl https://tarot-api.onrender.com/api/reviews
```

Should return your reviews list.

---

## Step 4: Update Frontend API URL (if needed)

If your Render API URL is different from `https://tarot-api.onrender.com`:

1. Update `artifacts/astrology-site/.env.production`:
```
VITE_API_BASE_URL=https://your-actual-render-url.onrender.com
```

2. Redeploy to Vercel (push changes to GitHub, Vercel auto-deploys)

---

## Costs & Upgrade Path

### Month 1-3 (Testing Phase)
- **Vercel**: Free tier (~$0)
- **Render**: Free tier (~$0)
- **Total**: $0

### Production (When Live)
- **Vercel**: Free tier works great for static sites
- **Render**: Upgrade to Standard plan ($7/month) to remove cold starts
- **MongoDB Atlas**: Free tier (512MB) or pay-as-you-go
- **Cloudinary**: Free tier (25 GB/month)
- **Total**: ~$7-15/month

---

## Troubleshooting

### "Cannot connect to API" Error
- Check Render API is deployed (should say "Live" in dashboard)
- Verify `VITE_API_BASE_URL` in Vercel environment variables
- Check CORS is enabled in API (it is: `app.use(cors())`)

### Render Cold Starts (Free Tier)
- First request takes 30-60 seconds
- Upgrade to Standard ($7/month) to eliminate
- Or add a monitoring service to ping every 5 minutes

### MongoDB Connection Failed
- Verify IP whitelist: MongoDB Atlas → Network Access → Allow 0.0.0.0/0
- Double-check connection string in environment variables

---

## Auto-Deployment Setup

Both Vercel and Render auto-deploy on push to GitHub:
1. Push code changes to `main` branch
2. Vercel + Render auto-detect and redeploy
3. No manual deploy needed!

---

## Next Steps

1. Create GitHub repository if you haven't
2. Push your code
3. Follow steps 1-4 above
4. Share your live URL! 🎉
