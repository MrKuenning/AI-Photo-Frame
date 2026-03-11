import os
import sys
from utils.metadata_extractor import extract_embedded_metadata

base_dir = r"E:\AI\Output"
webp_files = []

print(f"Scanning for webp files in {base_dir}...")
for root, dirs, files in os.walk(base_dir):
    for file in files:
        ext = os.path.splitext(file)[1].lower()
        if ext == '.webp':
            webp_files.append(os.path.join(root, file))
        if len(webp_files) >= 2:
            break
    if len(webp_files) >= 2:
        break

print(f"Found {len(webp_files)} webp files to test.")
for f in webp_files:
    print(f"\n--- Testing {os.path.basename(f)} ---")
    meta = extract_embedded_metadata(f)
    if meta:
        print(f"Metadata extracted: {list(meta.keys())}")
        for k, v in meta.items():
            val_str = str(v)
            if len(val_str) > 100:
                print(f"  {k}: {val_str[:100]}...")
            else:
                print(f"  {k}: {val_str}")
    else:
        print("No metadata found.")
