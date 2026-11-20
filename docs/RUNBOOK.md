# Runbook — running NYC TaxiPulse from scratch

Verified end-to-end on the demo machine: MSI laptop, Windows 11 + WSL 2 (Ubuntu), 24 cores, 8.2 GB available to WSL,
OpenJDK 17, Python 3.11.16, PySpark 3.5.1.

## 0. One-time setup
```bash
wsl --install -d Ubuntu                                   # PowerShell as admin; reboot
sudo apt update && sudo apt install -y openjdk-17-jdk python3-pip python3-venv unzip libgomp1
cp /mnt/c/Users/<you>/Downloads/NYC_TaxiPulse.zip ~/ && cd ~ && unzip -q NYC_TaxiPulse.zip && cd taxipulse
pip install -q uv && uv python install 3.11 && uv venv --seed --python 3.11 .venv311
source .venv311/bin/activate && pip install -r requirements.txt
```
**Python 3.11 is not optional.** Spark 3.5's bundled cloudpickle fails with `RecursionError: Stack overflow` on 3.12+,
and Ubuntu 26.04 ships Python 3.14. **`libgomp1` is not optional either** — LightGBM loads the OpenMP runtime at import.

## 1. Every new terminal
```bash
cd ~/taxipulse && source .venv311/bin/activate && export TAXIPULSE_DRIVER_MEMORY=4g
```
The venv and the environment variable are per-session; the prompt should read `(.venv311)`.

## 2. Full run
| Step | Command | Time on demo machine |
|---|---|---|
| Tests | `python -m pytest tests -q` | 7 s → `12 passed` |
| Download data | `python scripts/download_data.py` | ~30 s on 300 Mbps (325 MB) |
| Spark pipeline | `python -m taxipulse.pipeline.run_pipeline` | **1.1 min** |
| Train model | `python -m taxipulse.ml.train` | ~1 min |
| Benchmark 1–5 | `python -m taxipulse.benchmark.run_benchmark --repeats 3` | ~1 min |
| Benchmark 6 | `python -m taxipulse.benchmark.memory_scaling --months 1 2 3 4 --guard-gb 0` | ~1 min |
| Dashboard | `streamlit run taxipulse/app/dashboard.py` | opens `localhost:8501` |
| MongoDB (optional) | see `docs/MONGODB_GUIDE.md` — run the loader from **Windows** PowerShell, where MongoDB is installed | ~10 s |

Add a new month later: `python scripts/download_data.py 2026-06 && python -m taxipulse.pipeline.run_pipeline --months 2026-06`.

## 3. Expected output (reproduced exactly on the demo machine)
- Cleaning: `raw 18999282 -> kept 17904623 (94.24%)`
- Curated: 20 tables, `hourly_zone_demand` = 577,957 rows
- Model: `lightgbm_with_lags` MAE **5.811**, RMSE **13.255**, R² **0.9654** (seed 42 makes this exact)

## 4. Known-benign warnings
`WARN NativeCodeLoader: Unable to load native-hadoop library`, `WARN Utils: Your hostname ... resolves to a loopback address`,
`WARN SparkStringUtils: Truncated the string representation of a plan`. None affect results.

## 5. Troubleshooting
| Symptom | Cause | Fix |
|---|---|---|
| `RecursionError: Stack overflow` in every test | Python 3.12+ with Spark 3.5 | rebuild the venv on Python 3.11 (step 0) |
| `OSError: libgomp.so.1 cannot open shared object file` | OpenMP runtime missing | `sudo apt install -y libgomp1` |
| `Terminated` and the shell drops to PowerShell | WSL out-of-memory killer (Experiment 6 at 5 months) | expected; `wsl` to return, then step 1 |
| `guard_rail_tripped` in Experiment 6 | old copy of the script, or a non-zero `--guard-gb` | pass `--guard-gb 0` |
| `ServerSelectionTimeoutError` from the Mongo loader | `mongod` not running | start "MongoDB Server" in Windows Services |
| Spark cannot write Parquet on native Windows | missing `winutils.exe` | use WSL 2 (this runbook) |
