import pandas as pd

# Load input and output paths
input_path = "data/input/ngo_capabilities.csv"
output_path = "data/output/ngo_capabilities_converted.csv"

# Read input data
df = pd.read_csv(input_path)

# Define all relief categories for consistent schema
categories = [
    "Emergency Shelter & Housing",
    "Water & Sanitation Recovery",
    "Emergency Food Distribution",
    "Emergency Logistics & Transportation",
    "Search Rescue & Evacuation",
    "Emergency Health Response",
    "Immediate Cash Assistance",
    "Emergency Communications",
    "Psychosocial First Aid",
    "Critical Infrastructure Restoration",
    "Agricultural Recovery"
]

# Initialize empty NGO dictionary
output = {}

for _, row in df.iterrows():
    ngo = str(row["ngo_name"]).strip()
    category = str(row["category"]).strip()
    score = float(row["capacity_score"])

    # Initialize NGO entry if new
    if ngo not in output:
        output[ngo] = {c: 0 for c in categories}

    # Assign 1 if score > 0, else 0
    if category in output[ngo]:
        output[ngo][category] = 1 if score > 0 else 0

# Convert dictionary to DataFrame
output_df = pd.DataFrame.from_dict(output, orient="index").reset_index()
output_df.rename(columns={"index": "NGO"}, inplace=True)

# Ensure columns are in correct order
output_df = output_df[["NGO"] + categories]

# Convert only numeric columns to int
numeric_cols = [c for c in output_df.columns if c != "NGO"]
output_df[numeric_cols] = output_df[numeric_cols].fillna(0).astype(int)

# Add any NGOs that may not exist in the input, with default 0s
all_ngos = [
    "Red Cross", "World Vision", "CARE Nepal", "UNICEF", 
    "Oxfam", "Save the Children", "Habitat for Humanity", 
    "WFP", "FAO"
]

for ngo in all_ngos:
    if ngo not in output_df["NGO"].values:
        output_df.loc[len(output_df)] = [ngo] + [0] * len(categories)

# Save to CSV
output_df.to_csv(output_path, index=False)
print(f"✅ NGO capability matrix saved to {output_path}")
print(output_df.head())