// Media rendering helper for displaying both images and videos
function createMediaElement(mediaInfo) {
    const { filename, subfolder, media_type } = mediaInfo;
    const mediaUrl = `/image/${subfolder}/${filename}`;

    if (media_type === 'video') {
        return `
            <video src="${mediaUrl}" controls preload="metadata" class="thumbnail">
                Your browser does not support the video tag.
            </video>
            <div class="media-type-badge video">
                <i class="bi bi-play-circle"></i> Video
            </div>
        `;
    } else {
        return `
            <img src="${mediaUrl}" alt="${filename}" class="thumbnail">
            <div class="media-type-badge image">
                <i class="bi bi-image"></i> Image
            </div>
        `;
    }
}

// Get file extension to determine media type
function getMediaType(filename) {
    const ext = filename.toLowerCase().split('.').pop();
    const videoExtensions = ['mp4', 'webm', 'mov', 'avi', 'mkv', 'm4v'];
    return videoExtensions.includes(ext) ? 'video' : 'image';
}

// Create a media element from filename
function createMediaElementFromFilename(filename, subfolder) {
    const media_type = getMediaType(filename);
    return createMediaElement({ filename, subfolder, media_type });
}
