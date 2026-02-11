/**
 * Settings Modal Handler
 * Loads and saves settings via API (admin only)
 */

// Show settings modal and load current settings
async function showSettingsModal() {
    // Check permissions first
    if (!window.authState.canAccessSettings) {
        if (window.authState.settingsPassphraseRequired) {
            showSettingsUnlockModal();
            return;
        } else {
            alert('Access Denied: You do not have permission to access settings.');
            return;
        }
    }

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
            errorDiv.textContent = 'Failed to load settings. Are you logged in with sufficient permissions?';
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
        'SAFE_MODE_DEFAULT', 'CONTENT_SCAN_DEFAULT', 'CONTENT_LOCK_DEFAULT', 'HIDE_ARCHIVE_DEFAULT',
        'AUTH_ENABLED', 'USER_PASSPHRASE', 'ADMIN_PASSPHRASE',
        'DELETE_LEVEL', 'FLAG_LEVEL', 'ARCHIVE_LEVEL',
        'DELETE_PASSPHRASE', 'FLAG_PASSPHRASE', 'ARCHIVE_PASSPHRASE',
        'SETTINGS_LEVEL', 'SETTINGS_PASSPHRASE',
        'TOGGLE_CONTENT_SCAN_LEVEL', 'TOGGLE_CONTENT_LOCK_LEVEL', 'TOGGLE_HIDE_ARCHIVE_LEVEL', 'TOGGLE_SAFEMODE_VIEW_LEVEL',
        'TOGGLE_CONTENT_SCAN_PASSPHRASE', 'TOGGLE_CONTENT_LOCK_PASSPHRASE', 'TOGGLE_ARCHIVE_PASSPHRASE', 'TOGGLE_SAFEMODE_PASSPHRASE',
        'CONTENT_SCAN_OFFSET', 'NUDITY_THRESHOLD', 'NSFW_KEYWORDS', 'NSFW_FOLDERS', 'NSFW_LABELS', 'SAFE_FOLDERS'
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

    // Hide settings button? No, always show it now per new spec
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
        settingsBtn.style.display = '';
    }
});

// Settings Unlock Modal Functions
function showSettingsUnlockModal() {
    const modal = document.getElementById('settings-unlock-modal');
    if (modal) {
        modal.style.display = 'block';
        modal.classList.add('show');
        document.body.classList.add('modal-open');
        const input = document.getElementById('settings-unlock-passphrase');
        if (input) setTimeout(() => input.focus(), 100);
    }
}

function hideSettingsUnlockModal() {
    const modal = document.getElementById('settings-unlock-modal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
        document.body.classList.remove('modal-open');
        document.getElementById('settings-unlock-passphrase').value = '';
        document.getElementById('settings-unlock-error').style.display = 'none';
    }
}

async function handleSettingsUnlock(event) {
    if (event) event.preventDefault();
    const passphrase = document.getElementById('settings-unlock-passphrase').value;
    const errorDiv = document.getElementById('settings-unlock-error');

    try {
        const response = await fetch('/unlock_settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ passphrase })
        });

        const data = await response.json();

        if (data.success) {
            hideSettingsUnlockModal();
            // Refresh auth state then show settings
            await checkAuthStatus();
            showSettingsModal();
        } else {
            if (errorDiv) {
                errorDiv.textContent = data.error || 'Invalid passphrase';
                errorDiv.style.display = 'block';
            }
        }
    } catch (error) {
        if (errorDiv) {
            errorDiv.textContent = 'Error unlocking settings';
            errorDiv.style.display = 'block';
        }
    }
}

// Make functions globally available
window.showSettingsModal = showSettingsModal;
window.hideSettingsModal = hideSettingsModal;
window.saveSettings = saveSettings;
