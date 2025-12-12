// Image size toggle functionality
document.addEventListener('DOMContentLoaded', function() {
    // Get the image size toggle button and main image container
    const imageSizeToggleBtn = document.getElementById('image-size-toggle');
    const mainImageContainer = document.querySelector('.main-image-container');
    
    // Check if the image size preference is stored in localStorage
    const stretchToFill = localStorage.getItem('stretchToFill') === 'true';
    
    // Function to toggle image size
    function toggleImageSize() {
        if (mainImageContainer) {
            const mainImage = mainImageContainer.querySelector('img');
            if (!mainImage) return;
            
            // Toggle image size
            if (mainImage.classList.contains('stretch-to-fill')) {
                // Switch to actual size
                mainImage.classList.remove('stretch-to-fill');
                if (imageSizeToggleBtn) {
                    imageSizeToggleBtn.innerHTML = '<i class="bi bi-arrows-angle-expand"></i>';
                    imageSizeToggleBtn.setAttribute('title', 'Stretch to Fill');
                }
                localStorage.setItem('stretchToFill', 'false');
            } else {
                // Switch to stretch to fill
                mainImage.classList.add('stretch-to-fill');
                if (imageSizeToggleBtn) {
                    imageSizeToggleBtn.innerHTML = '<i class="bi bi-arrows-angle-contract"></i>';
                    imageSizeToggleBtn.setAttribute('title', 'Actual Size');
                }
                localStorage.setItem('stretchToFill', 'true');
            }
        }
    }
    
    // Set initial state based on localStorage
    function applyImageSizePreference() {
        if (mainImageContainer) {
            const mainImage = mainImageContainer.querySelector('img');
            if (!mainImage) return;
            
            if (stretchToFill) {
                mainImage.classList.add('stretch-to-fill');
                if (imageSizeToggleBtn) {
                    imageSizeToggleBtn.innerHTML = '<i class="bi bi-arrows-angle-contract"></i>';
                    imageSizeToggleBtn.setAttribute('title', 'Actual Size');
                }
            } else {
                mainImage.classList.remove('stretch-to-fill');
                if (imageSizeToggleBtn) {
                    imageSizeToggleBtn.innerHTML = '<i class="bi bi-arrows-angle-expand"></i>';
                    imageSizeToggleBtn.setAttribute('title', 'Stretch to Fill');
                }
            }
        }
    }
    
    // Apply initial state
    applyImageSizePreference();
    
    // Add event listener to toggle button
    if (imageSizeToggleBtn) {
        imageSizeToggleBtn.addEventListener('click', toggleImageSize);
    }
    
    // Add event listener to main image container to toggle image size when clicked
    if (mainImageContainer) {
        // Use event delegation to handle clicks on images, even when they're dynamically added
        mainImageContainer.addEventListener('click', function(event) {
            // Only toggle if clicking on the image itself, not other elements in the container
            if (event.target.tagName === 'IMG') {
                // Prevent default behavior (opening in new tab)
                event.preventDefault();
                // Stop event propagation to prevent other handlers from firing
                event.stopPropagation();
                // Toggle the image size
                toggleImageSize();
                console.log('Image clicked, toggling size');
            }
        });
        
        // We don't need a direct event listener as it can cause conflicts
        // The event delegation approach above will handle all image clicks
    }
    
    // Re-apply preference when main image changes (e.g., when clicking thumbnails)
    // Use a MutationObserver to detect changes in the main image container
    if (mainImageContainer) {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList' || mutation.type === 'subtree') {
                    applyImageSizePreference();
                }
            });
        });
        
        observer.observe(mainImageContainer, { childList: true, subtree: true });
    }
});