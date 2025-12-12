// Home page navigation functionality
document.addEventListener('DOMContentLoaded', function () {
    // Elements
    const prevButton = document.getElementById('home-prev-image');
    const nextButton = document.getElementById('home-next-image');
    const heroContainer = document.querySelector('.image-container.hero-view');

    // Current state
    let currentImages = [];
    let currentIndex = 0;

    // Initialize
    function init() {
        // Get all thumbnail links for navigation
        updateCurrentImages();

        // Set up navigation button handlers
        if (prevButton) {
            prevButton.addEventListener('click', showPrevImage);
        }

        if (nextButton) {
            nextButton.addEventListener('click', showNextImage);
        }

        // Update the current index based on which image is showing
        updateCurrentIndex();

        // Update button states
        updateNavButtons();

        // Set up keyboard navigation
        document.addEventListener('keydown', function (e) {
            // Only respond to arrow keys when we're on the home page (not in a modal/input)
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            if (e.key === 'ArrowLeft') {
                showPrevImage();
            } else if (e.key === 'ArrowRight') {
                showNextImage();
            }
        });

        // Update index when thumbnails are clicked
        document.querySelectorAll('.thumbnail-link').forEach((link, index) => {
            link.addEventListener('click', function () {
                currentIndex = index;
                updateNavButtons();
            });
        });
    }

    // Update the current images array from thumbnail links
    function updateCurrentImages() {
        currentImages = Array.from(document.querySelectorAll('.thumbnail-link'));
    }

    // Update current index based on which image is displayed
    function updateCurrentIndex() {
        if (!heroContainer) return;

        const currentFilename = heroContainer.dataset.filename;
        const currentSubfolder = heroContainer.dataset.subfolder;

        // Find the index of the current image in the thumbnails
        currentImages.forEach((link, index) => {
            if (link.dataset.filename === currentFilename &&
                link.dataset.subfolder === currentSubfolder) {
                currentIndex = index;
            }
        });
    }

    // Show previous image
    function showPrevImage() {
        if (currentIndex <= 0 || currentImages.length === 0) return;

        currentIndex--;
        navigateToImage(currentIndex);
    }

    // Show next image
    function showNextImage() {
        if (currentIndex >= currentImages.length - 1 || currentImages.length === 0) return;

        currentIndex++;
        navigateToImage(currentIndex);
    }

    // Navigate to specific image
    function navigateToImage(index) {
        if (index < 0 || index >= currentImages.length) return;

        const link = currentImages[index];
        const url = link.href;
        const container = link.closest('.image-container');
        const mediaType = container ? container.dataset.mediaType : 'image';
        const filename = link.dataset.filename;
        const subfolder = link.dataset.subfolder;

        if (!heroContainer) return;

        // Clear existing content except metadata
        const metadata = heroContainer.querySelector('.metadata');
        heroContainer.innerHTML = '';

        // Create appropriate media element
        if (mediaType === 'video') {
            const videoElement = document.createElement('video');
            videoElement.src = url;
            videoElement.controls = true;
            videoElement.autoplay = true;
            videoElement.loop = true;
            videoElement.className = 'hero-image';
            heroContainer.appendChild(videoElement);
        } else {
            const imgElement = document.createElement('img');
            imgElement.src = url;
            imgElement.alt = 'Selected Image';
            imgElement.className = 'hero-image';
            heroContainer.appendChild(imgElement);
        }

        // Update hero container data attributes for metadata loading
        heroContainer.dataset.filename = filename;
        heroContainer.dataset.subfolder = subfolder;
        heroContainer.dataset.mediaType = mediaType;

        // Re-add metadata div and reset it for new image
        if (metadata) {
            // Clear old metadata content and reset loaded flag
            metadata.innerHTML = '';
            delete metadata.dataset.loaded;
            heroContainer.appendChild(metadata);
        }

        // Update thumbnail selection highlighting
        document.querySelectorAll('.thumbnail-only').forEach(t => t.classList.remove('selected'));
        if (container) {
            container.classList.add('selected');
            // Scroll thumbnail into view
            container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        // Update navigation buttons
        updateNavButtons();
    }

    // Update navigation buttons state
    function updateNavButtons() {
        if (prevButton) {
            prevButton.disabled = currentIndex <= 0;
        }

        if (nextButton) {
            nextButton.disabled = currentIndex >= currentImages.length - 1;
        }
    }

    // Initialize on page load
    init();
});
