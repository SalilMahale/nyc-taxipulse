# Running TaxiPulse on Windows

PySpark itself is pure `pip install`, but Spark uses Hadoop's file APIs to **write** Parquet, and on Windows that needs two native
files (`winutils.exe`, `hadoop.dll`). Reading works without them; writing (our `clean.py` stage) does not. Two options — pick one.

## Option A (recommended, simplest): WSL 2 (Ubuntu)
1. PowerShell as admin: `wsl --install -d Ubuntu`, reboot, create a Linux user.
2. In the Ubuntu terminal:
   ```bash
   sudo apt update && sudo apt install -y openjdk-17-jdk python3-pip python3-venv
   cd /mnt/c/Users/<you>/taxipulse        # the unzipped project on your Windows drive
   python3 -m venv .venv && source .venv/bin/activate
   pip install -r requirements.txt
   ```
3. Run every command from the README inside this terminal. Streamlit prints a `http://localhost:8501` link that opens in your Windows browser.
   (For speed, copy the project to `~/taxipulse` inside WSL rather than running from `/mnt/c`.)

## Option B: native Windows
1. **Java**: you already have it. Check `java -version` shows 11, 17 or 21, and that `JAVA_HOME` is set (e.g. `C:\Program Files\Java\jdk-17`).
2. **winutils**: create `C:\hadoop\bin`, download `winutils.exe` and `hadoop.dll` for Hadoop **3.3.x** from
   https://github.com/cdarlint/winutils (folder `hadoop-3.3.6/bin`) into it. Set environment variables:
   `HADOOP_HOME = C:\hadoop` and add `C:\hadoop\bin` to `PATH`. Open a **new** terminal afterwards.
3. `PYSPARK_PYTHON` = full path of your venv's `python.exe` (avoids "python3 not found" worker errors).
4. Then follow the README normally.

## Memory
Set `TAXIPULSE_DRIVER_MEMORY` to about half your RAM: 8 GB laptop → `4g` (default), 16 GB → `8g`. Under 6 GB RAM use `2g`.
On PowerShell: `$env:TAXIPULSE_DRIVER_MEMORY="8g"`.

## Known-benign warnings
`WARN SparkStringUtils: Truncated the string representation of a plan` and `WARN NativeCodeLoader: Unable to load native-hadoop library`
are harmless. Stage logs from our own code start with `▶ START` / `✔ DONE`.
