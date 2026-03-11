// Metadata Extraction Toggle functionality

document.addEventListener('DOMContentLoaded', function () {
    // Metadata Extraction Toggle
    const metadataExtractionToggle = document.getElementById('metadata-extraction-toggle');

    if (metadataExtractionToggle) {
        // Always sync FROM server on page load (server is source of truth)
        fetch('/get_metadata_extraction_status')
            .then(response => response.json())
            .then(data => {
                // Server state is authoritative - update UI and localStorage to match
                metadataExtractionToggle.checked = data.enabled;
                localStorage.setItem('metadataExtractionEnabled', data.enabled);
            })
            .catch(() => {
                // If server request fails, use local state as fallback
                metadataExtractionToggle.checked = localStorage.getItem('metadataExtractionEnabled') === 'true';
            });

        // Check permissions and set up intercept if needed
        fetch('/auth_status')
            .then(response => response.json())
            .then(authData => {
                if (!authData.can_toggle_metadata_extraction) {
                    // Intercept click to block unauthorized toggle
                    metadataExtractionToggle.addEventListener('click', function (e) {
                        // Only intercept when turning OFF (unchecking)
                        // Enabling (checking) is allowed for everyone
                        if (!this.checked && !window.authState?.canToggleMetadataExtraction) {
                            e.preventDefault();
                            e.stopPropagation();
                            if (typeof showMetadataExtractionUnlockModal === 'function') {
                                showMetadataExtractionUnlockModal();
                            }
                            return false;
                        }
                    }, false);
                }
            })
            .catch(() => { /* Ignore auth check failure */ });

        // Handle toggle change
        metadataExtractionToggle.addEventListener('change', function () {
            const isEnabled = this.checked;

            // Save to localStorage
            localStorage.setItem('metadataExtractionEnabled', isEnabled);

            // Send to server
            fetch('/toggle_metadata_extraction', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled: isEnabled })
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        console.log('[MetadataExtraction] ' + (data.enabled ? 'Enabled' : 'Disabled'));
                    }
                })
                .catch(error => {
                    console.error('[MetadataExtraction] Error toggling:', error);
                    // Revert toggle on error
                    this.checked = !isEnabled;
                    localStorage.setItem('metadataExtractionEnabled', !isEnabled);
                });
        });
    }
});
