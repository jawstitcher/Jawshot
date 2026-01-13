# 🦈 JAWSHOT - One Take. No Scraps.

> The most viral rap challenge app on the internet. Enter the tank, drop your verse, survive the jaws.

## 🎯 What is Jawshot?

Jawshot is a daily rap challenge app where users get ONE free shot per day to record a 60-second verse over a 444Hz beat. Want another shot? Pay $1. The best submissions rise to the top through community voting.

### Core Features

- ✅ **One Daily Free Shot** - Everyone gets one free recording per day
- 💰 **$1 Retries** - Want another chance? Pay $1 via Stripe
- 🎵 **444Hz Beats** - Daily rotating beats for fresh challenges
- 🏆 **Real Leaderboard** - Community voting determines who's king of the tank
- 🔥 **Streak Tracking** - Build your streak, earn respect
- 📱 **Social Sharing** - Share your takes to Twitter, TikTok, Instagram
- 🌊 **Premium UI** - Underwater shark tank aesthetic with glassmorphism

## 🚀 Quick Start (Testing Mode)

```bash
# Clone or navigate to the project
cd Jawshot-app

# Install dependencies
npm install

# Start a local server
npx http-server -p 3000

# Open in browser
open http://localhost:3000
```

The app will run in **mock mode** - payments and auth are simulated. Perfect for testing!

## 🏗️ Full Production Setup

### Prerequisites

- Node.js 18+
- Supabase account (free tier works)
- Stripe account (test mode is fine)
- Domain name (optional but recommended)

### 1. Supabase Setup

#### Create Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Wait for setup to complete (~2 minutes)
4. Copy your **Project URL** and **anon public key**

#### Run Database Schema
1. Go to SQL Editor
2. Copy the entire schema from `supabase.js` (search for "SQL Schema")
3. Run it
4. Verify tables are created in Table Editor

#### Setup Storage
1. Go to Storage
2. Create a new bucket called `submissions`
3. Make it **public**
4. Add this policy:
```sql
CREATE POLICY "Anyone can upload submissions"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'submissions');

CREATE POLICY "Submissions are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'submissions');
```

#### Add Postgres Functions
1. Go to SQL Editor
2. Run the functions at the bottom of `supabase.js`:
   - `increment_score`
   - `decrement_score`

### 2. Stripe Setup

#### Get API Keys
1. Go to [stripe.com/dashboard](https://dashboard.stripe.com)
2. Get your **Publishable key** (starts with `pk_`)
3. Get your **Secret key** (starts with `sk_`)
4. Use **test mode** keys for development

#### Update Configuration
Edit `config.js`:
```javascript
supabase: {
    url: 'https://your-project.supabase.co',
    anonKey: 'your-anon-key-here'
},
stripe: {
    publishableKey: 'pk_test_your_key_here'
}
```

### 3. Deploy Backend (Optional but Recommended)

The backend handles Stripe webhooks and payments. You can skip this for testing.

#### Create server.js
```javascript
const express = require('express');
const Stripe = require('stripe');
const cors = require('cors');
require('dotenv').config();

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const app = express();

app.use(cors());
app.use(express.json());

// Use the backend code from stripe.js
// Copy the Express routes from the comments

app.listen(process.env.PORT || 3000);
```

#### Deploy to Railway
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

Or use **Render**, **Heroku**, or **Vercel** for serverless functions.

### 4. Deploy Frontend

#### Netlify (Recommended)
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod
```

#### Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

#### Manual Deploy
1. Build your files (they're already static)
2. Upload to any web host
3. Done!

## 📁 Project Structure

```
Jawshot-app/
├── index.html          # Main HTML structure
├── style.css           # Premium UI styles
├── app.js              # Frontend logic (original)
├── supabase.js         # Supabase integration
├── stripe.js           # Payment integration
├── config.js           # Configuration
├── package.json        # Dependencies
├── .env.example        # Environment template
└── README.md          # This file
```

## 🎮 How It Works

### User Flow

1. **Landing** - User sees the shark tank UI
2. **Activate Mic** - Clicks button to record
3. **Record** - 60 seconds, audio visualizer shows waveforms
4. **Submit** - Audio uploads to Supabase storage
5. **Share** - User can share their take to social media
6. **Leaderboard** - Submission appears in real-time leaderboard
7. **Voting** - Others can upvote, plays, comment
8. **Retry** - Pay $1 to record again

### Tech Stack

**Frontend:**
- Vanilla JavaScript (ES6+)
- CSS3 (Glassmorphism, animations)
- Web Audio API (visualizer)
- MediaRecorder API (audio recording)

**Backend:**
- Supabase (Auth, Database, Storage, Real-time)
- PostgreSQL (via Supabase)
- Stripe (Payments)
- Express.js (Optional backend server)

## 🎨 Customization

### Change Colors
Edit `style.css`:
```css
:root {
    --naga-green: #00ff41;  /* Main accent color */
    --deep-ocean: #050a0f;   /* Background */
}
```

### Change Recording Limit
Edit `config.js`:
```javascript
app: {
    maxRecordingTime: 60, // Change to 30, 90, 120, etc.
}
```

### Add New Beats
1. Upload beat to Supabase storage
2. Add entry to `beats` table:
```sql
INSERT INTO beats (id, name, audio_url, bpm, active_date)
VALUES ('naga-bounce', '444Hz NAGA-BOUNCE', 'https://...', 140, '2026-01-13');
```

## 💰 Monetization Strategy

### Current Model
- **Free Daily Shot** - Acquisition
- **$1 Retries** - Direct revenue
- **High volume** - Viral growth = compound revenue

### Potential Expansion
- **Premium Tier** ($9.99/mo) - Unlimited retries, early beats, exclusive challenges
- **Custom Beats** - Upload your own beat ($4.99)
- **Sponsored Challenges** - Brands pay for featured beats
- **NFT Exports** - Mint top submissions ($19.99)

## 📊 Analytics & Metrics

Track these KPIs:
- **DAU (Daily Active Users)**
- **Retention Rate** (7-day, 30-day)
- **Conversion Rate** (free → paid retry)
- **ARPU** (Average Revenue Per User)
- **Viral Coefficient** (shares → signups)

Use Google Analytics, Mixpanel, or Amplitude.

## 🚀 Going Viral

### Launch Strategy

1. **Seed with Influencers**
   - Give 100 free retries to rappers/influencers
   - Have them post their takes with unique link codes

2. **TikTok Campaign**
   - Post 5-10 insane takes
   - Use trending sounds
   - "Only got one shot" hook

3. **Twitter Launch**
   - Tweet thread explaining concept
   - Share leaderboard updates
   - Engage with every submission

4. **Reddit/Discord**
   - Post in r/hiphopheads
   - Create Discord for community
   - Run weekly challenges

5. **PR Push**
   - ProductHunt launch
   - Music blogs (HotNewHipHop, Complex)
   - Pitch to tech blogs (TechCrunch, Verge)

### Content Ideas
- "POV: You only get one shot" 
- Leaderboard drama
- Streak flexing
- Fail compilations
- Beat previews

## 🐛 Troubleshooting

### Microphone Not Working
- Check browser permissions
- Use HTTPS (required for MediaRecorder)
- Try Chrome/Safari (best support)

### Supabase Connection Failed
- Verify URL and anon key in `config.js`
- Check CORS settings in Supabase dashboard
- Enable Row Level Security policies

### Stripe Payments Not Working
- Use test mode keys for development
- Check webhook endpoints
- Verify SSL certificate on backend

### Audio Not Uploading
- Check Supabase storage policies
- Verify bucket is public
- Check file size limits

## 📜 License

MIT - Build whatever you want with this!

## 🦈 Let's Make It Viral

Questions? Need help deploying? Want to collaborate?

**Built with 🔥 for the culture.**

---

*Current Status: MVP Complete ✅*  
*Next: Launch & Iterate 🚀*
