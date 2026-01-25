// Image Zoom & Pan Module
// Supports: scroll wheel zoom, pinch-to-zoom, drag-to-pan, double-click/tap to toggle 100%
// Uses CSS transforms for smooth, continuous zoom levels

document.addEventListener('DOMContentLoaded', function () {
    // Zoom state for each container
    const zoomStates = new WeakMap();

    // Constants
    const ZOOM_SENSITIVITY = 0.002; // Scroll wheel sensitivity
    const MIN_ZOOM = 1; // 1 = fit-to-view
    const DOUBLE_TAP_DELAY = 300; // ms between taps for double-tap detection

    init();

    function init() {
        // Mouse events
        document.addEventListener('wheel', handleWheel, { passive: false });
        document.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('dblclick', handleDoubleClick);

        // Touch events
        document.addEventListener('touchstart', handleTouchStart, { passive: false });
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd, { passive: false });

        // Reset zoom on media navigation
        observeMediaChanges();

        console.log('[ZOOM] Module initialized');
    }

    // Get or create zoom state for a container
    function getZoomState(container) {
        if (!zoomStates.has(container)) {
            zoomStates.set(container, {
                zoom: 1,
                translateX: 0,
                translateY: 0,
                isPanning: false,
                startX: 0,
                startY: 0,
                startTranslateX: 0,
                startTranslateY: 0,
                // Touch-specific
                lastTouchTime: 0,
                lastTouchX: 0,
                lastTouchY: 0,
                initialPinchDistance: 0,
                initialPinchZoom: 1,
                pinchMidX: 0,
                pinchMidY: 0,
                initialTranslateX: 0,
                initialTranslateY: 0
            });
        }
        return zoomStates.get(container);
    }

    // Find the hero image and its container from an event target
    function findZoomTarget(target) {
        const heroImage = target.closest('.hero-image');
        if (!heroImage) return null;

        // Find the appropriate container
        let container = heroImage.closest('.hero-expanded');
        if (!container) container = heroImage.closest('.hero-view');
        if (!container) container = heroImage.closest('.large-preview-image-container');
        if (!container) container = heroImage.closest('.image-container');

        if (!container) return null;

        return { heroImage, container };
    }

    // Calculate the maximum zoom level (100% actual size)
    function getMaxZoom(heroImage, container) {
        let naturalWidth, naturalHeight;

        if (heroImage.tagName === 'VIDEO') {
            naturalWidth = heroImage.videoWidth || heroImage.offsetWidth;
            naturalHeight = heroImage.videoHeight || heroImage.offsetHeight;
        } else {
            naturalWidth = heroImage.naturalWidth || heroImage.offsetWidth;
            naturalHeight = heroImage.naturalHeight || heroImage.offsetHeight;
        }

        const containerRect = container.getBoundingClientRect();

        // Calculate fit-to-view scale
        const scaleX = containerRect.width / naturalWidth;
        const scaleY = containerRect.height / naturalHeight;
        const fitScale = Math.min(scaleX, scaleY, 1); // Don't scale up small images

        // Max zoom = 100% actual size relative to fit scale
        const maxZoom = 1 / fitScale;

        // Ensure max is at least 1 (for images smaller than container)
        return Math.max(maxZoom, 1);
    }

    // Enter zoom mode - add classes BEFORE any transforms
    function enterZoomMode(heroImage, container) {
        container.classList.add('zoom-active');
        heroImage.classList.add('zoomed');
    }

    // Exit zoom mode
    function exitZoomMode(heroImage, container) {
        container.classList.remove('zoom-active');
        heroImage.classList.remove('zoomed');
    }

    // Apply the current transform to the image - fast, no class changes
    function applyTransform(heroImage, state) {
        heroImage.style.transformOrigin = '0 0';
        heroImage.style.transform = `translate(${state.translateX}px, ${state.translateY}px) scale(${state.zoom})`;
    }

    // Constrain pan to keep image visible (call on end, not during drag for responsiveness)
    function constrainPan(state, heroImage, container) {
        const containerRect = container.getBoundingClientRect();
        const scaledWidth = heroImage.offsetWidth * state.zoom;
        const scaledHeight = heroImage.offsetHeight * state.zoom;

        // If image is smaller than container, center it
        if (scaledWidth <= containerRect.width) {
            state.translateX = (containerRect.width - scaledWidth) / 2;
        } else {
            const minX = containerRect.width - scaledWidth;
            const maxX = 0;
            state.translateX = Math.min(maxX, Math.max(minX, state.translateX));
        }

        if (scaledHeight <= containerRect.height) {
            state.translateY = (containerRect.height - scaledHeight) / 2;
        } else {
            const minY = containerRect.height - scaledHeight;
            const maxY = 0;
            state.translateY = Math.min(maxY, Math.max(minY, state.translateY));
        }
    }

    // Zoom at a specific point (cursor or pinch center)
    function zoomAtPoint(state, heroImage, container, newZoom, clientX, clientY) {
        const containerRect = container.getBoundingClientRect();
        const maxZoom = getMaxZoom(heroImage, container);

        // Clamp zoom level
        const clampedZoom = Math.min(Math.max(newZoom, MIN_ZOOM), maxZoom);

        if (Math.abs(clampedZoom - state.zoom) < 0.001) return;

        // Enter zoom mode BEFORE first transform
        if (state.zoom <= 1.01 && clampedZoom > 1.01) {
            enterZoomMode(heroImage, container);
        }

        // Calculate cursor position relative to container
        const cursorX = clientX - containerRect.left;
        const cursorY = clientY - containerRect.top;

        // Calculate the point on the image the cursor is over (in image coordinates)
        const imageX = (cursorX - state.translateX) / state.zoom;
        const imageY = (cursorY - state.translateY) / state.zoom;

        // Update zoom
        state.zoom = clampedZoom;

        // Adjust translation to keep the same image point under the cursor
        state.translateX = cursorX - imageX * clampedZoom;
        state.translateY = cursorY - imageY * clampedZoom;

        // Apply transform immediately
        applyTransform(heroImage, state);

        // Exit zoom mode if zoomed out
        if (clampedZoom <= 1.01) {
            exitZoomMode(heroImage, container);
        }
    }

    // Reset zoom to fit-to-view
    function resetZoom(heroImage, container) {
        const state = getZoomState(container);
        state.zoom = 1;
        state.translateX = 0;
        state.translateY = 0;
        state.isPanning = false;

        heroImage.style.transform = '';
        heroImage.style.transformOrigin = '';
        heroImage.style.cursor = 'zoom-in';

        exitZoomMode(heroImage, container);
    }

    // Toggle between fit-to-view and 100% actual size
    function toggleZoom(heroImage, container, clientX, clientY) {
        const state = getZoomState(container);
        const maxZoom = getMaxZoom(heroImage, container);

        if (state.zoom > 1.01) {
            // Currently zoomed - reset to fit
            resetZoom(heroImage, container);
        } else {
            // Currently fit - zoom to 100% centered on click point
            zoomAtPoint(state, heroImage, container, maxZoom, clientX, clientY);
            constrainPan(state, heroImage, container);
            applyTransform(heroImage, state);
        }
    }

    // === Mouse Event Handlers ===

    function handleWheel(e) {
        const target = findZoomTarget(e.target);
        if (!target) return;

        const { heroImage, container } = target;
        const state = getZoomState(container);

        // Prevent page scroll
        e.preventDefault();

        // Calculate new zoom level
        const delta = -e.deltaY * ZOOM_SENSITIVITY;
        const newZoom = state.zoom * (1 + delta);

        zoomAtPoint(state, heroImage, container, newZoom, e.clientX, e.clientY);
    }

    function handleMouseDown(e) {
        const target = findZoomTarget(e.target);
        if (!target) return;

        const { heroImage, container } = target;
        const state = getZoomState(container);

        // Only start panning if zoomed in
        if (state.zoom <= 1.01) return;

        // Only pan with left mouse button
        if (e.button !== 0) return;

        state.isPanning = true;
        state.startX = e.clientX;
        state.startY = e.clientY;
        state.startTranslateX = state.translateX;
        state.startTranslateY = state.translateY;

        heroImage.style.cursor = 'grabbing';
        e.preventDefault();
    }

    function handleMouseMove(e) {
        // Find any container that's being panned
        document.querySelectorAll('.zoom-active').forEach(container => {
            const state = getZoomState(container);
            if (!state.isPanning) return;

            const heroImage = container.querySelector('.hero-image');
            if (!heroImage) return;

            const deltaX = e.clientX - state.startX;
            const deltaY = e.clientY - state.startY;

            state.translateX = state.startTranslateX + deltaX;
            state.translateY = state.startTranslateY + deltaY;

            // Apply immediately without constraining (constrain on mouse up)
            applyTransform(heroImage, state);

            e.preventDefault();
        });
    }

    function handleMouseUp(e) {
        document.querySelectorAll('.zoom-active').forEach(container => {
            const state = getZoomState(container);
            if (state.isPanning) {
                state.isPanning = false;
                const heroImage = container.querySelector('.hero-image');
                if (heroImage) {
                    // Constrain after panning ends
                    constrainPan(state, heroImage, container);
                    applyTransform(heroImage, state);
                    heroImage.style.cursor = 'grab';
                }
            }
        });
    }

    function handleDoubleClick(e) {
        const target = findZoomTarget(e.target);
        if (!target) return;

        const { heroImage, container } = target;
        toggleZoom(heroImage, container, e.clientX, e.clientY);
    }

    // === Touch Event Handlers ===

    function handleTouchStart(e) {
        const target = findZoomTarget(e.target);
        if (!target) return;

        const { heroImage, container } = target;
        const state = getZoomState(container);

        if (e.touches.length === 1) {
            // Single touch - check for double-tap or start pan
            const now = Date.now();
            const touch = e.touches[0];

            // Check for double-tap
            if (now - state.lastTouchTime < DOUBLE_TAP_DELAY) {
                const dist = Math.hypot(
                    touch.clientX - state.lastTouchX,
                    touch.clientY - state.lastTouchY
                );
                if (dist < 30) {
                    // Double-tap detected
                    e.preventDefault();
                    toggleZoom(heroImage, container, touch.clientX, touch.clientY);
                    state.lastTouchTime = 0; // Reset to prevent triple-tap
                    return;
                }
            }

            state.lastTouchTime = now;
            state.lastTouchX = touch.clientX;
            state.lastTouchY = touch.clientY;

            // Start pan if zoomed
            if (state.zoom > 1.01) {
                state.isPanning = true;
                state.startX = touch.clientX;
                state.startY = touch.clientY;
                state.startTranslateX = state.translateX;
                state.startTranslateY = state.translateY;
                e.preventDefault();
            }
        } else if (e.touches.length === 2) {
            // Pinch start
            e.preventDefault();
            state.isPanning = false;

            const touch1 = e.touches[0];
            const touch2 = e.touches[1];

            state.initialPinchDistance = Math.hypot(
                touch2.clientX - touch1.clientX,
                touch2.clientY - touch1.clientY
            );
            state.initialPinchZoom = state.zoom;
            state.pinchMidX = (touch1.clientX + touch2.clientX) / 2;
            state.pinchMidY = (touch1.clientY + touch2.clientY) / 2;
            state.initialTranslateX = state.translateX;
            state.initialTranslateY = state.translateY;

            // Enter zoom mode immediately for pinch
            enterZoomMode(heroImage, container);
        }
    }

    function handleTouchMove(e) {
        const target = findZoomTarget(e.target);
        if (!target) return;

        const { heroImage, container } = target;
        const state = getZoomState(container);

        if (e.touches.length === 1 && state.isPanning) {
            // Single touch pan - apply immediately
            e.preventDefault();

            const touch = e.touches[0];
            state.translateX = state.startTranslateX + (touch.clientX - state.startX);
            state.translateY = state.startTranslateY + (touch.clientY - state.startY);

            applyTransform(heroImage, state);
        } else if (e.touches.length === 2 && state.initialPinchDistance > 0) {
            // Pinch zoom
            e.preventDefault();

            const touch1 = e.touches[0];
            const touch2 = e.touches[1];

            const currentDistance = Math.hypot(
                touch2.clientX - touch1.clientX,
                touch2.clientY - touch1.clientY
            );

            // Calculate new zoom
            const scale = currentDistance / state.initialPinchDistance;
            const newZoom = state.initialPinchZoom * scale;
            const maxZoom = getMaxZoom(heroImage, container);
            const clampedZoom = Math.min(Math.max(newZoom, MIN_ZOOM), maxZoom);

            // Current pinch center
            const midX = (touch1.clientX + touch2.clientX) / 2;
            const midY = (touch1.clientY + touch2.clientY) / 2;

            // Calculate transform - keep initial pinch point stable
            const containerRect = container.getBoundingClientRect();
            const initialMidXRel = state.pinchMidX - containerRect.left;
            const initialMidYRel = state.pinchMidY - containerRect.top;
            const currentMidXRel = midX - containerRect.left;
            const currentMidYRel = midY - containerRect.top;

            // Point in image space at initial pinch
            const imageX = (initialMidXRel - state.initialTranslateX) / state.initialPinchZoom;
            const imageY = (initialMidYRel - state.initialTranslateY) / state.initialPinchZoom;

            // New translation to keep that point at current pinch center
            state.translateX = currentMidXRel - imageX * clampedZoom;
            state.translateY = currentMidYRel - imageY * clampedZoom;
            state.zoom = clampedZoom;

            applyTransform(heroImage, state);
        }
    }

    function handleTouchEnd(e) {
        const target = findZoomTarget(e.target);
        if (!target) return;

        const { heroImage, container } = target;
        const state = getZoomState(container);

        if (e.touches.length === 0) {
            // All fingers lifted - constrain pan and cleanup
            if (state.isPanning || state.initialPinchDistance > 0) {
                constrainPan(state, heroImage, container);
                applyTransform(heroImage, state);
            }

            state.isPanning = false;
            state.initialPinchDistance = 0;

            // Exit zoom mode if zoomed out
            if (state.zoom <= 1.01) {
                resetZoom(heroImage, container);
            }
        } else if (e.touches.length === 1) {
            // Ended pinch, now single finger - transition to pan
            state.initialPinchDistance = 0;
            if (state.zoom > 1.01) {
                const touch = e.touches[0];
                state.isPanning = true;
                state.startX = touch.clientX;
                state.startY = touch.clientY;
                state.startTranslateX = state.translateX;
                state.startTranslateY = state.translateY;
            }
        }
    }

    // === Media Change Observer ===

    function observeMediaChanges() {
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                // Reset zoom when media is removed
                mutation.removedNodes.forEach(node => {
                    if (node.nodeType === 1 && node.classList?.contains('hero-image')) {
                        // Reset all active zoom containers
                        document.querySelectorAll('.zoom-active').forEach(container => {
                            exitZoomMode(container.querySelector('.hero-image'), container);
                        });
                    }
                });

                // Initialize new media
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1 && node.classList?.contains('hero-image')) {
                        node.style.cursor = 'zoom-in';
                        node.classList.remove('zoomed');
                        node.style.transform = '';
                    }
                });
            });
        });

        // Observe hero containers
        document.querySelectorAll('.hero-view, .large-preview-image-container, .image-container').forEach(container => {
            observer.observe(container, { childList: true, subtree: true });
        });
    }

    // Expose reset function globally for navigation scripts
    window.resetMediaZoom = function () {
        document.querySelectorAll('.zoom-active').forEach(container => {
            const heroImage = container.querySelector('.hero-image');
            if (heroImage) {
                resetZoom(heroImage, container);
            }
        });
    };
});
