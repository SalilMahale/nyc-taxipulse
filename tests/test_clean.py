"""Unit tests for the cleaning rules using a tiny deterministic dataset."""
from datetime import datetime

import pytest
from pyspark.sql import SparkSession, functions as F

from taxipulse.pipeline.clean import REQUIRED_COLUMNS, add_validation_flags, enrich


@pytest.fixture(scope="module")
def spark():
    s = SparkSession.builder.master("local[1]").appName("test").config("spark.sql.session.timeZone", "UTC").getOrCreate()
    yield s
    s.stop()


def base_row(**over):
    row = {c: None for c in REQUIRED_COLUMNS}
    row.update(dict(VendorID=2, tpep_pickup_datetime=datetime(2026, 1, 5, 8, 0), tpep_dropoff_datetime=datetime(2026, 1, 5, 8, 15),
                    passenger_count=1, trip_distance=2.5, RatecodeID=1, PULocationID=161, DOLocationID=237, payment_type=1,
                    fare_amount=15.0, extra=1.0, mta_tax=0.5, tip_amount=3.0, tolls_amount=0.0, improvement_surcharge=1.0,
                    total_amount=21.0, congestion_surcharge=2.5, Airport_fee=0.0, cbd_congestion_fee=0.75,
                    source_file="yellow_tripdata_2026-01"))
    row.update(over)
    return row


CASES = [
    ({}, None),
    ({"tpep_dropoff_datetime": datetime(2026, 1, 5, 7, 59)}, "duration_too_short_or_negative"),
    ({"tpep_dropoff_datetime": datetime(2026, 1, 5, 12, 0)}, "duration_too_long"),
    ({"trip_distance": 0.0}, "zero_or_null_distance"),
    ({"trip_distance": 5000.0}, "distance_implausible"),
    ({"fare_amount": -10.0}, "non_positive_fare"),
    ({"fare_amount": 999.0}, "fare_implausible"),
    ({"PULocationID": 264}, "unknown_pickup_zone"),
    ({"DOLocationID": 265}, "unknown_dropoff_zone"),
    ({"tpep_pickup_datetime": datetime(2026, 3, 5, 8, 0), "tpep_dropoff_datetime": datetime(2026, 3, 5, 8, 15)}, "pickup_outside_file_month"),
    ({"trip_distance": 40.0}, "speed_implausible"),  # 40 mi in 15 min = 160 mph
]


@pytest.mark.parametrize("override,expected", CASES)
def test_reject_reason(spark, override, expected):
    df = spark.createDataFrame([base_row(**override)])
    out = add_validation_flags(df).select("reject_reason").collect()[0][0]
    assert out == expected


def test_enrich_adds_time_features_and_zone_names(spark):
    zones = spark.createDataFrame([(161, "Manhattan", "Midtown Center", "Yellow Zone"), (237, "Manhattan", "Upper East Side South", "Yellow Zone")],
                                  ["LocationID", "Borough", "Zone", "service_zone"])
    df = add_validation_flags(spark.createDataFrame([base_row(passenger_count=0)]))
    r = enrich(df, zones).collect()[0]
    assert r.pickup_hour == 8 and r.pickup_dow == 2 and r.is_weekend is False  # Monday
    assert r.pu_zone == "Midtown Center" and r.do_borough == "Manhattan"
    assert r.passenger_count is None          # 0 passengers -> unknown
    assert r.tip_pct == 20.0 and r.duration_min == 15.0
