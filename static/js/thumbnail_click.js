// Thumbnail click functionality for Home page
document.addEventListener('DOMContentLoaded', function () {

    // Function to handle thumbnail clicks
    function setupThumbnailClicks() {
        const thumbnailLinks = document.querySelectorAll('.thumbnail-link');
        const mainImageContainer = document.querySelector('.main-image-container');

        if (!thumbnailLinks.length || !mainImageContainer) return;

        thumbnailLinks.forEach(link => {
            link.addEventListener('click', function (e) {
                e.preventDefault();

                // Get the media URL, filename and subfolder
                const mediaUrl = this.getAttribute('href');
                const filename = this.dataset.filename;
                const subfolder = this.dataset.subfolder;
                const mediaType = this.dataset.mediaType || 'image';

                // Update the main image container
                updateMainImage(mediaUrl, filename, subfolder, mediaType);

                // Highlight selected thumbnail
                highlightSelectedThumbnail(this);
            });
        });
    }

    // Add active class to highlight selected thumbnail
    function highlightSelectedThumbnail(selectedLink) {
        // Remove active class from all thumbnails
        document.querySelectorAll('.thumbnail-link').forEach(link => {
            link.parentElement.classList.remove('selected');
        });

        // Add active class to selected thumbnail
        if (selectedLink) {
            selectedLink.parentElement.classList.add('selected');
        }
    }

    // Function to update the main image
    function updateMainImage(mediaUrl, filename, subfolder, mediaType) {
        const mainImageContainer = document.querySelector('.main-image-container');
        if (!mainImageContainer) return;

        // Get control buttons HTML to preserve them
        const controls = `
            <button id="image-size-toggle" class="image-size-toggle" title="Stretch to Fill">
                <i class="bi bi-arrows-angle-expand"></i>
            </button>
            <button id="display-mode-toggle" class="display-mode-toggle" title="Display Mode: Contain">
                <i class="bi bi-aspect-ratio"></i>
            </button>
        `;

        // Create media element based on type
        let mediaElement;
        if (mediaType === 'video') {
            mediaElement = `<video src="${mediaUrl}" controls class="hero-image" preload="metadata"></video>`;
        } else {
            mediaElement = `<img src="${mediaUrl}" alt="Selected Media" class="hero-image">`;
        }

        // Create the new HTML for the main image container
        const html = controls + `
            <div class="image-container hero-view load-metadata" data-filename="${filename}" data-subfolder="${subfolder}" data-media-type="${mediaType}">
                ${mediaElement}
                <div class="metadata">
                    <!-- Metadata will be loaded via JavaScript -->
                </div>
            </div>
        `;

        // Update the main image container
        mainImageContainer.innerHTML = html;

        // Reinitialize display mode toggle
        if (window.initDisplayModeToggle) {
            window.initDisplayModeToggle();
        }

        // Load metadata for the new media
        const newImageContainer = mainImageContainer.querySelector('.load-metadata');
        if (newImageContainer) {
            const metadataContainer = newImageContainer.querySelector('.metadata');

            if (metadataContainer && !metadataContainer.dataset.loaded) {
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
                        if (data.subfolder || subfolder) {
                            metadataHtml += `<p><strong>Folder:</strong> ${data.subfolder || subfolder}</p>`;
                        }

                        metadataContainer.innerHTML = metadataHtml;
                        metadataContainer.dataset.loaded = 'true';
                    });
            }
        }
    }

    // Set up thumbnail clicks
    setupThumbnailClicks();
});
