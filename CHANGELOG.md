# Changelog

All notable changes to the AI Photo Frame application will be documented in this file.

---

## [2026-01-02]

### Added
- **Embedded metadata extraction** - The application now reads full prompts, negative prompts, seed, model, and dimensions from embedded file metadata (EXIF, PNG chunks, video comments) instead of just parsing filenames. Supports A1111/Forge text format and JSON format (WanGP, ComfyUI). Metadata is extracted on-demand when hovering/clicking for performance.

- **Metadata and fullscreen toggle buttons** - Replaced hover-based metadata display with toggle buttons in the navigation footer. Two new round buttons appear between Previous/Next: info icon to toggle metadata overlay, and fullscreen icon to toggle expanded view. Works for both images and videos without covering video controls.

- **Custom video controls** - Replaced native browser video controls with custom styled controls that auto-hide after 3 seconds. Features play/pause button, progress bar with seek, time display, and mute button. Eliminates the large Android play button overlay that obscures paused videos.


### Fixed
- **Media type filter not working on home page refresh** - When filtering by "Photos" on the home page, the live update polling would ignore the filter and display the most recent file regardless of type (including videos). Fixed by changing the live update fetch to use `window.location.href` instead of `/`, preserving all URL query parameters including `?media_type=photos`.

- **Video not filling screen on Android** - Expanded videos now use 100% dimensions instead of fixed viewport calculations, improving compatibility with Android mobile browsers.

- **Video metadata not showing** - Added filename parsing fallback for video metadata when ffprobe is not available. Videos now show seed and prompt extracted from filename patterns.

- **Prompt showing as Chinese characters** - Fixed encoding detection to try UTF-8 first before falling back to UTF-16, preventing ASCII text from being misinterpreted.


## [2025-12-20]

### Fixed
- **Fullscreen video scaling** - Videos in fullscreen view on home and gallery pages now properly stretch to fit the entire screen.


## [2025-12-16]

### Changed
- **Improved UI responsiveness** - Enhanced responsive design for all screen sizes, including proper mobile stacking for modal edit fields.

### Refactored
- **Standardized metadata display** - Created shared `metadata_utils.js` module for consistent metadata loading and display across home, gallery, and frame pages.
