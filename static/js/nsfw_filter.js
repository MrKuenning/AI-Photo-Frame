// NSFW filter functionality
document.addEventListener('DOMContentLoaded', function () {
    // Get the toggle switch element
    const nsfwToggle = document.getElementById('nsfw-toggle');

    if (nsfwToggle) {
        // First check auth status to see if safemode lock is enabled
        fetch('/auth_status')
            .then(response => response.json())
            .then(authData => {
                const canToggle = authData.can_toggle_safemode;

                if (!canToggle) {
                    // User doesn't have permission - force safemode ON and set up intercept
                    console.log('[NSFW Filter] Safemode is locked, forcing ON');
                    nsfwToggle.checked = true;
                    applyNsfwFilter(true);
                    localStorage.setItem('safeMode', 'true');

                    // Intercept click to block unauthorized toggle
                    nsfwToggle.addEventListener('click', function (e) {
                        if (!window.authState?.canToggleSafemode) {
                            e.preventDefault();
                            e.stopPropagation();
                            if (typeof showSafemodeUnlockModal === 'function') {
                                showSafemodeUnlockModal();
                            }
                            return false;
                        }
                    }, false);
                    return;
                }

                // Has permission - use normal localStorage logic
                initSafeModeFromStorage();
            })
            .catch(() => {
                // If auth check fails, fall back to localStorage
                initSafeModeFromStorage();
            });

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

    function initSafeModeFromStorage() {
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
    }
});

// Function to apply NSFW filter
function applyNsfwFilter(enabled) {
    // Set a cookie to store the preference server-side
    document.cookie = 'safeMode=' + enabled + '; path=/; max-age=31536000'; // 1 year expiration

    console.log('NSFW filter ' + (enabled ? 'enabled' : 'disabled'));
}