// ============ CONFIGURATION ============
export const config = {
    // Supabase
    supabase: {
        url: 'YOUR_SUPABASE_URL',
        anonKey: 'YOUR_SUPABASE_ANON_KEY'
    },

    // Stripe
    stripe: {
        publishableKey: 'YOUR_STRIPE_PUBLISHABLE_KEY'
    },

    // App settings
    app: {
        maxRecordingTime: 60, // seconds
        retryPrice: 100, // cents ($1.00)
        dailyFreeShots: 1
    },

    // Feature flags
    features: {
        mockPayments: true, // Set to false in production
        mockAuth: false, // Set to false to use real Supabase auth
        realLeaderboard: false // Set to true when Supabase is configured
    }
};

// ============ SETUP INSTRUCTIONS ============
/*

🚀 JAWSHOT FULL-STACK SETUP GUIDE

## 1. Supabase Setup

1. Go to https://supabase.com and create a new project
2. Copy your project URL and anon key
3. Go to SQL Editor and run the schema from supabase.js
4. Go to Storage and create a bucket called "submissions" (make it public)
5. Update config.supabase with your credentials

## 2. Stripe Setup

1. Go to https://stripe.com and create an account
2. Get your publishable key from the dashboard
3. Update config.stripe.publishableKey
4. For production: Set up webhooks and backend API

## 3. Running the App

### Option A: Simple Local Server (for testing)
```bash
# Install a simple HTTP server
npm install -g http-server

# Run the app
http-server -p 3000
```

### Option B: Full Backend (for production)
```bash
# Install dependencies
npm install express stripe @supabase/supabase-js cors dotenv

# Create server.js with the backend code from stripe.js
# Run the server
node server.js
```

## 4. Deploy

### Frontend (Netlify/Vercel):
- Connect your GitHub repo
- Deploy with default settings

### Backend (Railway/Render):
- Deploy the Express server
- Set environment variables
- Configure Stripe webhooks

## 5. Testing Checklist

- [ ] User can sign up/login
- [ ] User can record audio
- [ ] Audio uploads to Supabase storage
- [ ] Submissions appear in leaderboard
- [ ] Users can vote on submissions
- [ ] Streak tracking works
- [ ] Payment flow works (test mode)
- [ ] Daily beat rotation
- [ ] Social sharing works

*/
