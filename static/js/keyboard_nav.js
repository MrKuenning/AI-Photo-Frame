// Keyboard Navigation for Gallery Detail View
document.addEventListener('DOMContentLoaded', function () {
    let currentImageIndex = -1;
    const galleryItems = [];

    // Update gallery items array when gallery loads
    function updateGalleryItems() {
        galleryItems.length = 0; // Clear array
        document.querySelectorAll('.gallery-item').forEach((item, index) => {
            // Only include visible items (respect media filter)
            if (item.style.display !== 'none') {
                galleryItems.push({
                    element: item,
                    index: index,
                    filename: item.dataset.filename,
                    subfolder: item.dataset.subfolder
                });
            }
        });
    }

    // Find current image index
    function findCurrentImageIndex(filename) {
        return galleryItems.findIndex(item => item.filename === filename);
    }

    // Navigate to specific image
    function navigateToImage(index) {
        if (index < 0 || index >= galleryItems.length) return;

        const item = galleryItems[index];
        currentImageIndex = index;

        // Trigger click on the gallery item to show it in preview
        if (item.element) {
            item.element.click();
        }
    }

    // Keyboard event handler
    function handleKeyboardNav(event) {
        // Only handle keyboard nav when preview is open
        const previewContainer = document.getElementById('large-preview-container');
        if (!previewContainer || previewContainer.style.display === 'none') {
            return;
        }

        updateGalleryItems(); // Update list to respect current filters

        switch (event.key) {
            case 'ArrowLeft':
            case 'Left':
                event.preventDefault();
                if (currentImageIndex > 0) {
                    navigateToImage(currentImageIndex - 1);
                }
                break;

            case 'ArrowRight':
            case 'Right':
                event.preventDefault();
                if (currentImageIndex < galleryItems.length - 1) {
                    navigateToImage(currentImageIndex + 1);
                }
                break;

            case 'Escape':
            case 'Esc':
                event.preventDefault();
                const closeButton = document.getElementById('close-preview');
                if (closeButton) {
                    closeButton.click();
                }
                break;
        }
    }

    // Add keyboard event listener
    document.addEventListener('keydown', handleKeyboardNav);

    // Update current index when an image is clicked
    document.addEventListener('click', function (event) {
        const galleryItem = event.target.closest('.gallery-item');
        if (galleryItem) {
            updateGalleryItems();
            currentImageIndex = findCurrentImageIndex(galleryItem.dataset.filename);
        }
    });

    // Export functions for use by other scripts
    window.galleryKeyboardNav = {
        updateGalleryItems: updateGalleryItems,
        setCurrentIndex: function (filename) {
            updateGalleryItems();
            currentImageIndex = findCurrentImageIndex(filename);
        }
    };
});
