// Builds NYC_TaxiPulse.pptx from real pipeline outputs (data/reports, data/models, data/curated).
const pptxgen = require("pptxgenjs");
const fs = require("fs");
const F = JSON.parse(fs.readFileSync("/tmp/facts.json", "utf8"));

const DARK = "1F1F1F", YELLOW = "F5B700", GREY = "5F5F5F", LIGHT = "F4F4F4", WHITE = "FFFFFF";
const pres = new pptxgen();
pres.layout = "LAYOUT_16x9"; // 10 x 5.625 in
const HF = "Cambria", BF = "Calibri";

function dark(slide) { slide.background = { color: DARK }; }
function title(slide, text, sub) {
  slide.addText(text, { x: 0.5, y: 0.35, w: 9, h: 0.7, fontFace: HF, fontSize: 30, bold: true, color: DARK, isTextBox: true, margin: 0 });
  if (sub) slide.addText(sub, { x: 0.5, y: 1.0, w: 9, h: 0.4, fontFace: BF, fontSize: 14, color: GREY, isTextBox: true, margin: 0 });
}
function bullets(slide, items, opt) {
  slide.addText(items.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < items.length - 1, paraSpaceAfter: 6 } })),
    Object.assign({ fontFace: BF, fontSize: 14, color: DARK, isTextBox: true, valign: "top" }, opt));
}
function stat(slide, x, y, num, label, w = 2.1) {
  slide.addShape(pres.ShapeType.roundRect, { x, y, w, h: 1.35, fill: { color: LIGHT }, rectRadius: 0.1, line: { color: LIGHT } });
  slide.addText(num, { x, y: y + 0.12, w, h: 0.7, fontFace: HF, fontSize: 28, bold: true, color: DARK, align: "center", isTextBox: true, margin: 0 });
  slide.addText(label, { x, y: y + 0.82, w, h: 0.4, fontFace: BF, fontSize: 11, color: GREY, align: "center", isTextBox: true, margin: 0 });
}
const chartBase = { chartColors: [YELLOW], showLegend: false, catAxisLabelColor: GREY, valAxisLabelColor: GREY, valGridLine: { color: "DDDDDD", size: 0.5 }, catGridLine: { style: "none" }, catAxisLabelFontFace: BF, valAxisLabelFontFace: BF, catAxisLabelFontSize: 10, valAxisLabelFontSize: 10 };

// 1 Title
let s = pres.addSlide(); dark(s);
s.addShape(pres.ShapeType.ellipse, { x: 7.6, y: 0.6, w: 3.2, h: 3.2, fill: { color: YELLOW }, line: { color: YELLOW } });
s.addText("NYC TaxiPulse", { x: 0.6, y: 1.5, w: 6.8, h: 1, fontFace: HF, fontSize: 44, bold: true, color: WHITE, isTextBox: true, margin: 0 });
s.addText("Big Data Analytics and Short-Term Taxi Demand Prediction\nUsing NYC TLC Trip Records", { x: 0.6, y: 2.5, w: 6.8, h: 0.9, fontFace: BF, fontSize: 16, color: "CCCCCC", isTextBox: true, margin: 0 });
s.addText("Big Data Analytics Mini Project · BE Computer Engineering, SFIT\nSalil Mahale (53) · Winner Marvi (56) · Sufiyan Mithawala (60)", { x: 0.6, y: 4.2, w: 8, h: 0.8, fontFace: BF, fontSize: 12, color: YELLOW, isTextBox: true, margin: 0 });

// 2 Problem & objective
s = pres.addSlide(); title(s, "Problem and objective", "Turn 19 million raw taxi trips into answers a city planner or fleet operator can use");
bullets(s, ["NYC publishes every yellow-taxi trip: ~3.8 M records per month, 20 columns, messy in practice (nulls, negative fares, impossible speeds).",
  "Goal: an end-to-end Big Data platform — ingest → validate → clean → transform → aggregate → analyse → predict → explore.",
  "Questions answered: When is demand highest? Which zones and routes dominate? How do fares, tips and payments behave? What is next hour's demand in a zone?",
  "Big Data processing is the hero; ML is a focused, secondary layer; the dashboard is a thin window onto Spark's outputs."],
  { x: 0.5, y: 1.55, w: 5.6, h: 3.6 });
stat(s, 6.5, 1.6, "19.0 M", "raw trips (Jan–May 2026)", 3);
stat(s, 6.5, 3.15, "17.9 M", "trips retained after cleaning (94.2 %)", 3);

// 3 Dataset
s = pres.addSlide(); title(s, "Dataset: NYC TLC Yellow Taxi Trip Records", "Official monthly Parquet files · schema verified from the files, not the documentation");
bullets(s, ["Source: NYC Taxi & Limousine Commission open data (public).", "5 monthly Parquet files, 2026-01 to 2026-05 · 325 MB compressed · 18,999,282 rows · 20 columns.",
  "Key fields: pickup/drop-off timestamps, pickup/drop-off zone IDs (263 zones), distance, fare, tip, tolls, total, payment type, rate code, passenger count.",
  "Taxi-zone lookup table maps zone ID → zone name → borough.",
  "Found in inspection: 25 % of rows have nulls in 5 'flex fare' columns (real trips, kept); negative fares (refunds); distances up to 269,097 miles; 45k trips/month with duration ≤ 0."],
  { x: 0.5, y: 1.55, w: 9, h: 3.7 });

// 4 Architecture
s = pres.addSlide(); title(s, "Architecture", "Compute (Spark) is separated from serving (curated Parquet → dashboard / MongoDB)");
const boxes = [["TLC Parquet\n(raw, 19 M rows)", "DDDDDD"], ["PySpark\nvalidate · clean\nenrich", YELLOW], ["Processed trips\nParquet, partitioned\nby month", "DDDDDD"], ["PySpark\naggregation\n20 tables", YELLOW], ["Curated layer\n4.7 MB", "DDDDDD"]];
boxes.forEach(([t, c], i) => {
  const x = 0.4 + i * 1.95;
  s.addShape(pres.ShapeType.roundRect, { x, y: 1.7, w: 1.65, h: 1.2, fill: { color: c }, rectRadius: 0.08, line: { color: c } });
  s.addText(t, { x, y: 1.7, w: 1.65, h: 1.2, fontFace: BF, fontSize: 11, bold: true, color: DARK, align: "center", valign: "middle", isTextBox: true });
  if (i < 4) s.addText("▶", { x: x + 1.65, y: 2.1, w: 0.3, h: 0.4, fontSize: 14, color: GREY, align: "center", isTextBox: true, margin: 0 });
});
[["Streamlit dashboard", 0.9], ["LightGBM demand model", 3.7], ["MongoDB serving store (NoSQL)", 6.5]].forEach(([t, x]) => {
  s.addShape(pres.ShapeType.roundRect, { x, y: 3.5, w: 2.6, h: 0.7, fill: { color: DARK }, rectRadius: 0.08, line: { color: DARK } });
  s.addText(t, { x, y: 3.5, w: 2.6, h: 0.7, fontFace: BF, fontSize: 12, bold: true, color: WHITE, align: "center", valign: "middle", isTextBox: true });
});
s.addText("Deliberately NOT used: Hadoop/HDFS, Kafka, Spark Streaming, Kubernetes, deep learning — no project-specific reason. Complexity is not sophistication.",
  { x: 0.5, y: 4.5, w: 9, h: 0.6, fontFace: BF, fontSize: 12, color: GREY, isTextBox: true, margin: 0 });

// 5 Data quality
s = pres.addSlide(); title(s, "Spark cleaning: what happened to the data", "Every removed record is counted under the first rule it violated (Spark when/otherwise chain)");
s.addChart(pres.ChartType.bar, [{ name: "removed", labels: F.reasons.map(r => r[0].replace(/_/g, " ")), values: F.reasons.map(r => r[1]) }],
  Object.assign({ x: 0.4, y: 1.5, w: 5.6, h: 3.7, barDir: "bar", showValue: true, dataLabelPosition: "outEnd", dataLabelFontSize: 9, dataLabelFormatCode: "#,##0", valAxisLabelFormatCode: "#,##0", catAxisLabelFontSize: 9 }, chartBase));
bullets(s, ["Kept nulls as nulls — a missing passenger count does not make a trip fake.", "Kept legitimate extremes: 20-mile JFK trips and $200 fares survive.",
  "Rules: duration 1–180 min, distance 0–100 mi, fare $0–500, avg speed ≤ 80 mph, zone IDs 1–263, pickup within the file's month.",
  "Idempotent and incremental: each month overwrites only its own partition; adding June is one command.", "Unit-tested on a small deterministic dataset (12 tests)."],
  { x: 6.2, y: 1.5, w: 3.5, h: 3.8, fontSize: 12 });

// 6 Temporal insights
s = pres.addSlide(); title(s, "When is demand highest?", "Aggregated by Spark over 17.9 M trips");
s.addChart(pres.ChartType.line, [{ name: "trips", labels: F.hourly.map(h => String(h[0])), values: F.hourly.map(h => h[1]) }],
  Object.assign({ x: 0.4, y: 1.5, w: 5.8, h: 3.6, showTitle: true, title: "Trips by hour of day", titleFontSize: 12, titleColor: DARK, lineSize: 3, lineDataSymbol: "none", valAxisLabelFormatCode: "#,##0" }, chartBase));
s.addChart(pres.ChartType.bar, [{ name: "trips", labels: F.dow.map(d => d[0]), values: F.dow.map(d => d[1]) }],
  Object.assign({ x: 6.3, y: 1.5, w: 3.4, h: 2.2, showTitle: true, title: "Trips by weekday", titleFontSize: 12, titleColor: DARK, valAxisLabelFormatCode: "#,##0" }, chartBase));
bullets(s, ["Peak hour 18:00 (1.18 M trips); trough 04:00.", "Saturday busiest, Monday quietest; peak slot Sat 18:00.", "Weekend demand shifts late into the night."], { x: 6.3, y: 3.8, w: 3.4, h: 1.4, fontSize: 11 });

// 7 Geographic / routes
s = pres.addSlide(); title(s, "Where is demand concentrated?", "Zone, borough and route aggregates (top 2,000 routes persisted)");
s.addChart(pres.ChartType.bar, [{ name: "pickups", labels: F.zones.map(z => z[0]), values: F.zones.map(z => z[1]) }],
  Object.assign({ x: 0.4, y: 1.5, w: 5.4, h: 3.6, barDir: "bar", showTitle: true, title: "Top pickup zones", titleFontSize: 12, titleColor: DARK, showValue: true, dataLabelPosition: "outEnd", dataLabelFontSize: 9, dataLabelFormatCode: "#,##0", valAxisLabelFormatCode: "#,##0", catAxisLabelFontSize: 9 }, chartBase));
bullets(s, ["Manhattan: 15.5 M pickups (86 %); Queens 1.5 M (mostly JFK / LaGuardia); Brooklyn 0.7 M.",
  "JFK Airport: 649k pickups at $59.82 average fare vs $14 in the Upper East Side.",
  "Strongest route: Upper East Side South → North (123,711 trips) — short intra-neighbourhood hops dominate.",
  "Borough-to-borough flow matrix shows Manhattan → Manhattan as the overwhelming pattern."], { x: 6.0, y: 1.5, w: 3.7, h: 3.7, fontSize: 12 });

// 8 ML
s = pres.addSlide(); title(s, "Demand prediction: trips per hour per zone", "LightGBM · chronological split (train Jan 8 – Apr 30, test May 2026) · 143 zones · no target leakage");
const ml = F.ml;
const rows = [[{ text: "Model", options: { bold: true, fill: { color: LIGHT } } }, { text: "MAE", options: { bold: true, fill: { color: LIGHT } } }, { text: "RMSE", options: { bold: true, fill: { color: LIGHT } } }, { text: "R²", options: { bold: true, fill: { color: LIGHT } } }]];
[["Baseline: previous hour", "baseline_previous_hour"], ["Baseline: same hour last week", "baseline_same_hour_last_week"], ["Baseline: zone/hour/weekday mean", "baseline_zone_hour_dow_mean"], ["LightGBM calendar-only", "lightgbm_calendar_only"], ["LightGBM with lag features", "lightgbm_with_lags"]].forEach(([n, k], i) => {
  const b = i === 4; rows.push([{ text: n, options: { bold: b } }, { text: String(ml[k][0]), options: { bold: b } }, { text: String(ml[k][1]), options: { bold: b } }, { text: String(ml[k][2]), options: { bold: b } }]);
});
s.addTable(rows, { x: 0.5, y: 1.55, w: 5.6, colW: [3.0, 0.85, 0.9, 0.85], fontFace: BF, fontSize: 12, color: DARK, border: { type: "solid", pt: 0.5, color: "CCCCCC" } });
stat(s, 6.6, 1.55, "35 %", "lower error than same-hour-last-week baseline", 3);
bullets(s, ["Features: hour, weekday, month, zone, historical zone/hour/weekday mean (train only), lags 1/2/3/24/168 h, rolling 24 h and 168 h means.",
  "Calendar-only model predicts any future hour; lag model forecasts the next hours from real history — both labelled honestly in the UI.",
  "Not modelled: weather, events, holidays (Memorial Day is in the test set)."], { x: 6.6, y: 3.05, w: 3.1, h: 2.3, fontSize: 10 });

// 9 Benchmark
s = pres.addSlide(); title(s, "Why Spark and Parquet? Measured", "Same query everywhere: trips per (zone, hour) - median of 3 runs on the demo laptop (24 cores, WSL 2)");
const bench = (a) => F.bench.find(b => b[0].startsWith(a))[1];
s.addChart(pres.ChartType.bar, [{ name: "seconds", labels: ["CSV (417 MB)", "Parquet (64 MB)"], values: [bench("spark on CSV"), bench("spark on Parquet")] }],
  Object.assign({ x: 0.4, y: 1.5, w: 4.4, h: 1.8, barDir: "bar", showTitle: true, title: "Storage format, 1 month (s)", titleFontSize: 11, titleColor: DARK, showValue: true, dataLabelPosition: "outEnd", dataLabelFontSize: 10 }, chartBase));
s.addChart(pres.ChartType.bar, [{ name: "seconds", labels: ["RDD map/reduceByKey", "DataFrame groupBy"], values: [bench("RDD map"), bench("DataFrame groupBy")] }],
  Object.assign({ x: 0.4, y: 3.4, w: 4.4, h: 1.8, barDir: "bar", showTitle: true, title: "MapReduce style vs DataFrame, 1 month (s)", titleFontSize: 11, titleColor: DARK, showValue: true, dataLabelPosition: "outEnd", dataLabelFontSize: 10 }, chartBase));
stat(s, 5.2, 1.5, "3.4x", "faster on 24 cores than on 1 core (1.85 s -> 0.54 s)", 4.4);
bullets(s, ["Parquet is 2.9x faster than CSV: columnar storage reads 2 of 20 columns; CSV parses every byte of every row.",
  "Spark's DataFrame optimiser (Catalyst/Tungsten) is 13x faster than hand-written Python MapReduce over RDDs.",
  "Core scaling is real: the same 19 M-row job drops from 1.85 s to 0.54 s when Spark is given all 24 cores.",
  "Honest finding: at 325 MB, single-machine pandas (0.73 s) still beats Spark (1.44 s) - Spark's scheduling overhead is not repaid until the data outgrows one machine's memory. Spark earns its place in scaling, storage and API, not in raw speed at this size.",
  "No number here is estimated - every figure comes from a script that can be re-run."], { x: 5.2, y: 3.0, w: 4.5, h: 2.3, fontSize: 10 });

// 9b Memory scaling
s = pres.addSlide(); title(s, "Experiment 6: when one machine is not enough", "All 20 columns, 8 measures - pandas peak resident memory vs dataset size, on an 8.2 GB machine");
s.addChart(pres.ChartType.bar, [{ name: "pandas peak RSS (GB)", labels: F.mem.labels, values: F.mem.pandas_rss }],
  Object.assign({ x: 0.4, y: 1.5, w: 5.3, h: 3.6, showTitle: true, title: "pandas memory grows linearly; the 5th month is never reached", titleFontSize: 11, titleColor: DARK, showValue: true, dataLabelPosition: "outEnd", dataLabelFontSize: 10, catAxisLabelFontSize: 9 }, chartBase));
s.addShape(pres.ShapeType.roundRect, { x: 6.0, y: 1.5, w: 3.7, h: 0.95, fill: { color: DARK }, rectRadius: 0.08, line: { color: DARK } });
s.addText("5 months (19.0 M rows): pandas killed by the OS.\nSpark completed it in 1.47 s on 4 GB.", { x: 6.1, y: 1.55, w: 3.5, h: 0.85, fontFace: BF, fontSize: 12, bold: true, color: YELLOW, isTextBox: true, valign: "middle" });
bullets(s, ["pandas needs ~0.37 GB per million rows - a 23x amplification over the compressed Parquet file.",
  "The linear growth predicted the failure: the measured rate gives a 17.6 M-row ceiling on this 8.2 GB machine; the full dataset is 19.0 M rows, and the run was duly killed by the OS.",
  "Spark finished every size, including the one that killed pandas, inside a fixed 4 GB driver - it streams partitions and spills to disk instead of holding everything in RAM.",
  "pandas is faster until it isn't: it wins at 1 month (0.43 s vs 2.85 s), is 3.1x slower by 3 months, and returns no answer at 5.",
  "This is the real argument for Spark in this project: not speed at 325 MB, but that the same code keeps working as TLC publishes another file every month."],
  { x: 6.0, y: 2.65, w: 3.7, h: 2.6, fontSize: 10 });

// 10 NoSQL serving layer
s = pres.addSlide(); title(s, "MongoDB as the NoSQL serving layer", "Spark computes; Mongo serves — one collection per curated table, with indexes");
bullets(s, ["20 curated tables + overview, quality report, model metrics and benchmark results loaded as JSON documents into database `taxipulse`.",
  "Document model fits: denormalised, read-only, no joins needed at query time.",
  "Indexes on zone_id / pickup_date turn a 577,957-document scan into a ~3,600-document lookup (verified with explain()).",
  "Aggregation pipeline ($match → $group → $sort) demonstrated on hourly zone demand — the NoSQL counterpart of MapReduce.",
  "The dashboard works without Mongo; it is an add-on that shows the syllabus NoSQL concepts on real project data."], { x: 0.5, y: 1.55, w: 6, h: 3.7 });
s.addShape(pres.ShapeType.roundRect, { x: 6.8, y: 1.7, w: 2.9, h: 3.2, fill: { color: DARK }, rectRadius: 0.1, line: { color: DARK } });
s.addText("db.zone_metrics.aggregate([\n { $group: { _id: \"$borough\",\n   pickups: { $sum: \"$pickup_trips\" } } },\n { $sort: { pickups: -1 } }\n])", { x: 6.9, y: 1.8, w: 2.7, h: 3.0, fontFace: "Courier New", fontSize: 10, color: YELLOW, isTextBox: true, valign: "top" });

// 11 Demo flow + conclusion
s = pres.addSlide(); dark(s);
s.addText("Demo flow and conclusion", { x: 0.5, y: 0.4, w: 9, h: 0.7, fontFace: HF, fontSize: 30, bold: true, color: WHITE, isTextBox: true, margin: 0 });
["1  Show the raw TLC files (19 M rows)", "2  Run the Spark pipeline; watch stage logs and the quality report", "3  Open the dashboard: overview → demand → zones → routes → economics",
  "4  Ask for a prediction; show evaluation vs baselines", "5  Show the measured benchmark", "6  Query the same results in MongoDB"].forEach((t, i) => {
    s.addText(t, { x: 0.6, y: 1.3 + i * 0.5, w: 5.5, h: 0.45, fontFace: BF, fontSize: 14, color: WHITE, isTextBox: true, margin: 0 });
  });
s.addShape(pres.ShapeType.roundRect, { x: 6.4, y: 1.3, w: 3.2, h: 3.4, fill: { color: YELLOW }, rectRadius: 0.1, line: { color: YELLOW } });
s.addText("A genuinely large real-world dataset, processed with Spark, turned into analytical datasets, explored through a dashboard, with a focused, honestly evaluated predictive layer — and every number reproducible.",
  { x: 6.55, y: 1.4, w: 2.9, h: 3.2, fontFace: HF, fontSize: 13, bold: true, color: DARK, isTextBox: true, valign: "middle" });
s.addText("Tech: Python · Apache Spark 3.5 (PySpark, Spark SQL) · Parquet · LightGBM · MongoDB · Streamlit · pytest", { x: 0.6, y: 4.6, w: 9, h: 0.5, fontFace: BF, fontSize: 11, color: "AAAAAA", isTextBox: true, margin: 0 });

pres.writeFile({ fileName: "/home/claude/taxipulse/docs/NYC_TaxiPulse.pptx" }).then(() => console.log("written"));
