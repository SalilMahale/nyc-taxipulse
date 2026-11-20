# ML documentation — hourly zone demand prediction

**Target:** number of yellow-taxi pickups in a taxi zone during one clock hour (`trip_count`), built by Spark in `hourly_zone_demand`.
**Zones modelled:** 143 (zones with ≥ 5,000 trips over the period; the tail of near-zero zones is noise).
**Grid:** dense zone × hour grid — an hour with no pickups is a real 0, not a missing value.

## Features (only information available at prediction time)
Calendar: `zone_id` (categorical), `hour`, `dow`, `is_weekend`, `month`, `day_of_month`, `zone_hour_dow_mean` (mean demand for that zone/hour/weekday computed on **training rows only**).
Lags: `lag_1h, lag_2h, lag_3h, lag_24h, lag_168h`, `roll_mean_24h`, `roll_mean_168h` (rolling windows computed on the shifted series so the current hour is excluded → no leakage).

## Split (chronological, no shuffling)
Train 2026-01-08 00:00 → 2026-04-30 23:00 (387,816 rows; first week lost to the 168 h lag). Test 2026-05-01 → 2026-05-31 (106,392 rows).

## Models
| Model | Features | MAE | RMSE | R² |
|---|---|---|---|---|
| Baseline: previous hour | lag_1h | 9.58 | 21.98 | 0.905 |
| Baseline: same hour last week | lag_168h | 8.96 | 21.18 | 0.912 |
| Baseline: zone/hour/weekday mean | zone_hour_dow_mean | 7.26 | 17.45 | 0.940 |
| LightGBM calendar-only | calendar set | 7.05 | 17.21 | 0.942 |
| **LightGBM with lags** | calendar + lags | **5.81** | **13.26** | **0.965** |

The lag model reduces MAE by **35 %** vs the same-hour-last-week baseline and by 20 % vs the strongest naive baseline.
LightGBM settings: L1 objective (robust to spikes), 600 trees, lr 0.05, 63 leaves, min_child_samples 50, subsample/colsample 0.8, seed 42.

Top features (lag model, split importance): zone_id, zone_hour_dow_mean, hour, lag_1h, day_of_month.

## Two models are shipped, honestly labelled in the UI
- `demand_model_calendar.txt` — can predict **any** future date/hour (used for the "pick a zone and time" widget). Expected MAE ≈ 7 trips/hr.
- `demand_model_lags.txt` — needs the last 168 h of real demand; used for the next-12-hours forecast (recursive; accuracy degrades with horizon).

## Limitations
No weather, events, holidays, traffic or transit disruptions are modelled — Memorial Day (25 May 2026) is in the test set and is a known
source of error. Predictions are model outputs, not guarantees; the dashboard shows the expected error next to every prediction.
Per-zone test error is in `data/models/per_zone_test_error.csv`.

## Reproduce
`python -m taxipulse.ml.train` (deterministic with seed 42; ~1 min).
