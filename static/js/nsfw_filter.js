// NSFW filter functionality
document.addEventListener('DOMContentLoaded', function () {
    // Get the toggle switch element
    const nsfwToggle = document.getElementById('nsfw-toggle');

    if (nsfwToggle) {
        // Check localStorage for saved preference
        const savedSafeMode = localStorage.getItem('safeMode');

        if (savedSafeMode !== null) {
            // Use saved preference
            const safeMode = savedSafeMode === 'true';
            nsfwToggle.checked = safeMode;
            applyNsfwFilter(safeMode);
        } else {
            // First visit - fetch config default from server
            fetch('/get_content_scan_status')
                .then(response => response.json())
                .then(data => {
                    const defaultSafeMode = data.safe_mode_default || false;
                    nsfwToggle.checked = defaultSafeMode;
                    localStorage.setItem('safeMode', defaultSafeMode);
                    applyNsfwFilter(defaultSafeMode);
                })
                .catch(() => {
                    // If fetch fails, default to off
                    nsfwToggle.checked = false;
                    applyNsfwFilter(false);
                });
        }

        // Add event listener for toggle changes
        nsfwToggle.addEventListener('change', function () {
            const isChecked = this.checked;

            // Save preference to localStorage
            localStorage.setItem('safeMode', isChecked);

            // Apply the filter
            applyNsfwFilter(isChecked);

            // Reload the page to apply the filter to all images
            window.location.reload();
        });
    }
});

// Function to apply NSFW filter
function applyNsfwFilter(enabled) {
    // Set a cookie to store the preference server-side
    document.cookie = 'safeMode=' + enabled + '; path=/; max-age=31536000'; // 1 year expiration

    console.log('NSFW filter ' + (enabled ? 'enabled' : 'disabled'));
}