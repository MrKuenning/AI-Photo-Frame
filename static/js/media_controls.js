// Media Controls - Toggle buttons for metadata and fullscreen
document.addEventListener('DOMContentLoaded', function () {
    let metadataVisible = false;
    let isFullscreen = false;

    // Initialize toggle buttons
    initMetadataToggle();
    initFullscreenToggle();

    function initMetadataToggle() {
        // Handle all metadata toggle buttons (home and gallery)
        document.querySelectorAll('.toggle-metadata-btn').forEach(btn => {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                toggleMetadata();
            });
        });
    }

    function initFullscreenToggle() {
        // Handle all fullscreen toggle buttons (home and gallery)
        document.querySelectorAll('.toggle-fullscreen-btn').forEach(btn => {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                toggleFullscreen();
            });
        });
    }

    function toggleMetadata() {
        metadataVisible = !metadataVisible;

        // Find all metadata containers in hero views
        const metadataContainers = document.querySelectorAll('.hero-view .metadata, .preview-card-body .metadata');

        metadataContainers.forEach(container => {
            if (metadataVisible) {
                container.classList.add('metadata-visible');
                // Load metadata if not already loaded
                const parent = container.closest('.hero-view') || container.closest('.large-preview-image-container');
                if (parent && !container.dataset.loaded) {
                    const filename = parent.dataset?.filename ||
                        parent.closest('[data-filename]')?.dataset?.filename;
                    const subfolder = parent.dataset?.subfolder ||
                        parent.closest('[data-subfolder]')?.dataset?.subfolder;
                    if (filename) {
                        loadMetadata(filename, container, subfolder);
                    }
                }
            } else {
                container.classList.remove('metadata-visible');
            }
        });

        // Update all button icons
        updateMetadataButtonState();
    }

    function toggleFullscreen() {
        isFullscreen = !isFullscreen;

        // Find the hero container - same logic as hero_expand.js
        const heroImage = document.querySelector('.hero-view .hero-image') ||
            document.querySelector('.preview-card-body .hero-image');

        if (!heroImage) {
            console.log('[MEDIA CONTROLS] No hero image found');
            return;
        }

        // Find the container - same logic as hero_expand.js findHeroContainer
        let heroContainer;
        const previewCard = heroImage.closest('.preview-card');
        if (previewCard) {
            heroContainer = previewCard.querySelector('.preview-card-body');
        } else {
            heroContainer = heroImage.closest('.hero-view') || heroImage.closest('.main-image-container');
        }

        if (!heroContainer) {
            console.log('[MEDIA CONTROLS] No container found');
            return;
        }

        if (isFullscreen) {
            // Temporarily remove backdrop-filter from parent containers
            // backdrop-filter creates a stacking context that prevents position: fixed from escaping

            // Home page: .main-image-container
            const mainImageContainer = heroContainer.closest('.main-image-container');
            if (mainImageContainer) {
                mainImageContainer.style.backdropFilter = 'none';
                mainImageContainer.style.webkitBackdropFilter = 'none';
            }

            // Gallery page: .preview-card
            const parentPreviewCard = heroContainer.closest('.preview-card');
            if (parentPreviewCard) {
                parentPreviewCard.style.backdropFilter = 'none';
                parentPreviewCard.style.webkitBackdropFilter = 'none';
            }

            // Add expanded class
            heroContainer.classList.add('hero-expanded');
            document.body.classList.add('has-hero-expanded'); // Fallback for Safari :has() support
            heroImage.style.cursor = 'zoom-out';
            document.body.style.overflow = 'hidden';

            // FORCE card-footer to be visible on all devices including iPad
            const cardFooter = document.querySelector('.card-footer');
            if (cardFooter) {
                cardFooter.style.cssText = 'position: fixed !important; bottom: 0 !important; left: 0 !important; right: 0 !important; z-index: 10000 !important; display: flex !important; min-height: 60px !important; background: rgba(20,20,30,0.9) !important; padding-bottom: env(safe-area-inset-bottom, 10px) !important;';
                cardFooter.dataset.wasFixed = 'true';
            }

            // FORCE card-header to be visible on gallery preview
            const cardHeader = document.querySelector('#large-preview-container.active .card-header');
            if (cardHeader) {
                cardHeader.style.cssText = 'display: flex !important; visibility: visible !important; min-height: 50px !important;';
                cardHeader.dataset.wasForced = 'true';
            }

            console.log('[MEDIA CONTROLS] Entered fullscreen, card-footer fixed:', !!cardFooter, 'card-header fixed:', !!cardHeader);
        } else {
            // Restore backdrop-filter
            const mainImageContainer = heroContainer.closest('.main-image-container');
            if (mainImageContainer) {
                mainImageContainer.style.backdropFilter = '';
                mainImageContainer.style.webkitBackdropFilter = '';
            }

            const parentPreviewCard = heroContainer.closest('.preview-card');
            if (parentPreviewCard) {
                parentPreviewCard.style.backdropFilter = '';
                parentPreviewCard.style.webkitBackdropFilter = '';
            }

            // Remove expanded class
            heroContainer.classList.remove('hero-expanded');
            document.body.classList.remove('has-hero-expanded'); // Remove Safari fallback class
            heroImage.style.cursor = 'zoom-in';
            document.body.style.overflow = '';

            // Reset card-footer to original state
            const cardFooter = document.querySelector('.card-footer');
            if (cardFooter && cardFooter.dataset.wasFixed === 'true') {
                cardFooter.style.cssText = '';
                delete cardFooter.dataset.wasFixed;
            }

            // Reset card-header if it was forced
            const cardHeader = document.querySelector('.card-header');
            if (cardHeader && cardHeader.dataset.wasForced === 'true') {
                cardHeader.style.cssText = '';
                delete cardHeader.dataset.wasForced;
            }

            console.log('[MEDIA CONTROLS] Exited fullscreen');
        }

        // Update all button icons
        updateFullscreenButtonState();
    }

    function updateMetadataButtonState() {
        document.querySelectorAll('.toggle-metadata-btn').forEach(btn => {
            const icon = btn.querySelector('i');
            if (icon) {
                if (metadataVisible) {
                    icon.className = 'bi bi-info-circle-fill';
                    btn.classList.add('active');
                    btn.title = 'Hide Metadata';
                } else {
                    icon.className = 'bi bi-info-circle';
                    btn.classList.remove('active');
                    btn.title = 'Show Metadata';
                }
            }
        });
    }

    function updateFullscreenButtonState() {
        document.querySelectorAll('.toggle-fullscreen-btn').forEach(btn => {
            const icon = btn.querySelector('i');
            if (icon) {
                if (isFullscreen) {
                    icon.className = 'bi bi-fullscreen-exit';
                    btn.classList.add('active');
                    btn.title = 'Exit Fullscreen';
                } else {
                    icon.className = 'bi bi-arrows-fullscreen';
                    btn.classList.remove('active');
                    btn.title = 'Enter Fullscreen';
                }
            }
        });
    }

    // Escape key exits fullscreen
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && isFullscreen) {
            toggleFullscreen();
        }
    });

    // Re-initialize when content changes (for dynamic content like gallery preview)
    window.reinitMediaControls = function () {
        initMetadataToggle();
        initFullscreenToggle();
    };

    // Sync fullscreen state from hero_expand.js (when user clicks image directly)
    window.syncFullscreenState = function (expanded) {
        isFullscreen = expanded;
        updateFullscreenButtonState();
    };

    console.log('[MEDIA CONTROLS] Initialized');
});
