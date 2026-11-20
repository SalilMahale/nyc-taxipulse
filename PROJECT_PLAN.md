# PROJECT_PLAN.md — living execution plan

## What was found (data-first inspection, 2026-09-12)
- TLC has published Yellow Taxi Parquet for **2026-01 .. 2026-05** only (June+ returns 403). Dataset fixed to those 5 files.
- 18,999,282 rows, 20 columns; timestamps stored as `TIMESTAMP_NTZ` (naive NYC local time).
- 25.3 % of rows have nulls in `passenger_count`, `RatecodeID`, `store_and_fwd_flag`, `congestion_surcharge`, `Airport_fee` — these are the `payment_type = 0` ("flex fare") records. They are real trips and are **kept**.
- Real junk: negative fares (refunds), distances up to 269,097 mi, 45k trips/month with duration ≤ 0, zone IDs 264/265 (Unknown/N/A), pickups outside the file's month.

## Phases and status
| Phase | Status | Notes |
|---|---|---|
| 1 Understand data | ✅ | see above; schema verified from files, not docs |
| 2 Minimal Spark pipeline | ✅ | `pipeline/clean.py`, incremental per month, dynamic partition overwrite |
| 3 First analytical output | ✅ | quality_report.json, overview.json |
| 4 API | ⏸ deferred | curated tables + `ml/predict.py` are the API surface; FastAPI/React wrapper can be added later without touching the pipeline |
| 5 Minimal frontend | ✅ | Streamlit, reads curated outputs only |
| 6 Expand analytics | ✅ | 20 curated tables: temporal, zone, borough, route, economics |
| 7 Geographic experience | ◐ | zone/borough tables ready; polygon map (taxi_zones.geojson + Leaflet/pydeck) is a stretch item |
| 8 ML | ✅ | baselines + calendar model + lag model, chronological split, feature importance |
| 9 Benchmarking | ✅ | 6 measured experiments (incl. memory scaling), environment recorded, re-run on the demo laptop |
| 10 Polish + docs | ✅ | README, docs/, 12 tests, 12-slide PPT |
| 11 Run on demo hardware | ✅ | WSL 2 Ubuntu, 24 cores, 8.2 GB; pipeline 1.1 min; all results reproduced to the record |

## Environment requirements discovered on the demo machine
- **Python 3.10–3.11 only.** Spark 3.5's bundled cloudpickle crashes with `RecursionError: Stack overflow` on Python 3.12+ (Ubuntu 26.04 ships 3.14). Fixed by creating the venv with `uv venv --python 3.11`.
- **`libgomp1` required** — LightGBM loads the OpenMP runtime at import; a minimal Ubuntu image does not ship it.
- **WSL 2 gets ~50 % of system RAM** (8.2 GB of 16 GB here), which is what makes Experiment 6's failure point land at 5 months.
- **`RLIMIT_AS` is unusable as a memory guard with PyArrow** — it caps virtual address space, which PyArrow over-reserves; the cap tripped at 3.5 GB resident against a 7 GB limit. Peak RSS + the OS OOM killer are the honest measures.

## Decisions
- **No Hadoop/HDFS, Kafka, streaming** — no project-specific reason; Spark local mode over Parquet is the honest scale of this project.
- **MongoDB kept as an optional serving store** (syllabus NoSQL module): Spark computes, Mongo serves. Loader + guide provided.
- **Streamlit instead of React** for speed of delivery; the frontend never touches raw data, so swapping it is cheap.
- **LightGBM** (tabular, fast, interpretable via feature importance). Two models shipped: calendar-only (any future hour) and lag model (more accurate, next hours only). Both honestly labelled in the UI.
- **Train Jan 8 – Apr 30, test May 1 – 31** (first week lost to the 168 h lag).

## Stretch (only if core stays stable)
- Taxi-zone polygon map (choropleth) in the dashboard.
- FastAPI + React front end reading the same curated tables.
- Green Taxi comparison.
