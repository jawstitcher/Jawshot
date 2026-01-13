// ============ IMPORTS (Uncomment when using modules) ============
// import { config } from './config.js';
// import { supabase, signIn, signUp, signOut, getCurrentUser, getProfile, uploadAudio, createSubmission, getLeaderboard, getTodayBeat, voteSubmission, getActiveUserCount } from './supabase.js';
// import { mockPayment, checkRetryAccess, consumeRetry } from './stripe.js';

// ============ STATE MANAGEMENT ============
let mediaRecorder;
let audioChunks = [];
let timerInterval;
let seconds = 0;
let audioContext;
let analyser;
let dataArray;
let animationId;
let currentUser = null;
let currentBeat = null;

// Feature flags (set in config.js)
const MOCK_MODE = true; // Set to false when Supabase is configured
const MOCK_PAYMENTS = true; // Set to false for real Stripe

// ============ INITIALIZATION ============
document.addEventListener('DOMContentLoaded', async () => {
    initParticles();
    initVisualizer();
    await initApp();

    // Set up event listeners
    document.getElementById('mainActionBtn').addEventListener('click', handleMainAction);
    document.getElementById('stopBtn').addEventListener('click', stopRecording);
    document.getElementById('viewLeaderboard').addEventListener('click', showLeaderboard);
    document.getElementById('closeLeaderboard').addEventListener('click', hideLeaderboard);
    document.getElementById('confirmPayment').addEventListener('click', handlePayment);
    document.getElementById('cancelPayment').addEventListener('click', hidePaymentModal);
    document.getElementById('closeShare').addEventListener('click', hideShareModal);

    // Share buttons
    document.getElementById('shareTwitter').addEventListener('click', () => shareToSocial('twitter'));
    document.getElementById('shareTikTok').addEventListener('click', () => shareToSocial('tiktok'));
    document.getElementById('shareInstagram').addEventListener('click', () => shareToSocial('instagram'));
});

async function initApp() {
    try {
        if (!MOCK_MODE) {
            // Real mode: Check authentication
            currentUser = await getCurrentUser();
            if (!currentUser) {
                showAuthModal();
                return;
            }

            // Load today's beat
            currentBeat = await getTodayBeat();
            if (currentBeat) {
                document.querySelector('.footer-info span').textContent =
                    `BEAT: ${currentBeat.name} (${currentBeat.bpm} BPM)`;
            }

            // Load real leaderboard
            await loadRealLeaderboard();

            // Update active count from database
            const count = await getActiveUserCount();
            document.getElementById('activeCount').textContent = count.toLocaleString();
        } else {
            // Mock mode: Use local data
            initLeaderboard();
            updateActiveCount();
        }
    } catch (error) {
        console.error('Init error:', error);
        // Fall back to mock mode
        initLeaderboard();
        updateActiveCount();
    }
}

// ============ FLOATING PARTICLES ============
function initParticles() {
    const container = document.createElement('div');
    container.id = 'particles-container';
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '0';
    document.body.prepend(container);

    const particleCount = 30;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';

        const size = Math.random() * 4 + 2;
        const startX = Math.random() * 100;
        const duration = Math.random() * 10 + 15;
        const delay = Math.random() * 5;

        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.left = `${startX}%`;
        particle.style.animationDuration = `${duration}s`;
        particle.style.animationDelay = `${delay}s`;

        container.appendChild(particle);
    }
}

// ============ AUDIO VISUALIZER ============
function initVisualizer() {
    const canvas = document.getElementById('visualizer');
    const ctx = canvas.getContext('2d');

    canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const displayWidth = canvas.offsetWidth;
    const displayHeight = canvas.offsetHeight;

    function drawIdleWave() {
        ctx.clearRect(0, 0, displayWidth, displayHeight);

        const time = Date.now() * 0.002;
        const bars = 50;
        const barWidth = displayWidth / bars;

        for (let i = 0; i < bars; i++) {
            const height = Math.sin(time + i * 0.5) * 30 + 40;
            const x = i * barWidth;
            const hue = 120 + Math.sin(time + i * 0.1) * 20;

            const gradient = ctx.createLinearGradient(x, displayHeight / 2 - height / 2, x, displayHeight / 2 + height / 2);
            gradient.addColorStop(0, `hsla(${hue}, 100%, 50%, 0.8)`);
            gradient.addColorStop(1, `hsla(${hue}, 100%, 50%, 0.2)`);

            ctx.fillStyle = gradient;
            ctx.fillRect(x, displayHeight / 2 - height / 2, barWidth - 2, height);
        }

        if (!mediaRecorder || mediaRecorder.state !== 'recording') {
            requestAnimationFrame(drawIdleWave);
        }
    }

    drawIdleWave();
}

function initRecordingVisualizer(stream) {
    const canvas = document.getElementById('recordingVisualizer');
    const ctx = canvas.getContext('2d');

    canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const displayWidth = canvas.offsetWidth;
    const displayHeight = canvas.offsetHeight;

    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);

    source.connect(analyser);
    analyser.fftSize = 256;

    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);

    function draw() {
        animationId = requestAnimationFrame(draw);

        analyser.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, displayWidth, displayHeight);

        const bars = 50;
        const barWidth = displayWidth / bars;

        for (let i = 0; i < bars; i++) {
            const dataIndex = Math.floor(i * bufferLength / bars);
            const height = (dataArray[dataIndex] / 255) * displayHeight * 0.8;
            const x = i * barWidth;

            const gradient = ctx.createLinearGradient(x, displayHeight - height, x, displayHeight);
            gradient.addColorStop(0, '#00ff41');
            gradient.addColorStop(1, 'rgba(0, 255, 65, 0.1)');

            ctx.fillStyle = gradient;
            ctx.fillRect(x, displayHeight - height, barWidth - 2, height);
        }
    }

    draw();
}

// ============ MAIN ACTION HANDLER ============
async function handleMainAction() {
    // Check if user has already used their free shot today
    const lastShot = localStorage.getItem('lastShotDate');
    const today = new Date().toDateString();

    const hasRetryAccess = MOCK_PAYMENTS ? false : checkRetryAccess();

    if (lastShot === today && !hasRetryAccess) {
        showPaymentModal();
    } else {
        await startRecording();
        if (hasRetryAccess) {
            consumeRetry();
        } else {
            localStorage.setItem('lastShotDate', today);
        }
    }
}

// ============ RECORDING LOGIC ============
async function startRecording() {
    try {
        // Hide entry state, show recording state
        document.getElementById('entry-state').classList.add('hidden');
        document.getElementById('recording-state').classList.remove('hidden');

        // Request microphone access
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // Initialize visualizer with actual audio
        initRecordingVisualizer(stream);

        // Set up MediaRecorder
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = event => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });

            // Stop all tracks
            stream.getTracks().forEach(track => track.stop());

            // Stop visualizer
            if (animationId) cancelAnimationFrame(animationId);
            if (audioContext) audioContext.close();

            // Upload to backend
            if (!MOCK_MODE && currentUser) {
                try {
                    // Upload audio to Supabase
                    const audioUrl = await uploadAudio(audioBlob, currentUser.id);

                    // Create submission record
                    await createSubmission(
                        currentUser.id,
                        audioUrl,
                        currentBeat?.id || 'naga-bounce',
                        seconds
                    );

                    console.log('Submission uploaded successfully!');
                } catch (error) {
                    console.error('Upload failed:', error);
                    alert('⚠️ Upload failed. Try again later.');
                }
            } else {
                // Mock mode: just log it
                const audioUrl = URL.createObjectURL(audioBlob);
                console.log('Mock submission:', audioUrl);
            }

            // Show share modal
            showShareModal();
        };

        // Start recording
        mediaRecorder.start();
        startTimer();

    } catch (error) {
        console.error('Microphone access denied:', error);
        alert('⚠️ Microphone access required to enter the tank!');
        resetToEntry();
    }
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        clearInterval(timerInterval);
        mediaRecorder.stop();
    }
}

function startTimer() {
    seconds = 0;
    timerInterval = setInterval(() => {
        seconds++;
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        document.getElementById('timer').innerText =
            `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

        // Auto-stop at 60 seconds
        if (seconds >= 60) {
            stopRecording();
        }
    }, 1000);
}

// ============ MODAL MANAGEMENT ============
function showPaymentModal() {
    document.getElementById('paymentModal').style.display = 'flex';
}

function hidePaymentModal() {
    document.getElementById('paymentModal').style.display = 'none';
}

async function handlePayment() {
    hidePaymentModal();

    // Show loading state
    const btn = document.getElementById('confirmPayment');
    const originalText = btn.textContent;
    btn.textContent = 'PROCESSING...';
    btn.disabled = true;

    try {
        if (MOCK_PAYMENTS) {
            // Mock payment
            await mockPayment();
            await startRecording();
        } else {
            // Real Stripe payment
            // This would redirect to Stripe Checkout
            // After successful payment, user is redirected back
            // and checkRetryAccess() will return true
            window.location.href = '/checkout'; // Implement this route
        }
    } catch (error) {
        console.error('Payment failed:', error);
        alert('Payment failed. Please try again.');
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }

    updateActiveCount();
}

function showLeaderboard() {
    document.getElementById('leaderboardModal').style.display = 'flex';
}

function hideLeaderboard() {
    document.getElementById('leaderboardModal').style.display = 'none';
}

function showShareModal() {
    document.getElementById('shareModal').style.display = 'flex';
}

function hideShareModal() {
    document.getElementById('shareModal').style.display = 'none';
    resetToEntry();
}

// ============ LEADERBOARD ============
function initLeaderboard() {
    const mockData = [
        { rank: 1, username: 'SHARK_KING', avatar: '👑', streak: 47, score: 9847 },
        { rank: 2, username: 'APEX_VERSE', avatar: '🦈', streak: 32, score: 8920 },
        { rank: 3, username: 'DEEP_FLOW', avatar: '🌊', streak: 28, score: 7654 },
        { rank: 4, username: 'NAGA_RAP', avatar: '🐍', streak: 19, score: 6543 },
        { rank: 5, username: 'BITE_BARS', avatar: '🦷', streak: 15, score: 5821 },
        { rank: 6, username: 'OCEAN_MC', avatar: '🌊', streak: 12, score: 4932 },
        { rank: 7, username: 'TANK_GOD', avatar: '⚡', streak: 9, score: 4201 },
        { rank: 8, username: 'WAVE_RIDER', avatar: '🏄', streak: 7, score: 3890 },
        { rank: 9, username: 'BASS_BEAST', avatar: '🔊', streak: 5, score: 3421 },
        { rank: 10, username: 'TIDE_TURNER', avatar: '🔄', streak: 3, score: 2987 }
    ];

    renderLeaderboard(mockData);
}

async function loadRealLeaderboard() {
    try {
        const submissions = await getLeaderboard(10);
        const formattedData = submissions.map((sub, index) => ({
            rank: index + 1,
            username: sub.profiles.username,
            avatar: sub.profiles.avatar_url || '🦈',
            streak: sub.profiles.current_streak,
            score: sub.score,
            submissionId: sub.id
        }));
        renderLeaderboard(formattedData);
    } catch (error) {
        console.error('Failed to load leaderboard:', error);
        initLeaderboard(); // Fall back to mock
    }
}

function renderLeaderboard(data) {
    const list = document.getElementById('leaderboardList');
    list.innerHTML = '';

    data.forEach(user => {
        const item = document.createElement('li');
        item.className = 'leaderboard-item';

        const avatarDisplay = user.avatar.startsWith('http')
            ? `<img src="${user.avatar}" alt="${user.username}" style="width:30px;height:30px;border-radius:50%;"/>`
            : user.avatar;

        item.innerHTML = `
            <div class="rank">#${user.rank}</div>
            <div class="user-info">
                <div class="username">${avatarDisplay} ${user.username}</div>
                <div class="user-stats">${user.streak} day streak</div>
            </div>
            <div class="score">${user.score.toLocaleString()}</div>
            <button class="play-btn" data-submission-id="${user.submissionId || ''}">▶️</button>
        `;

        // Add vote handler
        const playBtn = item.querySelector('.play-btn');
        playBtn.addEventListener('click', () => handleVote(user.submissionId, playBtn));

        list.appendChild(item);
    });
}

async function handleVote(submissionId, button) {
    if (MOCK_MODE || !currentUser || !submissionId) {
        // Mock vote
        button.textContent = button.textContent === '▶️' ? '✅' : '▶️';
        return;
    }

    try {
        const voted = await voteSubmission(submissionId, currentUser.id);
        button.textContent = voted ? '✅' : '▶️';
        // Reload leaderboard to show updated scores
        await loadRealLeaderboard();
    } catch (error) {
        console.error('Vote failed:', error);
    }
}

// ============ SOCIAL SHARING ============
function shareToSocial(platform) {
    const text = "Just dropped my verse in the JAWSHOT tank 🦈🎤 One take, no scraps. Think you can survive?";
    const url = "https://jawshot.app"; // Update when deployed
    const hashtags = "Jawshot,OneTake,Rap";

    let shareUrl;

    switch (platform) {
        case 'twitter':
            shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}&hashtags=${hashtags}`;
            break;
        case 'tiktok':
            navigator.clipboard.writeText(text + '\n' + url);
            alert('📋 Caption copied! Open TikTok and paste to share your take.');
            return;
        case 'instagram':
            navigator.clipboard.writeText(text + '\n' + url);
            alert('📋 Caption copied! Open Instagram and paste to share your take.');
            return;
    }

    if (shareUrl) {
        window.open(shareUrl, '_blank', 'width=600,height=400');
    }

    hideShareModal();
}

// ============ UTILITY FUNCTIONS ============
function resetToEntry() {
    seconds = 0;
    document.getElementById('timer').innerText = '00:00';
    document.getElementById('recording-state').classList.add('hidden');
    document.getElementById('entry-state').classList.remove('hidden');

    // Restart idle visualizer
    initVisualizer();
}

function updateActiveCount() {
    const baseCount = 4203;
    const variance = Math.floor(Math.random() * 100) - 50;
    const newCount = baseCount + variance;

    const countElement = document.getElementById('activeCount');
    countElement.style.transition = 'all 0.5s ease';
    countElement.innerText = newCount.toLocaleString();
}

// Update active count every 10 seconds
setInterval(() => {
    if (MOCK_MODE) {
        updateActiveCount();
    }
}, 10000);

// ============ KEYBOARD SHORTCUTS ============
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            stopRecording();
        } else if (!document.getElementById('entry-state').classList.contains('hidden')) {
            handleMainAction();
        }
    }

    if (e.code === 'Escape') {
        hidePaymentModal();
        hideLeaderboard();
        hideShareModal();
    }
});

// ============ AUTH HELPERS (Placeholder) ============
function showAuthModal() {
    // TODO: Implement sign-up/sign-in modal
    console.log('Auth required');
}

// Mock implementations for standalone use
function mockPayment() {
    return new Promise(resolve => setTimeout(resolve, 1500));
}

function checkRetryAccess() {
    return sessionStorage.getItem('retryGranted') === 'true';
}

function consumeRetry() {
    sessionStorage.removeItem('retryGranted');
}
