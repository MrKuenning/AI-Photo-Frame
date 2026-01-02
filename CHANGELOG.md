# Changelog

All notable changes to the AI Photo Frame application will be documented in this file.

---

## [2026-01-02]

### Fixed
- **Media type filter not working on home page refresh** - When filtering by "Photos" on the home page, the live update polling would ignore the filter and display the most recent file regardless of type (including videos). Fixed by changing the live update fetch to use `window.location.href` instead of `/`, preserving all URL query parameters including `?media_type=photos`.
  - File: `static/js/live_update.js`


## [2025-12-20]

### Fixed
- **Fullscreen video scaling** - Videos in fullscreen view on home and gallery pages now properly stretch to fit the entire screen.


## [2025-12-16]

### Changed
- **Improved UI responsiveness** - Enhanced responsive design for all screen sizes, including proper mobile stacking for modal edit fields.

### Refactored
- **Standardized metadata display** - Created shared `metadata_utils.js` module for consistent metadata loading and display across home, gallery, and frame pages.
