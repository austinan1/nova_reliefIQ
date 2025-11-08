import pandas as pd

def value_to_color(value):
    """Map value (1–100) to red→green hex color."""
    t = (value - 1) / 99  # Normalize
    r = int(255 * (1 - t))
    g = int(255 * t)
    b = 0
    return f"#{r:02x}{g:02x}{b:02x}"

# Load CSV
df = pd.read_csv("nepal_districts.csv")

# Add color column
df["color"] = df["value"].apply(value_to_color)

# Save
df.to_csv("nepal_districts_colored.csv", index=False)
print("✅ Added color gradient to nepal_districts_colored.csv.")
