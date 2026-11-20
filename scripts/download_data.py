"""Download NYC TLC Yellow Taxi monthly parquet files + zone lookup.

    python scripts/download_data.py                  # default months from config
    python scripts/download_data.py 2026-01 2026-02  # specific months
"""
import sys
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from taxipulse import config  # noqa: E402


def fetch(url: str, dest: Path) -> None:
    if dest.exists():
        print(f"skip (exists) {dest.name}")
        return
    print(f"downloading {url}")
    urllib.request.urlretrieve(url, dest)
    print(f"  -> {dest} ({dest.stat().st_size/1e6:.1f} MB)")


if __name__ == "__main__":
    config.ensure_dirs()
    months = sys.argv[1:] or config.DEFAULT_MONTHS
    fetch(f"{config.TLC_BASE_URL}/misc/taxi_zone_lookup.csv", config.ZONE_LOOKUP_FILE)
    for m in months:
        fetch(f"{config.TLC_BASE_URL}/trip-data/yellow_tripdata_{m}.parquet", config.RAW_DIR / f"yellow_tripdata_{m}.parquet")
