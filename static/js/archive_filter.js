/**
 * Archive View Toggle
 * Shows/hides archive folder content, similar to Safe Mode filter.
 */
document.addEventListener('DOMContentLoaded', function () {
    const archiveToggle = document.getElementById('archive-view-toggle');

    if (archiveToggle) {
        // First check auth status to see if toggle requires permission
        fetch('/auth_status')
            .then(response => response.json())
            .then(authData => {
                const canToggle = authData.can_toggle_archive_view;

                if (!canToggle) {
                    // User doesn't have permission - set up intercept
                    setupArchiveViewIntercept(archiveToggle);
                }

                initArchiveViewFromStorage();
            })
            .catch(() => {
                initArchiveViewFromStorage();
            });

        // Listen for toggle changes
        archiveToggle.addEventListener('change', function () {
            const isChecked = this.checked;
            localStorage.setItem('archiveView', isChecked);
            applyArchiveViewFilter(isChecked);
        });
    }

    function initArchiveViewFromStorage() {
        const savedArchiveView = localStorage.getItem('archiveView');

        if (savedArchiveView !== null) {
            // Use saved preference
            const archiveView = savedArchiveView === 'true';
            archiveToggle.checked = archiveView;
            applyArchiveViewFilter(archiveView);
        } else {
            // First visit - use config default
            fetch('/auth_status')
                .then(response => response.json())
                .then(data => {
                    const defaultArchiveView = data.archive_view_default || false;
                    archiveToggle.checked = defaultArchiveView;
                    localStorage.setItem('archiveView', defaultArchiveView);
                    applyArchiveViewFilter(defaultArchiveView);
                });
        }
    }

    function applyArchiveViewFilter(enabled) {
        // Set cookie for server-side filtering
        document.cookie = 'archiveView=' + enabled + '; path=/; max-age=31536000'; // 1 year

        // Reload page to apply filter (archive content is filtered server-side)
        // Check if current filter state matches what we need
        const currentCookie = document.cookie.includes('archiveView=' + enabled);
        if (!currentCookie) {
            // Need to reload to apply the change
            setTimeout(() => {
                window.location.reload();
            }, 100);
        }
    }
});

/**
 * Set up intercept to require passphrase for archive view toggle
 */
function setupArchiveViewIntercept(toggle) {
    toggle.addEventListener('click', function (e) {
        // Only intercept when trying to enable (show archive content)
        if (!this.checked) {
            // Check if already unlocked
            if (!window.authState?.archive_view_unlocked) {
                e.preventDefault();
                showArchiveViewUnlockModal();
            }
        }
    });
}
