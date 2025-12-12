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
                }
            })
            .catch(error => {
                console.error('[LIVE UPDATE] Error checking for updates:', error);
            });
    }, 3000); // Check every 3 seconds
});
