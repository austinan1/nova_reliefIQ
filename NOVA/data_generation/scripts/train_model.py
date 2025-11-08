import pandas as pd, pickle
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor

data = pd.read_csv("outputs/ngo_region_scores.csv")
data = data.dropna(subset=["fitness_score"])
print("✅ Loaded data:", data.shape)

X = data[["match","urgency"]]
y = data["fitness_score"]

X_train,X_test,y_train,y_test=train_test_split(X,y,test_size=0.2,random_state=42)
model=RandomForestRegressor(n_estimators=300,random_state=42)
model.fit(X_train,y_train)
print("Model R²:", model.score(X_test,y_test))

pickle.dump(model, open("outputs/model.pkl","wb"))
print("✅ Saved model.pkl")
