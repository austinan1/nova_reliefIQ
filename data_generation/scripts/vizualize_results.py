import pandas as pd
import folium

scores = pd.read_csv("outputs/ngo_region_scores.csv")
needs = pd.read_csv("outputs/regional_needs_2015.csv")

m = folium.Map(location=[28.4,84.1], zoom_start=6, tiles="cartodbpositron")
for _,r in needs.iterrows():
    folium.CircleMarker(
        location=[r["lat"], r["lon"]],
        radius=5,
        popup=f"{r['district']} — AvgNeed: {r[cats].mean():.1f}",
        color="red", fill=True
    ).add_to(m)
m.save("outputs/map.html")
