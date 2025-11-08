import pandas as pd
import folium
import json
import os
import urllib.request

# -------------------------------------------------
# Step 1: Ensure GeoJSON exists
# -------------------------------------------------
geo_path = "nepal_districts.geojson"
if not os.path.exists(geo_path):
    url = "https://raw.githubusercontent.com/Acesmndr/nepal-geojson/master/nepal-with-districts-acesmndr.geojson"
    print("🌐 Downloading Nepal district GeoJSON...")
    urllib.request.urlretrieve(url, geo_path)
    print("✅ Downloaded nepal_districts.geojson")

# -------------------------------------------------
# Step 2: Load datasets
# -------------------------------------------------
df = pd.read_csv("nepal_districts_colored.csv")

with open(geo_path, "r", encoding="utf-8") as f:
    geo_data = json.load(f)

# Identify the property with district name
sample_props = geo_data["features"][0]["properties"]
name_key = "DISTRICT" if "DISTRICT" in sample_props else list(sample_props.keys())[0]
print(f"✅ Using '{name_key}' as district key.\n")

# -------------------------------------------------
# Step 3: Standardize names (uppercase)
# -------------------------------------------------
# Make all names uppercase for matching
df["district_upper"] = df["district"].str.upper().str.strip()
color_map = dict(zip(df["district_upper"], df["color"]))

# -------------------------------------------------
# Step 4: Build map
# -------------------------------------------------
m = folium.Map(location=[28.4, 84.1], zoom_start=6, tiles="cartodbpositron")

def style_function(feature):
    name = feature["properties"][name_key].upper().strip()
    return {
        "fillColor": color_map.get(name, "#cccccc"),
        "color": "black",
        "weight": 0.5,
        "fillOpacity": 0.8,
    }

folium.GeoJson(
    geo_data,
    name="Districts",
    style_function=style_function,
    tooltip=folium.GeoJsonTooltip(fields=[name_key], aliases=["District:"], labels=True)
).add_to(m)

# -------------------------------------------------
# Step 5: Add legend (value scale)
# -------------------------------------------------
folium.Choropleth(
    geo_data=geo_data,
    data=df,
    columns=["district_upper", "value"],
    key_on=f"feature.properties.{name_key}",
    fill_color="RdYlGn",
    fill_opacity=0.2,
    line_opacity=0.1,
    legend_name="Regional Value (1–100)"
).add_to(m)

# -------------------------------------------------
# Step 6: Save map
# -------------------------------------------------
m.save("nepal_districts_map.html")
print("✅ Saved interactive map → nepal_districts_map.html")
print("🎨 Map now uses uppercase match — colors should display correctly.")
