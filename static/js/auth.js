// Authentication handling for Photo Frame app
document.addEventListener('DOMContentLoaded', function () {
    // Check auth status on page load
    checkAuthStatus();
});

// Global auth state
window.authState = {
    authRequired: false,
    authenticated: false,
    role: null,
    canDelete: true,
    canToggleSafemode: true,
    safemodeUnlocked: false,
    safemodeLockEnabled: false
};

// Check authentication status
async function checkAuthStatus() {
    try {
        const response = await fetch('/auth_status');
        const data = await response.json();

        window.authState = {
            authRequired: data.auth_required,
            authenticated: data.authenticated,
            role: data.role,
            canDelete: data.can_delete,
            canToggleSafemode: data.can_toggle_safemode,
            safemodeUnlocked: data.safemode_unlocked,
            safemodeLockEnabled: data.safemode_lock_enabled
        };

        // Show login modal and overlay if auth required and not authenticated
        if (data.auth_required && !data.authenticated) {
            showAuthOverlay();
            showLoginModal();
        } else {
            hideAuthOverlay();
        }

        // Update UI based on permissions
        updateUIPermissions();

        // Set up safemode toggle intercept after we know the auth state
        setupSafemodeIntercept();

    } catch (error) {
        console.error('Error checking auth status:', error);
    }
}

// Show login modal
function showLoginModal() {
    const modal = document.getElementById('login-modal');
    if (modal) {
        modal.classList.add('show');
        modal.style.display = 'block';
        document.body.classList.add('modal-open');

        // Focus passphrase input
        const input = modal.querySelector('#login-passphrase');
        if (input) {
            setTimeout(() => input.focus(), 100);
        }
    }
}

// Hide login modal
function hideLoginModal() {
    const modal = document.getElementById('login-modal');
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
    }
}

// Handle login form submission
async function handleLogin(event) {
    if (event) event.preventDefault();

    const passphraseInput = document.getElementById('login-passphrase');
    const rememberCheckbox = document.getElementById('login-remember');
    const errorDiv = document.getElementById('login-error');

    const passphrase = passphraseInput ? passphraseInput.value : '';
    const remember = rememberCheckbox ? rememberCheckbox.checked : false;

    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ passphrase, remember })
        });

        const data = await response.json();

        if (data.success) {
            hideLoginModal();
            // Refresh auth state
            await checkAuthStatus();
            // Clear input
            if (passphraseInput) passphraseInput.value = '';
            if (errorDiv) errorDiv.style.display = 'none';
        } else {
            // Show error
            if (errorDiv) {
                errorDiv.textContent = data.error || 'Invalid passphrase';
                errorDiv.style.display = 'block';
            }
            if (passphraseInput) {
                passphraseInput.value = '';
                passphraseInput.focus();
            }
        }
    } catch (error) {
        console.error('Login error:', error);
        if (errorDiv) {
            errorDiv.textContent = 'Connection error. Please try again.';
            errorDiv.style.display = 'block';
        }
    }
}

// Handle logout
async function handleLogout() {
    try {
        await fetch('/logout', { method: 'POST' });
        // Reload page to reset state
        window.location.reload();
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Show safemode unlock modal
function showSafemodeUnlockModal() {
    const modal = document.getElementById('safemode-unlock-modal');
    if (modal) {
        modal.classList.add('show');
        modal.style.display = 'block';
        document.body.classList.add('modal-open');

        // Focus passphrase input
        const input = modal.querySelector('#safemode-passphrase');
        if (input) {
            setTimeout(() => input.focus(), 100);
        }
    }
}

// Hide safemode unlock modal
function hideSafemodeUnlockModal() {
    const modal = document.getElementById('safemode-unlock-modal');
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
    }
}

// Handle safemode unlock
async function handleSafemodeUnlock(event) {
    if (event) event.preventDefault();

    const passphraseInput = document.getElementById('safemode-passphrase');
    const errorDiv = document.getElementById('safemode-unlock-error');

    const passphrase = passphraseInput ? passphraseInput.value : '';

    try {
        const response = await fetch('/unlock_safemode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ passphrase })
        });

        const data = await response.json();

        if (data.success) {
            hideSafemodeUnlockModal();
            // Update auth state
            window.authState.safemodeUnlocked = true;
            window.authState.canToggleSafemode = true;
            // Clear input
            if (passphraseInput) passphraseInput.value = '';
            if (errorDiv) errorDiv.style.display = 'none';
            // Now actually toggle safemode off
            const toggle = document.getElementById('nsfw-toggle');
            if (toggle && toggle.checked) {
                toggle.checked = false;
                // Trigger the change event to update the filter
                toggle.dispatchEvent(new Event('change'));
            }
        } else {
            // Show error
            if (errorDiv) {
                errorDiv.textContent = data.error || 'Invalid passphrase';
                errorDiv.style.display = 'block';
            }
            if (passphraseInput) {
                passphraseInput.value = '';
                passphraseInput.focus();
            }
        }
    } catch (error) {
        console.error('Safemode unlock error:', error);
        if (errorDiv) {
            errorDiv.textContent = 'Connection error. Please try again.';
            errorDiv.style.display = 'block';
        }
    }
}

// Update UI based on permissions
function updateUIPermissions() {
    // Update delete/flag buttons visibility
    const deleteBtn = document.querySelector('.delete-btn, #delete-btn, [data-action="delete"]');
    const flagBtn = document.getElementById('flag-nsfw-btn');

    if (!window.authState.canDelete) {
        if (deleteBtn) {
            deleteBtn.style.display = 'none';
        }
        if (flagBtn) {
            flagBtn.style.display = 'none';
        }
    }

    // Update safemode toggle - add lock icon if locked
    const safemodeToggle = document.getElementById('nsfw-toggle');
    const safemodeLabel = document.querySelector('label[for="nsfw-toggle"]');

    if (window.authState.safemodeLockEnabled && !window.authState.canToggleSafemode) {
        if (safemodeLabel) {
            // Add lock icon if not already there
            if (!safemodeLabel.querySelector('.bi-lock-fill')) {
                safemodeLabel.innerHTML = '<i class="bi bi-lock-fill me-1"></i>' + safemodeLabel.textContent;
            }
        }
    }

    // Show logout button if authenticated
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.style.display = window.authState.authenticated ? 'inline-block' : 'none';
    }
}

// Set up safemode toggle intercept
let safemodeInterceptSet = false;
function setupSafemodeIntercept() {
    if (safemodeInterceptSet) return;

    const toggle = document.getElementById('nsfw-toggle');
    if (!toggle) return;

    // Add click handler to intercept before the change happens
    toggle.addEventListener('click', function (e) {
        // In click event on checkbox, toggle.checked shows state AFTER click
        // So if toggle.checked is FALSE, user just clicked to turn it OFF (disable safe mode)
        // We want to block turning OFF safe mode when locked
        const turningOff = !toggle.checked;  // After click, if unchecked, user turned it OFF

        console.log('[AUTH] Toggle clicked. Checked after click:', toggle.checked,
            'Turning off:', turningOff,
            'Locked:', window.authState.safemodeLockEnabled,
            'Can toggle:', window.authState.canToggleSafemode);

        if (turningOff && window.authState.safemodeLockEnabled && !window.authState.canToggleSafemode) {
            e.preventDefault();
            e.stopPropagation();
            // Revert the checkbox back to checked (safe mode on)
            toggle.checked = true;
            showSafemodeUnlockModal();
            return false;
        }
    }, false);  // Use bubble phase since we need to see final state

    safemodeInterceptSet = true;
    console.log('[AUTH] Safemode intercept set up, locked:', window.authState.safemodeLockEnabled);
}

// Legacy function name for compatibility
function interceptSafemodeToggle() {
    setupSafemodeIntercept();
}

// Show auth overlay to block page content
function showAuthOverlay() {
    const overlay = document.getElementById('auth-overlay');
    const mainContent = document.getElementById('main-content');
    if (overlay) {
        overlay.style.display = 'block';
    }
    if (mainContent) {
        mainContent.style.filter = 'blur(20px)';
        mainContent.style.pointerEvents = 'none';
    }
}

// Hide auth overlay
function hideAuthOverlay() {
    const overlay = document.getElementById('auth-overlay');
    const mainContent = document.getElementById('main-content');
    if (overlay) {
        overlay.style.display = 'none';
    }
    if (mainContent) {
        mainContent.style.filter = '';
        mainContent.style.pointerEvents = '';
    }
}

// Make functions available globally
window.checkAuthStatus = checkAuthStatus;
window.showLoginModal = showLoginModal;
window.hideLoginModal = hideLoginModal;
window.handleLogin = handleLogin;
window.handleLogout = handleLogout;
window.showSafemodeUnlockModal = showSafemodeUnlockModal;
window.hideSafemodeUnlockModal = hideSafemodeUnlockModal;
window.handleSafemodeUnlock = handleSafemodeUnlock;
window.updateUIPermissions = updateUIPermissions;
window.interceptSafemodeToggle = interceptSafemodeToggle;
window.showAuthOverlay = showAuthOverlay;
window.hideAuthOverlay = hideAuthOverlay;
