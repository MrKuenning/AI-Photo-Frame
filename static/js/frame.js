// Polling-based auto-update for Picture Frame page
document.addEventListener('DOMContentLoaded', () => {
    // Initialize event listeners for metadata overlay
    initializeEventListeners();

    // Track the current image filename
    let currentFilename = document.querySelector('.image-container')?.dataset.filename;

    console.log('[FRAME] Starting auto-update polling...');
    console.log('[FRAME] Current image:', currentFilename);

    // Poll for new images every 3 seconds
    setInterval(() => {
        fetch('/frame')
            .then(response => response.text())
            .then(html => {
                const parser = new DOMParser();
                const newDoc = parser.parseFromString(html, 'text/html');

                // Get the new image filename
                const newImageContainer = newDoc.querySelector('.image-container');
                const newFilename = newImageContainer?.dataset.filename;

                // Check if the image has changed
                if (newFilename && newFilename !== currentFilename) {
                    console.log('[FRAME] 🔔 NEW IMAGE DETECTED!');
                    console.log('[FRAME] Old:', currentFilename);
                    console.log('[FRAME] New:', newFilename);

                    const currentImageContainer = document.querySelector('.image-container');

                    if (newImageContainer && currentImageContainer) {
                        // Check if it's a video or image
                        const newMedia = newImageContainer.querySelector('img, video');
                        const currentMedia = currentImageContainer.querySelector('img, video');

                        if (newMedia && currentMedia) {
                            // If media type changed (img to video or vice versa), replace the element
                            if (newMedia.tagName !== currentMedia.tagName) {
                                currentMedia.replaceWith(newMedia.cloneNode(true));
                            } else {
                                // Same type, just update the src
                                currentMedia.src = newMedia.src;
                            }

                            // Update data attributes
                            currentImageContainer.dataset.filename = newImageContainer.dataset.filename;
                            currentImageContainer.dataset.subfolder = newImageContainer.dataset.subfolder;
                            currentImageContainer.dataset.mediaType = newImageContainer.dataset.mediaType;

                            // Reset metadata loaded state
                            const metadataContainer = currentImageContainer.querySelector('.metadata');
                            if (metadataContainer) {
                                metadataContainer.dataset.loaded = 'false';
                                metadataContainer.innerHTML = '';
                            }

                            // Update current filename tracker
                            currentFilename = newFilename;

                            console.log('[FRAME] ✅ Image updated successfully!');
                        }
                    }

                    // Reinitialize event listeners
                    initializeEventListeners();
                }
            })
            .catch(error => {
                console.error('[FRAME] Error checking for updates:', error);
            });
    }, 3000); // Check every 3 seconds


    // Function to reinitialize event listeners after content update
    function initializeEventListeners() {
        // Load image metadata when hovering over images
        document.querySelectorAll('.load-metadata').forEach(function (element) {
            element.addEventListener('mouseenter', function () {
                const metadataContainer = this.querySelector('.metadata');
                const filename = this.dataset.filename;
                const subfolder = this.dataset.subfolder;

                if (metadataContainer && !metadataContainer.dataset.loaded) {
                    loadMetadata(filename, metadataContainer, subfolder);
                }
            });
        });
    }
});