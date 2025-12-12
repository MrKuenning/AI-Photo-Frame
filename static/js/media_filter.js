// Media Type Filter
document.addEventListener('DOMContentLoaded', function () {
    const filterButtons = document.querySelectorAll('.media-filter-btn');

    // Get current media filter from URL
    const urlParams = new URLSearchParams(window.location.search);
    const currentFilter = urlParams.get('media_type') || 'all';

    // Apply saved filter
    filterButtons.forEach(btn => {
        if (btn.dataset.filter === currentFilter) {
            btn.classList.add('active');
            btn.classList.remove('btn-outline-primary');
            btn.classList.add('btn-primary');
        } else {
            btn.classList.remove('active', 'btn-primary');
            btn.classList.add('btn-outline-primary');
        }
    });

    // Handle filter button clicks - reload page with query param for both home and gallery
    filterButtons.forEach(button => {
        button.addEventListener('click', function () {
            const filter = this.dataset.filter;

            // Build new URL with media_type parameter
            const url = new URL(window.location);
            if (filter === 'all') {
                url.searchParams.delete('media_type');
            } else {
                url.searchParams.set('media_type', filter);
            }
            // Reload page with new filter
            window.location.href = url.toString();
        });
    });

    // Apply initial filter - only for gallery page (home page uses server-side filtering)
    if (window.location.pathname === '/gallery') {
        applyMediaFilter(currentFilter);
    }
});

function applyMediaFilter(filter) {
    const containers = document.querySelectorAll('.image-container');
    let videoCount = 0, imageCount = 0, hiddenCount = 0;

    containers.forEach(container => {
        // Get media type from data attribute
        let mediaType = container.dataset.mediaType || 'image';

        // Fallback: detect media type by checking actual elements
        if (!container.dataset.mediaType) {
            const hasVideo = container.querySelector('video');
            const hasImg = container.querySelector('img');
            mediaType = hasVideo ? 'video' : (hasImg ? 'image' : 'image');
        }

        // Apply filter
        if (filter === 'all') {
            container.style.display = '';
        } else if (filter === 'photos' && mediaType === 'image') {
            container.style.display = '';
            imageCount++;
        } else if (filter === 'videos' && mediaType === 'video') {
            container.style.display = '';
            videoCount++;
        } else {
            container.style.display = 'none';
            hiddenCount++;
        }
    });

    console.log(`Filter: ${filter} - Showing ${videoCount} videos, ${imageCount} images. Hidden: ${hiddenCount}`);
}
