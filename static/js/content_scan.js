// Content Scan Toggle and Gallery Scan Button functionality

document.addEventListener('DOMContentLoaded', function () {
    // Content Scan Toggle
    const contentScanToggle = document.getElementById('content-scan-toggle');

    if (contentScanToggle) {
        // Always sync FROM server on page load (server is source of truth)
        fetch('/get_content_scan_status')
            .then(response => response.json())
            .then(data => {
                // Server state is authoritative - update UI and localStorage to match
                contentScanToggle.checked = data.enabled;
                localStorage.setItem('contentScanEnabled', data.enabled);
            })
            .catch(() => {
                // If server request fails, use local state as fallback
                contentScanToggle.checked = localStorage.getItem('contentScanEnabled') === 'true';
            });

        // Handle toggle change
        contentScanToggle.addEventListener('change', function () {
            const isEnabled = this.checked;

            // Save to localStorage
            localStorage.setItem('contentScanEnabled', isEnabled);

            // Send to server
            fetch('/toggle_content_scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled: isEnabled })
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        console.log('[ContentScan] ' + (data.enabled ? 'Enabled' : 'Disabled'));
                    }
                })
                .catch(error => {
                    console.error('[ContentScan] Error toggling:', error);
                    // Revert toggle on error
                    this.checked = !isEnabled;
                    localStorage.setItem('contentScanEnabled', !isEnabled);
                });
        });
    }

    // Gallery Scan Content Button
    const scanContentBtn = document.getElementById('scan-content-btn');
    const scanProgressContainer = document.getElementById('scan-progress-container');
    const scanProgressBar = document.getElementById('scan-progress-bar');
    const scanProgressText = document.getElementById('scan-progress-text');

    if (scanContentBtn) {
        scanContentBtn.addEventListener('click', function () {
            // Get current subfolder from URL
            const urlParams = new URLSearchParams(window.location.search);
            const subfolder = urlParams.get('subfolder') || '';

            // Confirm action
            const folderName = subfolder || 'ALL folders';
            if (!confirm(`Scan "${folderName}" for NSFW content?\n\nThis will move detected files to NSFW subfolders.`)) {
                return;
            }

            // Disable button and show progress
            scanContentBtn.disabled = true;
            scanContentBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Scanning...';

            if (scanProgressContainer) {
                scanProgressContainer.style.display = 'block';
            }

            // Start scan
            fetch('/scan_folder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subfolder: subfolder })
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        console.log('[ContentScan] Scan started');
                        // Poll for progress
                        pollScanProgress();
                    } else {
                        alert('Error starting scan: ' + (data.error || 'Unknown error'));
                        resetScanButton();
                    }
                })
                .catch(error => {
                    console.error('[ContentScan] Error starting scan:', error);
                    alert('Error starting scan');
                    resetScanButton();
                });
        });
    }

    function pollScanProgress() {
        fetch('/scan_status')
            .then(response => response.json())
            .then(data => {
                updateProgress(data);

                if (!data.complete) {
                    // Continue polling
                    setTimeout(pollScanProgress, 500);
                } else {
                    // Scan complete
                    setTimeout(() => {
                        resetScanButton();
                        if (data.moved > 0) {
                            alert(`Scan complete!\n\nProcessed: ${data.processed} files\nMoved to NSFW: ${data.moved} files`);
                        } else {
                            alert(`Scan complete!\n\nProcessed: ${data.processed} files\nNo NSFW content detected.`);
                        }
                        // Always reload page to refresh gallery and clear empty placeholders
                        window.location.reload();
                    }, 500);
                }
            })
            .catch(error => {
                console.error('[ContentScan] Error getting status:', error);
                resetScanButton();
            });
    }

    function updateProgress(data) {
        if (scanProgressBar && data.total > 0) {
            const percent = Math.round((data.processed / data.total) * 100);
            scanProgressBar.style.width = percent + '%';
            scanProgressBar.setAttribute('aria-valuenow', percent);
        }

        if (scanProgressText) {
            scanProgressText.textContent = `Scanned ${data.processed} of ${data.total} (${data.moved} moved)`;
        }
    }

    function resetScanButton() {
        if (scanContentBtn) {
            scanContentBtn.disabled = false;
            scanContentBtn.innerHTML = '<i class="bi bi-shield-exclamation"></i> Scan Content';
        }

        if (scanProgressContainer) {
            scanProgressContainer.style.display = 'none';
        }

        if (scanProgressBar) {
            scanProgressBar.style.width = '0%';
        }
    }

    // Listen for WebSocket progress updates
    if (typeof io !== 'undefined') {
        const socket = io();
        socket.on('scan_progress', function (data) {
            updateProgress(data);
        });
    }
});
