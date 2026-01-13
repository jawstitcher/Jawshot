# 🚀 JAWSHOT - Quick Start Guide

Get Jawshot running in **5 minutes** or less.

## Option 1: Test Locally (Fastest - No Setup Required)

```bash
# Start the app
npm run dev
```

That's it! The app will open at `http://localhost:3000` in **mock mode** with:
- ✅ Working UI and animations
- ✅ Audio recording
- ✅ Simulated payments
- ✅ Mock leaderboard
- ✅ Social sharing

Perfect for testing the concept!

## Option 2: Deploy to Production (Real Backend)

### Step 1: Set up Supabase (5 min)

1. Go to https://supabase.com and sign up
2. Click "New Project"
3. Name it "jawshot" and pick a password
4. Wait 2 minutes for setup
5. Copy your **Project URL** and **anon key** from Settings → API

### Step 2: Run Database Setup

1. In Supabase, go to **SQL Editor**
2. Copy the entire schema from `supabase.js` (lines 7-100)
3. Paste and click **Run**
4. Go to **Storage** → Create bucket → Name it `submissions` → Make it **Public**

### Step 3: Configure the App

Edit `config.js`:

```javascript
supabase: {
    url: 'https://YOUR-PROJECT.supabase.co',  // ← Paste your URL
    anonKey: 'YOUR-ANON-KEY'                   // ← Paste your key
},
features: {
    mockPayments: true,      // Keep true for testing
    mockAuth: false,         // Set to false to use real auth
    realLeaderboard: true    // Set to true for real data
}
```

Change `app.js` line 1:
```javascript
const MOCK_MODE = false;  // Change from true to false
```

### Step 4: Test It

```bash
npm run dev
```

Now you have:
- ✅ Real user authentication
- ✅ Audio uploads to cloud
- ✅ Live leaderboard
- ✅ Persistent data
- 🔜 Stripe payments (next step)

### Step 5: Add Payments (Optional)

1. Go to https://stripe.com/dashboard
2. Copy your **Publishable Key**
3. Add to `config.js`:

```javascript
stripe: {
    publishableKey: 'pk_test_YOUR_KEY'
}
```

4. Set `mockPayments: false` in config
5. You'll need a backend server for webhooks (see README.md)

## Option 3: Deploy Online

### Deploy to Netlify (Easiest)

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod
```

Follow the prompts and you're live!

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

## What's Next?

### Test the Flow
1. Click "ACTIVATE MIC" → Record a take
2. Check it appears in leaderboard
3. Try voting on submissions
4. Test social sharing
5. Attempt a retry (payment flow)

### Customize
- Change colors in `style.css`
- Add new beats to Supabase `beats` table
- Modify recording time in `config.js`

### Go Viral
- Share on Twitter/TikTok
- Get rappers to try it
- Post on Reddit (r/hiphopheads)
- Launch on ProductHunt

## Troubleshooting

### "Microphone not working"
- Use Chrome or Safari
- Allow mic permissions
- Must use `https://` or `localhost`

### "Supabase connection failed"
- Check URL and key in `config.js`
- Verify RLS policies are set
- Check browser console for errors

### "Can't deploy"
- Run `npm install` first
- Make sure you're logged into Netlify/Vercel
- Check you have a package.json

## Get Help

Stuck? Check:
- `README.md` - Full documentation
- `config.js` - All settings explained
- Browser console - Error messages

Ready to make Jawshot go viral? 🦈🔥
