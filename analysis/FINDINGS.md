# Findings: pricing sanity-check for the Free / Pro / Advanced tiers

**Date:** 2026-11-14 · **Script:** `analysis/pricing_sanity_check.py` · **Data:** `backend/sample_data/customers.csv` (900 rows, the app's bundled sample subscription data)

## Question and metric

Do the proposed launch prices (Free ₹0, Pro ₹499, Advanced ₹1,499) sit in a plausible
range relative to observed ARPU (mean `monthly_revenue`) and churn by `plan_tier` in
the sample data? This informs the Pricing page copy already shipped — it does **not**
validate real willingness to pay.

## Method and data quality

- Grouped `monthly_revenue`, `churned`, `usage_score` by `plan_tier`; 95% CI via normal approximation (SEM × 1.96).
- Data checks: 900 rows, 0 missing `monthly_revenue`, 0 duplicate `customer_id`. Cross-sectional; no time leakage concern (ARPU is a level, not a forecast).

## Results (outputs in `analysis/outputs/`)

| plan_tier | customers | ARPU (₹-equivalent units) | churn rate |
|---|---|---|---|
| Starter | 369 | 29.6 (±0.5 at 95% CI, n=369) | 9% |
| Growth | 279 | 101.4 | 10% |
| Scale | 164 | 256.1 | 5% |
| Enterprise | 88 | 711.2 | 5% |

Chart: `outputs/tier_arpu_churn.png` (ARPU and churn by tier); table: `outputs/tier_summary.csv`.

## Reading against the proposed tiers

- The sample's tier ladder (≈30 → 100 → 256 → 711) spans roughly **24×** from entry to top. The proposed ladder (0 → 499 → 1,499) spans a much flatter **3×** from Pro to Advanced.
- The proposed Pro price (₹499) lands between the sample's Growth and Scale ARPU; Advanced (₹1,499) sits between Scale and Enterprise. Plausible mid-market anchors, but the sample suggests customers at the top tier tolerate substantially higher prices (≈711 observed) — Advanced may be underpriced.
- Churn is lowest in the two higher tiers (5%) vs Starter/Growth (9–10%), consistent with the assumption that higher-priced plans retain better.

## Limitations

- **The data is sample/seed data bundled with the app, not real customer data.** Conclusions are directional only.
- Prices are in sample data units, not verified ₹; currency mapping is assumed, not measured.
- No willingness-to-pay survey: the disclaimer on the Pricing page ("validate willingness to pay with actual shop owners") remains necessary and accurate.

## What is a finding vs a hypothesis

- **Finding (in-sample):** observed ARPU ladder is steeper than the proposed price ladder; churn falls with tier.
- **Hypothesis:** Advanced could support a higher launch price or a richer feature gap; would need real customer data or a survey to confirm.
