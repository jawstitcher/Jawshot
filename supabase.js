// ============ SUPABASE CLIENT SETUP ============
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase (you'll need to replace these with your actual keys)
const supabaseUrl = 'https://xavbshdmppvqkkvtxhip.supabase.co';
const supabaseAnonKey = 'sb_publishable_Kd1OQQwgTcg7G2Tnt83Krw_LPp6YN1b';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============ DATABASE SCHEMA ============
/*
SQL Schema to run in Supabase:

-- Users table (extends Supabase auth.users)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    total_submissions INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_submission_date DATE
);

-- Submissions table
CREATE TABLE public.submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) NOT NULL,
    audio_url TEXT NOT NULL,
    beat_id TEXT NOT NULL,
    duration INTEGER NOT NULL,
    score INTEGER DEFAULT 0,
    play_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Votes table
CREATE TABLE public.votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID REFERENCES public.submissions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(submission_id, user_id)
);

-- Beats table (daily rotation)
CREATE TABLE public.beats (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    audio_url TEXT NOT NULL,
    bpm INTEGER NOT NULL,
    active_date DATE UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payments table
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) NOT NULL,
    stripe_payment_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public profiles are viewable by everyone" 
    ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" 
    ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Submissions are viewable by everyone" 
    ON public.submissions FOR SELECT USING (true);

CREATE POLICY "Users can insert own submissions" 
    ON public.submissions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view beats" 
    ON public.beats FOR SELECT USING (true);

CREATE POLICY "Users can vote on submissions" 
    ON public.votes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own votes" 
    ON public.votes FOR DELETE USING (auth.uid() = user_id);
*/

// ============ AUTH FUNCTIONS ============
export async function signUp(email, password, username) {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                username
            }
        }
    });

    if (error) throw error;

    // Create profile
    if (data.user) {
        await supabase.from('profiles').insert({
            id: data.user.id,
            username: username,
            avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
        });
    }

    return data;
}

export async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) throw error;
    return data;
}

export async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
}

export async function getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

export async function getProfile(userId) {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (error) throw error;
    return data;
}

// ============ SUBMISSION FUNCTIONS ============
export async function uploadAudio(file, userId) {
    const fileName = `${userId}_${Date.now()}.webm`;
    const { data, error } = await supabase.storage
        .from('submissions')
        .upload(fileName, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
        .from('submissions')
        .getPublicUrl(fileName);

    return publicUrl;
}

export async function createSubmission(userId, audioUrl, beatId, duration) {
    const { data, error } = await supabase
        .from('submissions')
        .insert({
            user_id: userId,
            audio_url: audioUrl,
            beat_id: beatId,
            duration: duration
        })
        .select()
        .single();

    if (error) throw error;

    // Update user stats
    await updateUserStats(userId);

    return data;
}

async function updateUserStats(userId) {
    const { data: profile } = await supabase
        .from('profiles')
        .select('last_submission_date, current_streak')
        .eq('id', userId)
        .single();

    const today = new Date().toISOString().split('T')[0];
    const lastSubmission = profile?.last_submission_date;

    let newStreak = 1;
    if (lastSubmission) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (lastSubmission === yesterdayStr) {
            newStreak = (profile.current_streak || 0) + 1;
        }
    }

    await supabase
        .from('profiles')
        .update({
            last_submission_date: today,
            current_streak: newStreak,
            total_submissions: supabase.raw('total_submissions + 1')
        })
        .eq('id', userId);
}

// ============ LEADERBOARD FUNCTIONS ============
export async function getLeaderboard(limit = 50) {
    const { data, error } = await supabase
        .from('submissions')
        .select(`
            *,
            profiles:user_id (username, avatar_url, current_streak)
        `)
        .order('score', { ascending: false })
        .limit(limit);

    if (error) throw error;
    return data;
}

export async function getTodayLeaderboard() {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
        .from('submissions')
        .select(`
            *,
            profiles:user_id (username, avatar_url, current_streak)
        `)
        .gte('created_at', today)
        .order('score', { ascending: false });

    if (error) throw error;
    return data;
}

// ============ VOTING FUNCTIONS ============
export async function voteSubmission(submissionId, userId) {
    // Check if already voted
    const { data: existingVote } = await supabase
        .from('votes')
        .select('id')
        .eq('submission_id', submissionId)
        .eq('user_id', userId)
        .single();

    if (existingVote) {
        // Remove vote
        await supabase
            .from('votes')
            .delete()
            .eq('id', existingVote.id);

        // Decrease score
        await supabase.rpc('decrement_score', { submission_id: submissionId });

        return false;
    } else {
        // Add vote
        await supabase
            .from('votes')
            .insert({ submission_id: submissionId, user_id: userId });

        // Increase score
        await supabase.rpc('increment_score', { submission_id: submissionId });

        return true;
    }
}

// ============ BEAT FUNCTIONS ============
export async function getTodayBeat() {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
        .from('beats')
        .select('*')
        .eq('active_date', today)
        .single();

    if (error) {
        // If no beat for today, get a random one
        const { data: randomBeat } = await supabase
            .from('beats')
            .select('*')
            .limit(1)
            .single();

        return randomBeat;
    }

    return data;
}

// ============ STATS FUNCTIONS ============
export async function getActiveUserCount() {
    // Count users who submitted in the last 24 hours
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const { count, error } = await supabase
        .from('submissions')
        .select('user_id', { count: 'exact', head: true })
        .gte('created_at', yesterday.toISOString());

    if (error) return 0;
    return count || 0;
}

// ============ POSTGRES FUNCTIONS (Run in Supabase SQL Editor) ============
/*
-- Function to increment submission score
CREATE OR REPLACE FUNCTION increment_score(submission_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE public.submissions
    SET score = score + 1
    WHERE id = submission_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrement submission score
CREATE OR REPLACE FUNCTION decrement_score(submission_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE public.submissions
    SET score = GREATEST(score - 1, 0)
    WHERE id = submission_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
*/
