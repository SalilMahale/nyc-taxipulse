# Benchmark documentation

**Why:** the syllabus and the project both demand evidence, not slogans, that Big Data tooling matters. Every number in
`data/reports/benchmark_results.json` is wall-clock measured; the environment is recorded in the same file.

**Query used everywhere:** trips per (pickup zone, pickup hour) — one shuffle-heavy aggregation representative of the pipeline.
**Method:** `--repeats N` runs per approach, median reported; Spark sessions get an untimed warm-up so JVM start-up is not charged to the first run.

| # | Experiment | Compares | What it demonstrates |
|---|---|---|---|
| 1 | single machine vs Spark | pandas (column-pruned, best-case single process) vs Spark DataFrame, full 19 M rows | whether distribution pays off on this machine |
| 2 | Parquet vs CSV | same month, same query, Spark | columnar storage: Parquet reads 2 of 20 columns, CSV must parse every byte |
| 3 | MapReduce vs DataFrame | RDD `map → reduceByKey` (classic MapReduce) vs DataFrame `groupBy` | Catalyst/Tungsten vs Python-lambda MapReduce |
| 4 | column pruning | read 20 columns vs 2, Spark | Catalyst prunes projections automatically |
| 5 | core scaling | `local[1]` vs `local[*]` | parallelism |

## Results on the demo laptop (MSI, WSL 2 Ubuntu, 24 cores, 8.2 GB available to WSL, PySpark 3.5.1, Python 3.11, 3 repeats, median)
| Experiment | Approach | Median |
|---|---|---|
| 1 | pandas (single process) | 0.73 s |
| 1 | Spark local[*] | 1.44 s |
| 2 | Parquet (64.2 MB) | 0.20 s |
| 2 | CSV (417.1 MB) | 0.57 s |
| 3 | RDD map + reduceByKey | 3.51 s |
| 3 | DataFrame groupBy | 0.27 s |
| 4 | 20 columns / 2 columns | 0.51 s / 0.48 s |
| 5 | local[1] / local[*] (24 cores) | 1.85 s / 0.54 s |

**Reading the results honestly:**
- **Parquet beats CSV 2.9x** even though both are read by 24 cores: columnar storage lets Spark read 2 of 20 columns; CSV must parse every byte of every row. The gap is about file format, not parallelism.
- **The DataFrame API beats RDD MapReduce 13x.** Both express the same computation; the RDD version ships every row through the Python/JVM bridge as a lambda, while the DataFrame version is compiled by Catalyst and executed on Tungsten's binary format. This is the strongest argument in the project for *how* you write Spark code.
- **Core scaling is real: 1.85 s on one core, 0.54 s on 24 (3.4x).** Not 24x - shuffle, JVM start-up and disk reads do not parallelise, which is Amdahl's law showing up in a measurement rather than a textbook.
- **pandas (0.73 s) still beats Spark (1.44 s) on the full 19 M rows.** This is the honest and most interesting result: 325 MB of Parquet fits comfortably in one machine's memory, so Spark's job scheduling and serialisation overhead is not repaid. Spark earns its place here through *scalability*, the optimiser, and the fact that the same code runs unchanged on a cluster - not through raw speed at this data size. A project that claimed "Spark is always faster" would be making a claim its own measurements contradict.
- **Column pruning shows almost no difference (0.51 s vs 0.48 s)** because Catalyst prunes unused columns at plan time whether or not the query asks for them explicitly - the optimiser already did the work.

> Earlier figures measured on a 1-core development sandbox are superseded by the table above. Re-run
> `python -m taxipulse.benchmark.run_benchmark --repeats 3` on any machine; the environment is recorded in the JSON alongside the results.

**Not a fair benchmark, so not claimed:** cluster vs laptop, memory footprint (pandas holds all rows in RAM, Spark streams), and
the pandas variant without column pruning (would be slower but is a strawman).

---

## Experiment 6: memory scaling — where single-machine processing runs out of room

Experiments 1–5 all used a *narrow* query (2 of 20 columns, one count), which plays to pandas' strengths — and pandas won.
Experiment 6 asks the opposite question: **how much memory does each engine need when the job touches every column, and what
happens as the dataset grows?**

**Workload (identical in both engines):** read all 20 columns of N months, derive trip duration from the timestamps, then
aggregate by (pickup zone × pickup hour × payment type) computing 8 measures.
**Method:** pandas runs in a child process, once per dataset size, reporting wall time and peak *resident* memory
(`ru_maxrss`) — real physical memory touched. Spark runs the same workload with a fixed 4 GB driver.

### Results (demo laptop: 24 cores, 8.2 GB available to WSL 2, Spark driver 4 GB)
| Months | Rows | Input (Parquet) | pandas time | pandas peak RSS | Spark time |
|---|---|---|---|---|---|
| 1 | 3,724,889 | 64.2 MB | 0.43 s | 1.80 GB | 2.85 s |
| 2 | 7,124,755 | 122.8 MB | 1.18 s | 3.55 GB | 0.56 s |
| 3 | 11,077,206 | 190.7 MB | 3.92 s | 5.19 GB | 1.26 s |
| 4 | 14,908,446 | 255.6 MB | 3.71 s | 5.97 GB | 0.74 s |
| 5 | 18,999,282 | 325.3 MB | **killed by the OS (out of memory)** | — | 1.47 s |

Rows 1–4 are from `data/reports/memory_scaling.json`; row 5 is from a separate run at `--months 1 2 3 4 5`, in which the
out-of-memory killer terminated the process (and its parent shell) before it could report. Peak RSS varies by a few
hundred MB between runs — the 4-month figure was 6.43 GB in the earlier run — because the memory allocator's behaviour
is not perfectly deterministic. The growth rate is stable.

### What the numbers say
- **pandas needs ~0.373 GB of RAM per million rows — a 23.4× amplification** over the Parquet file on disk. Parquet is
  compressed and columnar; pandas holds every column decompressed, as 8-byte types, and `concat` briefly doubles the
  largest allocation.
- **The growth is linear and predicted its own failure.** The measured rate projects a ceiling of **17.6 M rows
  (≈4.7 months)** for this machine, assuming 6.6 GB of the 8.2 GB is usable. The full dataset is 19.0 M rows — beyond
  that ceiling — and the 5-month run was duly killed.
- **Spark completed every size, including the one that killed pandas, inside a fixed 4 GB driver**, in 0.6–2.9 s. Its
  memory use does not grow with the dataset: it processes one partition at a time and spills to disk under pressure.
- **pandas is faster until it isn't.** At 1 month pandas wins on time (0.43 s vs 2.85 s). By 3 months Spark is 3.1×
  faster (1.26 s vs 3.92 s) as pandas starts fighting for memory. At 5 months pandas produces no answer at all.

### The honest conclusion for this project
Experiments 1–5 show that **at 325 MB, Spark is not the faster tool** — its scheduling overhead is not repaid.
Experiment 6 shows **why it is still the right tool**: the dataset has already crossed the point where single-machine
processing stops working on this hardware, and NYC TLC publishes another file every month. Spark's value here is not
speed; it is that the same code keeps working as the data grows, and runs unchanged on a cluster when one machine is no
longer enough.

### Methodological note (a correction worth recording)
An earlier version of this experiment capped the pandas process with `RLIMIT_AS` (virtual address space) to force a
deterministic failure. That was wrong: PyArrow reserves large virtual mappings it never fills, so the cap tripped at
3.5–3.6 GB resident against a 7.0 GB limit — a failure of the instrument, not of pandas. The cap is disabled by default;
peak resident memory and the OS out-of-memory killer are the honest measures, and the results above use those.
