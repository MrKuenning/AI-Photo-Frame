// Thumbnail Size Slider - Controls number of thumbnails per row
document.addEventListener('DOMContentLoaded', function () {
    const slider = document.getElementById('thumbnail-size-slider');
    const sizeLabel = document.getElementById('thumbnail-size-label');

    if (!slider) return;

    // Load saved columns from localStorage
    const savedColumns = localStorage.getItem('thumbnailColumns') || '1';
    slider.value = savedColumns;

    // Apply initial size
    updateThumbnailColumns(savedColumns);

    // Update label
    if (sizeLabel) {
        sizeLabel.textContent = savedColumns + ' per row';
    }

    // Handle slider changes
    slider.addEventListener('input', function () {
        const columns = this.value;

        // Update label
        if (sizeLabel) {
            sizeLabel.textContent = columns + ' per row';
        }

        // Apply columns
        updateThumbnailColumns(columns);

        // Save preference
        localStorage.setItem('thumbnailColumns', columns);
    });
});

function updateThumbnailColumns(columns) {
    const thumbnailGrid = document.querySelector('.thumbnail-grid');

    if (thumbnailGrid) {
        // Update CSS custom property for grid columns
        thumbnailGrid.style.setProperty('--thumbnail-columns', columns);

        //Apply grid template to thumbnail grid
        thumbnailGrid.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
        thumbnailGrid.style.display = 'grid';
        thumbnailGrid.style.gap = 'var(--spacing-sm)';
    }
}
