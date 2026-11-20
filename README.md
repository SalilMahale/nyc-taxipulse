# NYC TaxiPulse 🚕
**Big Data Analytics and Short-Term Taxi Demand Prediction Using NYC TLC Trip Records**

Final-year Big Data Analytics mini project — BE Computer Engineering, SFIT (Mumbai University).
Group: Salil Mahale (53), Winner Marvi (56), Sufiyan Mithawala (60).

## What it does
1. Ingests **5 months of official NYC Yellow Taxi trip records (Jan–May 2026, 18,999,282 trips, 325 MB Parquet)**.
2. Validates, cleans and enriches them with **Apache Spark (PySpark)** — 17,904,623 trips retained (94.24 %), every removal accounted for by rule.
3. Aggregates the data with Spark into 20 small **analytical datasets** (temporal, geographic, route, economic).
4. Serves them through a **Streamlit dashboard** (and optionally **MongoDB** as a NoSQL serving store).
5. Trains a **LightGBM demand model** (trips per hour per zone) with a strict chronological split and honest baselines.
6. **Benchmarks** Parquet vs CSV, MapReduce-style RDD vs DataFrame, single-machine vs Spark, and core scaling — all measured, never estimated.

```
TLC Parquet (raw) ──► Spark: validate → clean → enrich ──► processed/trips (Parquet, partitioned by month)
                                                              │
                                   Spark aggregation ◄────────┘
                                          │
                                          ▼
                     curated/*.parquet + overview.json  ──► Streamlit dashboard
                                          │             ──► MongoDB (optional serving layer)
                                          ▼
                     hourly_zone_demand ──► LightGBM (baselines + calendar model + lag model)
```

## Repository layout
```
taxipulse/
  config.py                    # every path, threshold, Spark setting (env-overridable)
  spark_session.py             # one SparkSession builder
  pipeline/clean.py            # ingest + validate + clean + enrich (Spark), incremental per month
  pipeline/aggregate.py        # all analytical aggregations (Spark)
  pipeline/run_pipeline.py     # orchestrates the two stages
  ml/train.py                  # features, baselines, LightGBM, chronological evaluation
  ml/predict.py                # prediction helpers used by the dashboard
  benchmark/run_benchmark.py   # performance experiments 1-5
  benchmark/memory_scaling.py  # experiment 6: memory growth vs dataset size
  serving/load_mongo.py        # load curated tables into MongoDB
  app/dashboard.py             # Streamlit UI (reads curated outputs only)
scripts/download_data.py       # fetch TLC data
tests/test_clean.py            # unit tests for cleaning rules (small deterministic data)
docs/                          # ARCHITECTURE, DATA, ML, BENCHMARK, MONGODB_GUIDE, WINDOWS_SETUP, RUNBOOK
data/
  raw/        (not in git)     # TLC parquet + taxi_zone_lookup.csv
  processed/  (not in git)     # cleaned trip-level parquet
  curated/                     # analytical tables (small, shipped)
  features/ models/ reports/   # ML artefacts, quality report, benchmark results
```

## Setup
Requirements: **Python 3.10–3.11** (Spark 3.5 does not support Python 3.12+; its bundled cloudpickle crashes with a `RecursionError`), **Java 11/17/21**, ~4 GB RAM free, and the OpenMP runtime for LightGBM (`sudo apt install libgomp1` on a minimal Linux install). Windows users: read `docs/WINDOWS_SETUP.md` first.
```bash
python -m venv .venv && .venv\Scripts\activate      # (Linux/Mac: source .venv/bin/activate)
pip install -r requirements.txt
```

## Run — full data mode (the real thing)
```bash
python scripts/download_data.py                 # ~325 MB from the official TLC bucket
python -m taxipulse.pipeline.run_pipeline       # Spark: clean (per month) + aggregate   (~5 min on a laptop)
python -m taxipulse.ml.train                    # ~1 min
python -m taxipulse.benchmark.run_benchmark     # experiments 1-5, ~3 min
python -m taxipulse.benchmark.memory_scaling --months 1 2 3 4   # experiment 6, ~2 min
streamlit run taxipulse/app/dashboard.py
```
Add a new month later: `python scripts/download_data.py 2026-06 && python -m taxipulse.pipeline.run_pipeline --months 2026-06`.

## Run — quick demo mode
The repository ships with `data/curated`, `data/models` and `data/reports` already generated from the full dataset, so
`streamlit run taxipulse/app/dashboard.py` works immediately. These are real outputs of the pipeline above, not fixtures.

## Tests
```bash
python -m pytest tests -q
```

## MongoDB (optional NoSQL serving layer)
See `docs/MONGODB_GUIDE.md` — step-by-step, including the queries to show in the viva.

## Configuration
Environment variables: `TAXIPULSE_DATA_DIR`, `TAXIPULSE_SPARK_MASTER` (default `local[*]`), `TAXIPULSE_DRIVER_MEMORY` (default `4g`),
`TAXIPULSE_SHUFFLE_PARTITIONS` (default 16), `TAXIPULSE_MONGO_URI`. Cleaning thresholds live in `taxipulse/config.py`.

## Key results (real, from this codebase)
| Item | Value |
|---|---|
| Raw trips | 18,999,282 (Jan–May 2026) |
| Retained after cleaning | 17,904,623 (94.24 %) |
| Total revenue analysed | $533.5 M |
| Busiest pickup zone | Upper East Side South (822k pickups) |
| Peak hour | 18:00 (1.18 M trips); peak slot Sat 18:00 |
| Demand model (lag LightGBM) | MAE 5.81 trips/hr, R² 0.965 on unseen May 2026 — 35 % better than same-hour-last-week baseline |
| Parquet vs CSV (Spark, 1 month) | 0.20 s vs 0.57 s (2.9×) |
| DataFrame vs RDD MapReduce (1 month) | 0.27 s vs 3.51 s (13×) |
| Spark core scaling (19 M rows) | 1.85 s on 1 core vs 0.54 s on 24 cores (3.4×) |
| Memory scaling (Experiment 6) | pandas needs ~0.37 GB per million rows (23× the Parquet size), projecting a 17.6 M-row ceiling on an 8.2 GB machine; the full 19.0 M rows killed it, while Spark finished in 1.47 s inside a 4 GB driver |

Benchmark numbers above were measured on the demo laptop (24 cores, WSL 2, PySpark 3.5.1, median of 3 runs). At this data size single-machine pandas is still faster than Spark (0.73 s vs 1.44 s) — see `docs/BENCHMARK.md` for why that is the expected and honest result.

## Data source & licence
NYC Taxi & Limousine Commission Trip Record Data — https://www.nyc.gov/site/tlc/about/tlc-trip-record-data.page (public, NYC Open Data terms).
