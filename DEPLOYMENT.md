# 🚀 CrazyTyper Deployment Guide

Deploy CrazyTyper with **Frontend on Vercel** + **Backend on Render**

## 📋 Quick Deployment Checklist

### 1️⃣ Prepare Backend for Render

```bash
cd backend/
npm install  # Test dependencies work
```

### 2️⃣ Deploy Backend on Render

1. **Push to GitHub**: Create a repo with your backend code
2. **Connect Render**: Go to [render.com](https://render.com) → New Web Service
3. **Connect Repo**: Link your GitHub repo
4. **Configure**:
   - **Name**: `crazytyper-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free (sufficient for this project)

5. **Environment Variables** (in Render dashboard):
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   NODE_ENV=production
   MAX_WORDS=20000
   ```

6. **Deploy**: Render will build and deploy automatically
7. **Get Backend URL**: Copy your Render URL (e.g., `https://crazytyper-backend-xyz.onrender.com`)

### 3️⃣ Update Frontend

Edit `script.js` line 4:
```javascript
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:3001' 
    : 'https://YOUR-RENDER-URL-HERE.onrender.com'; // <-- Put your Render URL here
```

### 4️⃣ Deploy Frontend on Vercel

```bash
# From the main CrazyTyper directory (not backend/)
npx vercel --prod
```

Follow the prompts:
- **Set up project**: Yes
- **Link to existing project**: No (create new)
- **Project name**: `crazytyper` (or whatever you want)
- **Directory**: `.` (current directory)

### 5️⃣ Update Backend CORS

In Render dashboard, add environment variable:
```
FRONTEND_URL=https://your-vercel-url.vercel.app
```

Then **redeploy** the backend.

## 🔧 Alternative: One-Command Deploy

### Quick Vercel Deploy
```bash
# Install Vercel CLI globally
npm i -g vercel

# Deploy frontend
cd /Users/pb/Documents/Dev/CrazyTyper
vercel --prod
```

### Backend Deploy Options

**Option A: Render (Recommended - Free)**
- Easy setup
- Free tier sufficient
- Auto-deploys from GitHub

**Option B: Railway**
```bash
npm i -g @railway/cli
railway login
railway deploy
```

**Option C: Heroku**
```bash
# Install Heroku CLI, then:
cd backend/
heroku create crazytyper-backend
git init
git add .
git commit -m "Initial deploy"
heroku git:remote -a crazytyper-backend
git push heroku main
```

## 🧪 Test Your Deployment

### 1. Test Backend
Visit: `https://your-backend-url.onrender.com/health`
Should return: `{"status":"OK",...}`

### 2. Test Frontend
1. Visit your Vercel URL
2. Try generating text
3. Try transforming text
4. Test custom font upload

### 3. Monitor
- **Render logs**: Check backend logs in Render dashboard
- **Vercel logs**: Check function logs in Vercel dashboard

## 🚨 Troubleshooting

### Common Issues

**"Failed to generate text"**
- Check backend logs in Render dashboard
- Verify OpenAI API key is correct
- Check CORS settings

**"Network Error" / CORS Issues**
- Make sure `FRONTEND_URL` in backend matches your Vercel URL exactly
- Redeploy backend after changing environment variables

**Backend Won't Start**
- Check build logs in Render
- Verify `package.json` has correct start script
- Check Node.js version compatibility

**Rate Limiting Issues**
- Adjust rate limits in `server.js`
- Or wait 15 minutes and try again

### Debug Commands

**Check Backend Health**
```bash
curl https://your-backend-url.onrender.com/health
```

**Test API Endpoint**
```bash
curl -X POST https://your-backend-url.onrender.com/api/generate-text \
  -H "Content-Type: application/json" \
  -d '{"prompt":"test","pageLength":"quarter","timeEra":"1950s"}'
```

## 💰 Cost Considerations

### Free Tiers
- **Render**: 750 hours/month free
- **Vercel**: Generous free tier for frontend
- **OpenAI**: Pay per use (GPT-3.5: ~$0.002/1K tokens)

### Scaling
- Backend handles 30 requests/15min per IP
- Adjust `MAX_WORDS` to control OpenAI costs
- Monitor usage in OpenAI dashboard

## 🔐 Security Checklist

- ✅ API key secured in backend environment
- ✅ CORS properly configured
- ✅ Rate limiting enabled
- ✅ Input validation active
- ✅ Security headers applied
- ✅ No API key in frontend code

## 🎯 Production URLs

After deployment, you'll have:
- **Frontend**: `https://crazytyper-abc.vercel.app`
- **Backend**: `https://crazytyper-backend-xyz.onrender.com`
- **Health Check**: `https://crazytyper-backend-xyz.onrender.com/health`

Ready to type like it's 1955! 🎉