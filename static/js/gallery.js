// Gallery page functionality
document.addEventListener('DOMContentLoaded', function () {
    // Elements
    const searchInput = document.getElementById('image-search');
    const sizeControl = document.getElementById('image-size');
    const perPageControl = document.getElementById('per-page');
    const imageGrid = document.querySelector('.image-grid');
    const galleryGridContainer = document.getElementById('gallery-grid-container');
    const largePreviewContainer = document.getElementById('large-preview-container');
    const largePreviewImage = document.getElementById('large-preview-image');
    const previewMetadata = document.getElementById('preview-metadata');
    const closePreviewBtn = document.getElementById('close-preview');
    const prevButton = document.getElementById('prev-image');
    const nextButton = document.getElementById('next-image');

    // Current state
    let currentImages = [];
    let currentIndex = -1;

    // Initialize
    function init() {
        // Store all image elements for navigation
        updateCurrentImages();

        // Set up event listeners
        if (searchInput) {
            searchInput.addEventListener('input', handleSearch);
        }

        if (sizeControl) {
            sizeControl.addEventListener('change', handleSizeChange);
        }

        if (perPageControl) {
            perPageControl.addEventListener('change', handlePerPageChange);
        }

        // Set up image click handlers
        setupImageClicks();

        // Set up preview panel controls
        if (closePreviewBtn) {
            closePreviewBtn.addEventListener('click', closeImagePreview);
        }

        if (prevButton) {
            prevButton.addEventListener('click', showPrevImage);
        }

        if (nextButton) {
            nextButton.addEventListener('click', showNextImage);
        }

        // Delete button handler
        const deleteButton = document.getElementById('delete-image-btn');
        if (deleteButton) {
            deleteButton.addEventListener('click', function () {
                // Get current image info
                if (currentIndex < 0 || currentIndex >= currentImages.length) return;

                const container = currentImages[currentIndex];
                const filename = container.dataset.filename;
                const subfolder = container.dataset.subfolder;
                const fullPath = subfolder + '/' + filename;

                // Confirm deletion
                if (!confirm(`Are you sure you want to permanently delete "${filename}"?\n\nThis action cannot be undone.`)) {
                    return;
                }

                // Send DELETE request
                fetch(`/delete_image/${encodeURIComponent(fullPath)}`, {
                    method: 'DELETE'
                })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            // Remove the item from the grid
                            container.remove();

                            // Update currentImages array
                            updateCurrentImages();

                            // Close the preview
                            closeImagePreview();

                            // Show success message (optional)
                            console.log('File deleted successfully');
                        } else {
                            alert('Error deleting file: ' + (data.error || 'Unknown error'));
                        }
                    })
                    .catch(error => {
                        console.error('Error deleting file:', error);
                        alert('Error deleting file. Please try again.');
                    });
            });
        }

        // Keyboard navigation
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && largePreviewContainer && largePreviewContainer.classList.contains('active')) {
                closeImagePreview();
            } else if (e.key === 'ArrowLeft' && largePreviewContainer && largePreviewContainer.classList.contains('active')) {
                showPrevImage();
            } else if (e.key === 'ArrowRight' && largePreviewContainer && largePreviewContainer.classList.contains('active')) {
                showNextImage();
            }
        });
    }

    // Handle search input - now submits the form for server-side search
    function handleSearch() {
        // For immediate visual feedback, we'll still do client-side filtering
        const searchTerm = searchInput.value.toLowerCase();

        // If user presses Enter, submit the form for server-side search
        searchInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                document.getElementById('search-form').submit();
            }
        });

        // Load metadata for hover display
        document.querySelectorAll('.image-container').forEach(container => {
            const metadataElem = container.querySelector('.metadata');
            if (!metadataElem || metadataElem.dataset.loaded) return;

            // Load metadata for hover display
            fetch('/image_info/' + encodeURIComponent(container.dataset.filename))
                .then(response => response.json())
                .then(data => {
                    let metadataHtml = '';
                    if (data.prompt) {
                        metadataHtml += `<p><strong>Prompt:</strong> ${data.prompt}</p>`;
                    }
                    if (data.seed) {
                        metadataHtml += `<p><strong>Seed:</strong> ${data.seed}</p>`;
                    }
                    if (data.model) {
                        metadataHtml += `<p><strong>Model:</strong> ${data.model}</p>`;
                    }
                    if (data.dimensions) {
                        metadataHtml += `<p><strong>Dimensions:</strong> ${data.dimensions}</p>`;
                    }
                    if (data.date_time) {
                        metadataHtml += `<p><strong>Created:</strong> ${data.date_time}</p>`;
                    }
                    if (data.subfolder) {
                        metadataHtml += `<p><strong>Folder:</strong> ${data.subfolder}</p>`;
                    }

                    if (metadataElem) {
                        metadataElem.innerHTML = metadataHtml;
                        metadataElem.dataset.loaded = 'true';
                    }
                });
        });

        // Update current images array for preview navigation
        currentImages = Array.from(document.querySelectorAll('.image-container'));
    }

    // Handle image size change
    function handleSizeChange() {
        const size = sizeControl.value;
        const containers = document.querySelectorAll('.col-image-container');

        containers.forEach(container => {
            // Remove existing size classes
            container.classList.remove('col-md-2', 'col-md-3', 'col-md-4', 'col-md-6');

            // Add new size class
            switch (size) {
                case 'small':
                    container.classList.add('col-md-2');
                    break;
                case 'medium':
                    container.classList.add('col-md-3');
                    break;
                case 'large':
                    container.classList.add('col-md-4');
                    break;
                case 'xlarge':
                    container.classList.add('col-md-6');
                    break;
                default:
                    container.classList.add('col-md-4');
            }
        });

        // Save preference in localStorage
        localStorage.setItem('gallery-image-size', size);
    }

    // Handle per page change
    function handlePerPageChange() {
        const perPage = perPageControl.value;

        // Save preference in localStorage
        localStorage.setItem('gallery-per-page', perPage);

        // Redirect to update the page with new per_page parameter
        const url = new URL(window.location.href);
        url.searchParams.set('per_page', perPage);

        // Preserve search query if it exists
        const searchInput = document.getElementById('image-search');
        if (searchInput && searchInput.value) {
            url.searchParams.set('search', searchInput.value);
        }

        window.location.href = url.toString();
    }

    // Set up image clicks using event delegation
    function setupImageClicks() {
        // Use event delegation on the image grid container
        const imageGrid = document.getElementById('image-grid');
        if (!imageGrid) return;

        imageGrid.addEventListener('click', function (e) {
            // Find the closest image-container
            const container = e.target.closest('.image-container');
            if (!container) return;

            // Get the media element (img or video)
            const img = container.querySelector('img');
            const video = container.querySelector('video');
            const mediaElement = img || video;

            if (!mediaElement) return;

            const fullMediaUrl = mediaElement.src;
            const mediaType = video ? 'video' : 'image';

            // Get the filename and metadata
            const filename = container.dataset.filename;
            const subfolder = container.dataset.subfolder;

            // Find the index of this container
            const allContainers = Array.from(document.querySelectorAll('.image-container'));
            const index = allContainers.indexOf(container);

            // Show the preview panel with this media
            showImagePreview(fullMediaUrl, filename, subfolder, index, mediaType);
        });
    }


    // Show image preview panel
    function showImagePreview(mediaUrl, filename, subfolder, index, mediaType = 'image') {
        if (!largePreviewContainer) return;

        // Make sure currentImages is up to date
        updateCurrentImages();

        // Set current index for navigation
        currentIndex = index;

        // Get the preview image container directly
        const previewImageContainer = document.querySelector('.large-preview-image-container');
        if (!previewImageContainer) return;

        // Clear existing content
        previewImageContainer.innerHTML = '';

        // Create appropriate media element
        if (mediaType === 'video') {
            const videoElement = document.createElement('video');
            videoElement.src = mediaUrl;
            videoElement.controls = true;
            videoElement.autoplay = true;
            videoElement.loop = true;
            videoElement.muted = false;
            videoElement.className = 'hero-image';
            videoElement.id = 'large-preview-image';
            previewImageContainer.appendChild(videoElement);
        } else {
            const imgElement = document.createElement('img');
            imgElement.src = mediaUrl;
            imgElement.alt = filename;
            imgElement.className = 'hero-image';
            imgElement.id = 'large-preview-image';
            previewImageContainer.appendChild(imgElement);
        }

        // Add metadata overlay
        const metadataOverlay = document.createElement('div');
        metadataOverlay.className = 'metadata';
        metadataOverlay.id = 'preview-metadata-overlay';
        previewImageContainer.appendChild(metadataOverlay);

        // Load metadata
        loadPreviewMetadata(filename);

        // Show preview panel and adjust layout
        galleryGridContainer.classList.add('squished');
        largePreviewContainer.classList.add('active');

        // Remove selected class from all images
        document.querySelectorAll('.image-container').forEach(container => {
            container.classList.remove('selected');
        });

        // Add selected class to current image
        const selectedContainer = currentImages[index];
        if (selectedContainer) {
            selectedContainer.classList.add('selected');
            selectedContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        // Update navigation buttons
        updateNavButtons();
    }

    // Load metadata for preview panel
    function loadPreviewMetadata(filename) {
        // Show loading state in overlay if it exists
        const metadataOverlay = document.getElementById('preview-metadata-overlay');
        if (metadataOverlay) {
            metadataOverlay.innerHTML = '<p>Loading metadata...</p>';
        }

        // Show loading in metadata panel if it exists
        if (previewMetadata) {
            previewMetadata.innerHTML = '<p>Loading metadata...</p>';
        }

        fetch('/image_info/' + encodeURIComponent(filename))
            .then(response => response.json())
            .then(data => {
                let metadataHtml = '';
                if (data.prompt) {
                    metadataHtml += `<p><strong>Prompt:</strong> ${data.prompt}</p>`;
                }
                if (data.seed) {
                    metadataHtml += `<p><strong>Seed:</strong> ${data.seed}</p>`;
                }
                if (data.model) {
                    metadataHtml += `<p><strong>Model:</strong> ${data.model}</p>`;
                }
                if (data.dimensions) {
                    metadataHtml += `<p><strong>Dimensions:</strong> ${data.dimensions}</p>`;
                }
                if (data.date_time) {
                    metadataHtml += `<p><strong>Created:</strong> ${data.date_time}</p>`;
                }
                if (data.subfolder) {
                    metadataHtml += `<p><strong>Folder:</strong> ${data.subfolder}</p>`;
                }

                // Update the overlay metadata (primary display now)
                if (metadataOverlay) {
                    metadataOverlay.innerHTML = metadataHtml || '';
                }

                // Also update preview metadata panel if it exists
                if (previewMetadata) {
                    previewMetadata.innerHTML = metadataHtml || '<p>No metadata available</p>';
                }
            })
            .catch(error => {
                if (metadataOverlay) {
                    metadataOverlay.innerHTML = '<p>Error loading metadata</p>';
                }
                if (previewMetadata) {
                    previewMetadata.innerHTML = '<p>Error loading metadata</p>';
                }
                console.error('Error loading metadata:', error);
            });
    }

    // Close image preview
    function closeImagePreview() {
        if (!largePreviewContainer) return;

        galleryGridContainer.classList.remove('squished');
        largePreviewContainer.classList.remove('active');

        // Remove selected class from all images
        document.querySelectorAll('.image-container').forEach(container => {
            container.classList.remove('selected');
        });

        // Reset scroll position
        window.scrollTo(0, 0);
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

    // Navigate  to specific image
    function navigateToImage(index) {
        if (index < 0 || index >= currentImages.length) return;

        const container = currentImages[index];
        const img = container.querySelector('img');
        const video = container.querySelector('video');
        const mediaElement = img || video;

        if (!mediaElement) return;

        const fullMediaUrl = mediaElement.src;
        const filename = container.dataset.filename;
        const subfolder = container.dataset.subfolder;
        const mediaType = video ? 'video' : 'image';

        // Get the preview image container
        const previewImageContainer = document.querySelector('.large-preview-image-container');
        if (!previewImageContainer) return;

        // Clear existing content
        previewImageContainer.innerHTML = '';

        // Create appropriate media element
        if (mediaType === 'video') {
            const videoElement = document.createElement('video');
            videoElement.src = fullMediaUrl;
            videoElement.controls = true;
            videoElement.autoplay = true;
            videoElement.loop = true;
            videoElement.muted = false;
            videoElement.className = 'hero-image';
            videoElement.id = 'large-preview-image';
            previewImageContainer.appendChild(videoElement);
        } else {
            const imgElement = document.createElement('img');
            imgElement.src = fullMediaUrl;
            imgElement.alt = filename;
            imgElement.className = 'hero-image';
            imgElement.id = 'large-preview-image';
            previewImageContainer.appendChild(imgElement);
        }

        // Add metadata overlay
        const metadataOverlay = document.createElement('div');
        metadataOverlay.className = 'metadata';
        metadataOverlay.id = 'preview-metadata-overlay';
        previewImageContainer.appendChild(metadataOverlay);

        // Load metadata
        loadPreviewMetadata(filename);

        // Remove selected class from all images
        document.querySelectorAll('.image-container').forEach(container => {
            container.classList.remove('selected');
        });

        // Add selected class to current image
        container.classList.add('selected');
        container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

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

    // Apply saved preferences
    function applySavedPreferences() {
        // Apply saved image size
        const savedSize = localStorage.getItem('gallery-image-size');
        if (savedSize && sizeControl) {
            sizeControl.value = savedSize;
            handleSizeChange();
        }

        // Apply saved per page (already handled by server)
    }

    // Function to update current images array (exposed for infinite scroll)
    function updateCurrentImages() {
        currentImages = Array.from(document.querySelectorAll('.image-container'));
    }

    // Make functions available globally
    window.updateCurrentImages = updateCurrentImages;
    window.showImagePreview = showImagePreview;

    // Initialize on page load
    init();
    applySavedPreferences();
});