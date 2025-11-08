import geopandas as gpd
import pandas as pd
import matplotlib.pyplot as plt

gdf = gpd.read_file("nepal_provinces.geojson")
df = pd.read_csv("nepal_regions_colored.csv")

merged = gdf.merge(df, left_on="province_name", right_on="region")
merged.plot(color=merged["color"])
plt.title("Nepal Regions by Value")
plt.show()
