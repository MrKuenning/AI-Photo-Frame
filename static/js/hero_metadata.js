// Load metadata on hover for hero view
document.addEventListener('DOMContentLoaded', function () {
    const heroView = document.querySelector('.hero-view.load-metadata');

    if (heroView) {
        heroView.addEventListener('mouseenter', function () {
            const metadataContainer = this.querySelector('.metadata');
            const filename = this.dataset.filename;
            const subfolder = this.dataset.subfolder;

            if (metadataContainer && !metadataContainer.dataset.loaded) {
                loadMetadata(filename, metadataContainer, subfolder);
            }
        });
    }
});
