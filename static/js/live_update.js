// Live auto-update for Home page
document.addEventListener('DOMContentLoaded', function () {
    // Track the current latest image filename
    let currentLatestFilename = document.querySelector('.hero-view')?.dataset.filename;

    console.log('[LIVE UPDATE] Starting auto-update polling...');
    console.log('[LIVE UPDATE] Current latest image:', currentLatestFilename);

    // Poll for new images every 3 seconds
    setInterval(() => {
        fetch('/')
            .then(response => response.text())
            .then(html => {
                const parser = new DOMParser();
                const newDoc = parser.parseFromString(html, 'text/html');

                // Get the new latest image filename
                const newHeroView = newDoc.querySelector('.hero-view');
                const newLatestFilename = newHeroView?.dataset.filename;

                // Check if a new image has been added
                if (newLatestFilename && newLatestFilename !== currentLatestFilename) {
                    console.log('[LIVE UPDATE] 🔔 NEW IMAGE DETECTED!');
                    console.log('[LIVE UPDATE] Old:', currentLatestFilename);
                    console.log('[LIVE UPDATE] New:', newLatestFilename);

                    // Update the hero view with the new latest image
                    const currentHeroView = document.querySelector('.hero-view');

                    if (newHeroView && currentHeroView) {
                        // Get media elements
                        const newMedia = newHeroView.querySelector('img, video');
                        const currentMedia = currentHeroView.querySelector('img, video');

                        if (newMedia && currentMedia) {
                            // If media type changed (img to video or vice versa), replace the element
                            if (newMedia.tagName !== currentMedia.tagName) {
                                currentMedia.replaceWith(newMedia.cloneNode(true));
                            } else {
                                // Same type, just update the src
                                currentMedia.src = newMedia.src;
                                currentMedia.alt = newMedia.alt;
                            }

                            // Update data attributes
                            currentHeroView.dataset.filename = newHeroView.dataset.filename;
                            currentHeroView.dataset.subfolder = newHeroView.dataset.subfolder;
                            currentHeroView.dataset.mediaType = newHeroView.dataset.mediaType;

                            // Reset metadata loaded state to allow reload on hover
                            const metadataContainer = currentHeroView.querySelector('.metadata');
                            if (metadataContainer) {
                                metadataContainer.dataset.loaded = 'false';
                                metadataContainer.innerHTML = '';
                            }

                            // Update current filename tracker
                            currentLatestFilename = newLatestFilename;

                            console.log('[LIVE UPDATE] ✅ Hero view updated successfully!');
                        }
                    }

                    // Update thumbnail sidebar
                    const newThumbnailGrid = newDoc.querySelector('.thumbnail-grid');
                    const currentThumbnailGrid = document.querySelector('.thumbnail-grid');

                    if (newThumbnailGrid && currentThumbnailGrid) {
                        // Replace entire thumbnail grid content
                        currentThumbnailGrid.innerHTML = newThumbnailGrid.innerHTML;

                        // Re-attach click event listeners to new thumbnails
                        const thumbnailLinks = currentThumbnailGrid.querySelectorAll('.thumbnail-link');
                        thumbnailLinks.forEach(link => {
                            link.addEventListener('click', function (e) {
                                e.preventDefault();
                                const url = this.href;
                                const container = this.closest('.image-container');
                                const mediaType = container ? container.dataset.mediaType : 'image';
                                const filename = this.dataset.filename;
                                const subfolder = this.dataset.subfolder;

                                // Get the hero view container
                                const heroContainer = document.querySelector('.image-container.hero-view');
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
                                    videoElement.playsInline = true;
                                    videoElement.setAttribute('playsinline', '');
                                    videoElement.setAttribute('webkit-playsinline', '');
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

                                // Re-add metadata div and reset
                                if (metadata) {
                                    metadata.innerHTML = '';
                                    delete metadata.dataset.loaded;
                                    heroContainer.appendChild(metadata);
                                }

                                // Highlight selected
                                document.querySelectorAll('.thumbnail-only').forEach(t => t.classList.remove('selected'));
                                this.closest('.thumbnail-only').classList.add('selected');
                            });
                        });

                        // Highlight the first thumbnail
                        const firstThumbnail = currentThumbnailGrid.querySelector('.thumbnail-link');
                        if (firstThumbnail) {
                            firstThumbnail.closest('.thumbnail-only').classList.add('selected');
                        }

                        console.log('[LIVE UPDATE] ✅ Thumbnail sidebar refreshed!');
                    }
                }
            })
            .catch(error => {
                console.error('[LIVE UPDATE] Error checking for updates:', error);
            });
    }, 3000); // Check every 3 seconds
});
