# app.py
import os
import subprocess
import modal

image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        "joblib==1.4.2",
        "numpy==1.26.4",
        "pandas==2.2.2",
        "scikit-learn==1.5.2",
        "fastapi",  # needed for web endpoints
    )
    .add_local_dir(".", remote_path="/app", copy=False)
)

app = modal.App("reliefiq-pipeline")
vol = modal.Volume.from_name("reliefiq-work", create_if_missing=True)

def link_ws():
    os.makedirs("/workspace/data", exist_ok=True)
    os.makedirs("/workspace/outputs", exist_ok=True)
    if not os.path.exists("/app/data"):
        os.symlink("/workspace/data", "/app/data")
    if not os.path.exists("/app/outputs"):
        os.symlink("/workspace/outputs", "/app/outputs")

# ---------- pipeline steps ----------

@app.function(image=image, volumes={"/workspace": vol}, timeout=600)
def build_matrix():
    link_ws()
    # run from /app so relative "data/..." paths in your script resolve
    subprocess.run(["python", "build_need_matrix.py"], check=True, cwd="/app")
    vol.commit()
    return "needs matrix built"

@app.function(image=image, volumes={"/workspace": vol}, timeout=600)
def compute_fitness():
    link_ws()
    subprocess.run(["python", "compute_fitness.py"], check=True, cwd="/app")
    vol.commit()
    return "fitness scores computed"

@app.function(image=image, volumes={"/workspace": vol}, timeout=600)
def train_model():
    link_ws()
    subprocess.run(["python", "train_model.py"], check=True, cwd="/app")
    vol.commit()
    return "model trained"

@app.function(image=image, volumes={"/workspace": vol}, timeout=1800)
def run_pipeline():
    build_matrix.remote()
    compute_fitness.remote()
    train_model.remote()
    return "pipeline complete"

# ---------- web inference endpoint ----------

@app.function(image=image, volumes={"/workspace": vol}, timeout=120)
@modal.fastapi_endpoint(method="POST")  # <- updated decorator
def predict(body: dict):
    import pandas as pd, numpy as np, pickle

    link_ws()

    ngo = body.get("ngo")
    district = body.get("district")
    if not ngo or not district:
        return {"error": "Provide 'ngo' and 'district'."}, 400

    # use /app paths (symlinked to the volume)
    needs = pd.read_csv("/app/outputs/regional_needs_2015.csv")
    ngos  = pd.read_csv("/app/data/ngo_capabilities.csv")
    with open("/app/outputs/model.pkl", "rb") as f:
        model = pickle.load(f)

    cats = [c for c in needs.columns if c in ngos.columns and c != "district"]
    if not cats:
        return {"error": "No overlapping categories between needs and NGO capabilities."}, 500

    def cosine(a, b):
        if np.linalg.norm(a) == 0 or np.linalg.norm(b) == 0: return 0.0
        return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))

    try:
        ngo_vec = ngos.loc[ngos["NGO"] == ngo, cats].values[0].astype(float)
        reg_vec = needs.loc[needs["district"] == district, cats].values[0].astype(float)
    except IndexError:
        return {"error": "Unknown NGO or district."}, 404

    match = cosine(ngo_vec, reg_vec)
    urgency = float(reg_vec.mean() / 100.0)
    X = pd.DataFrame([[match, urgency]], columns=["match", "urgency"])
    pred = float(model.predict(X)[0])
    return {"ngo": ngo, "district": district, "fitness": pred}

# ---------- small helpers ----------

@app.function(image=image, volumes={"/workspace": vol})
def debug_ls():
    link_ws()
    import os
    print("== /app ==")
    print(os.listdir("/app"))
    print("== /app/data ==")
    print(os.listdir("/app/data"))
    print("== /app/outputs ==")
    print(os.listdir("/app/outputs"))

@app.local_entrypoint()
def main():
    run_pipeline.remote()
    print("✅ pipeline complete")
