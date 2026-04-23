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
src/techem_forecast/
  aggregate.py                    Monthly, annual, portfolio totals
  baselines.py                    Simple forecasting baselines
  business_logic.py               Cost and CO2 calculations
  data_loader.py                  CSV and optional weather loading
  features.py                     Forecast feature engineering
  pipeline.py                     End-to-end orchestration
  predict.py                      Recursive daily forecasting
  preprocess.py                   Grain conversion and missing dates
  schemas.py                      Column normalization and validation
  train.py                        Time-based model training
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
