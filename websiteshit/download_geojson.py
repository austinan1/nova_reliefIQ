"""
Download Nepal districts GeoJSON file
This script downloads a Nepal districts GeoJSON file from a public source.
"""
import urllib.request
import os

# URL for Nepal districts GeoJSON (using a common public source)
# You may need to replace this with an actual URL or provide the file manually
GEOJSON_URL = "https://raw.githubusercontent.com/codefornepal/nepalmap/master/static/data/nepal-districts.geojson"

def download_geojson():
    """Download Nepal districts GeoJSON file"""
    output_path = "data/nepal-districts.geojson"
    
    # Create data directory if it doesn't exist
    os.makedirs("data", exist_ok=True)
    
    try:
        print(f"Downloading GeoJSON from {GEOJSON_URL}...")
        urllib.request.urlretrieve(GEOJSON_URL, output_path)
        print(f"✓ GeoJSON downloaded successfully to {output_path}")
        return True
    except Exception as e:
        print(f"✗ Error downloading GeoJSON: {e}")
        print("\nPlease manually download a Nepal districts GeoJSON file and save it as:")
        print(f"  {output_path}")
        print("\nYou can find Nepal GeoJSON files at:")
        print("  - https://github.com/codefornepal/nepalmap")
        print("  - https://github.com/younginnovations/nepal-geojson")
        return False

if __name__ == "__main__":
    download_geojson()

