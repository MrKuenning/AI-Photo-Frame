// Shared metadata utilities for consistent display across all pages

/**
 * Generate HTML markup for metadata display
 * @param {Object} data - Metadata object from API
 * @param {string} subfolder - Fallback subfolder path if not in data
 * @returns {string} HTML markup for metadata
 */
function formatMetadataHTML(data, subfolder = '') {
    let metadataHtml = '';

    if (data.prompt) {
        metadataHtml += `<p><strong>Prompt:</strong> ${data.prompt}</p>`;
    }
    if (data.negative_prompt) {
        metadataHtml += `<p><strong>Negative Prompt:</strong> ${data.negative_prompt}</p>`;
    }
    if (data.seed) {
        metadataHtml += `<p><strong>Seed:</strong> ${data.seed}</p>`;
    }
    if (data.model) {
        metadataHtml += `<p><strong>Model:</strong> ${data.model}</p>`;
    }
    if (data.dimensions) {
        metadataHtml += `<p><strong>Dimensions:</strong> ${data.dimensions}</p>`;
    }
    if (data.date_time) {
        metadataHtml += `<p><strong>Created:</strong> ${data.date_time}</p>`;
    }
    if (data.subfolder || subfolder) {
        metadataHtml += `<p><strong>Folder:</strong> ${data.subfolder || subfolder}</p>`;
    }

    return metadataHtml;
}

/**
 * Load and display metadata for an image/video
 * @param {string} filename - The filename to fetch metadata for
 * @param {HTMLElement} container - The DOM element to populate with metadata
 * @param {string} subfolder - Optional subfolder path for fallback
 * @returns {Promise} Promise that resolves when metadata is loaded
 */
function loadMetadata(filename, container, subfolder = '') {
    if (!container) return Promise.reject('Container element not found');

    // Show loading state
    container.innerHTML = '<p>Loading metadata...</p>';

    return fetch('/image_info/' + encodeURIComponent(filename))
        .then(response => response.json())
        .then(data => {
            const metadataHtml = formatMetadataHTML(data, subfolder);
            container.innerHTML = metadataHtml || '<p>No metadata available</p>';
            container.dataset.loaded = 'true';
            return data;
        })
        .catch(error => {
            container.innerHTML = '<p>Error loading metadata</p>';
            console.error('Error loading metadata:', error);
            throw error;
        });
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { formatMetadataHTML, loadMetadata };
}
