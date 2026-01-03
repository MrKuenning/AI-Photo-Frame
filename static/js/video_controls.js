// Custom Video Controls
// Replaces native video controls with custom styled controls that auto-hide
document.addEventListener('DOMContentLoaded', function () {

    // Initialize custom controls for all hero videos
    initCustomVideoControls();

    // Watch for dynamically added videos
    const observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            mutation.addedNodes.forEach(function (node) {
                if (node.nodeType === 1) {
                    if (node.tagName === 'VIDEO' && node.classList.contains('hero-image')) {
                        setupVideoControls(node);
                    }
                    const videos = node.querySelectorAll && node.querySelectorAll('video.hero-image');
                    if (videos) {
                        videos.forEach(video => setupVideoControls(video));
                    }
                }
            });
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    function initCustomVideoControls() {
        document.querySelectorAll('video.hero-image').forEach(video => {
            setupVideoControls(video);
        });
    }

    function setupVideoControls(video) {
        // Skip if already has custom controls
        if (video.dataset.customControls) return;
        video.dataset.customControls = 'true';

        // Remove native controls
        video.removeAttribute('controls');

        // Get or create the control wrapper
        const container = video.closest('.hero-view') || video.closest('.image-container') || video.parentElement;

        // Create controls overlay
        const controls = document.createElement('div');
        controls.className = 'custom-video-controls';
        controls.innerHTML = `
            <div class="video-controls-bar">
                <button class="video-btn video-play-btn" title="Play/Pause">
                    <i class="bi bi-play-fill"></i>
                </button>
                <button class="video-btn video-first-btn" title="First Frame">
                    <i class="bi bi-skip-start-fill"></i>
                </button>
                <button class="video-btn video-stepback-btn" title="Step Back">
                    <i class="bi bi-chevron-left"></i>
                </button>
                <div class="video-progress-container">
                    <div class="video-progress-bar">
                        <div class="video-progress-fill"></div>
                    </div>
                </div>
                <button class="video-btn video-stepfwd-btn" title="Step Forward">
                    <i class="bi bi-chevron-right"></i>
                </button>
                <button class="video-btn video-last-btn" title="Last Frame">
                    <i class="bi bi-skip-end-fill"></i>
                </button>
                <span class="video-time">0:00 / 0:00</span>
                <button class="video-btn video-mute-btn" title="Mute/Unmute">
                    <i class="bi bi-volume-up-fill"></i>
                </button>
            </div>
        `;

        container.style.position = 'relative';
        container.appendChild(controls);

        // Get control elements
        const playBtn = controls.querySelector('.video-play-btn');
        const firstBtn = controls.querySelector('.video-first-btn');
        const stepBackBtn = controls.querySelector('.video-stepback-btn');
        const stepFwdBtn = controls.querySelector('.video-stepfwd-btn');
        const lastBtn = controls.querySelector('.video-last-btn');
        const muteBtn = controls.querySelector('.video-mute-btn');
        const progressContainer = controls.querySelector('.video-progress-container');
        const progressFill = controls.querySelector('.video-progress-fill');
        const timeDisplay = controls.querySelector('.video-time');

        // Frame step amount (approximate - 1/30th of a second for 30fps video)
        const FRAME_STEP = 1 / 30;

        // First frame button
        firstBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            video.pause();
            video.currentTime = 0;
            showControls();
        });

        // Step back button (one frame)
        stepBackBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            video.pause();
            video.currentTime = Math.max(0, video.currentTime - FRAME_STEP);
            showControls();
        });

        // Step forward button (one frame)
        stepFwdBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            video.pause();
            video.currentTime = Math.min(video.duration, video.currentTime + FRAME_STEP);
            showControls();
        });

        // Last frame button
        lastBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            video.pause();
            // Go slightly before the end so the last frame is visible
            video.currentTime = Math.max(0, video.duration - 0.01);
            showControls();
        });

        // Auto-hide timer
        let hideTimeout;
        let isHovering = false;

        function showControls() {
            controls.classList.add('visible');
            clearTimeout(hideTimeout);
            if (!video.paused && !isHovering) {
                hideTimeout = setTimeout(() => {
                    controls.classList.remove('visible');
                }, 3000);
            }
        }

        function hideControls() {
            if (!video.paused) {
                controls.classList.remove('visible');
            }
        }

        // Show controls on interaction
        container.addEventListener('mousemove', () => {
            isHovering = true;
            showControls();
        });

        container.addEventListener('mouseleave', () => {
            isHovering = false;
            if (!video.paused) {
                hideTimeout = setTimeout(hideControls, 2000);
            }
        });

        container.addEventListener('touchstart', () => {
            showControls();
        });

        // Play/Pause
        playBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (video.paused) {
                video.play();
            } else {
                video.pause();
            }
        });

        // Also toggle play on video click (but not on controls)
        video.addEventListener('click', (e) => {
            // Don't interfere with expand functionality
            if (e.target.closest('.custom-video-controls')) return;
        });

        // Update play button icon
        video.addEventListener('play', () => {
            playBtn.querySelector('i').className = 'bi bi-pause-fill';
            showControls();
        });

        video.addEventListener('pause', () => {
            playBtn.querySelector('i').className = 'bi bi-play-fill';
            showControls();
            clearTimeout(hideTimeout); // Keep controls visible when paused
        });

        // Mute/Unmute
        muteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            video.muted = !video.muted;
            muteBtn.querySelector('i').className = video.muted ? 'bi bi-volume-mute-fill' : 'bi bi-volume-up-fill';
        });

        // Progress bar
        video.addEventListener('timeupdate', () => {
            if (video.duration) {
                const percent = (video.currentTime / video.duration) * 100;
                progressFill.style.width = percent + '%';
                timeDisplay.textContent = formatTime(video.currentTime) + ' / ' + formatTime(video.duration);
            }
        });

        video.addEventListener('loadedmetadata', () => {
            timeDisplay.textContent = '0:00 / ' + formatTime(video.duration);
        });

        // Seek on progress bar click
        progressContainer.addEventListener('click', (e) => {
            e.stopPropagation();
            const rect = progressContainer.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            video.currentTime = percent * video.duration;
        });

        // Initial state
        if (video.autoplay || !video.paused) {
            playBtn.querySelector('i').className = 'bi bi-pause-fill';
        }
        if (video.muted) {
            muteBtn.querySelector('i').className = 'bi bi-volume-mute-fill';
        }

        // Show controls initially, then auto-hide if playing
        showControls();

        console.log('[VIDEO CONTROLS] Set up custom controls for video');
    }

    function formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return mins + ':' + (secs < 10 ? '0' : '') + secs;
    }

    // Expose for dynamic content
    window.initCustomVideoControls = initCustomVideoControls;

    console.log('[VIDEO CONTROLS] Module initialized');
});
