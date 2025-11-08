import pandas as pd, numpy as np, pickle

def cosine(a,b):
    return np.dot(a,b)/(np.linalg.norm(a)*np.linalg.norm(b))

model = pickle.load(open("outputs/model.pkl","rb"))
needs = pd.read_csv("outputs/regional_needs_2015.csv")
ngos  = pd.read_csv("data/ngo_capabilities.csv")

cats = [c for c in needs.columns if c in ngos.columns and c != "district"]

def predict_fitness(ngo_name, region_name):
    ngo_vec = ngos.loc[ngos["NGO"]==ngo_name, cats].values[0]
    reg_vec = needs.loc[needs["district"]==region_name, cats].values[0]
    match = cosine(ngo_vec, reg_vec)
    urgency = reg_vec.mean()/100
    X = pd.DataFrame([[match, urgency]], columns=["match","urgency"])
    return float(model.predict(X)[0])

print("Predicted Fitness (Red Cross → Sindhupalchok):",
      predict_fitness("Red Cross", "Sindhupalchok"))
