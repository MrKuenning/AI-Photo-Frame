# Changelog

All notable changes to the AI Photo Frame application will be documented in this file.

---

## [2026-01-03]

### Added
- **Save video frame button**<br>
  New camera icon in video controls captures the current frame and saves as a JPEG (95% quality). Filename format: `video.mp4-00001.jpg`. Saved frames inherit the video's modification date.

- **Delete button on home page**<br>
  Added trash icon button next to metadata button. Shows confirmation dialog before permanently deleting the current image/video.

### Changed
- **Responsive navbar layout**<br>
  Implemented three-view responsive navigation with breakpoint at 1050px.

### Fixed
- **Mobile expanded video controls**<br>
  Fixed video controls positioning in expanded mode on mobile using flexbox column layout.

- **Mobile video controls overflow**<br>
  Made video control buttons smaller (32x32) and hid time display when not expanded to prevent overflow.

---

## [2026-01-02]

### Added
- **Embedded metadata extraction**<br>
  The application now reads full prompts, negative prompts, seed, model, and dimensions from embedded file metadata (EXIF, PNG chunks, video comments). Supports A1111/Forge and JSON format (WanGP, ComfyUI).

- **Metadata and fullscreen toggle buttons**<br>
  Replaced hover-based metadata display with toggle buttons in the navigation footer. Info icon toggles metadata overlay, fullscreen icon toggles expanded view.

- **Custom video controls**<br>
  Replaced native browser video controls with custom styled controls that auto-hide after 3 seconds. Features play/pause, progress bar, time display, and mute button.

- **Video frame navigation buttons**<br>
  Added four buttons: First Frame (⏮), Step Back (◀), Step Forward (▶), and Last Frame (⏭). Perfect for stepping through AI-generated videos.

- **Mobile-responsive video controls**<br>
  On mobile devices, the progress bar moves to its own full-width line above the buttons for easier seeking.

- **Mobile-responsive sidebar**<br>
  On narrow screens, the thumbnail sidebar moves below the main image with a scrollable grid layout.

### Fixed
- **Media type filter not working on home page refresh**<br>
  Fixed by changing live update fetch to use `window.location.href` instead of `/`, preserving URL query parameters.

- **Video not filling screen on Android**<br>
  Expanded videos now use 100% dimensions instead of fixed viewport calculations.

- **Video metadata not showing**<br>
  Added filename parsing fallback for video metadata when ffprobe is not available.

- **Prompt showing as Chinese characters**<br>
  Fixed encoding detection to try UTF-8 first before falling back to UTF-16.

---

## [2025-12-20]

### Fixed
- **Fullscreen video scaling**<br>
  Videos in fullscreen view on home and gallery pages now properly stretch to fit the entire screen.

---

## [2025-12-16]

### Changed
- **Improved UI responsiveness**<br>
  Enhanced responsive design for all screen sizes, including proper mobile stacking for modal edit fields.

### Refactored
- **Standardized metadata display**<br>
  Created shared `metadata_utils.js` module for consistent metadata loading across home, gallery, and frame pages.
