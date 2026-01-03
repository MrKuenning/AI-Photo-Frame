"""
Metadata Extractor Module
Extracts embedded metadata from image and video files.
Supports A1111-style text metadata and JSON metadata formats.
"""

import os
import re
import json
from PIL import Image
from PIL.ExifTags import TAGS
import subprocess

# Cache for extracted metadata to avoid re-reading files
_metadata_cache = {}


def extract_embedded_metadata(file_path):
    """
    Extract embedded metadata from an image or video file.
    Returns a dictionary with prompt, negative_prompt, seed, model, dimensions.
    Uses caching to avoid re-reading files.
    """
    # Check cache first
    if file_path in _metadata_cache:
        return _metadata_cache[file_path]
    
    result = {
        'prompt': None,
        'negative_prompt': None,
        'seed': None,
        'model': None,
        'dimensions': None
    }
    
    try:
        ext = os.path.splitext(file_path)[1].lower()
        
        if ext in ('.jpg', '.jpeg'):
            result = _extract_from_jpeg(file_path)
        elif ext == '.png':
            result = _extract_from_png(file_path)
        elif ext == '.webp':
            result = _extract_from_webp(file_path)
        elif ext in ('.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v'):
            result = _extract_from_video(file_path)
    except Exception as e:
        print(f"[METADATA] Error extracting from {file_path}: {e}")
    
    # Cache the result
    _metadata_cache[file_path] = result
    return result


def _extract_from_jpeg(file_path):
    """Extract metadata from JPEG files using EXIF UserComment or ImageDescription"""
    result = {'prompt': None, 'negative_prompt': None, 'seed': None, 'model': None, 'dimensions': None}
    
    try:
        with Image.open(file_path) as img:
            # Get dimensions
            result['dimensions'] = f"{img.width}x{img.height}"
            
            # Try EXIF data
            exif_data = img._getexif()
            if exif_data:
                for tag_id, value in exif_data.items():
                    tag = TAGS.get(tag_id, tag_id)
                    if tag == 'UserComment':
                        # UserComment often has encoding prefix, try to decode
                        if isinstance(value, bytes):
                            value = _decode_user_comment(value)
                        if isinstance(value, str) and value:
                            result = _parse_a1111_metadata(value, result)
                    elif tag == 'ImageDescription':
                        if isinstance(value, bytes):
                            value = value.decode('utf-8', errors='replace')
                        if isinstance(value, str) and value:
                            result = _parse_a1111_metadata(value, result)
    except Exception as e:
        print(f"[METADATA] JPEG extraction error: {e}")
    
    return result


def _decode_user_comment(data):
    """
    Decode EXIF UserComment field which can have various encodings.
    The first 8 bytes may indicate the encoding, but many applications
    store plain UTF-8/ASCII without a proper marker.
    """
    if not data:
        return ""
    
    if isinstance(data, str):
        return data
    
    # First, try decoding the whole thing as UTF-8 (most common case)
    try:
        decoded = data.decode('utf-8')
        # Check if it looks like valid text (not garbage)
        if decoded and not decoded.startswith(('\x00', '\ufeff')):
            return decoded.rstrip('\x00')
    except:
        pass
    
    # Check if there's an encoding marker (first 8 bytes)
    if len(data) >= 8:
        encoding_marker = data[:8]
        content = data[8:]
        
        try:
            if encoding_marker == b'UNICODE\x00':
                # UTF-16 encoding - try both endianness
                try:
                    return content.decode('utf-16-le').rstrip('\x00')
                except:
                    try:
                        return content.decode('utf-16-be').rstrip('\x00')
                    except:
                        pass
            elif encoding_marker.startswith(b'ASCII\x00\x00\x00'):
                return content.decode('ascii', errors='replace').rstrip('\x00')
            elif encoding_marker == b'\x00\x00\x00\x00\x00\x00\x00\x00':
                # Empty marker - try UTF-8 on the content part
                try:
                    return content.decode('utf-8').rstrip('\x00')
                except:
                    pass
        except:
            pass
    
    # Last resort: try latin-1 which accepts any byte sequence
    try:
        return data.decode('latin-1', errors='replace').rstrip('\x00')
    except:
        return str(data)


def _extract_from_png(file_path):
    """Extract metadata from PNG files using text chunks"""
    result = {'prompt': None, 'negative_prompt': None, 'seed': None, 'model': None, 'dimensions': None}
    
    try:
        with Image.open(file_path) as img:
            # Get dimensions
            result['dimensions'] = f"{img.width}x{img.height}"
            
            # PNG files store metadata in info dictionary
            if hasattr(img, 'info'):
                # Check for 'parameters' key (A1111 standard)
                if 'parameters' in img.info:
                    result = _parse_a1111_metadata(img.info['parameters'], result)
                # Check for 'Comment' key
                elif 'Comment' in img.info:
                    comment = img.info['Comment']
                    # Try parsing as JSON first
                    try:
                        json_data = json.loads(comment)
                        result = _parse_json_metadata(json_data, result)
                    except json.JSONDecodeError:
                        # Not JSON, try A1111 format
                        result = _parse_a1111_metadata(comment, result)
                # Check for 'prompt' key directly (ComfyUI style)
                elif 'prompt' in img.info:
                    try:
                        json_data = json.loads(img.info['prompt'])
                        result = _parse_json_metadata(json_data, result)
                    except:
                        result['prompt'] = img.info['prompt']
    except Exception as e:
        print(f"[METADATA] PNG extraction error: {e}")
    
    return result


def _extract_from_webp(file_path):
    """Extract metadata from WebP files"""
    result = {'prompt': None, 'negative_prompt': None, 'seed': None, 'model': None, 'dimensions': None}
    
    try:
        with Image.open(file_path) as img:
            # Get dimensions
            result['dimensions'] = f"{img.width}x{img.height}"
            
            # WebP can have EXIF data
            exif_data = img.getexif()
            if exif_data:
                for tag_id, value in exif_data.items():
                    tag = TAGS.get(tag_id, tag_id)
                    if tag in ('UserComment', 'ImageDescription'):
                        if isinstance(value, str) and value:
                            result = _parse_a1111_metadata(value, result)
    except Exception as e:
        print(f"[METADATA] WebP extraction error: {e}")
    
    return result


def _extract_from_video(file_path):
    """Extract metadata from video files using ffprobe, with filename fallback"""
    result = {'prompt': None, 'negative_prompt': None, 'seed': None, 'model': None, 'dimensions': None}
    
    ffprobe_success = False
    
    try:
        # Use ffprobe to get metadata
        cmd = [
            'ffprobe', '-v', 'quiet', '-print_format', 'json',
            '-show_format', '-show_streams', file_path
        ]
        
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
        
        if proc.returncode == 0:
            ffprobe_success = True
            data = json.loads(proc.stdout)
            
            # Get dimensions from video stream
            if 'streams' in data:
                for stream in data['streams']:
                    if stream.get('codec_type') == 'video':
                        width = stream.get('width')
                        height = stream.get('height')
                        if width and height:
                            result['dimensions'] = f"{width}x{height}"
                        break
            
            # Get comment/description from format tags
            if 'format' in data and 'tags' in data['format']:
                tags = data['format']['tags']
                
                # Check for 'comment' tag (case-insensitive)
                comment = None
                for key in tags:
                    if key.lower() == 'comment':
                        comment = tags[key]
                        break
                    elif key.lower() == 'description':
                        comment = tags[key]
                        break
                
                if comment:
                    # Try parsing as JSON (WanGP style)
                    try:
                        json_data = json.loads(comment)
                        result = _parse_json_metadata(json_data, result)
                    except json.JSONDecodeError:
                        # Not JSON, try A1111 format
                        result = _parse_a1111_metadata(comment, result)
    except subprocess.TimeoutExpired:
        print(f"[METADATA] ffprobe timeout for {file_path}")
    except FileNotFoundError:
        # ffprobe not installed
        pass
    except Exception as e:
        print(f"[METADATA] Video extraction error: {e}")
    
    # Fallback: parse metadata from filename if ffprobe didn't get the prompt
    if not result.get('prompt'):
        result = _parse_video_filename(file_path, result)
    
    return result


def _parse_video_filename(file_path, result):
    """
    Parse video metadata from filename as fallback.
    Common patterns:
    - 2025-11-26-14h14m35s_seed30533987_prompt text here.mp4
    - 2025-12-21.000152 - 1949693332 - 864x1248 - model - prompt.mp4
    """
    filename = os.path.basename(file_path)
    name_without_ext = os.path.splitext(filename)[0]
    
    # Pattern 1: date_seedNNNNN_prompt (WanGP style)
    match = re.match(r'^[\d-]+[hms\d]*_seed(\d+)_(.+)$', name_without_ext)
    if match:
        result['seed'] = match.group(1)
        result['prompt'] = match.group(2).replace('_', ' ')
        return result
    
    # Pattern 2: date - seed - dimensions - model - prompt (A1111 style)
    parts = name_without_ext.split(' - ')
    if len(parts) >= 4:
        result['seed'] = parts[1] if parts[1].isdigit() else None
        # Check if part 3 looks like dimensions
        if re.match(r'^\d+x\d+$', parts[2]):
            result['dimensions'] = parts[2]
            result['model'] = parts[3] if len(parts) > 3 else None
            result['prompt'] = ' - '.join(parts[4:]) if len(parts) > 4 else None
        else:
            result['model'] = parts[2]
            result['prompt'] = ' - '.join(parts[3:]) if len(parts) > 3 else None
    
    return result


def _parse_a1111_metadata(text, result):
    """
    Parse A1111/Forge style metadata text.
    Format: prompt text
    Negative prompt: negative text
    Steps: X, Sampler: Y, ... Model: Z, ...
    """
    if not text or not isinstance(text, str):
        return result
    
    # Split by "Negative prompt:" to get prompt and rest
    neg_split = re.split(r'\nNegative prompt:\s*', text, maxsplit=1)
    
    if len(neg_split) >= 1:
        result['prompt'] = neg_split[0].strip()
    
    if len(neg_split) >= 2:
        # Split by newline to separate negative prompt from parameters
        remaining = neg_split[1]
        
        # Find where parameters start (look for common parameter names)
        param_match = re.search(r'\n(?:Steps|Sampler|CFG|Seed|Size|Model):', remaining)
        
        if param_match:
            result['negative_prompt'] = remaining[:param_match.start()].strip()
            params_text = remaining[param_match.start():]
        else:
            # No parameters found, everything is negative prompt
            result['negative_prompt'] = remaining.strip()
            params_text = ""
        
        # Parse parameters
        if params_text:
            # Extract Seed
            seed_match = re.search(r'Seed:\s*(\d+)', params_text)
            if seed_match:
                result['seed'] = seed_match.group(1)
            
            # Extract Model
            model_match = re.search(r'Model:\s*([^,\n]+)', params_text)
            if model_match:
                result['model'] = model_match.group(1).strip()
            
            # Extract Size/Dimensions
            size_match = re.search(r'Size:\s*(\d+x\d+)', params_text)
            if size_match:
                result['dimensions'] = size_match.group(1)
    else:
        # No negative prompt marker, check if there are parameters in a single line
        param_match = re.search(r'(?:Steps|Sampler|CFG|Seed|Size|Model):', text)
        if param_match:
            result['prompt'] = text[:param_match.start()].strip()
            params_text = text[param_match.start():]
            
            # Extract Seed
            seed_match = re.search(r'Seed:\s*(\d+)', params_text)
            if seed_match:
                result['seed'] = seed_match.group(1)
            
            # Extract Model
            model_match = re.search(r'Model:\s*([^,\n]+)', params_text)
            if model_match:
                result['model'] = model_match.group(1).strip()
    
    return result


def _parse_json_metadata(data, result):
    """
    Parse JSON metadata (WanGP, ComfyUI, etc.)
    """
    if not isinstance(data, dict):
        return result
    
    # Extract prompt
    if 'prompt' in data:
        result['prompt'] = data['prompt']
    
    # Extract negative prompt
    if 'negative_prompt' in data:
        result['negative_prompt'] = data['negative_prompt']
    elif 'negativePrompt' in data:
        result['negative_prompt'] = data['negativePrompt']
    
    # Extract seed
    if 'seed' in data:
        result['seed'] = str(data['seed'])
    
    # Extract model
    if 'model' in data:
        result['model'] = data['model']
    elif 'model_filename' in data:
        # Extract model name from URL/path
        model_path = data['model_filename']
        result['model'] = os.path.splitext(os.path.basename(model_path))[0]
    elif 'model_type' in data:
        result['model'] = data['model_type']
    
    # Extract dimensions
    if 'resolution' in data:
        result['dimensions'] = data['resolution']
    elif 'width' in data and 'height' in data:
        result['dimensions'] = f"{data['width']}x{data['height']}"
    
    return result


def clear_metadata_cache():
    """Clear the metadata cache"""
    global _metadata_cache
    _metadata_cache = {}


def get_cache_size():
    """Get the number of cached metadata entries"""
    return len(_metadata_cache)
