// ============ STRIPE PAYMENT INTEGRATION ============
import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe
const stripePromise = loadStripe('YOUR_STRIPE_PUBLISHABLE_KEY');

// ============ CHECKOUT SESSION ============
export async function createRetryCheckout(userId) {
    try {
        // In production, this would call your backend API
        // For now, we'll create a checkout session on the client

        const stripe = await stripePromise;

        // This should be done on your backend in production
        const response = await fetch('/api/create-checkout-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: userId,
                amount: 100, // $1.00 in cents
                productName: 'Jawshot Retry'
            }),
        });

        const session = await response.json();

        // Redirect to Stripe Checkout
        const result = await stripe.redirectToCheckout({
            sessionId: session.id,
        });

        if (result.error) {
            throw new Error(result.error.message);
        }

        return result;
    } catch (error) {
        console.error('Payment error:', error);
        throw error;
    }
}

// ============ PAYMENT SUCCESS HANDLER ============
export async function handlePaymentSuccess(sessionId, userId) {
    // Verify payment with your backend
    const response = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            sessionId,
            userId
        }),
    });

    const data = await response.json();

    if (data.success) {
        // Grant retry access
        sessionStorage.setItem('retryGranted', 'true');
        return true;
    }

    return false;
}

// ============ MOCK PAYMENT (FOR TESTING) ============
export async function mockPayment() {
    // Simulate payment processing
    return new Promise((resolve) => {
        setTimeout(() => {
            sessionStorage.setItem('retryGranted', 'true');
            resolve(true);
        }, 1500);
    });
}

export function checkRetryAccess() {
    return sessionStorage.getItem('retryGranted') === 'true';
}

export function consumeRetry() {
    sessionStorage.removeItem('retryGranted');
}

// ============ BACKEND API EXAMPLE (Node.js/Express) ============
/*
// This should be implemented on your backend server

const express = require('express');
const Stripe = require('stripe');
const stripe = Stripe('YOUR_STRIPE_SECRET_KEY');

const app = express();
app.use(express.json());

// Create checkout session
app.post('/api/create-checkout-session', async (req, res) => {
    const { userId, amount, productName } = req.body;
    
    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: productName,
                            description: 'Get another shot at the tank',
                        },
                        unit_amount: amount,
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${process.env.APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.APP_URL}/`,
            metadata: {
                userId: userId
            }
        });
        
        res.json({ id: session.id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Verify payment
app.post('/api/verify-payment', async (req, res) => {
    const { sessionId, userId } = req.body;
    
    try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        
        if (session.payment_status === 'paid' && session.metadata.userId === userId) {
            // Record payment in database
            // Grant retry access
            res.json({ success: true });
        } else {
            res.json({ success: false });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Webhook for Stripe events
app.post('/api/webhook', express.raw({type: 'application/json'}), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;
    
    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        
        // Record payment in Supabase
        await supabase.from('payments').insert({
            user_id: session.metadata.userId,
            stripe_payment_id: session.payment_intent,
            amount: session.amount_total,
            status: 'completed'
        });
    }
    
    res.json({received: true});
});

app.listen(3000, () => console.log('Server running on port 3000'));
*/
