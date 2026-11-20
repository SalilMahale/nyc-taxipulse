# MongoDB serving layer — step-by-step guide

**Role in the architecture:** Spark computes, MongoDB *serves*. We load the 20 curated tables (plus overview, quality report, model
metrics and benchmark results) into a database called `taxipulse`, one collection per table. This demonstrates the NoSQL module
(document model, JSON documents, indexes, aggregation pipeline) on real project data. The dashboard works without it; it is an add-on.

## Step 1 — make sure the server is running
Open a terminal:
```
mongod --version        # prints a version → installed
```
On Windows, MongoDB usually runs as a **service** already. Check: open *Services*, look for "MongoDB Server" → Running. If it is not,
start it there, or run `mongod --dbpath C:\data\db` in a terminal (create that folder first) and leave that terminal open.

## Step 2 — load the data (from the project folder, with the venv active)
```
python -m taxipulse.serving.load_mongo --dry-run   # shows what will be loaded, touches nothing
python -m taxipulse.serving.load_mongo             # loads everything (~10 s)
```
Expected last line: `Done. Database 'taxipulse' now has collections: [...]`.
If you see `ServerSelectionTimeoutError`, the server is not running → Step 1.

## Step 3 — explore in the shell (`mongosh`; if not installed, MongoDB Compass GUI works too)
```
mongosh
use taxipulse
show collections
db.overview.findOne()
db.zone_metrics.find({borough: "Queens"}).sort({pickup_trips: -1}).limit(5).pretty()
db.route_metrics.find({}, {pu_zone:1, do_zone:1, trip_count:1, _id:0}).sort({trip_count:-1}).limit(5)
db.hourly_zone_demand.find({zone_id: 161, pickup_date: "2026-05-01"}).sort({pickup_hour: 1})
```

## Step 4 — an aggregation pipeline (this is the NoSQL "MapReduce" equivalent, worth showing in the viva)
```
db.zone_metrics.aggregate([
  { $group: { _id: "$borough", pickups: { $sum: "$pickup_trips" }, avg_fare: { $avg: "$avg_fare" } } },
  { $sort: { pickups: -1 } }
])
db.hourly_zone_demand.aggregate([
  { $match: { zone_id: 132 } },                          // JFK
  { $group: { _id: "$pickup_hour", avg_trips: { $avg: "$trip_count" } } },
  { $sort: { _id: 1 } }
])
```

## Step 5 — indexes (created automatically by the loader; verify)
```
db.hourly_zone_demand.getIndexes()
db.hourly_zone_demand.find({zone_id: 161}).explain("executionStats").executionStats.totalDocsExamined
```
The last command shows that the query examines only zone 161's documents (~3,600) instead of all 577,957 — that is what the index does.

## Viva talking points
- Why Mongo and not Spark for serving? Spark is a batch engine (seconds of scheduling per query); Mongo answers key lookups in milliseconds.
- Why Mongo and not a relational DB? The curated tables are denormalised, read-only JSON-shaped documents with no joins — a document store fits.
- Where does Spark end and Mongo begin? `data/curated/*.parquet` is the hand-over point.
