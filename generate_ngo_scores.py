"""
Generate ngo_region_scores.csv file with match, urgency, and fitness_score columns.
This script creates scores for each NGO-district combination.
"""
import pandas as pd
import numpy as np

# Load data
damage_df = pd.read_csv('data/input/pdna_district_damage.csv')
ngo_df = pd.read_csv('data/input/ngo_capabilities.csv')
pop_df = pd.read_csv('data/input/population_density.csv')

# Get unique NGOs and districts
ngos = sorted(ngo_df['ngo_name'].unique())
districts = sorted(damage_df['district'].unique())

# Create combinations
results = []

for ngo in ngos:
    # Get NGO capabilities
    ngo_capabilities = ngo_df[ngo_df['ngo_name'] == ngo]
    
    for district in districts:
        # Get district damage data
        district_data = damage_df[damage_df['district'] == district].iloc[0]
        
        # Calculate urgency based on damage metrics
        urgency = (
            district_data['houses_destroyed_pct'] * 0.2 +
            district_data['health_facilities_damaged_pct'] * 0.15 +
            district_data['water_facilities_damaged_pct'] * 0.15 +
            district_data['food_insecure_households_pct'] * 0.2 +
            district_data['displaced_pop_pct'] * 0.15 +
            (100 - district_data['road_accessibility_score']) * 0.15
        ) / 100.0
        
        # Calculate match score based on NGO capabilities vs district needs
        match_score = 0.0
        total_weight = 0.0
        
        # Health facilities damaged -> Health Response
        if district_data['health_facilities_damaged_pct'] > 50:
            health_cap = ngo_capabilities[ngo_capabilities['category'] == 'Emergency Health Response']
            if not health_cap.empty and health_cap.iloc[0]['capacity_score'] > 0:
                match_score += 0.2
            total_weight += 0.2
        
        # Water facilities damaged -> Water & Sanitation
        if district_data['water_facilities_damaged_pct'] > 50:
            water_cap = ngo_capabilities[ngo_capabilities['category'] == 'Water & Sanitation Recovery']
            if not water_cap.empty and water_cap.iloc[0]['capacity_score'] > 0:
                match_score += 0.2
            total_weight += 0.2
        
        # Food insecure -> Food Distribution
        if district_data['food_insecure_households_pct'] > 50:
            food_cap = ngo_capabilities[ngo_capabilities['category'] == 'Emergency Food Distribution']
            if not food_cap.empty and food_cap.iloc[0]['capacity_score'] > 0:
                match_score += 0.2
            total_weight += 0.2
        
        # Houses destroyed -> Shelter
        if district_data['houses_destroyed_pct'] > 50:
            shelter_cap = ngo_capabilities[ngo_capabilities['category'] == 'Emergency Shelter & Housing']
            if not shelter_cap.empty and shelter_cap.iloc[0]['capacity_score'] > 0:
                match_score += 0.2
            total_weight += 0.2
        
        # Public infrastructure -> Infrastructure Restoration
        if district_data['public_infra_damaged_pct'] > 50:
            infra_cap = ngo_capabilities[ngo_capabilities['category'] == 'Critical Infrastructure Restoration']
            if not infra_cap.empty and infra_cap.iloc[0]['capacity_score'] > 0:
                match_score += 0.2
            total_weight += 0.2
        
        # Normalize match score
        if total_weight > 0:
            match_score = match_score / total_weight
        else:
            match_score = 0.5  # Default if no high damage areas
        
        # Fitness score combines match and urgency
        fitness_score = (match_score * 0.6 + urgency * 0.4) * 100
        
        results.append({
            'NGO': ngo,
            'district': district,
            'match': round(match_score * 100, 2),
            'urgency': round(urgency * 100, 2),
            'fitness_score': round(fitness_score, 2)
        })

# Create DataFrame and save
scores_df = pd.DataFrame(results)
scores_df.to_csv('data/input/ngo_region_scores.csv', index=False)
print(f"Generated ngo_region_scores.csv with {len(scores_df)} rows")
print(f"Covering {len(ngos)} NGOs and {len(districts)} districts")

