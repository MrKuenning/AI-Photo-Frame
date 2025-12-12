// NSFW filter functionality
document.addEventListener('DOMContentLoaded', function() {
    // Get the toggle switch element
    const nsfwToggle = document.getElementById('nsfw-toggle');
    
    // Check if the toggle preference is stored in localStorage
    const safeMode = localStorage.getItem('safeMode') === 'true';
    
    // Set the initial state of the toggle
    if (nsfwToggle) {
        nsfwToggle.checked = safeMode;
        
        // Apply the filter on page load
        applyNsfwFilter(safeMode);
        
        // Add event listener for toggle changes
        nsfwToggle.addEventListener('change', function() {
            const isChecked = this.checked;
            
            // Save preference to localStorage
            localStorage.setItem('safeMode', isChecked);
            
            // Apply the filter
            applyNsfwFilter(isChecked);
            
            // Reload the page to apply the filter to all images
            window.location.reload();
        });
    }
});

// Function to apply NSFW filter
function applyNsfwFilter(enabled) {
    // Set a cookie to store the preference server-side
    document.cookie = 'safeMode=' + enabled + '; path=/; max-age=31536000'; // 1 year expiration
    
    console.log('NSFW filter ' + (enabled ? 'enabled' : 'disabled'));
}