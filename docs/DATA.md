# Data documentation

## Source
NYC TLC Yellow Taxi Trip Records, monthly Parquet files from `https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_YYYY-MM.parquet`,
plus `taxi_zone_lookup.csv` (265 zones → borough / zone name). Months used: 2026-01 … 2026-05 (all that were published as of Sept 2026).

## Verified source schema (20 columns)
VendorID int32 · tpep_pickup_datetime / tpep_dropoff_datetime timestamp(ntz) · passenger_count int64 · trip_distance double · RatecodeID int64 ·
store_and_fwd_flag string · PULocationID / DOLocationID int32 · payment_type int64 · fare_amount, extra, mta_tax, tip_amount, tolls_amount,
improvement_surcharge, total_amount, congestion_surcharge, Airport_fee, cbd_congestion_fee double.

Timestamps are naive New York local time. The Spark session timezone is pinned to UTC so no conversion is ever applied; all hours in the
project are therefore NYC wall-clock hours. (Assumption documented; DST changes on 2026-03-08 are treated as wall-clock time.)

## Cleaning rules (first violated rule wins; counts are dataset-wide)
| Rule | Threshold | Removed | Why |
|---|---|---|---|
| zero_or_null_distance | distance ≤ 0 | 440,254 | meter did not record a trip |
| duration_too_short_or_negative | < 1 min | 428,069 | drop-off before/at pickup: clock errors, cancelled hails |
| non_positive_fare | fare ≤ 0 | 108,607 | negative/zero fares are refunds or voids, not trips |
| unknown_dropoff_zone | ID ∉ 1..263 | 84,561 | 264 = Unknown, 265 = N/A: cannot be placed on the map |
| unknown_pickup_zone | ID ∉ 1..263 | 22,382 | same |
| duration_too_long | > 180 min | 7,140 | meter left running |
| speed_implausible | avg > 80 mph | 2,441 | physically impossible in NYC |
| distance_implausible | > 100 mi | 689 | GPS/odometer error |
| non_positive_total | total ≤ 0 | 376 | |
| fare_implausible | > $500 | 72 | |
| pickup_outside_file_month | month ≠ file month | 68 | vendor filed the trip in the wrong month |

Total: 18,999,282 raw → 17,904,623 retained (94.24 %). Nulls in the "flex-fare" columns are **kept as null**; `passenger_count = 0` → null.
Legitimate extremes (JFK trips of 20+ miles, $200 fares) survive on purpose.

## Processed trip table (`data/processed/trips`, Parquet partitioned by `year_month`)
vendor_id, pickup_ts, dropoff_ts, passenger_count, trip_distance_mi, rate_code, PULocationID, DOLocationID, payment_type, fare_amount, extra,
mta_tax, tip_amount, tolls_amount, improvement_surcharge, total_amount, congestion_surcharge, airport_fee, cbd_congestion_fee, duration_min,
avg_speed_mph, pickup_date, pickup_hour, pickup_dow (1=Sun…7=Sat), is_weekend, pickup_month, tip_pct (card payments only), pu_zone, pu_borough,
do_zone, do_borough.

## Curated analytical datasets (`data/curated`)
| Table | Grain | Question answered |
|---|---|---|
| overview.json | dataset | headline KPIs |
| daily_metrics | date | demand trend over time |
| hourly_profile, dow_profile, monthly_metrics | hour / weekday / month | when is demand highest |
| hour_dow_heatmap | weekday × hour | peak / off-peak structure |
| weekend_vs_weekday_hourly | day-type × hour | are weekends different |
| zone_metrics | zone | busiest zones, pickup vs drop-off, avg fare/distance/duration/tip |
| borough_metrics | borough | borough activity |
| zone_hourly_profile | zone × hour | a zone's daily rhythm |
| route_metrics | pickup zone × drop-off zone (top 2000, ≥50 trips) | strongest routes |
| borough_flows | borough × borough | inter-borough mobility |
| payment_type_breakdown, rate_code_breakdown, passenger_count_breakdown | category | payment / rate / occupancy behaviour |
| fare_by_distance | 0.5-mi bin | fare–distance relationship |
| duration_distribution | 5-min bin | typical trip length |
| tips_by_hour | hour | tipping behaviour |
| hourly_zone_demand | zone × date × hour (577,957 rows) | ML base table |
