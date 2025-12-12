// Load metadata on hover for hero view
document.addEventListener('DOMContentLoaded', function () {
    const heroView = document.querySelector('.hero-view.load-metadata');

    if (heroView) {
        heroView.addEventListener('mouseenter', function () {
            const metadataContainer = this.querySelector('.metadata');
            const filename = this.dataset.filename;
            const subfolder = this.dataset.subfolder;

            if (metadataContainer && !metadataContainer.dataset.loaded) {
                fetch('/image_info/' + encodeURIComponent(filename))
                    .then(response => response.json())
                    .then(data => {
                        let metadataHtml = '';
                        if (data.prompt) {
                            metadataHtml += `<p><strong>Prompt:</strong> ${data.prompt}</p>`;
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

                        metadataContainer.innerHTML = metadataHtml;
                        metadataContainer.dataset.loaded = 'true';
                    });
            }
        });
    }
});
