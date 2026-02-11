/**
 * Hide Archive Toggle
 * Shows/hides archive folder content, similar to Safe Mode filter.
 */
document.addEventListener('DOMContentLoaded', function () {
    const archiveToggle = document.getElementById('hide-archive-toggle');

    if (archiveToggle) {
        // First check auth status to see if toggle requires permission
        fetch('/auth_status')
            .then(response => response.json())
            .then(authData => {
                const canToggle = authData.can_toggle_hide_archive;

                if (!canToggle) {
                    // User doesn't have permission - set up intercept
                    setuphideArchiveIntercept(archiveToggle);
                }

                inithideArchiveFromStorage();
            })
            .catch(() => {
                inithideArchiveFromStorage();
            });

        // Listen for toggle changes
        archiveToggle.addEventListener('change', function () {
            const isChecked = this.checked;
            localStorage.setItem('hideArchive', isChecked);
            applyhideArchiveFilter(isChecked);
        });
    }

    function inithideArchiveFromStorage() {
        const savedhideArchive = localStorage.getItem('hideArchive');

        if (savedhideArchive !== null) {
            // Use saved preference
            const hideArchive = savedhideArchive === 'true';
            archiveToggle.checked = hideArchive;
            applyhideArchiveFilter(hideArchive);
        } else {
            // First visit - use config default
            fetch('/auth_status')
                .then(response => response.json())
                .then(data => {
                    const defaulthideArchive = data.hide_archive_default || false;
                    archiveToggle.checked = defaulthideArchive;
                    localStorage.setItem('hideArchive', defaulthideArchive);
                    applyhideArchiveFilter(defaulthideArchive);
                });
        }
    }

    function applyhideArchiveFilter(enabled) {
        // Set cookie for server-side filtering
        document.cookie = 'hideArchive=' + enabled + '; path=/; max-age=31536000'; // 1 year

        // Reload page to apply filter (archive content is filtered server-side)
        // Check if current filter state matches what we need
        const currentCookie = document.cookie.includes('hideArchive=' + enabled);
        if (!currentCookie) {
            // Need to reload to apply the change
            setTimeout(() => {
                window.location.reload();
            }, 100);
        }
    }
});

/**
 * Set up intercept to require passphrase for Hide Archive toggle
 */
function setuphideArchiveIntercept(toggle) {
    toggle.addEventListener('click', function (e) {
        // Only intercept when trying to enable (show archive content)
        if (!this.checked) {
            // Check if already unlocked
            if (!window.authState?.hideArchiveUnlocked) {
                e.preventDefault();
                // Ensure function exists before calling (it's on window)
                if (window.showHideArchiveUnlockModal) {
                    window.showHideArchiveUnlockModal();
                } else {
                    console.error('showHideArchiveUnlockModal not found');
                }
            }
        }
    });
}
