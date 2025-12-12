// Display mode toggle functionality
document.addEventListener('DOMContentLoaded', function () {
    // Only run if the display mode toggle button exists (i.e., on home page)
    const displayModeToggleBtn = document.getElementById('display-mode-toggle');
    if (!displayModeToggleBtn) return; // Exit early if not on the right page

    const mainImageContainer = document.querySelector('.main-image-container');
    if (!mainImageContainer) return; // Exit early if container doesn't exist

    // Available display modes
    const displayModes = [
        { name: 'contain', icon: 'bi-aspect-ratio', title: 'Display Mode: Contain' },
        { name: 'cover', icon: 'bi-crop', title: 'Display Mode: Cover' },
        { name: 'actual', icon: 'bi-fullscreen-exit', title: 'Display Mode: Actual Size' }
    ];

    // Get current display mode index from localStorage or default to 0 (contain)
    let currentModeIndex = parseInt(localStorage.getItem('displayModeIndex') || '0');

    // Function to apply display mode to an image/video element
    function applyModeToElement(element) {
        if (!element) return;

        const currentMode = displayModes[currentModeIndex];

        // Remove display mode classes
        element.classList.remove('display-mode-contain', 'display-mode-cover');

        // Apply current mode
        if (currentMode.name === 'contain') {
            element.classList.add('display-mode-contain');
        } else if (currentMode.name === 'cover') {
            element.classList.add('display-mode-cover');
        }
    }

    // Function to toggle display mode
    function toggleDisplayMode() {
        const mainMedia = mainImageContainer.querySelector('img, video');
        if (!mainMedia) return;

        // Move to next display mode
        currentModeIndex = (currentModeIndex + 1) % displayModes.length;
        const newMode = displayModes[currentModeIndex];

        // Apply to the media element
        applyModeToElement(mainMedia);

        // Update button
        displayModeToggleBtn.innerHTML = `<i class="bi ${newMode.icon}"></i>`;
        displayModeToggleBtn.setAttribute('title', newMode.title);

        // Save preference
        localStorage.setItem('displayModeIndex', currentModeIndex.toString());
    }

    // Function to apply saved preference
    function applyDisplayModePreference() {
        const mainMedia = mainImageContainer.querySelector('img, video');
        if (!mainMedia) return;

        const currentMode = displayModes[currentModeIndex];

        // Apply to the media element
        applyModeToElement(mainMedia);

        // Update button
        displayModeToggleBtn.innerHTML = `<i class="bi ${currentMode.icon}"></i>`;
        displayModeToggleBtn.setAttribute('title', currentMode.title);
    }

    // Apply initial state
    applyDisplayModePreference();

    // Add click event
    displayModeToggleBtn.addEventListener('click', toggleDisplayMode);

    // Expose function globally for thumbnail_click.js
    window.initDisplayModeToggle = applyDisplayModePreference;
});