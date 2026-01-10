# Changelog

All notable changes to the AI Photo Frame application will be documented in this file.

---

## [2026-01-09]

### Added
- **LoRA metadata extraction**<br>
  Metadata view now displays LoRAs used with their weights. Supports A1111/Forge style `<lora:name:weight>` in prompts and WanGP JSON `activated_loras` fields.

- **WanGP Comment field metadata**<br>
  Metadata extraction now reads from the EXIF Comment field where WanGP stores its JSON metadata, in addition to the UserComment field used by Forge.

- **Native video fullscreen button**<br>
  New fullscreen button in video controls that uses the browser's native video fullscreen mode (separate from page expand).

### Fixed
- **Infinite scroll during scan**<br>
  Gallery infinite scroll now detects when server is scanning files and waits/retries instead of incorrectly showing "No more images".

- **Duplicate LoRAs in metadata**<br>
  Fixed WanGP metadata showing same LoRA twice due to redundant `activated_loras` and `transformer_loras_filenames` fields.

- **Dynamic image count in gallery**<br>
  The "Loaded X of Y images" counter now updates as you scroll and load more images.

---

## [2026-01-06]

### Added
- **Authentication system**<br>
  Optional passphrase-based login with user/admin roles. Configure `AUTH_ENABLED`, `USER_PASSPHRASE`, and `ADMIN_PASSPHRASE` in config.ini. Page is blurred until login when enabled.

- **Safe Mode passphrase lock**<br>
  Enable `SAFEMODE_LOCK_ENABLED` with a `SAFEMODE_PASSPHRASE` to prevent disabling Safe Mode without the passphrase. Once unlocked, toggle works freely for the session. Admins bypass the lock.

- **Role-based delete permissions**<br>
  When `ADMIN_PASSPHRASE` is set, only admin users can delete files or flag/unflag NSFW content. User role sees these buttons hidden.

- **Content Scan feature**<br>
  New toggle in navbar to automatically scan incoming images for NSFW content using NudeNet AI detection. Flagged images are automatically moved to `/NSFW` subfolders.

- **Gallery Scan Content button**<br>
  New button in gallery navigation to retroactively scan existing images in the current folder for NSFW content. Shows progress bar during scan.

- **Flag NSFW button**<br>
  New button in gallery preview panel (next to Delete) to manually flag any image as NSFW, moving it to the parent folder's NSFW subfolder.

- **Refresh media button**<br>
  New refresh icon button in navbar to manually rescan all media files, clearing stale placeholders from moved/deleted files.

- **Configurable toggle defaults**<br>
  New config options `SAFE_MODE_DEFAULT` and `CONTENT_SCAN_DEFAULT` to set initial toggle states for new users.

- **Configurable nudity threshold**<br>
  New `NUDITY_THRESHOLD` setting in config.ini (0.0-1.0) to control how sensitive the nudity detection is.

- **Verbose scanner logging**<br>
  Content scanner now outputs all detected body parts with confidence scores to console for debugging.

- **Configurable NSFW detection labels**<br>
  New `NSFW_LABELS` setting in config.ini to control exactly which body parts trigger NSFW flagging. All NudeNet labels are documented and configurable.

- **Unflag NSFW button**<br>
  The Flag button in gallery preview now dynamically shows "Unflag" (green) when viewing files already in NSFW folders, allowing users to undo false positives by moving files back to parent folder.

- **Video NSFW scanning**<br>
  Content scanner now supports video files (.mp4, .webm, .mov, .avi, .mkv) by extracting and scanning the last frame using ffmpeg. Ideal for AI-generated videos that reveal content at the end.

### Fixed
- **Safe Mode folder filtering**<br>
  Fixed path separator handling for nested NSFW folders with mixed forward/backward slashes.

- **Filename metadata parsing**<br>
  Added support for underscore-based filename format: `date_seedNNNNNN_prompt.jpg`.

- **Content scan file timing**<br>
  Added 0.5s delay before scanning new files to ensure they're fully written to disk.

- **Toggle sync with server**<br>
  Content Scan toggle now syncs FROM server on page load, ensuring UI always reflects actual server state after restarts.

- **Duplicate images in gallery**<br>
  Fixed infinite scroll loading duplicate images. Switched from page-based to offset-based loading so initial 50 images batch and subsequent 20-image batches don't overlap.

- **Gallery preview stays open on delete/flag**<br>
  When deleting or flagging an image in gallery preview, the preview now shows the next image instead of closing.

### Changed
- **Improved ffmpeg error logging**<br>
  Video frame extraction now logs ffmpeg stderr output when extraction fails, making it easier to diagnose video scanning issues.

---

## [2026-01-04]

### Fixed
- **Gallery preview panel appearing on small screens**<br>
  Fixed responsive CSS that was incorrectly showing the preview panel (width: 100%) even when no image was selected. Now properly hides with width: 0 until an image is clicked.

- **Video black screen in gallery expanded view**<br>
  Fixed video not displaying when expanding to fullscreen on the gallery page. The issue was caused by the container using `flex-direction: row`, which placed the video and controls side-by-side and squished the video to 0px width. Added `flex-direction: column` to stack them vertically.

- **Videos stretching to fill expanded view**<br>
  Videos in fullscreen/expanded view now properly fill the available space above the navigation footer bar, with controls remaining accessible.

- **Video pausing when entering expanded mode**<br>
  Fixed videos pausing when clicking to expand to fullscreen. Now preserves play state and resumes playback after expansion.

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
