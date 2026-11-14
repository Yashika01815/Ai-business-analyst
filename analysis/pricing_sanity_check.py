"""Pricing sanity-check for the proposed Free/Pro/Advanced tiers.

Question: do the proposed price points (Rs 0 / 499 / 1499) sit in a
plausible range relative to observed willingness-to-pay proxies in the
repo's sample subscription data (backend/sample_data/customers.csv)?
Metric: monthly_revenue per plan_tier (ARPU proxy) and churn by tier.
"""
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "analysis" / "outputs"
OUT.mkdir(parents=True, exist_ok=True)

df = pd.read_csv(ROOT / "backend" / "sample_data" / "customers.csv", parse_dates=["signup_date"])

summary = df.groupby("plan_tier").agg(
    customers=("customer_id", "count"),
    arpu_monthly_revenue=("monthly_revenue", "mean"),
    median_revenue=("monthly_revenue", "median"),
    churn_rate=("churned", "mean"),
    avg_usage=("usage_score", "mean"),
).round(2)
print(summary)
summary.to_csv(OUT / "tier_summary.csv")

fig, axes = plt.subplots(1, 2, figsize=(11, 4))
summary["arpu_monthly_revenue"].plot.bar(ax=axes[0], color="#4f46e5", rot=0)
axes[0].set_title("ARPU proxy by plan tier (monthly revenue)")
axes[0].set_ylabel("Rs/month (sample data units)")
summary["churn_rate"].plot.bar(ax=axes[1], color="#f59e0b", rot=0)
axes[1].set_title("Churn rate by plan tier")
axes[1].axhline(df["churned"].mean(), ls="--", c="grey", lw=1, label="overall")
axes[1].legend()
fig.tight_layout()
fig.savefig(OUT / "tier_arpu_churn.png", dpi=120)

# 95% CI for the mid tier ARPU (ties Pro's Rs 499 to an observed range)
pro = df[df["plan_tier"] == "Starter"]["monthly_revenue"]
ci = pro.sem() * 1.96
print(f"Starter ARPU 95% CI: {pro.mean():.0f} ± {ci:.0f} (n={len(pro)})")
print(f"Rows: {len(df)}, missing monthly_revenue: {df['monthly_revenue'].isna().sum()}, duplicates: {df['customer_id'].duplicated().sum()}")
