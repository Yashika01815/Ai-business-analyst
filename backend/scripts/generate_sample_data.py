"""
Generates realistic sample business datasets used for demo purposes.
Run: python scripts/generate_sample_data.py
"""
import os
import numpy as np
import pandas as pd

np.random.seed(42)
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "sample_data")
os.makedirs(OUT_DIR, exist_ok=True)

# ---------------------------------------------------------------------------
# 1. Sales dataset (transactions, products, regions)
# ---------------------------------------------------------------------------
n = 2400
dates = pd.date_range("2023-01-01", "2024-12-31", periods=n)
products = ["Aurora Desk", "Nimbus Chair", "Vertex Monitor", "Halo Lamp", "Orbit Keyboard", "Zenith Headset"]
regions = ["North America", "Europe", "APAC", "Latin America"]
channels = ["Online", "Retail Partner", "Direct Sales"]

product_base_price = {"Aurora Desk": 420, "Nimbus Chair": 260, "Vertex Monitor": 310,
                       "Halo Lamp": 65, "Orbit Keyboard": 90, "Zenith Headset": 150}

rows = []
for i in range(n):
    d = dates[i]
    product = np.random.choice(products, p=[0.22, 0.2, 0.18, 0.14, 0.14, 0.12])
    region = np.random.choice(regions, p=[0.4, 0.28, 0.22, 0.1])
    channel = np.random.choice(channels, p=[0.55, 0.25, 0.2])
    qty = max(1, int(np.random.poisson(3)))
    seasonal = 1 + 0.25 * np.sin(2 * np.pi * d.dayofyear / 365)
    growth = 1 + 0.15 * (i / n)
    noise = np.random.normal(1, 0.08)
    unit_price = product_base_price[product] * np.random.uniform(0.92, 1.08)
    revenue = round(unit_price * qty * seasonal * growth * noise, 2)
    cost = round(revenue * np.random.uniform(0.45, 0.65), 2)
    rows.append([d.strftime("%Y-%m-%d"), product, region, channel, qty, unit_price, revenue, cost,
                 f"CUST-{np.random.randint(1000, 1400)}"])

# Inject a few deliberate anomalies (spikes/drops) for the anomaly engine to find
for spike_date in [pd.Timestamp("2024-06-15"), pd.Timestamp("2024-11-29")]:
    for _ in range(8):
        rows.append([spike_date.strftime("%Y-%m-%d"), "Zenith Headset", "North America", "Online",
                     40, 150, 150 * 40 * np.random.uniform(0.9, 1.1), 150 * 40 * 0.5, f"CUST-{np.random.randint(1000,1400)}"])

# Some missing values and duplicates to demonstrate the Data Quality Center
sales_df = pd.DataFrame(rows, columns=["order_date", "product", "region", "channel",
                                        "quantity", "unit_price", "revenue", "cost", "customer_id"])
missing_idx = np.random.choice(sales_df.index, size=40, replace=False)
sales_df.loc[missing_idx, "unit_price"] = np.nan
dup_rows = sales_df.sample(15, random_state=1)
sales_df = pd.concat([sales_df, dup_rows], ignore_index=True)
sales_df.to_csv(os.path.join(OUT_DIR, "sales.csv"), index=False)

# ---------------------------------------------------------------------------
# 2. Marketing campaigns dataset
# ---------------------------------------------------------------------------
n2 = 400
camp_dates = pd.date_range("2023-01-01", "2024-12-31", periods=n2)
campaign_names = ["Spring Launch", "Summer Sale", "Back to School", "Holiday Push", "Always-On Search", "Retargeting"]
channels2 = ["Google Ads", "Meta Ads", "LinkedIn Ads", "Email", "Affiliate"]

rows2 = []
for i in range(n2):
    d = camp_dates[i]
    campaign = np.random.choice(campaign_names)
    channel = np.random.choice(channels2, p=[0.3, 0.28, 0.12, 0.15, 0.15])
    spend = round(np.random.uniform(200, 5000) * (1 + 0.1 * np.sin(2 * np.pi * d.dayofyear / 365)), 2)
    ctr = np.random.uniform(0.008, 0.045)
    impressions = int(spend * np.random.uniform(80, 200))
    clicks = int(impressions * ctr)
    conv_rate = np.random.uniform(0.01, 0.08)
    conversions = max(0, int(clicks * conv_rate))
    revenue = round(conversions * np.random.uniform(60, 220), 2)
    rows2.append([d.strftime("%Y-%m-%d"), campaign, channel, spend, impressions, clicks, conversions, revenue])

marketing_df = pd.DataFrame(rows2, columns=["date", "campaign_name", "channel", "spend",
                                             "impressions", "clicks", "conversions", "revenue"])
marketing_df.to_csv(os.path.join(OUT_DIR, "marketing.csv"), index=False)

# ---------------------------------------------------------------------------
# 3. Customer subscriptions dataset (for segmentation demo)
# ---------------------------------------------------------------------------
n3 = 900
plans = ["Starter", "Growth", "Scale", "Enterprise"]
plan_price = {"Starter": 29, "Growth": 99, "Scale": 249, "Enterprise": 699}
regions3 = ["North America", "Europe", "APAC", "Latin America"]

rows3 = []
for i in range(n3):
    plan = np.random.choice(plans, p=[0.4, 0.32, 0.18, 0.1])
    tenure_months = max(1, int(np.random.exponential(14)))
    monthly_revenue = plan_price[plan] * np.random.uniform(0.9, 1.15)
    usage_score = np.clip(np.random.normal(60 if plan in ["Scale", "Enterprise"] else 40, 20), 0, 100)
    support_tickets = max(0, int(np.random.poisson(2 if usage_score < 30 else 0.8)))
    churned = 1 if (usage_score < 20 and np.random.random() < 0.4) else (1 if np.random.random() < 0.03 else 0)
    signup_date = pd.Timestamp("2024-12-31") - pd.Timedelta(days=tenure_months * 30)
    rows3.append([f"CUST-{1000+i}", plan, np.random.choice(regions3), signup_date.strftime("%Y-%m-%d"),
                  tenure_months, round(monthly_revenue, 2), round(usage_score, 1), support_tickets, churned])

customers_df = pd.DataFrame(rows3, columns=["customer_id", "plan_tier", "region", "signup_date",
                                             "tenure_months", "monthly_revenue", "usage_score",
                                             "support_tickets", "churned"])
customers_df.to_csv(os.path.join(OUT_DIR, "customers.csv"), index=False)

print("Sample datasets generated in", OUT_DIR)
print("- sales.csv:", len(sales_df), "rows")
print("- marketing.csv:", len(marketing_df), "rows")
print("- customers.csv:", len(customers_df), "rows")
