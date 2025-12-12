# Real Time - AI Photo Frame

A modern, web-based photo frame application designed for viewing and managing AI-generated images and videos. Features a sleek glassmorphism UI with real-time updates, smart NSFW filtering, and responsive navigation.

It monitors a folder for new images and videos and updates image and video files in real-time. This allows you to use a second monitor as a photo frame or video player as you generate new images and videos.

![Version](https://img.shields.io/badge/version-5.0-blue)
![Python](https://img.shields.io/badge/python-3.8+-green)
![Flask](https://img.shields.io/badge/flask-2.3.3-lightgrey)

## ✨ Features

### 📸 Three Viewing Modes
- **Home Page** - Latest image hero view with scrollable thumbnail sidebar
- **Gallery** - Grid layout with folder navigation and live preview panel
- **Picture Frame** - Minimalist full-screen slideshow mode

### 🎨 Modern UI
- Glassmorphism design with smooth animations
- Dark theme optimized for media viewing
- Responsive layout for all screen sizes
- Customizable thumbnail sizes

### 🔍 Smart Features
- **Real-time Monitoring** - Auto-detects new images via file system watcher
- **NSFW Filtering** - Keyword and folder-based safe mode
- **Media Type Filters** - Toggle between photos, videos, or all
- **Recursive Folder Navigation** - Browse nested folder structures
- **Metadata Extraction** - Displays AI generation parameters from filenames
- **Search Functionality** - Search by filename, prompt, or model
- **Infinite Scroll** - Smooth loading for large libraries
- **Delete Capability** - Remove unwanted images directly from the interface

### ⌨️ Keyboard Controls
- **Arrow Keys** - Navigate between images
- **Escape** - Close preview panels
- **Full keyboard navigation** on all pages

### 🎬 Video Support
- Plays MP4, WebM, MOV, AVI, MKV, and M4V formats
- Auto-play with loop
- Same navigation controls as images

## 📋 Requirements

- Python 3.8 or higher
- Modern web browser (Chrome, Firefox, Edge, Safari)
- Windows, macOS, or Linux

## 🚀 Installation

### 1. Clone or Download
```bash
git clone <repository-url>
cd "AI - Photo Frame 5/App1"
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

**Dependencies:**
- Flask 2.3.3
- watchdog 3.0.0
- Pillow 10.0.0
- python-magic 0.4.27
- python-magic-bin 0.4.14
- flask-paginate 2023.10.8
- flask-socketio 5.3.6

### 3. Configure
Edit `config.ini` to set your image folder path:

```ini
[App]
# Path to the main image folder to monitor
IMAGE_FOLDER = E:\AI\Output
```

See [Configuration](#-configuration) section for all options.

### 4. Run
```bash
python Image_Viewer.py
```

Or use the included batch file:
```bash
Start Server.bat
```

### 5. Open Browser
Navigate to: `http://localhost:5000`

## ⚙️ Configuration

The `config.ini` file allows you to customize the application:

### Global Settings
```ini
# Main folder to monitor (can contain subfolders)
IMAGE_FOLDER = E:\AI\Output

# Initial load limit for performance
MAX_INITIAL_LOAD = 100
```

### NSFW Filtering
```ini
# Keywords to identify NSFW content (comma-separated)
NSFW_KEYWORDS = adult, nsfw, nude, ...

# Folders containing NSFW content (comma-separated)
NSFW_FOLDERS = NSFW, VIDEO, STAGING
```

### Display Settings
```ini
# Thumbnail size for home page
HOME_THUMBNAIL_SIZE = 200x200

# Thumbnail size for gallery
GALLERY_THUMBNAIL_SIZE = 200x200

# Preview size for gallery hero view
GALLERY_PREVIEW_SIZE = 800x800

# Pagination limit
PAGINATION_LIMIT = 100
```

## 📂 Project Structure

```
AI - Photo Frame 5/App1/
├── Image_Viewer.py          # Main Flask application
├── config.ini               # Configuration file
├── requirements.txt         # Python dependencies
├── Start Server.bat         # Quick start script
│
├── templates/               # HTML templates
│   ├── base.html           # Base template with header/navigation
│   ├── index.html          # Home page
│   ├── gallery.html        # Gallery view
│   └── frame.html          # Picture frame mode
│
└── static/                 # Static assets
    ├── css/
    │   └── style.css       # Main stylesheet
    └── js/
        ├── gallery.js              # Gallery page logic
        ├── index_navigation.js     # Home page navigation
        ├── hero_metadata.js        # Metadata loading
        ├── live_update.js          # Real-time updates
        ├── infinite-scroll.js      # Infinite scroll
        ├── media_filter.js         # Media type filtering
        ├── display_mode_toggle.js  # Safe mode toggle
        └── ... (other utilities)
```

## 🎯 Usage

### Home Page
- View the latest image in large hero view
- Scroll through thumbnails in the sidebar
- Click thumbnails to view in hero
- Use **Previous/Next** buttons or **arrow keys** to navigate
- Toggle **Safe Mode** in the header to filter NSFW content
- Filter by **Photos** or **Videos** using media type buttons

### Gallery
- Browse images in a responsive grid layout
- Click any image to open in preview panel
- Navigate with **Previous/Next** buttons
- Use folder breadcrumbs to navigate directory structure
- Search by filename, prompt, or model name
- Adjust thumbnail size with the slider
- **Delete** images directly from the preview panel

### Picture Frame Mode
- Minimalist full-screen view
- Auto-updates when new images arrive
- Perfect for dedicated display setups
- Click **Go to Home** to return to main view

## 🔧 Filename Format

The application extracts metadata from AI-generated image filenames in this format:

```
YYYY-MM-DD.HH-MM-SS - seed - dimensions - model - prompt.extension
```

**Example:**
```
2025-12-12.14-30-45 - 123456 - 1024x1024 - stable-diffusion-xl - a beautiful sunset over mountains.jpg
```

**Extracted metadata:**
- Date/Time: `2025-12-12.14-30-45`
- Seed: `123456`
- Dimensions: `1024x1024`
- Model: `stable-diffusion-xl`
- Prompt: `a beautiful sunset over mountains`

## 🛡️ Safe Mode

The application includes a built-in NSFW filter:

1. **Toggle Safe Mode** via the switch in the header
2. Images/videos are filtered based on:
   - Keywords in the prompt (configured in `config.ini`)
   - Folder names (configured in `config.ini`)
3. Filtered content is hidden from all views
4. Setting persists in browser cookies

## 🐛 Troubleshooting

### Server won't start
- Check Python version: `python --version` (needs 3.8+)
- Verify all dependencies installed: `pip install -r requirements.txt`
- Check if port 5000 is already in use

### Images not appearing
- Verify `IMAGE_FOLDER` path in `config.ini` is correct
- Check folder permissions
- Ensure images are in supported formats (JPG, PNG, GIF, BMP, WebP)

### Real-time updates not working
- Check browser console for WebSocket errors
- Ensure Flask-SocketIO is installed
- Try refreshing the browser

### High memory usage with large libraries
- Reduce `MAX_INITIAL_LOAD` in `config.ini`
- Clear browser cache
- Close unused tabs

## 🎨 Customization

### Changing Colors
Edit `static/css/style.css` and modify CSS variables:

```css
:root {
    --color-primary: #6366f1;
    --color-background: #0f172a;
    --color-surface: #1e293b;
    /* ... */
}
```

### Adjusting Layout
- Thumbnail sizes: Adjust sliders in the UI or change defaults in `config.ini`
- Grid columns: Modify CSS grid settings in `style.css`
- Spacing: Update CSS spacing variables

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest features
- Submit pull requests
- Improve documentation

## 📝 License

This project is provided as-is for personal use.

## 🙏 Acknowledgments

- Built with Flask web framework
- UI inspired by modern design trends
- Bootstrap Icons for iconography
- Watchdog library for file system monitoring

---

**Enjoy your AI Photo Frame! 📸✨**
