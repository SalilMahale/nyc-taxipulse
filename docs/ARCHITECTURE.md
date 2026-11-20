# Architecture

```
┌────────────────────────┐   scripts/download_data.py
│ NYC TLC Parquet (raw)  │ ◄────────────────────────── official TLC bucket
│ 5 files, 19 M rows     │
└──────────┬─────────────┘
           ▼   taxipulse/pipeline/clean.py   (PySpark, one month at a time, idempotent)
   read → cast NTZ timestamps → derive duration/speed → flag reject_reason → keep nulls-as-null
   → enrich (time features, tip %, broadcast join to zone lookup) → write Parquet partitioned by year_month
   → quality_by_month/*.json → merged quality_report.json
           ▼
┌────────────────────────┐
│ data/processed/trips   │  17.9 M rows, Snappy Parquet, 5 partitions
└──────────┬─────────────┘
           ▼   taxipulse/pipeline/aggregate.py   (PySpark; every table = one analytical question)
┌────────────────────────┐
│ data/curated/*         │  20 tables, 4.7 MB total — the ONLY thing downstream layers read
└───┬───────────┬────────┘
    │           └──────────────► serving/load_mongo.py ──► MongoDB `taxipulse` (NoSQL serving store, optional)
    ▼
 ml/train.py  hourly_zone_demand → dense grid → lags → LightGBM → data/models/*  ──► ml/predict.py
    ▼
 app/dashboard.py (Streamlit)  — Overview · Demand · Zones · Routes · Economics · Prediction · Quality & Benchmark
```

## Why each component
- **Spark, local mode** — 19 M rows × 20 columns is too big to *comfortably* hold in pandas on a student laptop and far too big to send to a browser; Spark gives lazy, column-pruned, partition-parallel processing and the same code runs unchanged on a cluster. Local mode is the honest scale.
- **Parquet everywhere** — columnar, compressed (325 MB for 19 M rows), predicate/column pushdown; benchmark shows 6× over CSV.
- **Incremental cleaning** — dynamic partition overwrite means a new month is one command and old months are untouched (idempotent, reproducible).
- **Curated layer** — separates *compute* (Spark) from *serving* (dashboard/Mongo). The UI never touches trip-level data.
- **MongoDB (optional)** — document store for key-based reads of aggregates; demonstrates the syllabus NoSQL module without making it load-bearing.
- **LightGBM** — strong tabular regressor, fast to train, feature importance for interpretability; deliberately smaller than the Big Data part.
- **Streamlit** — thin presentation layer; can be swapped for FastAPI + React without touching anything above it.

## Not used, on purpose
Hadoop/HDFS, Kafka, Spark Streaming, Airflow, Kubernetes, deep learning — no project-specific reason; complexity is not sophistication.
