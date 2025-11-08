import pandas as pd, numpy as np, pickle
import sys
import os

def cosine(a,b):
    return np.dot(a,b)/(np.linalg.norm(a)*np.linalg.norm(b))

# Get the directory where this script is located
script_dir = os.path.dirname(os.path.abspath(__file__))
data_gen_dir = os.path.dirname(script_dir)

# Load model and data with correct paths
model_path = os.path.join(data_gen_dir, "outputs", "model.pkl")
needs_path = os.path.join(data_gen_dir, "outputs", "regional_needs_2015.csv")
ngos_path = os.path.join(data_gen_dir, "data", "ngo_capabilities.csv")

model = pickle.load(open(model_path, "rb"))
needs = pd.read_csv(needs_path)
ngos  = pd.read_csv(ngos_path)

cats = [c for c in needs.columns if c in ngos.columns and c != "district"]

def predict_fitness(ngo_name, region_name):
    ngo_vec = ngos.loc[ngos["NGO"]==ngo_name, cats].values[0]
    reg_vec = needs.loc[needs["district"]==region_name, cats].values[0]
    match = cosine(ngo_vec, reg_vec)
    urgency = reg_vec.mean()/100
    X = pd.DataFrame([[match, urgency]], columns=["match","urgency"])
    return float(model.predict(X)[0])

# Command-line interface
if __name__ == "__main__":
    if len(sys.argv) == 3:
        # Two arguments: NGO name and district name
        ngo_name = sys.argv[1]
        district_name = sys.argv[2]
        
        # Check if NGO exists
        if ngo_name not in ngos["NGO"].values:
            print(f"Error: NGO '{ngo_name}' not found.")
            print(f"Available NGOs: {', '.join(ngos['NGO'].head(10).tolist())}...")
            sys.exit(1)
        
        # Check if district exists
        if district_name not in needs["district"].values:
            print(f"Error: District '{district_name}' not found.")
            print(f"Available districts: {', '.join(needs['district'].head(10).tolist())}...")
            sys.exit(1)
        
        score = predict_fitness(ngo_name, district_name)
        print(f"Predicted Fitness Score: {score:.2f}")
        print(f"NGO: {ngo_name}")
        print(f"District: {district_name}")
        
    elif len(sys.argv) == 1:
        # No arguments - run default example
        print("Predicted Fitness (Red Cross → Sindhupalchok):",
              predict_fitness("Red Cross", "Sindhupalchok"))
    else:
        print("Usage: python predict.py [NGO_NAME] [DISTRICT_NAME]")
        print("Example: python predict.py 'CARE Nepal' 'Sindhupalchok'")
        print("\nOr run without arguments for default example.")
        sys.exit(1)
