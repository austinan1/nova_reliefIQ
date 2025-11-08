import pandas as pd
from sklearn.preprocessing import MinMaxScaler

damage = pd.read_csv("data/pdna_district_damage.csv")
pop = pd.read_csv("data/population_density.csv")
df = damage.merge(pop, on="district")

df["shelter_need"]   = df["houses_destroyed_pct"]
df["wash_need"]      = df["water_facilities_damaged_pct"] * (df["pop_density"]/df["pop_density"].max())
df["food_need"]      = df["food_insecure_households_pct"]
df["logistics_need"] = 100 - df["road_accessibility_score"]
df["rescue_need"]    = df["shelter_need"] * (100 - df["road_accessibility_score"]) / 100
df["health_need"]    = df["health_facilities_damaged_pct"]
df["cash_need"]      = df["poverty_rate"] * df["houses_destroyed_pct"] / 100
df["comms_need"]     = 100 - df["telecom_coverage_pct"]
df["psych_need"]     = df["displaced_pop_pct"]
df["infra_need"]     = df["public_infra_damaged_pct"]
df["agri_need"]      = df["farmland_lost_pct"]

need_cols = ["shelter_need","wash_need","food_need","logistics_need","rescue_need",
             "health_need","cash_need","comms_need","psych_need","infra_need","agri_need"]
scaler = MinMaxScaler((0,100))
df[need_cols] = scaler.fit_transform(df[need_cols])

df.rename(columns={
    "shelter_need":"Emergency Shelter & Housing",
    "wash_need":"Water & Sanitation Recovery",
    "food_need":"Emergency Food Distribution",
    "logistics_need":"Emergency Logistics & Transportation",
    "rescue_need":"Search Rescue & Evacuation",
    "health_need":"Emergency Health Response",
    "cash_need":"Immediate Cash Assistance",
    "comms_need":"Emergency Communications",
    "psych_need":"Psychosocial First Aid",
    "infra_need":"Critical Infrastructure Restoration",
    "agri_need":"Agricultural Recovery"
}, inplace=True)

df.to_csv("outputs/regional_needs_2015.csv", index=False)
print("✅ Built needs matrix → outputs/regional_needs_2015.csv")
