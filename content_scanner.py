"""
Content Scanner Module
Detects NSFW content using keyword matching and NudeNet nudity detection.
Moves flagged media to NSFW subfolders.
"""

import os
import shutil
import threading
import time
from typing import Optional, Generator, List, Dict, Any

# NudeNet detector (lazy loaded to avoid startup delay)
_detector = None
_detector_lock = threading.Lock()

# Configuration - will be set from main app
NSFW_KEYWORDS = []
NUDITY_THRESHOLD = 0.5  # Confidence threshold for nudity detection

# Body parts that indicate NSFW content (configurable via set_config)
NSFW_LABELS = [
    'FEMALE_BREAST_EXPOSED',
    'FEMALE_GENITALIA_EXPOSED', 
    'MALE_GENITALIA_EXPOSED',
    'BUTTOCKS_EXPOSED',
    'ANUS_EXPOSED',
]


def set_config(keywords: List[str], threshold: float = 0.5, labels: List[str] = None):
    """Set configuration from main app"""
    global NSFW_KEYWORDS, NUDITY_THRESHOLD, NSFW_LABELS
    NSFW_KEYWORDS = [kw.lower().strip() for kw in keywords]
    NUDITY_THRESHOLD = threshold
    if labels:
        NSFW_LABELS = [label.strip().upper() for label in labels]
        print(f"[ContentScanner] NSFW labels: {', '.join(NSFW_LABELS)}")


def get_detector():
    """Lazy load NudeNet detector (thread-safe)"""
    global _detector
    if _detector is None:
        with _detector_lock:
            if _detector is None:  # Double-check after acquiring lock
                try:
                    from nudenet import NudeDetector
                    print("[ContentScanner] Loading NudeNet detector...")
                    _detector = NudeDetector()
                    print("[ContentScanner] ✅ NudeNet detector loaded successfully")
                except ImportError:
                    print("[ContentScanner] ⚠️ NudeNet not installed. Run: pip install nudenet")
                    return None
                except Exception as e:
                    print(f"[ContentScanner] ❌ Error loading NudeNet: {e}")
                    return None
    return _detector


def check_nsfw_keywords(metadata: Dict[str, Any]) -> bool:
    """
    Check if metadata contains any NSFW keywords.
    
    Args:
        metadata: Dictionary with 'prompt', 'model', etc.
        
    Returns:
        True if NSFW keyword found, False otherwise
    """
    if not metadata or not NSFW_KEYWORDS:
        return False
    
    # Check prompt
    prompt = metadata.get('prompt', '').lower()
    for keyword in NSFW_KEYWORDS:
        if keyword in prompt:
            print(f"[ContentScanner] 🔍 Keyword match: '{keyword}' in prompt")
            return True
    
    return False


def check_video_nudity(file_path: str) -> bool:
    """
    Check video for nudity by extracting and scanning the last frame.
    
    Args:
        file_path: Path to video file
        
    Returns:
        True if nudity detected, False otherwise
    """
    import subprocess
    import tempfile
    
    filename = os.path.basename(file_path)
    print(f"[ContentScanner] 🎬 Scanning video (last frame): {filename}")
    
    # Create temp file for extracted frame
    temp_dir = tempfile.gettempdir()
    temp_frame = os.path.join(temp_dir, f"content_scan_{os.getpid()}.jpg")
    
    try:
        # Use ffmpeg to extract last frame
        # sseof seeks to end of file, -1 means 1 second before end
        cmd = [
            'ffmpeg', '-y',
            '-sseof', '-1',  # Seek to 1 second before end
            '-i', file_path,
            '-frames:v', '1',
            '-q:v', '2',
            temp_frame
        ]
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            timeout=30
        )
        
        if result.returncode != 0 or not os.path.exists(temp_frame):
            stderr = result.stderr.decode('utf-8', errors='ignore')[:200]
            print(f"[ContentScanner] ⚠️ Failed to extract frame from video")
            if stderr:
                print(f"    └─ ffmpeg error: {stderr}")
            return False
        
        print(f"[ContentScanner] ✅ Frame extracted successfully")
        
        # Scan the extracted frame
        detector = get_detector()
        if detector is None:
            return False
        
        results = detector.detect(temp_frame)
        
        # Log all detections found
        if results:
            for detection in results:
                label = detection.get('class', '')
                confidence = detection.get('score', 0)
                print(f"    └─ {label}: {confidence:.1%}")
        
        # Check for NSFW content
        for detection in results:
            label = detection.get('class', '')
            confidence = detection.get('score', 0)
            
            if label in NSFW_LABELS and confidence >= NUDITY_THRESHOLD:
                print(f"[ContentScanner] 🔞 NSFW FLAGGED: {label} ({confidence:.1%}) >= threshold ({NUDITY_THRESHOLD:.0%})")
                return True
        
        return False
        
    except subprocess.TimeoutExpired:
        print(f"[ContentScanner] ⚠️ Video frame extraction timed out")
        return False
    except FileNotFoundError:
        print(f"[ContentScanner] ⚠️ ffmpeg not found - video scanning disabled")
        return False
    except Exception as e:
        print(f"[ContentScanner] ❌ Error scanning video: {e}")
        return False
    finally:
        # Clean up temp file
        if os.path.exists(temp_frame):
            try:
                os.remove(temp_frame)
            except:
                pass


def check_nudity_detection(file_path: str) -> bool:
    """
    Use NudeNet to check for nudity in an image or video.
    For videos, extracts and scans the last frame.
    
    Args:
        file_path: Path to image or video file
        
    Returns:
        True if nudity detected above threshold, False otherwise
    """
    ext = os.path.splitext(file_path)[1].lower()
    image_extensions = ('.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp')
    video_extensions = ('.mp4', '.webm', '.mov', '.avi', '.mkv')
    
    # Handle video files - extract last frame
    if ext in video_extensions:
        return check_video_nudity(file_path)
    
    # Skip unsupported files
    if ext not in image_extensions:
        print(f"[ContentScanner] ⏭️ Skipping unsupported: {ext}")
        return False
    
    detector = get_detector()
    if detector is None:
        return False
    
    try:
        # Wait briefly for file to be fully written
        time.sleep(0.5)
        
        # Verify file is readable
        if not os.path.exists(file_path) or os.path.getsize(file_path) == 0:
            print(f"[ContentScanner] ⏭️ File not ready or empty: {file_path}")
            return False
        
        filename = os.path.basename(file_path)
        results = detector.detect(file_path)
        
        # Log all detections found
        if results:
            print(f"[ContentScanner] 🔍 Scanning: {filename}")
            for detection in results:
                label = detection.get('class', '')
                confidence = detection.get('score', 0)
                print(f"    └─ {label}: {confidence:.1%}")
        else:
            print(f"[ContentScanner] ✅ No detections: {filename}")
        
        # Check for NSFW content
        for detection in results:
            label = detection.get('class', '')
            confidence = detection.get('score', 0)
            
            if label in NSFW_LABELS and confidence >= NUDITY_THRESHOLD:
                print(f"[ContentScanner] 🔞 NSFW FLAGGED: {label} ({confidence:.1%}) >= threshold ({NUDITY_THRESHOLD:.0%})")
                return True
                
        return False
        
    except Exception as e:
        print(f"[ContentScanner] ❌ Error scanning {file_path}: {e}")
        return False


def scan_media_content(file_path: str, metadata: Optional[Dict[str, Any]] = None) -> bool:
    """
    Scan media for NSFW content using keywords and nudity detection.
    
    Args:
        file_path: Path to media file
        metadata: Optional metadata dictionary (for keyword check)
        
    Returns:
        True if NSFW content detected, False otherwise
    """
    # First check keywords (fast)
    if metadata and check_nsfw_keywords(metadata):
        return True
    
    # Then check nudity detection (slower, only for images)
    if check_nudity_detection(file_path):
        return True
    
    return False


def move_to_nsfw_folder(file_path: str) -> Optional[str]:
    """
    Move file to NSFW subfolder within its current folder.
    
    Args:
        file_path: Path to file to move
        
    Returns:
        New file path if moved, None if failed
    """
    if not os.path.exists(file_path):
        print(f"[ContentScanner] ❌ File not found: {file_path}")
        return None
    
    # Get parent folder and filename
    parent_folder = os.path.dirname(file_path)
    filename = os.path.basename(file_path)
    
    # Create NSFW subfolder
    nsfw_folder = os.path.join(parent_folder, 'NSFW')
    os.makedirs(nsfw_folder, exist_ok=True)
    
    # Destination path
    dest_path = os.path.join(nsfw_folder, filename)
    
    # Handle filename collision
    if os.path.exists(dest_path):
        base, ext = os.path.splitext(filename)
        counter = 1
        while os.path.exists(dest_path):
            dest_path = os.path.join(nsfw_folder, f"{base}_{counter}{ext}")
            counter += 1
    
    try:
        shutil.move(file_path, dest_path)
        print(f"[ContentScanner] 📁 Moved to NSFW folder: {filename}")
        return dest_path
    except Exception as e:
        print(f"[ContentScanner] ❌ Error moving file: {e}")
        return None


def is_in_nsfw_folder(file_path: str) -> bool:
    """Check if file is already in an NSFW folder"""
    path_parts = file_path.replace('\\', '/').lower().split('/')
    return 'nsfw' in path_parts


def is_in_safe_folder(file_path: str) -> bool:
    """Check if file is in a SAFE folder (marked safe by user, skip scanning)"""
    path_parts = file_path.replace('\\', '/').lower().split('/')
    return 'safe' in path_parts


def is_in_archive_folder(file_path: str) -> bool:
    """Check if file is in an Archive folder"""
    path_parts = file_path.replace('\\', '/').lower().split('/')
    return 'archive' in path_parts


def should_skip_scanning(file_path: str, skip_archive: bool = False) -> bool:
    """
    Check if file should be skipped for content scanning.
    
    Files in NSFW folders are already flagged.
    Files in SAFE folders are marked safe by user to prevent false positives.
    Files in Archive folders are skipped during full scans (skip_archive=True).
    
    Args:
        file_path: Path to file to check
        skip_archive: If True, also skip files in Archive folders (for full scans)
    """
    if is_in_nsfw_folder(file_path) or is_in_safe_folder(file_path):
        return True
    if skip_archive and is_in_archive_folder(file_path):
        return True
    return False


def scan_folder_batch(
    folder_path: str, 
    batch_size: int = 50,
    get_metadata_func=None,
    skip_archive: bool = False
) -> Generator[Dict[str, Any], None, None]:
    """
    Scan folder for NSFW content in batches.
    
    Args:
        folder_path: Path to folder to scan
        batch_size: Number of files to process per batch
        get_metadata_func: Function to get metadata for a file
        skip_archive: If True, skip files in Archive folders (for full scans)
        
    Yields:
        Progress dict: {'processed': int, 'total': int, 'moved': int, 'current': str}
    """
    # Collect all media files (not in NSFW/SAFE folders, optionally skip Archive)
    image_extensions = ('.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp')
    video_extensions = ('.mp4', '.webm', '.mov', '.avi', '.mkv')
    media_extensions = image_extensions + video_extensions
    files_to_scan = []
    
    for root, dirs, files in os.walk(folder_path):
        # Skip NSFW, SAFE, and optionally Archive folders
        if should_skip_scanning(root, skip_archive=skip_archive):
            continue
            
        for filename in files:
            if filename.lower().endswith(media_extensions):
                files_to_scan.append(os.path.join(root, filename))
    
    total = len(files_to_scan)
    processed = 0
    moved = 0
    
    # Always yield at least once, even if no files to scan
    if total == 0:
        yield {
            'processed': 0,
            'total': 0,
            'moved': 0,
            'current': '',
            'complete': True
        }
        return
    
    for file_path in files_to_scan:
        # Get metadata if function provided
        metadata = None
        if get_metadata_func:
            try:
                metadata = get_metadata_func(file_path)
            except:
                pass
        
        # Scan content
        if scan_media_content(file_path, metadata):
            if move_to_nsfw_folder(file_path):
                moved += 1
        
        processed += 1
        
        # Yield progress every batch
        if processed % batch_size == 0 or processed == total:
            yield {
                'processed': processed,
                'total': total,
                'moved': moved,
                'current': os.path.basename(file_path),
                'complete': processed >= total
            }


def scan_single_file(file_path: str, metadata: Optional[Dict[str, Any]] = None) -> bool:
    """
    Scan a single file and move to NSFW folder if detected.
    
    Args:
        file_path: Path to file
        metadata: Optional metadata dictionary
        
    Returns:
        True if file was moved, False otherwise
    """
    # Skip if already in NSFW folder or in SAFE folder
    if should_skip_scanning(file_path):
        return False
    
    # Scan content
    if scan_media_content(file_path, metadata):
        return move_to_nsfw_folder(file_path) is not None
    
    return False
