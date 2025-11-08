import pandas as pd, numpy as np, re

def clean_cols(df):
    df.columns = [re.sub(r'[^0-9A-Za-z &]+','', c).strip() for c in df.columns]
    return df

def cosine(a,b):
    if np.linalg.norm(a)==0 or np.linalg.norm(b)==0:
        return 0
    return np.dot(a,b)/(np.linalg.norm(a)*np.linalg.norm(b))

needs = clean_cols(pd.read_csv("outputs/regional_needs_2015.csv"))
ngos  = clean_cols(pd.read_csv("data/ngo_capabilities.csv"))

cats = [c for c in needs.columns if c in ngos.columns and c != "district"]
print("✅ Matching categories:", cats)
if not cats:
    raise ValueError("No overlapping categories – check CSV headers!")

pairs=[]
for _,ngo in ngos.iterrows():
    C=ngo[cats].values.astype(float)
    for _,reg in needs.iterrows():
        N=reg[cats].values.astype(float)
        match=cosine(C,N)
        urgency=N.mean()/100
        score=0.7*match+0.3*urgency
        if np.isnan(score):
            continue
        pairs.append({"NGO":ngo["NGO"],"district":reg["district"],
                      "match":match,"urgency":urgency,"fitness_score":score})

df=pd.DataFrame(pairs)
df.to_csv("outputs/ngo_region_scores.csv",index=False)
print(f"✅ Saved {len(df)} NGO–region pairs → outputs/ngo_region_scores.csv")
