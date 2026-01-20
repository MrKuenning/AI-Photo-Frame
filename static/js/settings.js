/**
 * Settings Modal Handler
 * Loads and saves settings via API (admin only)
 */

// Show settings modal and load current settings
async function showSettingsModal() {
    const modal = document.getElementById('settings-modal');
    const errorDiv = document.getElementById('settings-error');
    const successDiv = document.getElementById('settings-success');

    if (!modal) return;

    // Hide any previous messages
    if (errorDiv) errorDiv.style.display = 'none';
    if (successDiv) successDiv.style.display = 'none';

    // Show modal
    modal.classList.add('show');
    modal.style.display = 'block';
    document.body.classList.add('modal-open');

    // Load current settings
    try {
        const response = await fetch('/settings');
        const data = await response.json();

        if (!data.success) {
            if (errorDiv) {
                errorDiv.textContent = data.error || 'Failed to load settings';
                errorDiv.style.display = 'block';
            }
            return;
        }

        const settings = data.settings;

        // Populate form fields
        for (const [key, value] of Object.entries(settings)) {
            // Special handling for NSFW_LABELS checkboxes
            if (key === 'NSFW_LABELS') {
                const labels = value.split(',').map(l => l.trim()).filter(l => l);
                document.querySelectorAll('.nsfw-label-check').forEach(checkbox => {
                    checkbox.checked = labels.includes(checkbox.value);
                });
                continue;
            }

            const input = document.getElementById(`setting-${key}`);
            if (!input) continue;

            if (input.type === 'checkbox') {
                input.checked = value === true || value === 'true';
            } else if (input.tagName === 'SELECT') {
                input.value = value;
            } else if (input.type === 'range') {
                input.value = value;
                // Update range display
                if (key === 'NUDITY_THRESHOLD') {
                    const display = document.getElementById('threshold-value');
                    if (display) display.textContent = value;
                }
            } else {
                input.value = value;
            }
        }

    } catch (error) {
        console.error('Error loading settings:', error);
        if (errorDiv) {
            errorDiv.textContent = 'Failed to load settings. Are you logged in as admin?';
            errorDiv.style.display = 'block';
        }
    }
}

// Hide settings modal
function hideSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
    }
}

// Save settings
async function saveSettings() {
    const errorDiv = document.getElementById('settings-error');
    const successDiv = document.getElementById('settings-success');

    // Hide previous messages
    if (errorDiv) errorDiv.style.display = 'none';
    if (successDiv) successDiv.style.display = 'none';

    // Collect all settings
    const settings = {};
    const settingFields = [
        'IMAGE_FOLDER', 'MAX_INITIAL_LOAD',
        'SAFE_MODE_DEFAULT', 'CONTENT_SCAN_DEFAULT', 'HIDE_ARCHIVE_DEFAULT',
        'AUTH_ENABLED', 'USER_PASSPHRASE', 'ADMIN_PASSPHRASE',
        'DELETE_LEVEL', 'FLAG_LEVEL', 'ARCHIVE_LEVEL',
        'TOGGLE_CONTENT_SCAN_LEVEL', 'TOGGLE_HIDE_ARCHIVE_LEVEL', 'TOGGLE_SAFEMODE_VIEW_LEVEL',
        'TOGGLE_CONTENT_SCAN_PASSPHRASE', 'TOGGLE_ARCHIVE_PASSPHRASE', 'TOGGLE_SAFEMODE_PASSPHRASE',
        'CONTENT_SCAN_OFFSET', 'NUDITY_THRESHOLD', 'NSFW_KEYWORDS', 'NSFW_FOLDERS', 'NSFW_LABELS'
    ];

    for (const key of settingFields) {
        // Special handling for NSFW_LABELS checkboxes
        if (key === 'NSFW_LABELS') {
            const checkedLabels = [];
            document.querySelectorAll('.nsfw-label-check:checked').forEach(checkbox => {
                checkedLabels.push(checkbox.value);
            });
            settings[key] = checkedLabels.join(', ');
            continue;
        }

        const input = document.getElementById(`setting-${key}`);
        if (!input) continue;

        if (input.type === 'checkbox') {
            settings[key] = input.checked;
        } else if (input.type === 'number' || input.type === 'range') {
            settings[key] = parseFloat(input.value);
        } else {
            settings[key] = input.value;
        }
    }

    try {
        const response = await fetch('/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ settings })
        });

        const data = await response.json();

        if (data.success) {
            if (successDiv) {
                successDiv.textContent = 'Settings saved successfully! Some changes may require a page refresh.';
                successDiv.style.display = 'block';
            }
            // Hide success message and modal after delay
            setTimeout(() => {
                hideSettingsModal();
            }, 1500);
        } else {
            if (errorDiv) {
                errorDiv.textContent = data.error || 'Failed to save settings';
                errorDiv.style.display = 'block';
            }
        }
    } catch (error) {
        console.error('Error saving settings:', error);
        if (errorDiv) {
            errorDiv.textContent = 'Failed to save settings. Check console for details.';
            errorDiv.style.display = 'block';
        }
    }
}

// Initialize settings UI handlers
document.addEventListener('DOMContentLoaded', function () {
    // Update threshold display when slider moves
    const thresholdSlider = document.getElementById('setting-NUDITY_THRESHOLD');
    const thresholdDisplay = document.getElementById('threshold-value');

    if (thresholdSlider && thresholdDisplay) {
        thresholdSlider.addEventListener('input', function () {
            thresholdDisplay.textContent = this.value;
        });
    }

    // Hide settings button if not admin
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
        fetch('/auth_status')
            .then(response => response.json())
            .then(data => {
                // Show settings button only for admins, or when auth is disabled
                if (!data.auth_required || data.role === 'admin') {
                    settingsBtn.style.display = '';
                } else {
                    settingsBtn.style.display = 'none';
                }
            })
            .catch(() => {
                // If auth check fails, hide settings button
                settingsBtn.style.display = 'none';
            });
    }
});

// Make functions globally available
window.showSettingsModal = showSettingsModal;
window.hideSettingsModal = hideSettingsModal;
window.saveSettings = saveSettings;
