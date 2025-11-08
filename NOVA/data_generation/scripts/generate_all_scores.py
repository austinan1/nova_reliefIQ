"""
Generate NGO region scores for all NGO-district combinations using predict.py
Updates data_generation/outputs/ngo_region_scores.csv
"""
import pandas as pd
import numpy as np
import pickle
import os
import sys

# Get the directory where this script is located
script_dir = os.path.dirname(os.path.abspath(__file__))
data_gen_dir = os.path.dirname(script_dir)

# Load model and data with correct paths (same as predict.py)
model_path = os.path.join(data_gen_dir, "outputs", "model.pkl")
needs_path = os.path.join(data_gen_dir, "outputs", "regional_needs_2015.csv")
ngos_path = os.path.join(data_gen_dir, "data", "ngo_capabilities.csv")

# Load data
model = pickle.load(open(model_path, "rb"))
needs = pd.read_csv(needs_path)
ngos = pd.read_csv(ngos_path)

cats = [c for c in needs.columns if c in ngos.columns and c != "district"]

def cosine(a, b):
    """Calculate cosine similarity between two vectors"""
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

def calculate_match_and_urgency(ngo_name, region_name):
    """Calculate match and urgency scores for an NGO-district pair"""
    ngo_vec = ngos.loc[ngos["NGO"] == ngo_name, cats].values[0]
    reg_vec = needs.loc[needs["district"] == region_name, cats].values[0]
    match = cosine(ngo_vec, reg_vec)
    urgency = reg_vec.mean() / 100
    return match, urgency

def predict_fitness(ngo_name, region_name):
    """Predict fitness score using the model"""
    match, urgency = calculate_match_and_urgency(ngo_name, region_name)
    X = pd.DataFrame([[match, urgency]], columns=["match", "urgency"])
    return float(model.predict(X)[0])

def generate_all_scores():
    """Generate scores for all NGO-district combinations"""
    # Get all unique NGOs and districts
    unique_ngos = sorted(ngos["NGO"].unique())
    unique_districts = sorted(needs["district"].unique())
    
    print(f"Generating scores for {len(unique_ngos)} NGOs and {len(unique_districts)} districts...")
    print(f"Total combinations: {len(unique_ngos) * len(unique_districts)}")
    
    results = []
    total = len(unique_ngos) * len(unique_districts)
    count = 0
    
    for ngo in unique_ngos:
        for district in unique_districts:
            count += 1
            if count % 100 == 0:
                print(f"Progress: {count}/{total} ({count*100/total:.1f}%)")
            
            try:
                # Calculate match and urgency
                match, urgency = calculate_match_and_urgency(ngo, district)
                
                # Get fitness score from model using match and urgency
                X = pd.DataFrame([[match, urgency]], columns=["match", "urgency"])
                fitness_score = float(model.predict(X)[0])
                
                results.append({
                    'NGO': ngo,
                    'district': district,
                    'match': match,
                    'urgency': urgency,
                    'fitness_score': fitness_score
                })
            except Exception as e:
                print(f"Error processing {ngo} - {district}: {str(e)}")
                continue
    
    # Create DataFrame
    scores_df = pd.DataFrame(results)
    
    # Save to CSV
    output_path = os.path.join(data_gen_dir, "outputs", "ngo_region_scores.csv")
    scores_df.to_csv(output_path, index=False)
    
    print(f"\n✅ Successfully generated {len(scores_df)} scores")
    print(f"📁 Saved to: {output_path}")
    print(f"\nSummary:")
    print(f"  - NGOs: {len(unique_ngos)}")
    print(f"  - Districts: {len(unique_districts)}")
    print(f"  - Total combinations: {len(scores_df)}")
    print(f"\nScore ranges:")
    print(f"  - Match: {scores_df['match'].min():.4f} - {scores_df['match'].max():.4f}")
    print(f"  - Urgency: {scores_df['urgency'].min():.4f} - {scores_df['urgency'].max():.4f}")
    print(f"  - Fitness: {scores_df['fitness_score'].min():.4f} - {scores_df['fitness_score'].max():.4f}")
    
    return scores_df

if __name__ == "__main__":
    generate_all_scores()

