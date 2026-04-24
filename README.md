# Techem Smart Energy Forecast Backend

Backend MVP for the Techem hackathon Smart Energy Forecast Dashboard. The code
loads raw room-level property CSVs, converts them into daily time series,
trains a time-series forecasting model, predicts daily energy consumption, and
derives cost and CO2 metrics for dashboard use.

## What This Implements

- Raw CSV ingestion from `dataset/property_*.csv`
- Challenge column normalization and schema validation
- Stable `property_id`, `unit_id`, and `room_id` creation
- Room-level to daily unit/property aggregation
- Missing daily date handling per time series
- Calendar, lag, rolling, weather, heating degree day, and metadata features
- Time-based validation only
- Baseline comparisons: lag-1, lag-7, rolling-7, rolling-14
- Main ML model: XGBoost when installed, otherwise sklearn
  `HistGradientBoostingRegressor`
- Daily forecasts with derived cost and CO2
- Monthly, annual, and portfolio aggregation outputs
- CSV and JSON files suitable for a dashboard/frontend

## Repository Structure

```text
dataset/                         Raw challenge CSVs
config/sample_config.json         Example run configuration
scripts/run_forecast.py           CLI entrypoint
scripts/run_demo_export.py        Demo JSON export entrypoint
scripts/run_demo_api.py           Demo FastAPI entrypoint
src/techem_forecast/
  aggregate.py                    Monthly, annual, portfolio totals
  baselines.py                    Simple forecasting baselines
  business_logic.py               Cost and CO2 calculations
  data_loader.py                  CSV and optional weather loading
  demo_api.py                     Thin FastAPI server over demo JSON outputs
  demo_exports.py                 Demo landlord/tenant registry and JSON exports
  features.py                     Forecast feature engineering
  pipeline.py                     End-to-end orchestration
  predict.py                      Recursive daily forecasting
  preprocess.py                   Grain conversion and missing dates
  schemas.py                      Column normalization and validation
  train.py                        Time-based model training
docs/demo_contract.md             Generated payload contract reference
```

## Setup

Create a virtual environment and install the core dependencies:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
```

XGBoost is optional. If you want to try it, uncomment it in `requirements.txt`
or install it separately. Without XGBoost, the backend automatically uses the
sklearn fallback.

## Run A Forecast

Use the sample config:

```bash
python scripts/run_forecast.py --config config/sample_config.json
```

Or override values from the command line:

```bash
python scripts/run_forecast.py \
  --dataset-dir dataset \
  --output-dir outputs/property_1_unit_1 \
  --grain unit \
  --property-id property_1 \
  --unit-id property_1_unit_1 \
  --horizon-days 30 \
  --price-eur-per-kwh 0.12 \
  --max-train-rows 10000
```

For a property-level forecast, use:

```bash
python scripts/run_forecast.py \
  --grain property \
  --property-id property_1 \
  --output-dir outputs/property_1
```

To forecast the whole portfolio, omit `--property-id` and `--unit-id`.

To train from the validated synthetic smart-building extension instead of the
raw `dataset/` CSVs, point the forecast script at the daily history file:

```bash
python3.11 scripts/run_forecast.py \
  --history-path outputs/synthetic/unit_daily_extended_2021_2026.csv \
  --output-dir outputs/synthetic_forecast \
  --grain unit \
  --validation-cutoff-date 2025-12-31 \
  --horizon-days 30
```

This keeps the split strictly time-based, preserves canonical `property_id` and
`unit_id` values, and uses the smart-building covariates when present. If
`xgboost` is installed, the backend uses it automatically; otherwise it falls
back to sklearn `HistGradientBoostingRegressor`.

## Run The Demo Export Batch

Generate fake landlords, fake tenants, and JSON payloads for the full 20-property
demo setup:

```bash
python scripts/run_demo_export.py \
  --dataset-dir dataset \
  --output-dir outputs/demo \
  --horizon-days 30 \
  --price-eur-per-kwh 0.12
```

Optional performance flag for quicker local runs:

```bash
python scripts/run_demo_export.py \
  --output-dir outputs/demo \
  --max-train-rows 120000
```

To regenerate the demo payloads from the synthetic extension without
overwriting `outputs/demo`, write them into a separate folder:

```bash
python3.11 scripts/run_demo_export.py \
  --history-path outputs/synthetic/unit_daily_extended_2021_2026.csv \
  --output-dir outputs/demo_synthetic \
  --validation-cutoff-date 2025-12-31 \
  --horizon-days 30
```

Assumptions for the synthetic-trained demo batch:

- The input file is already daily unit-level history.
- Smart-building covariates are optional model features when present.
- Future smart covariates are projected from same-series historical climatology
  and recent medians rather than future target values.
- The demo API can serve the regenerated payloads if it is started with the same
  output directory.

## Outputs

The pipeline writes both CSV and JSON files:

- `daily_forecast`: daily predicted kWh, cost, CO2, metadata
- `monthly_summary`: monthly totals by selected series
- `annual_summary`: annual totals by selected series
- `portfolio_monthly_summary`: portfolio-level monthly totals
- `portfolio_annual_summary`: portfolio-level annual totals
- `metrics.json`: validation metrics, baseline comparison, run config

Key output columns:

- `predicted_energy_kwh`
- `predicted_cost_eur`
- `predicted_co2_kg`
- `predicted_energy_per_m2_kwh`
- `price_eur_per_kwh`
- `emission_factor_g_per_kwh`

### Demo Export Outputs

The demo export batch writes JSON files under `outputs/demo` by default:

- `demo_users.json`: flattened fake login registry
- `landlords.json`: landlord registry with assigned properties
- `tenants.json`: tenant registry with assigned units
- `property_registry.json`: canonical property metadata
- `unit_registry.json`: canonical unit metadata and tenant assignments
- `daily_forecast.json`: unit-level daily forecast rows for the whole portfolio
- `monthly_summary.json`: unit-level monthly totals
- `annual_summary.json`: unit-level annual totals
- `property_summaries.json`: property-level forecast horizon totals
- `unit_summaries.json`: unit-level forecast horizon totals
- `landlord_summaries.json`: landlord dashboard totals
- `landlord_monthly_summary.json`: landlord totals by month
- `landlord_annual_summary.json`: landlord totals by year
- `tenant_summaries.json`: tenant dashboard totals
- `tenant_monthly_summary.json`: tenant totals by month
- `tenant_annual_summary.json`: tenant totals by year
- `metrics.json`: model and export metadata
- `contract_manifest.json`: machine-readable index of the generated files

See [docs/demo_contract.md](/Users/alankritsharma/tud/sem4/techem-t2/docs/demo_contract.md) for the
payload contract and intended frontend usage.

## Run The Local Demo API

After generating `outputs/demo`, start the thin FastAPI server:

```bash
python3.11 scripts/run_demo_api.py --output-dir outputs/demo --host 127.0.0.1 --port 8000
```

Frontend base URL:

```text
http://127.0.0.1:8000
```

Available demo endpoints:

- `POST /auth/login`
- `GET /auth/me`
- `GET /landlord/dashboard`
- `GET /landlord/properties`
- `GET /properties/{property_id}`
- `GET /properties/{property_id}/daily`
- `GET /properties/{property_id}/monthly`
- `GET /tenant/dashboard`
- `GET /tenant/daily`
- `GET /tenant/monthly`
- `GET /health`

The API reads generated JSON files only. It does not use a database and does not
implement real authentication. Login returns a fake bearer token derived from
the selected demo user.

## Future Weather Input

If future weather is available, pass a CSV via `--future-weather-csv`. Required
columns are:

```text
date,outside_temp_c
```

Optional matching columns are `unit_id`, `property_id`, `zipcode`, or `city`.
If no future weather file is provided, the model uses historical same-day-of-year
temperature climatology as a pragmatic demo fallback.

## Data Assumptions

- Raw rows are room-level daily readings.
- The model predicts energy consumption first.
- Cost is derived as `predicted_energy_kwh * price_eur_per_kwh`.
- CO2 is derived as `predicted_energy_kwh * emission_factor_g_per_kwh / 1000`.
- Daily unit forecasts aggregate room energy by sum and room living space by sum.
- Property forecasts aggregate unit forecasts by sum.
- Missing dates are inserted per series; temperature is interpolated, while
  missing energy remains unavailable for the supervised target.

## Notes For The Demo

The sample config uses `max_train_rows` to keep local runs responsive. Set it to
`null` in JSON, or omit `--max-train-rows`, to train on all available training
rows. Validation always remains time-based.

The demo export uses fake credentials only. Every generated user is synthetic,
uses backend-owned canonical IDs, and is intended solely for local hackathon
flows.
