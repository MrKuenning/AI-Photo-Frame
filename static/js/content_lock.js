// Content Lock toggle functionality
document.addEventListener('DOMContentLoaded', function () {
    const contentLockToggle = document.getElementById('content-lock-toggle');

    if (contentLockToggle) {
        // Initialize toggle state from localStorage, cookie or config default
        const contentLockStorage = localStorage.getItem('contentLock');
        const contentLockCookie = getCookie('contentLock');

        if (contentLockStorage !== null) {
            contentLockToggle.checked = contentLockStorage === 'true';
            // Ensure cookie is in sync
            if (contentLockCookie !== contentLockStorage) {
                setCookie('contentLock', contentLockStorage, 365);
            }
        } else if (contentLockCookie !== null) {
            contentLockToggle.checked = contentLockCookie === 'true';
            localStorage.setItem('contentLock', contentLockCookie);
        } else {
            // Use server default from config
            fetch('/auth_status')
                .then(r => r.json())
                .then(data => {
                    const defaultState = data.content_lock_default || false;
                    contentLockToggle.checked = defaultState;
                    localStorage.setItem('contentLock', defaultState);
                    setCookie('contentLock', defaultState, 365);
                });
        }

        // Handle toggle changes
        contentLockToggle.addEventListener('change', function () {
            // Only require permission when turning OFF (unchecking/unlocking)
            // Enabling (checking/locking) is allowed for everyone (like Safe Mode)
            if (!this.checked && !window.authState?.canToggleContentLock) {
                // Revert toggle
                this.checked = !this.checked;
                showContentLockUnlockModal();
                return;
            }

            // Save state to storage and cookie, then refresh
            const isChecked = this.checked;
            localStorage.setItem('contentLock', isChecked);
            setCookie('contentLock', isChecked, 365);
            location.reload();
        });
    }
});

function showContentLockUnlockModal() {
    const modal = document.getElementById('content-lock-unlock-modal');
    if (modal) {
        modal.style.display = 'block';
        document.getElementById('content-lock-passphrase').focus();
    }
}

function hideContentLockUnlockModal() {
    const modal = document.getElementById('content-lock-unlock-modal');
    if (modal) {
        modal.style.display = 'none';
        document.getElementById('content-lock-passphrase').value = '';
        document.getElementById('content-lock-unlock-error').style.display = 'none';
    }
}

async function handleContentLockUnlock(event) {
    event.preventDefault();
    const passphrase = document.getElementById('content-lock-passphrase').value;
    const errorDiv = document.getElementById('content-lock-unlock-error');

    try {
        const response = await fetch('/unlock_content_lock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ passphrase })
        });

        const data = await response.json();

        if (data.success) {
            hideContentLockUnlockModal();
            // Toggle the content lock
            const toggle = document.getElementById('content-lock-toggle');
            if (toggle) {
                toggle.checked = !toggle.checked;
                setCookie('contentLock', toggle.checked, 365);
                location.reload();
            }
        } else {
            errorDiv.textContent = data.error || 'Invalid passphrase';
            errorDiv.style.display = 'block';
        }
    } catch (error) {
        errorDiv.textContent = 'Error unlocking Content Lock';
        errorDiv.style.display = 'block';
    }
}

// Helper functions (if not already defined globally)
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

function setCookie(name, value, days) {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${value}; expires=${expires}; path=/`;
}
