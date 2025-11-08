import pandas as pd
import numpy as np
from pathlib import Path

# -----------------------------
# Configuration
# -----------------------------
INPUT_DIR = Path(".")      # current directory
OUTPUT_SUFFIX = "_trimmed" # output file suffix
DECIMALS = 2               # how many decimals to keep
ROUND_MODE = "truncate"    # "truncate" or "round"

# -----------------------------
# Function to truncate/round
# -----------------------------
def truncate_series(s: pd.Series, decimals: int = 1):
    """Truncate (not round) numeric values in a Series to given decimals."""
    multiplier = 10 ** decimals
    return np.floor(s * multiplier) / multiplier

# -----------------------------
# Process all CSVs
# -----------------------------
csv_files = list(INPUT_DIR.glob("*.csv"))
if not csv_files:
    print("⚠️  No CSV files found in current directory.")
else:
    for f in csv_files:
        print(f"Processing {f.name}...")
        try:
            df = pd.read_csv(f)
        except Exception as e:
            print(f"  ❌ Skipping {f.name}: {e}")
            continue

        # Apply truncation/rounding to all numeric columns
        for c in df.columns:
            if pd.api.types.is_numeric_dtype(df[c]):
                if ROUND_MODE == "truncate":
                    df[c] = truncate_series(df[c], DECIMALS)
                else:
                    df[c] = df[c].round(DECIMALS)

        # Output file
        out_path = f.with_name(f.stem + OUTPUT_SUFFIX + f.suffix)
        df.to_csv(out_path, index=False)
        print(f"  ✅ Saved {out_path.name}")

    print("\n🎯 Done — all numeric values truncated to one decimal place.")