// ============ STATE MANAGEMENT ============
let mediaRecorder;
let audioChunks = [];
let timerInterval;
let seconds = 0;
let audioContext;
let analyser;
let dataArray;
let animationId;
let beatAudio = null;
let currentBeatUrl = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'; // Default beat

// ============ INITIALIZATION ============
document.addEventListener('DOMContentLoaded', () => {
    initParticles();
    initVisualizer();
    initLeaderboard();
    updateActiveCount();

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

// ============ FLOATING PARTICLES ============
function initParticles() {
    const container = document.getElementById('particles-container');
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

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Idle animation (before recording)
    function drawIdleWave() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const time = Date.now() * 0.002;
        const bars = 50;
        const barWidth = canvas.width / bars;

        for (let i = 0; i < bars; i++) {
            const height = Math.sin(time + i * 0.5) * 30 + 40;
            const x = i * barWidth;
            const hue = 120 + Math.sin(time + i * 0.1) * 20;

            const gradient = ctx.createLinearGradient(x, canvas.height / 2 - height / 2, x, canvas.height / 2 + height / 2);
            gradient.addColorStop(0, `hsla(${hue}, 100%, 50%, 0.8)`);
            gradient.addColorStop(1, `hsla(${hue}, 100%, 50%, 0.2)`);

            ctx.fillStyle = gradient;
            ctx.fillRect(x, canvas.height / 2 - height / 2, barWidth - 2, height);
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

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

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

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const bars = 50;
        const barWidth = canvas.width / bars;

        for (let i = 0; i < bars; i++) {
            const dataIndex = Math.floor(i * bufferLength / bars);
            const height = (dataArray[dataIndex] / 255) * canvas.height * 0.8;
            const x = i * barWidth;

            const gradient = ctx.createLinearGradient(x, canvas.height - height, x, canvas.height);
            gradient.addColorStop(0, '#00ff41');
            gradient.addColorStop(1, 'rgba(0, 255, 65, 0.1)');

            ctx.fillStyle = gradient;
            ctx.fillRect(x, canvas.height - height, barWidth - 2, height);
        }
    }

    draw();
}

// ============ MAIN ACTION HANDLER ============
function handleMainAction() {
    // Check if user has already used their free shot today
    const lastShot = localStorage.getItem('lastShotDate');
    const today = new Date().toDateString();

    if (lastShot === today) {
        showPaymentModal();
    } else {
        startRecording();
        localStorage.setItem('lastShotDate', today);
    }
}

// ============ RECORDING LOGIC ============
async function startRecording() {
    try {
        // Hide entry state, show recording state
        document.getElementById('entry-state').classList.add('hidden');
        document.getElementById('recording-state').classList.remove('hidden');

        // Create and play the beat
        beatAudio = new Audio(currentBeatUrl);
        beatAudio.volume = 0.6; // Slightly lower so vocals are clear
        beatAudio.loop = true;
        beatAudio.play();

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

        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            const audioUrl = URL.createObjectURL(audioBlob);

            // Stop all tracks
            stream.getTracks().forEach(track => track.stop());

            // Stop visualizer
            if (animationId) cancelAnimationFrame(animationId);
            if (audioContext) audioContext.close();

            // Stop the beat
            if (beatAudio) {
                beatAudio.pause();
                beatAudio.currentTime = 0;
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

function handlePayment() {
    // In production, this would process a real payment
    // For now, simulate successful payment and allow recording
    hidePaymentModal();
    startRecording();

    // Update stats (mock)
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
        { rank: 1, username: 'FIRE_SPITTER', avatar: '🔥', streak: 47, humanVotes: 2847, aiVotes: 123, winner: 'human' },
        { rank: 2, username: 'HEAT_WAVE', avatar: '🌊', streak: 32, humanVotes: 2120, aiVotes: 345, winner: 'human' },
        { rank: 3, username: 'BLAZE_MC', avatar: '⚡', streak: 28, humanVotes: 1654, aiVotes: 567, winner: 'human' },
        { rank: 4, username: 'FLAME_BARS', avatar: '💥', streak: 19, humanVotes: 1243, aiVotes: 889, winner: 'human' },
        { rank: 5, username: 'EMBER_GOD', avatar: '✨', streak: 15, humanVotes: 921, aiVotes: 1002, winner: 'ai' },
        { rank: 6, username: 'INFERNO_MC', avatar: '🎤', streak: 12, humanVotes: 732, aiVotes: 1234, winner: 'ai' },
        { rank: 7, username: 'BURN_UNIT', avatar: '🎵', streak: 9, humanVotes: 501, aiVotes: 1456, winner: 'ai' },
        { rank: 8, username: 'HEAT_SEEKER', avatar: '🎧', streak: 7, humanVotes: 390, aiVotes: 1678, winner: 'ai' },
        { rank: 9, username: 'WILD_FIRE', avatar: '🌟', streak: 5, humanVotes: 221, aiVotes: 1901, winner: 'ai' },
        { rank: 10, username: 'PHOENIX_BARS', avatar: '🦅', streak: 3, humanVotes: 87, aiVotes: 2234, winner: 'ai' }
    ];

    const list = document.getElementById('leaderboardList');
    list.innerHTML = '';


    mockData.forEach(user => {
        const item = document.createElement('li');
        item.className = 'leaderboard-item';

        const winnerBadge = user.winner === 'human' ? '👤 WON' : '🤖 AI WON';
        const winnerClass = user.winner === 'human' ? 'human-won' : 'ai-won';

        item.innerHTML = `
            <div class="rank">#${user.rank}</div>
            <div class="user-info">
                <div class="username">${user.avatar} ${user.username}</div>
                <div class="user-stats">${user.streak} day streak · <span class="${winnerClass}">${winnerBadge}</span></div>
            </div>
            <div class="vote-counts">
                <span class="human-count">👤 ${user.humanVotes}</span>
                <span class="ai-count">🤖 ${user.aiVotes}</span>
            </div>
            <div class="vote-buttons">
                <button class="vote-btn human-btn" data-submission-id="${user.rank}">👤 HUMAN</button>
                <button class="vote-btn ai-btn" data-submission-id="${user.rank}">🤖 AI</button>
            </div>
        `;

        // Add vote handlers
        const humanBtn = item.querySelector('.human-btn');
        const aiBtn = item.querySelector('.ai-btn');

        humanBtn.addEventListener('click', () => handleVote(user.rank, 'human', humanBtn));
        aiBtn.addEventListener('click', () => handleVote(user.rank, 'ai', aiBtn));

        list.appendChild(item);
    });
}

function handleVote(submissionId, voteType, button) {
    // Get the counts display
    const item = button.closest('.leaderboard-item');
    const humanCount = item.querySelector('.human-count');
    const aiCount = item.querySelector('.ai-count');

    // Parse current counts
    let human = parseInt(humanCount.textContent.replace(/[^\d]/g, ''));
    let ai = parseInt(aiCount.textContent.replace(/[^\d]/g, ''));

    // Check if user already voted
    const voteKey = `vote_${submissionId}`;
    const previousVote = localStorage.getItem(voteKey);

    if (previousVote === voteType) {
        // Undo vote
        if (voteType === 'human') {
            human--;
        } else {
            ai--;
        }
        localStorage.removeItem(voteKey);
        button.classList.remove('voted');
    } else {
        // Remove previous vote if exists
        if (previousVote) {
            if (previousVote === 'human') {
                human--;
                item.querySelector('.human-btn').classList.remove('voted');
            } else {
                ai--;
                item.querySelector('.ai-btn').classList.remove('voted');
            }
        }

        // Add new vote
        if (voteType === 'human') {
            human++;
        } else {
            ai++;
        }
        localStorage.setItem(voteKey, voteType);
        button.classList.add('voted');
    }

    // Update display with animation
    humanCount.textContent = `👤 ${human}`;
    aiCount.textContent = `🤖 ${ai}`;

    // Animate the count
    const targetCount = voteType === 'human' ? humanCount : aiCount;
    targetCount.style.transform = 'scale(1.3)';
    setTimeout(() => {
        targetCount.style.transform = 'scale(1)';
    }, 200);
}

// ============ SOCIAL SHARING ============
function shareToSocial(platform) {
    const text = "Just dropped my verse in the JAWSHOT tank 🦈🎤 One take, no scraps. Think you can survive?";
    const url = "https://jawshot.app"; // Update with real URL when deployed
    const hashtags = "Jawshot,OneTake,Rap";

    let shareUrl;

    switch (platform) {
        case 'twitter':
            shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}&hashtags=${hashtags}`;
            break;
        case 'tiktok':
            // TikTok doesn't have a direct share URL, so we'll copy to clipboard
            navigator.clipboard.writeText(text + '\n' + url);
            alert('📋 Caption copied! Open TikTok and paste to share your take.');
            return;
        case 'instagram':
            // Instagram doesn't have a direct share URL, so we'll copy to clipboard
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
    // Simulate dynamic user count
    const baseCount = 4203;
    const variance = Math.floor(Math.random() * 100) - 50;
    const newCount = baseCount + variance;

    const countElement = document.getElementById('activeCount');
    countElement.style.transition = 'all 0.5s ease';
    countElement.innerText = newCount.toLocaleString();
}

// Update active count every 10 seconds
setInterval(updateActiveCount, 10000);

// ============ KEYBOARD SHORTCUTS ============
document.addEventListener('keydown', (e) => {
    // Space bar to start/stop recording
    if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            stopRecording();
        } else if (!document.getElementById('entry-state').classList.contains('hidden')) {
            handleMainAction();
        }
    }

    // Escape to close modals
    if (e.code === 'Escape') {
        hidePaymentModal();
        hideLeaderboard();
        hideShareModal();
    }
});