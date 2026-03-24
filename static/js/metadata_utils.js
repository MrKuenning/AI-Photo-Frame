// Shared metadata utilities for consistent display across all pages

/**
 * Generate HTML markup for metadata display with copy-to-clipboard buttons
 * @param {Object} data - Metadata object from API
 * @param {string} subfolder - Fallback subfolder path if not in data
 * @returns {string} HTML markup for metadata
 */
function formatMetadataHTML(data, subfolder = '') {
    let metadataHtml = '';

    /**
     * Helper to create a structured metadata line with a copy button
     */
    const addMetadataLine = (label, value) => {
        if (value === undefined || value === null || value === '') return '';
        
        // Escape quotes for data attribute to prevent HTML breakage
        const escapedValue = value.toString().replace(/"/g, '&quot;');
        
        return `
            <div class="metadata-line">
                <div class="metadata-content">
                    <strong>${label}:</strong> ${value}
                </div>
                <button class="copy-metadata-btn" data-copy-text="${escapedValue}" title="Copy ${label}">
                    <i class="bi bi-clipboard"></i>
                </button>
            </div>`;
    };

    metadataHtml += addMetadataLine('Prompt', data.prompt);
    metadataHtml += addMetadataLine('Negative Prompt', data.negative_prompt);
    metadataHtml += addMetadataLine('Seed', data.seed);
    metadataHtml += addMetadataLine('Model', data.model);
    metadataHtml += addMetadataLine('Dimensions', data.dimensions);

    if (data.loras && data.loras.length > 0) {
        const loraList = data.loras.map(lora => {
            const weight = parseFloat(lora.weight);
            const weightDisplay = Number.isInteger(weight) ? weight.toFixed(0) : weight.toFixed(2);
            return `${lora.name} (${weightDisplay})`;
        }).join(', ');
        metadataHtml += addMetadataLine('LoRAs', loraList);
    }

    metadataHtml += addMetadataLine('Created', data.date_time);
    metadataHtml += addMetadataLine('Folder', data.subfolder || subfolder);

    return metadataHtml;
}

/**
 * Handle clipboard copy for metadata buttons
 * @param {HTMLButtonElement} button - The clicked button
 */
function handleMetadataCopy(button) {
    const text = button.dataset.copyText;
    if (!text) return;

    navigator.clipboard.writeText(text).then(() => {
        const icon = button.querySelector('i');
        const originalClass = icon.className;
        
        // Success feedback
        button.classList.add('copied');
        icon.className = 'bi bi-check-lg';
        
        if (CONFIG && CONFIG.showToast) {
            CONFIG.showToast('Copied to clipboard');
        }

        setTimeout(() => {
            button.classList.remove('copied');
            icon.className = originalClass;
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy metadata:', err);
    });
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
    container.innerHTML = '<p class="text-muted"><i class="bi bi-hourglass-split"></i> Loading metadata...</p>';

    return fetch('/image_info/' + encodeURIComponent(filename))
        .then(response => response.json())
        .then(data => {
            const metadataHtml = formatMetadataHTML(data, subfolder);
            container.innerHTML = metadataHtml || '<p class="text-muted">No metadata available</p>';
            
            // Attach event listeners to copy buttons
            container.querySelectorAll('.copy-metadata-btn').forEach(btn => {
                btn.addEventListener('click', function(e) {
                    e.stopPropagation(); // Don't trigger parent click events (like closing the panel)
                    handleMetadataCopy(this);
                });
            });

            container.dataset.loaded = 'true';
            return data;
        })
        .catch(error => {
            container.innerHTML = '<p class="text-danger">Error loading metadata</p>';
            console.error('Error loading metadata:', error);
            throw error;
        });
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { formatMetadataHTML, loadMetadata };
}
