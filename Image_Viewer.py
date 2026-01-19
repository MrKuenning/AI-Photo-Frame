import os
import shutil
import threading
import configparser
import time
from datetime import datetime
from flask import Flask, render_template, request, jsonify, send_from_directory, make_response, redirect, url_for
from flask_paginate import Pagination, get_page_parameter
from flask_socketio import SocketIO
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from metadata_extractor import extract_embedded_metadata
import content_scanner

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*", ping_timeout=60, ping_interval=25)

# Load configuration from config.ini
def load_config():
    """Load configuration from config.ini file"""
    config = configparser.ConfigParser()
    config_path = os.path.join(os.path.dirname(__file__), 'config.ini')
    
    # Default configuration
    default_config = {
        'IMAGE_FOLDER': 'E:\\AI\\Output',
        'PER_PAGE': 100,
        'MAX_INITIAL_LOAD': 100,  # Limit initial page load for performance
        'HOME_THUMBNAIL_SIZE': '200x200',
        'GALLERY_THUMBNAIL_SIZE': '200x200',
        'GALLERY_PREVIEW_SIZE': '800x800',
        'NSFW_KEYWORDS': [
            'adult', 'ass', 'bikini', 'boob', 'booty', 'bra', 'busty', 'camgirl',
            'camwhore', 'cleavage', 'curvy', 'dominatrix', 'escort', 'erotic', 'explicit',
            'fetish', 'gstring', 'hardcore', 'hot girl', 'hot woman', 'intimate', 'kink',
            'latex', 'leotard', 'lingerie', 'lust', 'modeling', 'naked', 'nipple',
            'nipples', 'nude', 'nudes', 'nsfw', 'onlyfans', 'panties', 'pantyhose',
            'panty', 'playboy', 'porn', 'pornographic', 'pornstar', 'provocative',
            'seductive', 'sensual', 'sex', 'sexually', 'softcore', 'stripper', 'suggestive',
            'swimsuit', 'thick', 'thighs', 'thong', 'topless', 'underwear', 'wet', 'penis',
            'dancing', 'breast', 'dancing', 'bathing', 'swim', 'xxx', 'yoga'
        ],
        'NSFW_FOLDERS': [],
        'NUDITY_THRESHOLD': 0.5,
        'NSFW_LABELS': ['FEMALE_BREAST_EXPOSED', 'FEMALE_GENITALIA_EXPOSED', 'MALE_GENITALIA_EXPOSED', 'BUTTOCKS_EXPOSED', 'ANUS_EXPOSED'],
        'SAFE_MODE_DEFAULT': False,
        'CONTENT_SCAN_DEFAULT': False,
        'ARCHIVE_VIEW_DEFAULT': False,
        'AUTH_ENABLED': False,
        'USER_PASSPHRASE': '',
        'ADMIN_PASSPHRASE': '',
        # Action permission levels
        'DELETE_LEVEL': 'guest',
        'FLAG_LEVEL': 'guest',
        'ARCHIVE_LEVEL': 'guest',
        # Toggle permission levels
        'TOGGLE_CONTENT_SCAN_LEVEL': 'guest',
        'TOGGLE_ARCHIVE_VIEW_LEVEL': 'guest',
        'TOGGLE_SAFEMODE_VIEW_LEVEL': 'guest',
        # Toggle passphrase overrides
        'TOGGLE_CONTENT_SCAN_PASSPHRASE': '',
        'TOGGLE_ARCHIVE_PASSPHRASE': '',
        'TOGGLE_SAFEMODE_PASSPHRASE': '',
        # Content scan settings
        'CONTENT_SCAN_OFFSET': 0
    }
    
    # Try to read config file
    if os.path.exists(config_path):
        config.read(config_path)
        
        if 'App' in config:
            # Load settings from config file
            default_config['IMAGE_FOLDER'] = config.get('App', 'IMAGE_FOLDER', fallback=default_config['IMAGE_FOLDER'])
            default_config['HOME_THUMBNAIL_SIZE'] = config.get('App', 'HOME_THUMBNAIL_SIZE', fallback=default_config['HOME_THUMBNAIL_SIZE'])
            default_config['GALLERY_THUMBNAIL_SIZE'] = config.get('App', 'GALLERY_THUMBNAIL_SIZE', fallback=default_config['GALLERY_THUMBNAIL_SIZE'])
            default_config['GALLERY_PREVIEW_SIZE'] = config.get('App', 'GALLERY_PREVIEW_SIZE', fallback=default_config['GALLERY_PREVIEW_SIZE'])
            default_config['PER_PAGE'] = config.getint('App', 'PAGINATION_LIMIT', fallback=default_config['PER_PAGE'])
            default_config['MAX_INITIAL_LOAD'] = config.getint('App', 'MAX_INITIAL_LOAD', fallback=default_config['MAX_INITIAL_LOAD'])
            
            # Parse NSFW keywords
            nsfw_keywords_str = config.get('App', 'NSFW_KEYWORDS', fallback='')
            if nsfw_keywords_str:
                default_config['NSFW_KEYWORDS'] = [kw.strip() for kw in nsfw_keywords_str.split(',')]
            
            # Parse NSFW folders
            nsfw_folders_str = config.get('App', 'NSFW_FOLDERS', fallback='')
            if nsfw_folders_str:
                default_config['NSFW_FOLDERS'] = [folder.strip().lower() for folder in nsfw_folders_str.split(',')]
            
            # Parse nudity threshold
            default_config['NUDITY_THRESHOLD'] = config.getfloat('App', 'NUDITY_THRESHOLD', fallback=0.5)
            
            # Parse NSFW labels
            nsfw_labels_str = config.get('App', 'NSFW_LABELS', fallback='')
            if nsfw_labels_str:
                default_config['NSFW_LABELS'] = [label.strip() for label in nsfw_labels_str.split(',')]
            
            # Parse toggle defaults
            default_config['SAFE_MODE_DEFAULT'] = config.getboolean('App', 'SAFE_MODE_DEFAULT', fallback=False)
            default_config['CONTENT_SCAN_DEFAULT'] = config.getboolean('App', 'CONTENT_SCAN_DEFAULT', fallback=False)
            default_config['ARCHIVE_VIEW_DEFAULT'] = config.getboolean('App', 'ARCHIVE_VIEW_DEFAULT', fallback=False)
            
            # Parse authentication settings
            default_config['AUTH_ENABLED'] = config.getboolean('App', 'AUTH_ENABLED', fallback=False)
            default_config['USER_PASSPHRASE'] = config.get('App', 'USER_PASSPHRASE', fallback='').strip()
            default_config['ADMIN_PASSPHRASE'] = config.get('App', 'ADMIN_PASSPHRASE', fallback='').strip()
            
            # Parse action permission levels (guest, user, admin)
            default_config['DELETE_LEVEL'] = config.get('App', 'DELETE_LEVEL', fallback='guest').strip().lower()
            default_config['FLAG_LEVEL'] = config.get('App', 'FLAG_LEVEL', fallback='guest').strip().lower()
            default_config['ARCHIVE_LEVEL'] = config.get('App', 'ARCHIVE_LEVEL', fallback='guest').strip().lower()
            
            # Parse toggle permission levels
            default_config['TOGGLE_CONTENT_SCAN_LEVEL'] = config.get('App', 'TOGGLE_CONTENT_SCAN_LEVEL', fallback='guest').strip().lower()
            default_config['TOGGLE_ARCHIVE_VIEW_LEVEL'] = config.get('App', 'TOGGLE_ARCHIVE_VIEW_LEVEL', fallback='guest').strip().lower()
            default_config['TOGGLE_SAFEMODE_VIEW_LEVEL'] = config.get('App', 'TOGGLE_SAFEMODE_VIEW_LEVEL', fallback='guest').strip().lower()
            
            # Parse toggle passphrase overrides
            default_config['TOGGLE_CONTENT_SCAN_PASSPHRASE'] = config.get('App', 'TOGGLE_CONTENT_SCAN_PASSPHRASE', fallback='').strip()
            default_config['TOGGLE_ARCHIVE_PASSPHRASE'] = config.get('App', 'TOGGLE_ARCHIVE_PASSPHRASE', fallback='').strip()
            default_config['TOGGLE_SAFEMODE_PASSPHRASE'] = config.get('App', 'TOGGLE_SAFEMODE_PASSPHRASE', fallback='').strip()
            
            # Parse content scan settings
            default_config['CONTENT_SCAN_OFFSET'] = config.getint('App', 'CONTENT_SCAN_OFFSET', fallback=0)
        
        print(f"[OK] Loaded configuration from {config_path}")
    else:
        print(f"[WARN] Config file not found at {config_path}, using defaults")
    
    return default_config

# Configuration
CONFIG = load_config()

# Context processor to inject config values into all templates
@app.context_processor
def inject_config():
    """Make config values available in all templates"""
    return {
        'safe_mode_default': CONFIG.get('SAFE_MODE_DEFAULT', False)
    }


# Global variables
image_cache = {}
image_list = []
subfolders = []
latest_image = None
latest_image_timestamp = 0  # Track the timestamp of the latest image
scan_in_progress = False  # Flag to prevent concurrent scans
last_scan_time = 0  # Track last scan time for debouncing
content_scan_enabled = CONFIG.get('CONTENT_SCAN_DEFAULT', False)  # Content Scan toggle state
content_scan_progress = None  # Current scan progress for gallery scan

# Lock for thread safety
cache_lock = threading.Lock()

# Make CONFIG available in all templates
@app.context_processor
def inject_config():
    return {'config': CONFIG}

# Session management
SECRET_KEY = os.environ.get('SECRET_KEY', 'photo-frame-secret-key-change-me')
session_serializer = URLSafeTimedSerializer(SECRET_KEY)

def create_session(role: str, remember: bool = False) -> str:
    """Create a signed session cookie value"""
    # Session lasts 30 days if remember, otherwise until browser closes (handled by cookie settings)
    max_age = 30 * 24 * 60 * 60 if remember else None  # 30 days in seconds
    session_data = {
        'role': role,  # 'user', 'admin', or None
        'safemode_unlocked': False,
        'created': time.time()
    }
    return session_serializer.dumps(session_data), max_age

def get_session() -> dict:
    """Get and verify session from cookie"""
    session_cookie = request.cookies.get('auth_session')
    if not session_cookie:
        return {'role': None, 'safemode_unlocked': False}
    
    try:
        # Max age 30 days
        session_data = session_serializer.loads(session_cookie, max_age=30 * 24 * 60 * 60)
        return session_data
    except (BadSignature, SignatureExpired):
        return {'role': None, 'safemode_unlocked': False}

def is_auth_required() -> bool:
    """Check if authentication is required"""
    return CONFIG.get('AUTH_ENABLED', False) and (
        CONFIG.get('USER_PASSPHRASE', '') or CONFIG.get('ADMIN_PASSPHRASE', '')
    )

def is_authenticated() -> bool:
    """Check if user is authenticated (or auth not required)"""
    if not is_auth_required():
        return True
    session = get_session()
    return session.get('role') in ('user', 'admin')

def is_admin() -> bool:
    """Check if user is logged in as admin"""
    session = get_session()
    return session.get('role') == 'admin'


def get_user_level() -> str:
    """Get current user's permission level: 'guest', 'user', or 'admin'"""
    session = get_session()
    role = session.get('role')
    if role == 'admin':
        return 'admin'
    elif role == 'user':
        return 'user'
    else:
        return 'guest'


def has_permission(required_level: str) -> bool:
    """
    Check if current user meets the required permission level.
    Permission hierarchy: guest < user < admin
    """
    user_level = get_user_level()
    required = required_level.lower()
    
    # Guest level - anyone can access
    if required == 'guest':
        return True
    
    # User level - user or admin can access
    if required == 'user':
        return user_level in ('user', 'admin')
    
    # Admin level - only admin can access
    if required == 'admin':
        return user_level == 'admin'
    
    # Unknown level - default to admin only
    return user_level == 'admin'


def can_delete() -> bool:
    """Check if user can delete files based on DELETE_LEVEL config"""
    return has_permission(CONFIG.get('DELETE_LEVEL', 'guest'))


def can_flag() -> bool:
    """Check if user can flag files as NSFW based on FLAG_LEVEL config"""
    return has_permission(CONFIG.get('FLAG_LEVEL', 'guest'))


def can_archive() -> bool:
    """Check if user can archive files based on ARCHIVE_LEVEL config"""
    return has_permission(CONFIG.get('ARCHIVE_LEVEL', 'guest'))


def can_toggle_content_scan() -> bool:
    """Check if user can toggle content scan based on TOGGLE_CONTENT_SCAN_LEVEL config"""
    # Admin can always toggle
    if is_admin():
        return True
    # Check permission level
    if has_permission(CONFIG.get('TOGGLE_CONTENT_SCAN_LEVEL', 'guest')):
        return True
    # Check if user has unlocked this toggle via passphrase
    session = get_session()
    return session.get('content_scan_unlocked', False)


def can_toggle_archive_view() -> bool:
    """Check if user can toggle archive view based on TOGGLE_ARCHIVE_VIEW_LEVEL config"""
    # Admin can always toggle
    if is_admin():
        return True
    # Check permission level
    if has_permission(CONFIG.get('TOGGLE_ARCHIVE_VIEW_LEVEL', 'guest')):
        return True
    # Check if user has unlocked this toggle via passphrase
    session = get_session()
    return session.get('archive_view_unlocked', False)


def can_toggle_safemode() -> bool:
    """Check if user can toggle safe mode based on TOGGLE_SAFEMODE_VIEW_LEVEL config"""
    # Admin can always toggle
    if is_admin():
        return True
    # Check permission level
    if has_permission(CONFIG.get('TOGGLE_SAFEMODE_VIEW_LEVEL', 'guest')):
        return True
    # Check if user has unlocked this toggle via passphrase
    session = get_session()
    return session.get('safemode_unlocked', False)


def get_image_metadata(image_path):
    """Extract metadata from image filename"""
    try:
        filename = os.path.basename(image_path)
        base_name = os.path.splitext(filename)[0]
        
        # Format 1: date.time - seed - dimensions - model - prompt.jpg
        parts = base_name.split(' - ', 3)
        if len(parts) >= 4:
            date_time = parts[0]
            seed = parts[1]
            dimensions = parts[2]
            model_prompt = parts[3]
            
            # Further split model and prompt
            model_prompt_parts = model_prompt.split(' - ', 1)
            model = model_prompt_parts[0]
            prompt = model_prompt_parts[1] if len(model_prompt_parts) > 1 else ''
            
            return {
                'date_time': date_time,
                'seed': seed,
                'dimensions': dimensions,
                'model': model,
                'prompt': prompt
            }
        
        # Format 2: date_seedNNNNNN_prompt.jpg (underscore-based with 'seed' prefix)
        # Example: 2026-01-05-23h58m32s_seed754972137_Rotate the camera 45 degrees.jpg
        import re
        seed_match = re.match(r'^(.+?)_seed(\d+)_(.+)$', base_name)
        if seed_match:
            date_time = seed_match.group(1)
            seed = seed_match.group(2)
            prompt = seed_match.group(3)
            
            return {
                'date_time': date_time,
                'seed': seed,
                'dimensions': 'Unknown',
                'model': 'Unknown',
                'prompt': prompt
            }
            
    except Exception as e:
        print(f"Error extracting metadata from {image_path}: {e}")
    
    # Return basic metadata if parsing fails
    return {
        'date_time': datetime.fromtimestamp(os.path.getmtime(image_path)).strftime('%Y-%m-%d %H:%M:%S'),
        'seed': 'Unknown',
        'dimensions': 'Unknown',
        'model': 'Unknown',
        'prompt': os.path.splitext(os.path.basename(image_path))[0]
    }





def is_nsfw_content(metadata, subfolder=''):
    """Check if image metadata contains NSFW keywords or is in NSFW folder"""
    # Check folder-based filtering
    if subfolder and CONFIG.get('NSFW_FOLDERS'):
        # Normalize subfolder path: convert backslashes to forward slashes and lowercase
        subfolder_normalized = subfolder.replace('\\', '/').lower()
        for nsfw_folder in CONFIG['NSFW_FOLDERS']:
            nsfw_folder_lower = nsfw_folder.lower()
            # Check if any part of the path matches the NSFW folder name
            path_parts = subfolder_normalized.split('/')
            if nsfw_folder_lower in path_parts:
                return True
    
    # Check keyword-based filtering
    if not metadata or not metadata.get('prompt'):
        return False
    
    prompt = metadata['prompt'].lower()
    for keyword in CONFIG['NSFW_KEYWORDS']:
        if keyword.lower() in prompt:
            return True
    
    return False


def scan_images():
    """Scan all images and videos in the configured folder and subfolders recursively"""
    global image_list, subfolders, latest_image, latest_image_timestamp, scan_in_progress, last_scan_time
    
    # Prevent concurrent scans
    if scan_in_progress:
        print("[SCAN] Scan already in progress, skipping...")
        return
    
    # Debounce: Don't scan more than once per second
    import time
    current_time = time.time()
    if current_time - last_scan_time < 1.0:
        print("[SCAN] Scan requested too soon, debouncing...")
        return
    
    scan_in_progress = True
    last_scan_time = current_time
    
    try:
        print(f"[SCAN] Starting scan of {CONFIG['IMAGE_FOLDER']}...")
        
        # Supported file extensions
        IMAGE_EXTENSIONS = ('.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp')
        VIDEO_EXTENSIONS = ('.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v')
        
        with cache_lock:
            image_list = []
            subfolders = []
            
            # Get only top-level subfolders for navigation
            for item in os.listdir(CONFIG['IMAGE_FOLDER']):
                item_path = os.path.join(CONFIG['IMAGE_FOLDER'], item)
                if os.path.isdir(item_path):
                    subfolders.append(item)
            
            # Recursive function to scan all media files in all subfolder levels
            def scan_folder(folder_path, top_folder):
                for item in os.listdir(folder_path):
                    item_path = os.path.join(folder_path, item)
                    
                    # If it's a directory, scan it recursively
                    if os.path.isdir(item_path):
                        scan_folder(item_path, top_folder)
                    
                    # Check if it's an image or video
                    item_lower = item.lower()
                    is_image = item_lower.endswith(IMAGE_EXTENSIONS)
                    is_video = item_lower.endswith(VIDEO_EXTENSIONS)
                    
                    if is_image or is_video:
                        # Get file modification time
                        mod_time = os.path.getmtime(item_path)
                        
                        # Get metadata
                        metadata = get_image_metadata(item_path)
                        
                        # Get relative path from the top folder
                        rel_path = os.path.relpath(os.path.dirname(item_path), 
                                                  os.path.join(CONFIG['IMAGE_FOLDER'], top_folder))
                        
                        # If it's in the root of the top folder, use empty string for subfolder_path
                        subfolder_path = '' if rel_path == '.' else rel_path
                        
                        # Create full subfolder path for display and file access
                        full_subfolder = top_folder
                        if subfolder_path:
                            # Use forward slashes for web URLs
                            full_subfolder = f"{top_folder}/{subfolder_path}"
                        
                        # Determine media type
                        media_type = 'image' if is_image else 'video'
                        
                        # Create media info
                        media_info = {
                            'path': item_path,
                            'filename': item,
                            'subfolder': full_subfolder,  # Full path for file access
                            'top_folder': top_folder,     # Just the top-level folder for filtering
                            'mod_time': mod_time,
                            'metadata': metadata,
                            'is_nsfw': is_nsfw_content(metadata, full_subfolder),
                            'media_type': media_type  # 'image' or 'video'
                        }
                        
                        image_list.append(media_info)
            
            # Scan all top-level subfolders recursively
            for subfolder in subfolders:
                subfolder_path = os.path.join(CONFIG['IMAGE_FOLDER'], subfolder)
                scan_folder(subfolder_path, subfolder)
            
            # Sort media by modification time (newest first)
            image_list.sort(key=lambda x: x['mod_time'], reverse=True)
            
            # Update latest media and timestamp
            if image_list:
                latest_image = image_list[0]
                latest_image_timestamp = latest_image['mod_time']
            
            print(f"[SCAN] Complete! Found {len(image_list)} media files")
    
    # Always reset the flag when done (even if there's an exception)
    finally:
        scan_in_progress = False


class ImageChangeHandler(FileSystemEventHandler):
    """Handler for file system events"""
    # Supported file extensions
    MEDIA_EXTENSIONS = ('.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v')
    
    # Pending scan queue for offset feature
    _pending_scan_queue = []
    
    def on_created(self, event):
        if not event.is_directory and event.src_path.lower().endswith(self.MEDIA_EXTENSIONS):
            print(f"New media detected: {event.src_path}")
            
            # Content Scan: Check if enabled and file is NOT already in NSFW or SAFE folder
            if content_scan_enabled and not content_scanner.should_skip_scanning(event.src_path):
                offset = CONFIG.get('CONTENT_SCAN_OFFSET', 0)
                
                if offset <= 0:
                    # No offset - scan immediately
                    try:
                        metadata = get_image_metadata(event.src_path)
                        if content_scanner.scan_single_file(event.src_path, metadata):
                            print(f"[ContentScan] 📁 File moved to NSFW folder")
                    except Exception as e:
                        print(f"[ContentScan] ❌ Error scanning: {e}")
                else:
                    # Add current file to queue and scan oldest if queue is full
                    self._pending_scan_queue.append(event.src_path)
                    print(f"[ContentScan] ⏳ Added to queue (offset={offset}, queue={len(self._pending_scan_queue)})")
                    
                    # When queue exceeds offset, scan the oldest file
                    while len(self._pending_scan_queue) > offset:
                        file_to_scan = self._pending_scan_queue.pop(0)
                        if os.path.exists(file_to_scan) and not content_scanner.should_skip_scanning(file_to_scan):
                            try:
                                metadata = get_image_metadata(file_to_scan)
                                if content_scanner.scan_single_file(file_to_scan, metadata):
                                    print(f"[ContentScan] 📁 File moved to NSFW folder: {file_to_scan}")
                            except Exception as e:
                                print(f"[ContentScan] ❌ Error scanning: {e}")
                        else:
                            print(f"[ContentScan] ⏭️ Skipping (not found or in NSFW/SAFE): {file_to_scan}")
            elif content_scan_enabled:
                print(f"[ContentScan] ⏭️ Skipping file in NSFW or SAFE folder")
            
            # Run scan in background thread to avoid blocking
            threading.Thread(target=scan_images, daemon=True).start()
            # Emit event to all clients
            try:
                print(f"[DEBUG] About to emit new_image event...")
                socketio.emit('new_image', {'path': event.src_path, 'type': 'new_image'})
                print(f"[WebSocket] ✅ Emitted 'new_image' event successfully")
            except Exception as e:
                print(f"[WebSocket] ❌ Error emitting event: {e}")
    
    def on_modified(self, event):
        if not event.is_directory and event.src_path.lower().endswith(self.MEDIA_EXTENSIONS):
            print(f"Media modified: {event.src_path}")
            # Run scan in background thread to avoid blocking
            threading.Thread(target=scan_images, daemon=True).start()
            # Emit event to all clients
            try:
                socketio.emit('new_image', {'path': event.src_path, 'type': 'new_image'})
                print(f"[WebSocket] ✅ Emitted 'new_image' event successfully")
            except Exception as e:
                print(f"[WebSocket] ❌ Error emitting event: {e}")
    
    def on_moved(self, event):
        if not event.is_directory and event.dest_path.lower().endswith(self.MEDIA_EXTENSIONS):
            print(f"Media moved: {event.dest_path}")
            # Run scan in background thread to avoid blocking
            threading.Thread(target=scan_images, daemon=True).start()
            # Emit event to all clients
            try:
                socketio.emit('new_image', {'path': event.dest_path, 'type': 'new_image'})
                print(f"[WebSocket] ✅ Emitted 'new_image' event successfully")
            except Exception as e:
                print(f"[WebSocket] ❌ Error emitting event: {e}")


def start_observer():
    """Start the file system observer with recursive monitoring"""
    event_handler = ImageChangeHandler()
    observer = Observer()
    
    # Watch the main folder recursively
    observer.schedule(event_handler, CONFIG['IMAGE_FOLDER'], recursive=True)
    
    observer.start()
    print(f"Started recursive monitoring of {CONFIG['IMAGE_FOLDER']} and all subfolders")
    return observer


@app.route('/')
def index():
    """Main page showing the latest image and thumbnails"""
    with cache_lock:
        # Get selected subfolder (if any)
        selected_subfolder = request.args.get('subfolder', '')
        
        # Get media type filter (if any)
        media_type = request.args.get('media_type', 'all')
        
        # Check if safe mode is enabled (cookie or config default for first visit)
        safe_mode_cookie = request.cookies.get('safeMode')
        if safe_mode_cookie is not None:
            safe_mode = safe_mode_cookie == 'true'
        else:
            # First visit - use config default
            safe_mode = CONFIG.get('SAFE_MODE_DEFAULT', False)
        
        # Check if archive view is enabled (cookie or config default)
        archive_view_cookie = request.cookies.get('archiveView')
        if archive_view_cookie is not None:
            archive_view = archive_view_cookie == 'true'
        else:
            archive_view = CONFIG.get('ARCHIVE_VIEW_DEFAULT', False)
        
        # Filter images by top-level subfolder if selected
        filtered_images = image_list
        if selected_subfolder:
            filtered_images = [img for img in image_list if img['top_folder'] == selected_subfolder]
        
        # Filter by media type if specified
        if media_type == 'photos':
            filtered_images = [img for img in filtered_images if img.get('media_type') == 'image']
        elif media_type == 'videos':
            filtered_images = [img for img in filtered_images if img.get('media_type') == 'video']
        
        # Filter out archive content if archive view is disabled
        if not archive_view:
            filtered_images = [img for img in filtered_images 
                             if 'archive' not in img.get('subfolder', '').lower().split('/')]
        
        # Filter out NSFW content if safe mode is enabled
        if safe_mode:
            filtered_images = [img for img in filtered_images if not img.get('is_nsfw', False)]
        
        # Get the hero image to display
        current_latest_image = latest_image
        
        # If filtering by media type, use the first filtered item as hero
        if media_type != 'all' and filtered_images:
            current_latest_image = filtered_images[0]
        # Otherwise, check for safe mode
        elif safe_mode and latest_image and latest_image.get('is_nsfw', False):
            # Find the first non-NSFW image
            for img in filtered_images:
                if not img.get('is_nsfw', False):
                    current_latest_image = img
                    break
        
        # Limit initial load for performance (only most recent files)
        max_initial = CONFIG['MAX_INITIAL_LOAD']
        sidebar_images = filtered_images[:max_initial]

        # Parse breadcrumb path (split by / for nested folders)
        breadcrumb_parts = selected_subfolder.split('/') if selected_subfolder else []
        breadcrumbs = []
        current_path = ''
        for part in breadcrumb_parts:
            if current_path:
                current_path += '/' + part
            else:
                current_path = part
            breadcrumbs.append({'name': part, 'path': current_path})
        
        return render_template('index.html', 
                              latest_image=current_latest_image,
                              images=sidebar_images,
                              subfolders=subfolders,
                              selected_subfolder=selected_subfolder,
                              total_images=len(filtered_images),
                              safe_mode=safe_mode,
                              media_type=media_type)


@app.route('/frame')
def frame():
    """Picture Frame page showing only the latest image in full-screen mode"""
    with cache_lock:
        # Check if safe mode is enabled
        safe_mode = request.cookies.get('safeMode') == 'true'
        
        # Get the latest non-NSFW image if safe mode is enabled
        current_latest_image = latest_image
        if safe_mode and latest_image and latest_image.get('is_nsfw', False):
            # Find the first non-NSFW image
            filtered_images = [img for img in image_list if not img.get('is_nsfw', False)]
            if filtered_images:
                current_latest_image = filtered_images[0]
        
        return render_template('frame.html', 
                              latest_image=current_latest_image,
                              safe_mode=safe_mode)


@app.route('/gallery')
def gallery():
    """Gallery view with grid layout and side preview"""
    with cache_lock:
        # Initial batch size for infinite scrolling (reduced for performance)
        initial_batch_size = 50
        
        # Get selected subfolder (if any)
        selected_subfolder = request.args.get('subfolder', '')
        
        # Get search query (if any)
        search_query = request.args.get('search', '')
        
        # Get media type filter (if any)
        media_type = request.args.get('media_type', 'all')
        
        # Check if safe mode is enabled (cookie or config default for first visit)
        safe_mode_cookie = request.cookies.get('safeMode')
        if safe_mode_cookie is not None:
            safe_mode = safe_mode_cookie == 'true'
        else:
            # First visit - use config default
            safe_mode = CONFIG.get('SAFE_MODE_DEFAULT', False)
        
        # Check if archive view is enabled (cookie or config default)
        archive_view_cookie = request.cookies.get('archiveView')
        if archive_view_cookie is not None:
            archive_view = archive_view_cookie == 'true'
        else:
            archive_view = CONFIG.get('ARCHIVE_VIEW_DEFAULT', False)
        
        # Get recursive flag (default True)
        recursive = request.args.get('recursive', 'true') == 'true'
        
        # Filter images by selected subfolder
        filtered_images = image_list
        if selected_subfolder:
            # Normalize to forward slashes for consistent comparison
            selected_subfolder_normalized = selected_subfolder.replace('\\', '/')
            
            if recursive:
                # Show ALL images within the selected folder and any nested subfolders
                filtered_images = [img for img in image_list 
                                 if img.get('subfolder', '').replace('\\', '/').startswith(selected_subfolder_normalized)]
            else:
                # Show ONLY images in the selected folder (exact match)
                filtered_images = [img for img in image_list 
                                 if img.get('subfolder', '').replace('\\', '/') == selected_subfolder_normalized]
        
        # Filter by search query if provided
        if search_query:
            search_query = search_query.lower()
            filtered_images = [img for img in filtered_images if 
                              search_query in img['filename'].lower() or 
                              search_query in img.get('metadata', {}).get('prompt', '').lower() or
                              search_query in img.get('metadata', {}).get('model', '').lower()]
        
        # Filter by media type if specified
        if media_type == 'photos':
            filtered_images = [img for img in filtered_images if img.get('media_type') == 'image']
        elif media_type == 'videos':
            filtered_images = [img for img in filtered_images if img.get('media_type') == 'video']
        
        # Filter out archive content if archive view is disabled
        if not archive_view:
            filtered_images = [img for img in filtered_images 
                             if 'archive' not in img.get('subfolder', '').lower().split('/')]
        
        # Filter out NSFW content if safe mode is enabled
        if safe_mode:
            filtered_images = [img for img in filtered_images if not img.get('is_nsfw', False)]
        
        # Parse breadcrumb path (split by / for nested folders)
        breadcrumb_parts = selected_subfolder.split('/') if selected_subfolder else []
        
        # Extract SIBLING folders (parallel folders at same level as selected folder)
        sibling_folders = []
        if selected_subfolder:
            # Get parent folder path
            selected_normalized = selected_subfolder.replace('\\', '/')
            if '/' in selected_normalized:
                parent_path = '/'.join(selected_normalized.split('/')[:-1])
                # Current folder name (last part)
                current_folder = selected_normalized.split('/')[-1]
            else:
                # Selected folder is top-level, so parent is root
                parent_path = ''
                current_folder = selected_normalized
            
            # Find all folders at the same level (siblings)
            sibling_set = set()
            for img in image_list:
                img_folder_normalized = img.get('subfolder', '').replace('\\', '/')
                
                if parent_path:
                    # Looking for siblings under parent
                    if img_folder_normalized.startswith(parent_path + '/'):
                        remaining = img_folder_normalized[len(parent_path) + 1:]
                        if '/' in remaining:
                            sibling = remaining.split('/')[0]
                        else:
                            sibling = remaining
                        if sibling:
                            sibling_set.add(sibling)
                else:
                    # Looking for top-level siblings
                    parts = img_folder_normalized.split('/')
                    if parts and parts[0]:
                        sibling_set.add(parts[0])
            
            sibling_folders = sorted(sibling_set)
        
        # Extract child subfolders from filtered images (ONLY immediate children)
        child_folders = set()
        if selected_subfolder:
            # Normalize selected_subfolder to use forward slashes
            selected_subfolder_normalized = selected_subfolder.replace('\\', '/')
            
            for img in filtered_images:
                # Check if this image is in a subfolder of the selected folder
                img_folder = img.get('subfolder', '').replace('\\', '/')  # Normalize to forward slashes
                
                # If image folder starts with selected folder + '/', it's in a child
                if img_folder.startswith(selected_subfolder_normalized + '/'):
                    # Get the remaining path after selected folder
                    remaining_path = img_folder[len(selected_subfolder_normalized) + 1:]
                    # Get ONLY the first part (immediate child folder)
                    if '/' in remaining_path:
                        child_folder = remaining_path.split('/')[0]
                    else:
                        # The remaining path IS the child folder (no further nesting)
                        child_folder = remaining_path
                    if child_folder:
                        child_folders.add(child_folder)
                elif img_folder == selected_subfolder_normalized:
                    # Image is directly in selected folder (not in a subfolder)
                    # Don't add to child_folders
                    pass
        
        child_folders = sorted(child_folders)
        
        # Get initial batch of images
        initial_images = filtered_images[:initial_batch_size]
        
        return render_template('gallery.html', 
                              images=initial_images,
                              subfolders=subfolders,
                              selected_subfolder=selected_subfolder,
                              breadcrumb_parts=breadcrumb_parts,
                              sibling_folders=sibling_folders,
                              child_folders=child_folders,
                              current_folder=selected_subfolder.split('/')[-1] if selected_subfolder else '',
                              config=CONFIG,
                              safe_mode=safe_mode,
                              media_type=media_type,
                              total_images=len(filtered_images),
                              recursive=recursive)


@app.route('/load_more_images')
def load_more_images():
    """API endpoint for loading more images (infinite scroll)"""
    # Check if scan is in progress - tell client to retry later
    if scan_in_progress:
        return jsonify({
            'images': [],
            'has_more': True,
            'total': 0,
            'scanning': True  # Tell frontend to wait and retry
        })
    
    # Get pagination parameters - use explicit offset instead of page to avoid mismatches
    offset = request.args.get('offset', type=int, default=0)
    batch_size = 20  # Number of images to load per batch
    
    # Get selected subfolder (if any)
    selected_subfolder = request.args.get('subfolder', '')
    
    # Get recursive flag (default True)
    recursive = request.args.get('recursive', 'true') == 'true'
    
    # Get search query (if any)
    search_query = request.args.get('search', '')
    
    # Get media type filter (if any)
    media_type = request.args.get('media_type', 'all')
    
    # Check if safe mode is enabled (from query param, cookie, or config default)
    if request.args.get('safe_mode') == 'true':
        safe_mode = True
    else:
        safe_mode_cookie = request.cookies.get('safeMode')
        if safe_mode_cookie is not None:
            safe_mode = safe_mode_cookie == 'true'
        else:
            # First visit - use config default
            safe_mode = CONFIG.get('SAFE_MODE_DEFAULT', False)
    
    # Check if archive view is enabled (cookie or config default)
    archive_view_cookie = request.cookies.get('archiveView')
    if archive_view_cookie is not None:
        archive_view = archive_view_cookie == 'true'
    else:
        archive_view = CONFIG.get('ARCHIVE_VIEW_DEFAULT', False)
    
    # Filter images by selected subfolder
    filtered_images = image_list
    if selected_subfolder:
        # Normalize to forward slashes for consistent comparison
        selected_subfolder_normalized = selected_subfolder.replace('\\', '/')
        
        if recursive:
            # Show ALL images within the selected folder and any nested subfolders
            filtered_images = [img for img in image_list 
                             if img.get('subfolder', '').replace('\\', '/').startswith(selected_subfolder_normalized)]
        else:
            # Show ONLY images in the selected folder (exact match)
            filtered_images = [img for img in image_list 
                             if img.get('subfolder', '').replace('\\', '/') == selected_subfolder_normalized]
    
    # Filter by search query if provided
    if search_query:
        search_query = search_query.lower()
        filtered_images = [img for img in filtered_images if 
                          search_query in img['filename'].lower() or 
                          search_query in img.get('metadata', {}).get('prompt', '').lower() or
                          search_query in img.get('metadata', {}).get('model', '').lower()]
    
    # Filter by media type if specified
    if media_type == 'photos':
        filtered_images = [img for img in filtered_images if img.get('media_type') == 'image']
    elif media_type == 'videos':
        filtered_images = [img for img in filtered_images if img.get('media_type') == 'video']
    
    # Filter out archive content if archive view is disabled
    if not archive_view:
        filtered_images = [img for img in filtered_images 
                         if 'archive' not in img.get('subfolder', '').lower().split('/')]
    
    # Filter out NSFW content if safe mode is enabled
    if safe_mode:
        filtered_images = [img for img in filtered_images if not img.get('is_nsfw', False)]
    
    # Debug log for infinite scroll issues
    print("=" * 80)
    print(f"[LOAD MORE] offset={offset}, filtered_count={len(filtered_images)}, safe_mode={safe_mode}")
    print(f"[LOAD MORE] subfolder='{selected_subfolder}', media_type='{media_type}', recursive={recursive}")
    print(f"[LOAD MORE] batch will be [{offset}:{offset + batch_size}]")
    print("=" * 80)
    
    # Get batch of images
    batch_images = filtered_images[offset:offset + batch_size]
    
    # Convert to JSON-serializable format (only include necessary fields)
    serialized_images = []
    for img in batch_images:
        serialized_images.append({
            'filename': img.get('filename', ''),
            'subfolder': img.get('subfolder', ''),
            'media_type': img.get('media_type', 'image')
        })
    
    # Return JSON response
    return jsonify({
        'images': serialized_images,
        'has_more': offset + batch_size < len(filtered_images),
        'total': len(filtered_images)
    })


@app.route('/image/<path:filename>')
def serve_image(filename):
    """Serve original images and videos from any subfolder depth with range request support for iOS"""
    import mimetypes
    from flask import Response
    
    # Split the path to handle nested subfolders
    path_parts = filename.split('/')
    
    # The last part is the actual filename
    actual_filename = path_parts[-1]
    
    # The rest is the subfolder path
    subfolder_path = '/'.join(path_parts[:-1])
    
    # Construct the full directory path
    full_dir_path = os.path.join(CONFIG['IMAGE_FOLDER'], subfolder_path)
    full_file_path = os.path.join(full_dir_path, actual_filename)
    
    # Check if file exists
    if not os.path.exists(full_file_path):
        return "File not found", 404
    
    # Determine MIME type based on file extension
    mimetype, _ = mimetypes.guess_type(actual_filename)
    
    # If mimetype couldn't be guessed, set defaults based on extension
    if not mimetype:
        ext = os.path.splitext(actual_filename)[1].lower()
        video_mimes = {
            '.mp4': 'video/mp4',
            '.webm': 'video/webm',
            '.mov': 'video/quicktime',
            '.avi': 'video/x-msvideo',
            '.mkv': 'video/x-matroska',
            '.m4v': 'video/x-m4v'
        }
        mimetype = video_mimes.get(ext, 'application/octet-stream')
    
    # Check if this is a video file
    is_video = mimetype and mimetype.startswith('video/')
    
    # For videos, support range requests (required for iOS Safari)
    if is_video:
        file_size = os.path.getsize(full_file_path)
        range_header = request.headers.get('Range', None)
        
        if range_header:
            # Parse range header
            byte_range = range_header.replace('bytes=', '').split('-')
            start = int(byte_range[0]) if byte_range[0] else 0
            end = int(byte_range[1]) if len(byte_range) > 1 and byte_range[1] else file_size - 1
            length = end - start + 1
            
            # Read the requested range
            with open(full_file_path, 'rb') as f:
                f.seek(start)
                data = f.read(length)
            
            # Return 206 Partial Content response
            response = Response(data, 206, mimetype=mimetype, direct_passthrough=True)
            response.headers.add('Content-Range', f'bytes {start}-{end}/{file_size}')
            response.headers.add('Accept-Ranges', 'bytes')
            response.headers.add('Content-Length', str(length))
            return response
        else:
            # No range request, send full file with range support headers
            response = send_from_directory(full_dir_path, actual_filename, mimetype=mimetype)
            response.headers.add('Accept-Ranges', 'bytes')
            response.headers.add('Content-Length', str(file_size))
            return response
    else:
        # For images, use standard serving
        return send_from_directory(full_dir_path, actual_filename, mimetype=mimetype)



@app.route('/delete_image/<path:filename>', methods=['DELETE'])
def delete_image(filename):
    """Delete an image or video file"""
    global image_list, latest_image, latest_image_timestamp
    
    # Check permissions
    if not can_delete():
        return jsonify({'success': False, 'error': 'Permission denied. Admin access required.'}), 403
    
    try:
        # Construct the full file path
        file_path = os.path.join(CONFIG['IMAGE_FOLDER'], filename)
        
        # Check if file exists
        if not os.path.exists(file_path):
            return jsonify({'success': False, 'error': 'File not found'}), 404
        
        # Delete the file
        os.remove(file_path)
        print(f"[DELETE] Deleted file: {file_path}")
        
        # Remove from image_list
        with cache_lock:
            image_list = [img for img in image_list if not (img['subfolder'] + '/' + img['filename'] == filename)]
            
            # Update latest_image if it was the deleted one
            if latest_image and (latest_image['subfolder'] + '/' + latest_image['filename'] == filename):
                if image_list:
                    latest_image = image_list[0]
                    latest_image_timestamp = latest_image['mod_time']
                else:
                    latest_image = None
                    latest_image_timestamp = 0
        
        return jsonify({'success': True, 'message': 'File deleted successfully'})
    
    except Exception as e:
        print(f"[ERROR] Failed to delete file: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/flag_nsfw/<path:filename>', methods=['POST'])
def flag_nsfw(filename):
    """Move a file to NSFW subfolder"""
    global image_list
    
    # Check permissions
    if not can_flag():
        return jsonify({'success': False, 'error': 'Permission denied. Insufficient access level.'}), 403
    
    # Build file path
    file_path = os.path.join(CONFIG['IMAGE_FOLDER'], filename)
    
    if not os.path.exists(file_path):
        return jsonify({'success': False, 'error': 'File not found'}), 404
    
    # Check if already in NSFW folder
    if content_scanner.is_in_nsfw_folder(file_path):
        return jsonify({'success': False, 'error': 'File is already in NSFW folder'}), 400
    
    try:
        # Move to NSFW folder
        new_path = content_scanner.move_to_nsfw_folder(file_path)
        
        if new_path:
            print(f"[FLAG NSFW] Moved file to: {new_path}")
            
            # Trigger rescan to update image list
            threading.Thread(target=scan_images, daemon=True).start()
            
            return jsonify({
                'success': True, 
                'message': 'File moved to NSFW folder',
                'new_path': new_path
            })
        else:
            return jsonify({'success': False, 'error': 'Failed to move file'}), 500
    
    except Exception as e:
        print(f"[ERROR] Failed to flag file as NSFW: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/unflag_nsfw/<path:filename>', methods=['POST'])
def unflag_nsfw(filename):
    """Move a file from NSFW subfolder back to parent folder"""
    global image_list
    
    # Check permissions
    if not can_flag():
        return jsonify({'success': False, 'error': 'Permission denied. Insufficient access level.'}), 403
    
    # Build file path
    file_path = os.path.join(CONFIG['IMAGE_FOLDER'], filename)
    
    if not os.path.exists(file_path):
        return jsonify({'success': False, 'error': 'File not found'}), 404
    
    # Check if actually in NSFW folder
    if not content_scanner.is_in_nsfw_folder(file_path):
        return jsonify({'success': False, 'error': 'File is not in NSFW folder'}), 400
    
    try:
        # Get current folder and parent
        current_folder = os.path.dirname(file_path)
        parent_folder = os.path.dirname(current_folder)
        file_name = os.path.basename(file_path)
        
        # Destination path in parent folder
        dest_path = os.path.join(parent_folder, file_name)
        
        # Handle filename collision
        if os.path.exists(dest_path):
            base, ext = os.path.splitext(file_name)
            counter = 1
            while os.path.exists(dest_path):
                dest_path = os.path.join(parent_folder, f"{base}_{counter}{ext}")
                counter += 1
        
        # Move file
        import shutil
        shutil.move(file_path, dest_path)
        print(f"[UNFLAG NSFW] Moved file to: {dest_path}")
        
        # Trigger rescan to update image list
        threading.Thread(target=scan_images, daemon=True).start()
        
        return jsonify({
            'success': True, 
            'message': 'File unflagged and moved to parent folder',
            'new_path': dest_path
        })
    
    except Exception as e:
        print(f"[ERROR] Failed to unflag file: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/image_info/<path:filename>')
def image_info(filename):
    """Get image metadata - combines filename parsing with embedded metadata"""
    for img in image_list:
        if img['filename'] == filename:
            # Start with filename-based metadata
            result = dict(img['metadata'])
            
            # Try to extract embedded metadata from the file
            try:
                embedded = extract_embedded_metadata(img['path'])
                
                # Merge embedded metadata, preferring embedded values when available
                if embedded.get('prompt'):
                    result['prompt'] = embedded['prompt']
                if embedded.get('negative_prompt'):
                    result['negative_prompt'] = embedded['negative_prompt']
                if embedded.get('seed'):
                    result['seed'] = embedded['seed']
                if embedded.get('model'):
                    result['model'] = embedded['model']
                if embedded.get('dimensions'):
                    result['dimensions'] = embedded['dimensions']
                if embedded.get('loras'):
                    result['loras'] = embedded['loras']
            except Exception as e:
                print(f"[METADATA] Error extracting embedded metadata: {e}")
            
            return jsonify(result)
    return jsonify({})


@app.route('/test_emit')
def test_emit():
    """Test WebSocket emission"""
    socketio.emit('new_image', {'path': 'TEST_PATH', 'type': 'test'}, namespace='/')
    return jsonify({'status': 'emitted test event'})


@app.route('/refresh')
def refresh():
    """Manually refresh the image list"""
    scan_images()
    return jsonify({'status': 'success', 'count': len(image_list)})


@app.route('/check_new_images')
def check_new_images():
    """Check if there are new media files since the last check"""
    global latest_image_timestamp
    
    MEDIA_EXTENSIONS = ('.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v')
    
    # Get the most recent media from the folder
    for subfolder in subfolders:
        subfolder_path = os.path.join(CONFIG['IMAGE_FOLDER'], subfolder)
        for filename in os.listdir(subfolder_path):
            if filename.lower().endswith(MEDIA_EXTENSIONS):
                media_path = os.path.join(subfolder_path, filename)
                mod_time = os.path.getmtime(media_path)
                
                # If we found a newer media file than our latest, return true
                if mod_time > latest_image_timestamp:
                    return jsonify({'new_image': True})
    
    # No new media found
    return jsonify({'new_image': False})


@app.route('/save-frame', methods=['POST'])
def save_frame():
    """Save current video frame as a JPEG image"""
    import base64
    import glob
    
    try:
        data = request.get_json()
        video_filename = data.get('video_filename', '')
        image_data = data.get('image_data', '')
        
        if not video_filename or not image_data:
            return jsonify({'success': False, 'error': 'Missing video_filename or image_data'})
        
        # Find the video file by searching recursively
        video_path = None
        for root, dirs, files in os.walk(CONFIG['IMAGE_FOLDER']):
            if video_filename in files:
                video_path = os.path.join(root, video_filename)
                break
        
        if not video_path:
            return jsonify({'success': False, 'error': f'Video file not found: {video_filename}'})
        
        # Find next available frame number
        video_dir = os.path.dirname(video_path)
        base_name = video_filename  # Keep full video name including extension
        
        # Find existing frame files for this video
        pattern = os.path.join(video_dir, f"{base_name}-*.jpg")
        existing_frames = glob.glob(pattern)
        
        # Extract numbers and find the next one
        max_num = 0
        for frame_path in existing_frames:
            try:
                # Extract number from filename like "video.mp4-00001.jpg"
                frame_name = os.path.basename(frame_path)
                num_str = frame_name.replace(f"{base_name}-", "").replace(".jpg", "")
                num = int(num_str)
                max_num = max(max_num, num)
            except ValueError:
                continue
        
        next_num = max_num + 1
        new_filename = f"{base_name}-{next_num:05d}.jpg"
        new_path = os.path.join(video_dir, new_filename)
        
        # Decode base64 image data and save
        # Remove the data URL prefix if present
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        
        image_bytes = base64.b64decode(image_data)
        
        with open(new_path, 'wb') as f:
            f.write(image_bytes)
        
        # Copy video's modification time to the saved frame
        video_stat = os.stat(video_path)
        os.utime(new_path, (video_stat.st_atime, video_stat.st_mtime))
        
        print(f"[SAVE FRAME] Saved frame as: {new_filename}")
        return jsonify({'success': True, 'filename': new_filename, 'path': new_path})
        
    except Exception as e:
        print(f"[SAVE FRAME] Error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)})


# ============================================
# Authentication Routes
# ============================================

@app.route('/login', methods=['POST'])
def login():
    """Validate passphrase and create session"""
    data = request.get_json() or {}
    passphrase = data.get('passphrase', '').strip()
    remember = data.get('remember', False)
    
    # Check if passphrase matches admin or user
    admin_pass = CONFIG.get('ADMIN_PASSPHRASE', '')
    user_pass = CONFIG.get('USER_PASSPHRASE', '')
    
    role = None
    if admin_pass and passphrase == admin_pass:
        role = 'admin'
    elif user_pass and passphrase == user_pass:
        role = 'user'
    elif not admin_pass and not user_pass:
        # No passphrases configured, deny login
        return jsonify({'success': False, 'error': 'No passphrases configured'})
    
    if role:
        session_token, max_age = create_session(role, remember)
        response = make_response(jsonify({'success': True, 'role': role}))
        # Set cookie - if remember, set max_age; otherwise session cookie
        if max_age:
            response.set_cookie('auth_session', session_token, max_age=max_age, httponly=True, samesite='Lax')
        else:
            response.set_cookie('auth_session', session_token, httponly=True, samesite='Lax')
        return response
    else:
        return jsonify({'success': False, 'error': 'Invalid passphrase'})

@app.route('/logout', methods=['POST'])
def logout():
    """Clear session cookie"""
    response = make_response(jsonify({'success': True}))
    response.delete_cookie('auth_session')
    return response

@app.route('/auth_status')
def auth_status():
    """Get current authentication status and permissions"""
    session = get_session()
    return jsonify({
        'auth_required': is_auth_required(),
        'authenticated': is_authenticated(),
        'role': session.get('role'),
        'can_delete': can_delete(),
        'can_flag': can_flag(),
        'can_archive': can_archive(),
        # Toggle permissions
        'can_toggle_content_scan': can_toggle_content_scan(),
        'can_toggle_archive_view': can_toggle_archive_view(),
        'can_toggle_safemode': can_toggle_safemode(),
        # Unlock states
        'content_scan_unlocked': session.get('content_scan_unlocked', False),
        'archive_view_unlocked': session.get('archive_view_unlocked', False),
        'safemode_unlocked': session.get('safemode_unlocked', False),
        # Defaults
        'safe_mode_default': CONFIG.get('SAFE_MODE_DEFAULT', False),
        'archive_view_default': CONFIG.get('ARCHIVE_VIEW_DEFAULT', False),
        'content_scan_default': CONFIG.get('CONTENT_SCAN_DEFAULT', False)
    })


@app.route('/unlock_content_scan', methods=['POST'])
def unlock_content_scan():
    """Unlock content scan toggle for this session"""
    data = request.get_json() or {}
    passphrase = data.get('passphrase', '').strip()
    
    config_pass = CONFIG.get('TOGGLE_CONTENT_SCAN_PASSPHRASE', '')
    
    if not config_pass:
        return jsonify({'success': False, 'error': 'No content scan passphrase configured'})
    
    if passphrase == config_pass:
        session = get_session()
        session['content_scan_unlocked'] = True
        session_token = session_serializer.dumps(session)
        
        response = make_response(jsonify({'success': True}))
        response.set_cookie('auth_session', session_token, httponly=True, samesite='Lax')
        return response
    else:
        return jsonify({'success': False, 'error': 'Invalid passphrase'})


@app.route('/unlock_archive_view', methods=['POST'])
def unlock_archive_view():
    """Unlock archive view toggle for this session"""
    data = request.get_json() or {}
    passphrase = data.get('passphrase', '').strip()
    
    config_pass = CONFIG.get('TOGGLE_ARCHIVE_PASSPHRASE', '')
    
    if not config_pass:
        return jsonify({'success': False, 'error': 'No archive view passphrase configured'})
    
    if passphrase == config_pass:
        session = get_session()
        session['archive_view_unlocked'] = True
        session_token = session_serializer.dumps(session)
        
        response = make_response(jsonify({'success': True}))
        response.set_cookie('auth_session', session_token, httponly=True, samesite='Lax')
        return response
    else:
        return jsonify({'success': False, 'error': 'Invalid passphrase'})


@app.route('/unlock_safemode', methods=['POST'])
def unlock_safemode():
    """Unlock safemode toggle for this session"""
    data = request.get_json() or {}
    passphrase = data.get('passphrase', '').strip()
    
    config_pass = CONFIG.get('TOGGLE_SAFEMODE_PASSPHRASE', '')
    
    if not config_pass:
        return jsonify({'success': False, 'error': 'No safemode passphrase configured'})
    
    if passphrase == config_pass:
        session = get_session()
        session['safemode_unlocked'] = True
        session_token = session_serializer.dumps(session)
        
        response = make_response(jsonify({'success': True}))
        response.set_cookie('auth_session', session_token, httponly=True, samesite='Lax')
        return response
    else:
        return jsonify({'success': False, 'error': 'Invalid passphrase'})


# ============================================
# Content Scan Routes
# ============================================

@app.route('/toggle_content_scan', methods=['POST'])
def toggle_content_scan():
    """Toggle content scanning on/off"""
    global content_scan_enabled
    
    data = request.get_json() or {}
    enabled = data.get('enabled', not content_scan_enabled)
    content_scan_enabled = enabled
    
    status = "enabled" if enabled else "disabled"
    print(f"[ContentScan] Content scanning {status}")
    
    return jsonify({
        'success': True,
        'enabled': content_scan_enabled
    })


@app.route('/get_content_scan_status')
def get_content_scan_status():
    """Get current content scan toggle state and default settings"""
    return jsonify({
        'enabled': content_scan_enabled,
        'safe_mode_default': CONFIG.get('SAFE_MODE_DEFAULT', False),
        'content_scan_default': CONFIG.get('CONTENT_SCAN_DEFAULT', False)
    })


@app.route('/scan_folder', methods=['POST'])
def scan_folder():
    """Start scanning a folder for NSFW content"""
    global content_scan_progress
    
    data = request.get_json() or {}
    subfolder = data.get('subfolder', '')
    
    # Build full folder path
    if subfolder:
        folder_path = os.path.join(CONFIG['IMAGE_FOLDER'], subfolder)
    else:
        folder_path = CONFIG['IMAGE_FOLDER']
    
    if not os.path.exists(folder_path):
        return jsonify({'success': False, 'error': 'Folder not found'})
    
    # Set initial progress state (so JS knows scan is starting)
    content_scan_progress = {
        'processed': 0,
        'total': 0,
        'moved': 0,
        'current': 'Starting scan...',
        'complete': False
    }
    
    # Start scan in background thread
    def run_scan():
        global content_scan_progress
        final_progress = {'processed': 0, 'total': 0, 'moved': 0, 'complete': True}
        # Skip Archive folder during full scans (no subfolder), allow targeted scans within Archive
        skip_archive = not subfolder
        for progress in content_scanner.scan_folder_batch(folder_path, batch_size=20, get_metadata_func=get_image_metadata, skip_archive=skip_archive):
            content_scan_progress = progress
            final_progress = progress  # Keep track of the last progress
            socketio.emit('scan_progress', progress)
        
        # Rescan image list after moving files
        scan_images()
        
        # Keep final progress with complete flag for the status endpoint
        final_progress['complete'] = True
        content_scan_progress = final_progress
    
    threading.Thread(target=run_scan, daemon=True).start()
    
    return jsonify({
        'success': True,
        'message': f'Scan started for folder: {subfolder or "All"}'
    })


@app.route('/scan_status')
def scan_status():
    """Get current scan progress"""
    if content_scan_progress:
        return jsonify(content_scan_progress)
    return jsonify({'complete': True, 'processed': 0, 'total': 0, 'moved': 0})


# Archive operation progress
archive_progress = None


@app.route('/archive', methods=['POST'])
def archive_files():
    """Move all content from Output folder (except Archive) into Archive folder"""
    global archive_progress
    
    # Check permissions
    if not can_archive():
        return jsonify({'success': False, 'error': 'Permission denied. Insufficient access level.'}), 403
    
    image_folder = CONFIG['IMAGE_FOLDER']
    archive_folder = os.path.join(image_folder, 'Archive')
    
    # Create Archive folder if it doesn't exist
    os.makedirs(archive_folder, exist_ok=True)
    
    # Get all top-level folders except Archive
    folders_to_archive = []
    files_to_archive = []
    
    for item in os.listdir(image_folder):
        item_path = os.path.join(image_folder, item)
        if item.lower() == 'archive':
            continue
        if os.path.isdir(item_path):
            folders_to_archive.append(item)
        elif os.path.isfile(item_path):
            # Also handle loose files in root
            files_to_archive.append(item)
    
    total_items = len(folders_to_archive) + len(files_to_archive)
    
    if total_items == 0:
        return jsonify({'success': False, 'error': 'No content to archive'})
    
    # Set initial progress
    archive_progress = {
        'processed': 0,
        'total': total_items,
        'moved': 0,
        'current': 'Starting archive...',
        'complete': False
    }
    
    def run_archive():
        global archive_progress
        processed = 0
        moved = 0
        
        # Move folders
        for folder_name in folders_to_archive:
            src_path = os.path.join(image_folder, folder_name)
            dest_path = os.path.join(archive_folder, folder_name)
            
            print(f"[Archive] Processing folder: {folder_name}")
            print(f"[Archive]   src: {src_path}")
            print(f"[Archive]   dst: {dest_path}")
            
            archive_progress = {
                'processed': processed,
                'total': total_items,
                'moved': moved,
                'current': f'Moving {folder_name}...',
                'complete': False
            }
            socketio.emit('archive_progress', archive_progress)
            
            try:
                if os.path.exists(dest_path):
                    print(f"[Archive]   Destination exists, merging...")
                    # Merge into existing folder recursively
                    def merge_folders(src, dst):
                        """Recursively merge src into dst"""
                        # Ensure destination exists
                        os.makedirs(dst, exist_ok=True)
                        
                        items = os.listdir(src)
                        if not items:
                            print(f"[Archive]   Empty folder: {src}")
                            return
                            
                        for item in items:
                            s = os.path.join(src, item)
                            d = os.path.join(dst, item)
                            try:
                                if os.path.isdir(s):
                                    if os.path.exists(d):
                                        # Recursively merge subdirectories
                                        merge_folders(s, d)
                                    else:
                                        print(f"[Archive]   Moving dir: {item}")
                                        shutil.move(s, d)
                                else:
                                    if os.path.exists(d):
                                        # Handle collision - append timestamp
                                        base, ext = os.path.splitext(item)
                                        timestamp = int(time.time())
                                        d = os.path.join(dst, f"{base}_{timestamp}{ext}")
                                    print(f"[Archive]   Moving file: {item}")
                                    shutil.move(s, d)
                            except Exception as item_err:
                                print(f"[Archive]   ❌ Error moving {item}: {item_err}")
                    
                    merge_folders(src_path, dest_path)
                    # Remove source folder tree (may have empty dirs left)
                    try:
                        shutil.rmtree(src_path)
                        print(f"[Archive]   Removed source folder")
                    except Exception as rm_err:
                        print(f"[Archive]   ⚠️ Could not remove source: {rm_err}")
                else:
                    print(f"[Archive]   Moving entire folder...")
                    shutil.move(src_path, dest_path)
                moved += 1
                print(f"[Archive] ✅ Moved folder: {folder_name}")
            except Exception as e:
                print(f"[Archive] ❌ Error moving folder {folder_name}: {e}")
                import traceback
                traceback.print_exc()
            
            processed += 1
        
        # Move loose files
        for file_name in files_to_archive:
            src_path = os.path.join(image_folder, file_name)
            dest_path = os.path.join(archive_folder, file_name)
            
            archive_progress = {
                'processed': processed,
                'total': total_items,
                'moved': moved,
                'current': f'Moving {file_name}...',
                'complete': False
            }
            socketio.emit('archive_progress', archive_progress)
            
            try:
                if os.path.exists(dest_path):
                    base, ext = os.path.splitext(file_name)
                    import time as time_mod
                    timestamp = int(time_mod.time())
                    dest_path = os.path.join(archive_folder, f"{base}_{timestamp}{ext}")
                shutil.move(src_path, dest_path)
                moved += 1
                print(f"[Archive] 📦 Moved file: {file_name}")
            except Exception as e:
                print(f"[Archive] ❌ Error moving file {file_name}: {e}")
            
            processed += 1
        
        # Final progress
        archive_progress = {
            'processed': processed,
            'total': total_items,
            'moved': moved,
            'current': 'Complete',
            'complete': True
        }
        socketio.emit('archive_progress', archive_progress)
        
        # Rescan image list after moving files
        scan_images()
        print(f"[Archive] ✅ Archive complete! Moved {moved} items.")
    
    threading.Thread(target=run_archive, daemon=True).start()
    
    return jsonify({
        'success': True,
        'message': f'Archiving {total_items} items...'
    })


@app.route('/archive_status')
def archive_status():
    """Get current archive progress"""
    if archive_progress:
        return jsonify(archive_progress)
    return jsonify({'complete': True, 'processed': 0, 'total': 0, 'moved': 0})


if __name__ == '__main__':
    # Initialize content scanner with config
    content_scanner.set_config(
        CONFIG.get('NSFW_KEYWORDS', []),
        CONFIG.get('NUDITY_THRESHOLD', 0.5),
        CONFIG.get('NSFW_LABELS', [])
    )
    
    # Initial scan
    scan_images()
    
    # Start file system observer
    observer = start_observer()
    
    try:
        # Start Flask app with SocketIO
        socketio.run(app, host='0.0.0.0', port=5000, debug=True, use_reloader=False, allow_unsafe_werkzeug=True)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()