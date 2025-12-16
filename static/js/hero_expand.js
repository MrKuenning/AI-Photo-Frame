// Hero image click-to-expand functionality
document.addEventListener('DOMContentLoaded', function () {
    let isExpanded = false;
    let expandedContainer = null;

    // Initialize expand functionality
    function init() {
        // Set up click handlers for hero images
        setupHeroImageClicks();

        // Escape key to exit expanded mode
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && isExpanded) {
                collapseHeroImage();
            }
        });
    }

    // Set up click event listeners on hero images
    function setupHeroImageClicks() {
        // Use event delegation since images may be replaced dynamically
        document.addEventListener('click', function (e) {
            // Check if clicked element is a hero image (img or video with hero-image class)
            const heroImage = e.target.closest('.hero-image');
            if (!heroImage) return;

            // Don't expand if clicking on video controls
            if (heroImage.tagName === 'VIDEO' && e.target !== heroImage) {
                return;
            }

            // Toggle expanded state
            if (isExpanded) {
                collapseHeroImage();
            } else {
                expandHeroImage(heroImage);
            }
        });
    }

    // Expand hero image to fullscreen
    function expandHeroImage(heroImage) {
        // Find the container - could be different on different pages
        const container = findHeroContainer(heroImage);
        if (!container) return;

        expandedContainer = container;
        isExpanded = true;

        // Temporarily remove backdrop-filter from parent containers
        // backdrop-filter creates a stacking context that prevents position: fixed from escaping

        // Home page: .main-image-container
        const mainImageContainer = container.closest('.main-image-container');
        if (mainImageContainer) {
            mainImageContainer.style.backdropFilter = 'none';
            mainImageContainer.style.webkitBackdropFilter = 'none';
        }

        // Gallery page: .preview-card
        const previewCard = container.closest('.preview-card');
        if (previewCard) {
            previewCard.style.backdropFilter = 'none';
            previewCard.style.webkitBackdropFilter = 'none';
        }

        // Add expanded class to container
        container.classList.add('hero-expanded');

        // Add cursor pointer indicator to hero image
        heroImage.style.cursor = 'zoom-out';

        // Prevent body scroll when expanded
        document.body.style.overflow = 'hidden';

        console.log('[HERO EXPAND] Expanded hero image');
    }

    // Collapse hero image back to normal size
    function collapseHeroImage() {
        if (!expandedContainer) return;

        // Restore backdrop-filter to parent containers

        // Home page: .main-image-container
        const mainImageContainer = expandedContainer.closest('.main-image-container');
        if (mainImageContainer) {
            mainImageContainer.style.backdropFilter = ''; // Restore to default from CSS
            mainImageContainer.style.webkitBackdropFilter = '';
        }

        // Gallery page: .preview-card
        const previewCard = expandedContainer.closest('.preview-card');
        if (previewCard) {
            previewCard.style.backdropFilter = ''; // Restore to default from CSS
            previewCard.style.webkitBackdropFilter = '';
        }

        // Remove expanded class
        expandedContainer.classList.remove('hero-expanded');

        // Reset cursor
        const heroImage = expandedContainer.querySelector('.hero-image');
        if (heroImage) {
            heroImage.style.cursor = 'zoom-in';
        }

        // Restore body scroll
        document.body.style.overflow = '';

        isExpanded = false;
        expandedContainer = null;

        console.log('[HERO EXPAND] Collapsed hero image');
    }

    // Find the appropriate container for the hero image
    function findHeroContainer(heroImage) {
        // Check if we're inside a preview card (gallery page)
        const previewCard = heroImage.closest('.preview-card');
        let container;

        if (previewCard) {
            // If we are inside a preview card (gallery), target its body for expansion
            // This allows the CSS rule .preview-card-body.hero-expanded~.card-footer to work
            container = previewCard.querySelector('.preview-card-body');
        } else {
            // Otherwise (home page), try hero-view first, then main-image-container
            container = heroImage.closest('.hero-view');
            if (!container) {
                container = heroImage.closest('.main-image-container');
            }
        }

        return container;
    }

    // Add visual indicator that images are clickable
    function addClickableIndicators() {
        // Add cursor pointer to all hero images
        document.querySelectorAll('.hero-image').forEach(img => {
            img.style.cursor = 'zoom-in';
        });

        // Watch for new hero images being added (via MutationObserver)
        const observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                mutation.addedNodes.forEach(function (node) {
                    if (node.nodeType === 1) { // Element node
                        if (node.classList && node.classList.contains('hero-image')) {
                            node.style.cursor = 'zoom-in';
                        }
                        // Also check child nodes
                        const heroImages = node.querySelectorAll && node.querySelectorAll('.hero-image');
                        if (heroImages) {
                            heroImages.forEach(img => {
                                img.style.cursor = 'zoom-in';
                            });
                        }
                    }
                });
            });
        });

        // Observe the entire document for changes
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // Initialize on page load
    init();
    addClickableIndicators();

    console.log('[HERO EXPAND] Module initialized');
});
