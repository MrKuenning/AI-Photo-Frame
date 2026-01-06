// Actual Size Toggle - Click to toggle between fit-to-view and actual size
// Includes drag-to-pan functionality when zoomed in

document.addEventListener('DOMContentLoaded', function () {
    // State tracking
    let isPanning = false;
    let hasDragged = false;
    let startX = 0;
    let startY = 0;
    let scrollLeft = 0;
    let scrollTop = 0;
    let panContainer = null;

    // Initialize
    init();

    function init() {
        // Set up click handler for hero images/videos
        document.addEventListener('click', handleMediaClick);

        // Set up panning handlers
        document.addEventListener('mousedown', handlePanStart);
        document.addEventListener('mousemove', handlePanMove);
        document.addEventListener('mouseup', handlePanEnd);

        // Touch support for panning
        document.addEventListener('touchstart', handleTouchStart, { passive: false });
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handlePanEnd);

        // Reset zoom when navigating (listen for media changes)
        observeMediaChanges();

        console.log('[ACTUAL SIZE] Module initialized');
    }

    // Handle click on hero image/video
    function handleMediaClick(e) {
        const heroImage = e.target.closest('.hero-image');
        if (!heroImage) return;

        // Don't toggle if clicking on video controls
        if (heroImage.tagName === 'VIDEO' && e.target !== heroImage) {
            return;
        }

        // Don't toggle if we just finished panning (dragging)
        if (hasDragged) {
            hasDragged = false;
            return;
        }

        // Prevent default video play/pause
        if (heroImage.tagName === 'VIDEO') {
            e.preventDefault();
            e.stopPropagation();
        }

        // Get click position relative to the image for zoom targeting
        const rect = heroImage.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        const percentX = clickX / rect.width;
        const percentY = clickY / rect.height;

        // Toggle actual size mode, passing click position
        toggleActualSize(heroImage, percentX, percentY);
    }

    // Toggle between fit-to-view and actual size
    function toggleActualSize(mediaElement, clickPercentX = 0.5, clickPercentY = 0.5) {
        const container = findScrollContainer(mediaElement);
        if (!container) return;

        const isActualSize = mediaElement.classList.contains('actual-size');

        if (isActualSize) {
            // Switch back to fit-to-view
            mediaElement.classList.remove('actual-size');
            container.classList.remove('actual-size-mode');
            container.scrollTop = 0;
            container.scrollLeft = 0;

            // Return video controls to their original container
            returnVideoControls(container);

            console.log('[ACTUAL SIZE] Switched to fit-to-view');
        } else {
            // Switch to actual size
            mediaElement.classList.add('actual-size');
            container.classList.add('actual-size-mode');

            // Move video controls to body so they stay fixed at bottom
            moveVideoControlsToBody(container);

            // Scroll to the clicked position after layout settles
            setTimeout(() => {
                scrollToClickPosition(container, mediaElement, clickPercentX, clickPercentY);
            }, 50);

            console.log('[ACTUAL SIZE] Switched to actual size at', Math.round(clickPercentX * 100) + '%', Math.round(clickPercentY * 100) + '%');
        }
    }

    // Scroll to the position the user clicked on (when zooming in)
    function scrollToClickPosition(container, mediaElement, percentX, percentY) {
        const containerRect = container.getBoundingClientRect();

        // Get actual content dimensions
        let contentWidth, contentHeight;
        if (mediaElement.tagName === 'VIDEO') {
            contentWidth = mediaElement.videoWidth || mediaElement.offsetWidth;
            contentHeight = mediaElement.videoHeight || mediaElement.offsetHeight;
        } else {
            contentWidth = mediaElement.naturalWidth || mediaElement.offsetWidth;
            contentHeight = mediaElement.naturalHeight || mediaElement.offsetHeight;
        }

        // Calculate the pixel position the user clicked on in the actual-size image
        const targetX = contentWidth * percentX;
        const targetY = contentHeight * percentY;

        // Calculate scroll position to center that point in the container
        const scrollX = Math.max(0, Math.min(targetX - containerRect.width / 2, contentWidth - containerRect.width));
        const scrollY = Math.max(0, Math.min(targetY - containerRect.height / 2, contentHeight - containerRect.height));

        container.scrollLeft = scrollX;
        container.scrollTop = scrollY;
    }

    // Find the scrollable container for the media element
    function findScrollContainer(mediaElement) {
        // Check for expanded view first (works in both hero and gallery expanded)
        let container = mediaElement.closest('.hero-expanded');
        if (container) return container;

        // Try hero-view (home page)
        container = mediaElement.closest('.hero-view');
        if (container) return container;

        // Try large-preview-image-container (gallery)
        container = mediaElement.closest('.large-preview-image-container');
        if (container) return container;

        // Fallback to image-container
        container = mediaElement.closest('.image-container');
        return container;
    }

    // Move video controls to body so they stay fixed during actual size mode
    function moveVideoControlsToBody(container) {
        // Look for controls in the container or its parent (for nested structures)
        let controls = container.querySelector('.custom-video-controls');
        if (!controls) {
            // Also check parent container in case of nested structure
            const parentContainer = container.closest('.image-container') || container.closest('.hero-view');
            if (parentContainer) {
                controls = parentContainer.querySelector('.custom-video-controls');
            }
        }
        if (!controls) return;

        // Already moved? Skip
        if (controls.classList.contains('actual-size-fixed')) return;

        // Get the hero view container for positioning
        const heroContainer = container.closest('.main-image-container') ||
            container.closest('.hero-view') ||
            container.closest('.large-preview-image-container') ||
            container;

        // Get container position for constraining controls
        const rect = heroContainer.getBoundingClientRect();

        // Store original parent reference
        controls.dataset.originalParent = 'stored';
        controls._originalParent = controls.parentElement;

        // Add class for fixed positioning
        controls.classList.add('actual-size-fixed');

        // Set position to match the hero container (not full screen)
        controls.style.left = rect.left + 'px';
        controls.style.right = (window.innerWidth - rect.right) + 'px';
        controls.style.width = rect.width + 'px';

        // Move to body
        document.body.appendChild(controls);
    }

    // Return video controls to their original container
    function returnVideoControls(container) {
        const controls = document.querySelector('.custom-video-controls.actual-size-fixed');
        if (!controls || !controls._originalParent) return;

        // Remove fixed class
        controls.classList.remove('actual-size-fixed');

        // Clear inline positioning styles
        controls.style.left = '';
        controls.style.right = '';
        controls.style.width = '';

        // Return to original parent
        controls._originalParent.appendChild(controls);
        delete controls._originalParent;
        delete controls.dataset.originalParent;
    }

    // Panning handlers for mouse
    function handlePanStart(e) {
        const container = e.target.closest('.actual-size-mode');
        if (!container) return;

        // Only pan with left mouse button
        if (e.button !== 0) return;

        isPanning = true;
        hasDragged = false;
        panContainer = container;
        startX = e.clientX;
        startY = e.clientY;
        scrollLeft = container.scrollLeft;
        scrollTop = container.scrollTop;

        container.style.cursor = 'grabbing';
        e.preventDefault();
    }

    function handlePanMove(e) {
        if (!isPanning || !panContainer) return;

        e.preventDefault();

        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;

        // Mark as dragged if moved more than 5 pixels
        if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
            hasDragged = true;
        }

        panContainer.scrollLeft = scrollLeft - deltaX;
        panContainer.scrollTop = scrollTop - deltaY;
    }

    function handlePanEnd(e) {
        if (!isPanning) return;

        if (panContainer) {
            panContainer.style.cursor = 'grab';
        }

        isPanning = false;
        panContainer = null;

        // Keep hasDragged true briefly so the click event doesn't toggle zoom
        if (hasDragged) {
            setTimeout(() => {
                hasDragged = false;
            }, 100);
        }
    }

    // Touch handlers for panning
    function handleTouchStart(e) {
        const container = e.target.closest('.actual-size-mode');
        if (!container) return;

        if (e.touches.length === 1) {
            isPanning = true;
            hasDragged = false;
            panContainer = container;
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            scrollLeft = container.scrollLeft;
            scrollTop = container.scrollTop;
        }
    }

    function handleTouchMove(e) {
        if (!isPanning || !panContainer) return;

        if (e.touches.length === 1) {
            e.preventDefault();

            const deltaX = e.touches[0].clientX - startX;
            const deltaY = e.touches[0].clientY - startY;

            // Mark as dragged if moved more than 5 pixels
            if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
                hasDragged = true;
            }

            panContainer.scrollLeft = scrollLeft - deltaX;
            panContainer.scrollTop = scrollTop - deltaY;
        }
    }

    // Observe for media changes and reset zoom
    function observeMediaChanges() {
        const observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                if (mutation.type === 'childList') {
                    mutation.removedNodes.forEach(function (node) {
                        if (node.nodeType === 1 && node.classList && node.classList.contains('hero-image')) {
                            resetAllZoom();
                        }
                    });
                    mutation.addedNodes.forEach(function (node) {
                        if (node.nodeType === 1 && node.classList && node.classList.contains('hero-image')) {
                            node.classList.remove('actual-size');
                        }
                    });
                }
            });
        });

        // Observe hero containers
        document.querySelectorAll('.hero-view, .large-preview-image-container').forEach(container => {
            observer.observe(container, { childList: true, subtree: true });
        });
    }

    // Reset all zoom states
    function resetAllZoom() {
        document.querySelectorAll('.hero-image.actual-size').forEach(media => {
            media.classList.remove('actual-size');
        });
        document.querySelectorAll('.actual-size-mode').forEach(container => {
            container.classList.remove('actual-size-mode');
            container.scrollTop = 0;
            container.scrollLeft = 0;
        });
    }

    // Expose reset function globally for navigation scripts to use
    window.resetMediaZoom = resetAllZoom;
});
