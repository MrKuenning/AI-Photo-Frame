// Infinite scroll functionality for gallery page
document.addEventListener('DOMContentLoaded', function () {
    // Elements
    const imageGrid = document.querySelector('.image-grid');
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'text-center my-4 loading-indicator';
    loadingIndicator.innerHTML = '<div class="spinner-border text-light" role="status"><span class="visually-hidden">Loading...</span></div>';

    // State variables
    let loading = false;
    let allImagesLoaded = false;

    // Get current query parameters
    const urlParams = new URLSearchParams(window.location.search);
    const selectedSubfolder = urlParams.get('subfolder') || '';
    const searchQuery = urlParams.get('search') || '';

    // Initialize intersection observer for infinite scrolling
    function initInfiniteScroll() {
        // Create intersection observer
        window.scrollObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !loading && !allImagesLoaded) {
                    loadMoreImages();
                }
            });
        }, {
            rootMargin: '0px 0px 200px 0px' // Start loading when sentinel is 200px from viewport
        });

        // Create and position the sentinel element
        repositionSentinel();
    }

    // Load more images
    function loadMoreImages() {
        loading = true;

        // Calculate offset based on how many images are already in the grid
        const currentImageCount = document.querySelectorAll('.image-container').length;

        // Show loading indicator
        imageGrid.appendChild(loadingIndicator);

        // Get current filters from URL
        const urlParams = new URLSearchParams(window.location.search);
        const selectedSubfolder = urlParams.get('subfolder') || '';
        const searchQuery = urlParams.get('search') || '';
        const mediaType = urlParams.get('media_type') || 'all';

        // Build the query string with explicit offset
        let queryString = `offset=${currentImageCount}`;
        if (selectedSubfolder) {
            queryString += `&subfolder=${encodeURIComponent(selectedSubfolder)}`;
        }
        if (searchQuery) {
            queryString += `&search=${encodeURIComponent(searchQuery)}`;
        }
        if (mediaType && mediaType !== 'all') {
            queryString += `&media_type=${encodeURIComponent(mediaType)}`;
        }

        // Add safe mode parameter if enabled
        const safeMode = document.cookie.includes('safeMode=true');
        if (safeMode) {
            queryString += '&safe_mode=true';
        }

        // Build the final API URL
        const apiUrl = `/load_more_images?${queryString}`;

        // Fetch more images
        fetch(apiUrl)
            .then(response => response.json())
            .then(data => {
                // Remove loading indicator
                if (loadingIndicator.parentNode) {
                    loadingIndicator.parentNode.removeChild(loadingIndicator);
                }

                if (data.images && data.images.length > 0) {
                    // Append new images to the grid
                    appendImages(data.images);
                } else {
                    // No more images to load
                    allImagesLoaded = true;
                    const endMessage = document.createElement('div');
                    endMessage.className = 'col-12 text-center my-4';
                    endMessage.innerHTML = '<p>No more images to load</p>';
                    imageGrid.appendChild(endMessage);
                }

                loading = false;
            })
            .catch(error => {
                console.error('Error loading more images:', error);
                loading = false;

                // Remove loading indicator
                if (loadingIndicator.parentNode) {
                    loadingIndicator.parentNode.removeChild(loadingIndicator);
                }

                // Show error message
                const errorMessage = document.createElement('div');
                errorMessage.className = 'col-12 text-center my-4 text-danger';
                errorMessage.innerHTML = '<p>Error loading more images. Please try again.</p>';
                imageGrid.appendChild(errorMessage);
            });
    }

    // Sentinel element reference
    let sentinel;

    // Create or reposition the sentinel element
    function repositionSentinel() {
        // Remove existing sentinel if it exists
        const existingSentinel = document.querySelector('.sentinel');
        if (existingSentinel) {
            existingSentinel.remove();
        }

        // Create a new sentinel element
        sentinel = document.createElement('div');
        sentinel.className = 'sentinel';
        sentinel.style.height = '20px';
        sentinel.style.width = '100%';
        imageGrid.appendChild(sentinel);

        // Make sure the observer is watching the new sentinel
        if (window.scrollObserver) {
            window.scrollObserver.observe(sentinel);
        }
    }

    // Append new images to the grid
    function appendImages(images) {
        images.forEach(image => {
            // Create image container
            const imageContainer = document.createElement('div');
            imageContainer.className = 'image-container load-metadata gallery-item';
            imageContainer.dataset.filename = image.filename;
            imageContainer.dataset.subfolder = image.subfolder;
            imageContainer.dataset.mediaType = image.media_type || 'image';

            // Create media element (img or video)
            let mediaElement;
            if (image.media_type === 'video') {
                mediaElement = document.createElement('video');
                mediaElement.src = `/image/${image.subfolder}/${image.filename}`;
                mediaElement.className = 'thumbnail';
                mediaElement.preload = 'metadata';
                mediaElement.muted = true;
            } else {
                mediaElement = document.createElement('img');
                mediaElement.src = `/image/${image.subfolder}/${image.filename}`;
                mediaElement.alt = image.filename;
                mediaElement.className = 'thumbnail';
            }

            // Create metadata container
            const metadata = document.createElement('div');
            metadata.className = 'metadata';

            // Append elements
            imageContainer.appendChild(mediaElement);
            imageContainer.appendChild(metadata);

            // Add to grid
            imageGrid.appendChild(imageContainer);

            // Add click event
            imageContainer.addEventListener('click', function (e) {
                // Get the media URL and type
                const fullMediaUrl = mediaElement.src;
                const mediaType = image.media_type || 'image';

                // Show the preview panel with this media
                if (typeof showImagePreview === 'function') {
                    const index = Array.from(document.querySelectorAll('.image-container')).indexOf(this);
                    showImagePreview(fullMediaUrl, image.filename, image.subfolder, index, mediaType);
                }
            });

            // Load metadata for hover display
            fetch('/image_info/' + encodeURIComponent(image.filename))
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

                    metadata.innerHTML = metadataHtml;
                    metadata.dataset.loaded = 'true';
                });
        });

        // Reposition the sentinel element after adding new images
        repositionSentinel();

        // Update currentImages array in gallery.js
        if (typeof updateCurrentImages === 'function') {
            updateCurrentImages();
        }

        // Update keyboard nav
        if (window.galleryKeyboardNav && window.galleryKeyboardNav.updateGalleryItems) {
            window.galleryKeyboardNav.updateGalleryItems();
        }

        // NOTE: No need to apply media filter here - the server already filtered based on URL params
        // Applying client-side filter would hide server-filtered items and cause endless loading
    }

    // Initialize infinite scroll
    initInfiniteScroll();
});