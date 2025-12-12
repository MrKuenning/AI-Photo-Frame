// Fullscreen API with cross-browser compatibility
const fullscreenAPI = {
    enter: function (element) {
        if (element.requestFullscreen) {
            element.requestFullscreen();
        } else if (element.mozRequestFullScreen) {
            element.mozRequestFullScreen();
        } else if (element.webkitRequestFullscreen) {
            element.webkitRequestFullscreen();
        } else if (element.msRequestFullscreen) {
            element.msRequestFullscreen();
        }
    },
    exit: function () {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    },
    isFullscreen: function () {
        return document.fullscreenElement ||
            document.mozFullScreenElement ||
            document.webkitFullscreenElement ||
            document.msFullscreenElement;
    }
};

document.addEventListener('DOMContentLoaded', function () {
    // Check if fullscreen button already exists in the HTML (e.g., on frame page)
    let fullscreenToggle = document.getElementById('fullscreen-toggle');
    const pictureFrame = document.getElementById('picture-frame');

    // Only create the button if it doesn't exist
    if (!fullscreenToggle && pictureFrame) {
        fullscreenToggle = document.createElement('button');
        fullscreenToggle.id = 'fullscreen-toggle';
        fullscreenToggle.className = 'fullscreen-toggle';
        fullscreenToggle.title = 'Toggle Fullscreen';
        fullscreenToggle.innerHTML = '<i class="bi bi-arrows-fullscreen"></i>';

        // Insert the fullscreen toggle button before the display mode toggle
        const displayModeToggle = document.getElementById('display-mode-toggle');
        if (displayModeToggle) {
            displayModeToggle.parentNode.insertBefore(fullscreenToggle, displayModeToggle);
        } else {
            pictureFrame.appendChild(fullscreenToggle);
        }
    }

    // Only setup event listeners if button exists
    if (!fullscreenToggle || !pictureFrame) return;

    // Update button icon based on fullscreen state
    function updateFullscreenButton() {
        const icon = fullscreenToggle.querySelector('i');
        if (fullscreenAPI.isFullscreen()) {
            icon.classList.remove('bi-arrows-fullscreen');
            icon.classList.add('bi-fullscreen-exit');
            fullscreenToggle.title = 'Exit Fullscreen';
        } else {
            icon.classList.remove('bi-fullscreen-exit');
            icon.classList.add('bi-arrows-fullscreen');
            fullscreenToggle.title = 'Enter Fullscreen';
        }
    }

    // Toggle fullscreen when clicking the button
    fullscreenToggle.addEventListener('click', function () {
        if (!fullscreenAPI.isFullscreen()) {
            fullscreenAPI.enter(pictureFrame);
        } else {
            fullscreenAPI.exit();
        }
    });

    // Update button when fullscreen state changes
    document.addEventListener('fullscreenchange', updateFullscreenButton);
    document.addEventListener('mozfullscreenchange', updateFullscreenButton);
    document.addEventListener('webkitfullscreenchange', updateFullscreenButton);
    document.addEventListener('MSFullscreenChange', updateFullscreenButton);
});