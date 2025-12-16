import os
import threading
import configparser
from datetime import datetime
from flask import Flask, render_template, request, jsonify, send_from_directory
from flask_paginate import Pagination, get_page_parameter
from flask_socketio import SocketIO
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

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
        'NSFW_FOLDERS': []
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
        
        print(f"[OK] Loaded configuration from {config_path}")
    else:
        print(f"[WARN] Config file not found at {config_path}, using defaults")
    
    return default_config

# Configuration
CONFIG = load_config()


# Global variables
image_cache = {}
image_list = []
subfolders = []
latest_image = None
latest_image_timestamp = 0  # Track the timestamp of the latest image
scan_in_progress = False  # Flag to prevent concurrent scans
last_scan_time = 0  # Track last scan time for debouncing

# Lock for thread safety
cache_lock = threading.Lock()


def get_image_metadata(image_path):
    """Extract metadata from image filename"""
    try:
        filename = os.path.basename(image_path)
        # Parse filename format: date.time - seed - dimensions - model - prompt.jpg
        parts = filename.split(' - ', 3)
        if len(parts) >= 4:
            date_time = parts[0]
            seed = parts[1]
            dimensions = parts[2]
            model_prompt = parts[3]
            
            # Further split model and prompt
            model_prompt_parts = model_prompt.split(' - ', 1)
            model = model_prompt_parts[0]
            prompt = model_prompt_parts[1] if len(model_prompt_parts) > 1 else ''
            
            # Remove file extension from prompt
            prompt = os.path.splitext(prompt)[0]
            
            return {
                'date_time': date_time,
                'seed': seed,
                'dimensions': dimensions,
                'model': model,
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
    
    def on_created(self, event):
        if not event.is_directory and event.src_path.lower().endswith(self.MEDIA_EXTENSIONS):
            print(f"New media detected: {event.src_path}")
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
        
        # Check if safe mode is enabled
        safe_mode = request.cookies.get('safeMode') == 'true'
        
        # Filter images by top-level subfolder if selected
        filtered_images = image_list
        if selected_subfolder:
            filtered_images = [img for img in image_list if img['top_folder'] == selected_subfolder]
        
        # Filter by media type if specified
        if media_type == 'photos':
            filtered_images = [img for img in filtered_images if img.get('media_type') == 'image']
        elif media_type == 'videos':
            filtered_images = [img for img in filtered_images if img.get('media_type') == 'video']
        
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
        
        # Check if safe mode is enabled
        safe_mode = request.cookies.get('safeMode') == 'true'
        
        # Filter images by selected subfolder (RECURSIVE - shows all images in folder and subfolders)
        filtered_images = image_list
        if selected_subfolder:
            # Normalize to forward slashes for consistent comparison
            selected_subfolder_normalized = selected_subfolder.replace('\\', '/')
            # Show ALL images within the selected folder and any nested subfolders
            filtered_images = [img for img in image_list 
                             if img.get('subfolder', '').replace('\\', '/').startswith(selected_subfolder_normalized)]
        
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
                              total_images=len(filtered_images))


@app.route('/load_more_images')
def load_more_images():
    """API endpoint for loading more images (infinite scroll)"""
    # Get pagination parameters
    page = request.args.get('page', type=int, default=1)
    batch_size = 20  # Number of images to load per batch
    offset = (page - 1) * batch_size
    
    # Get selected subfolder (if any)
    selected_subfolder = request.args.get('subfolder', '')
    
    # Get search query (if any)
    search_query = request.args.get('search', '')
    
    # Get media type filter (if any)
    media_type = request.args.get('media_type', 'all')
    
    # Check if safe mode is enabled
    safe_mode = request.args.get('safe_mode') == 'true' or request.cookies.get('safeMode') == 'true'
    
    # Filter images by selected subfolder (RECURSIVE - same as gallery page)
    filtered_images = image_list
    if selected_subfolder:
        # Normalize to forward slashes for consistent comparison
        selected_subfolder_normalized = selected_subfolder.replace('\\', '/')
        # Show ALL images within the selected folder and any nested subfolders
        filtered_images = [img for img in image_list 
                         if img.get('subfolder', '').replace('\\', '/').startswith(selected_subfolder_normalized)]
    
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
    
    # Filter out NSFW content if safe mode is enabled
    if safe_mode:
        filtered_images = [img for img in filtered_images if not img.get('is_nsfw', False)]
    
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


@app.route('/image_info/<path:filename>')
def image_info(filename):
    """Get image metadata"""
    for img in image_list:
        if img['filename'] == filename:
            return jsonify(img['metadata'])
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


if __name__ == '__main__':
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