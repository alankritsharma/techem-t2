# Team Techem T2 - Smart Building Energy Forecasting Demo

Team Techem T2 built an end-to-end smart-building demo that turns historical Techem-style property data into forecasting, cost, CO2, landlord decisions, tenant guidance, and a mobile-style live experience.

The project has three main parts:

1. A Python backend pipeline that loads the original property CSV files, prepares daily unit-level energy history, extends the data into a richer 2021-2026 smart-building dataset, trains a forecasting model, and exports demo-ready JSON.
2. A FastAPI demo server that serves the generated forecasts, landlord views, tenant views, fake login, and deterministic live simulation.
3. A React/Vite frontend that presents the landlord dashboard and tenant app experience.

## Team

| Area | Team member | Main responsibility |
|---|---|---|
| Backend logic | Alankrit Sharma | Data pipeline, synthetic data generation, forecasting logic, API, demo exports, live simulation |
| Frontend | Luca Forbes | React dashboard and user interface experience |
| Mobile app | Nojus Baltrusaitis | Tenant/mobile-style flow and mobile presentation logic |
| Planning / information | Deniz Zimmer | Research, planning, project framing, requirements, and information structure |

## Project Goal

The idea is simple: landlords and tenants should not only see past energy usage, they should understand what is likely to happen next and what action can reduce cost, CO2, and risk.

The system starts from historical energy data, builds a richer smart-building history, predicts future energy consumption, and converts the prediction into useful decisions:

| User | Use case | What the project shows |
|---|---|---|
| Landlord | Monitor a property portfolio | Forecasted energy, cost, CO2, property risk, and tenant-facing notices |
| Tenant | Understand apartment usage | Predicted next days, live state, advice cards, and heating suggestions |
| Building operator | Detect inefficient usage | Window-open risk, radiator load, occupancy proxy, heating mode, and forecast deviation |
| Sustainability / ESG viewer | Estimate CO2 impact | Energy forecasts converted to emissions using each energy source factor |

## High-Level Architecture

```text
Original Techem CSV files
        |
        v
Python data loader and preprocessing
        |
        v
Daily unit-level history
        |
        v
Synthetic smart-building extension, 2021-01-01 to 2026-04-24
        |
        v
Feature engineering and ML forecast model
        |
        v
Daily, monthly, annual forecast outputs
        |
        v
Demo JSON export layer
        |
        v
FastAPI backend
        |
        v
React landlord dashboard and tenant mobile-style app
```

## Repository Structure

| Path | Purpose | Status |
|---|---|---|
| `dataset/` | Original Techem-style property input CSV files, `property_1.csv` to `property_20.csv`. These are the starting point for the backend. | Important input data |
| `src/techem_forecast/` | Main Python package for loading data, preprocessing, feature engineering, training, prediction, synthetic data generation, business calculations, exports, and API support. | Core backend |
| `scripts/` | Command-line entry points for generating synthetic data, running forecasts, exporting demo JSON, validating synthetic data, and starting the API. | Operational scripts |
| `config/` | Example configuration files. | Supporting config |
| `docs/` | Demo API/data contract documentation. | Supporting docs |
| `evidence.ai-—-executive-trust-infrastructure/` | Main React/Vite frontend used for the landlord dashboard and tenant mobile-style interface. | Core frontend |
| `outputs/` | Generated forecast and demo artifacts. This is ignored by git because outputs can be recreated from scripts. | Local/generated |
| `app_interface/` | Older/local interface work kept as reference material. It is ignored by git. | Scratch/reference |
| `trusted-building-dashboard(2)/` | Older dashboard copy/reference. It is ignored by git. | Scratch/reference |
| `remix_-trusted-building-dashboard--cs-energy-prgnose-update(5)/` | Older Remix/dashboard copy/reference. It is ignored by git. | Scratch/reference |

## Important Backend Files

| File | What it does |
|---|---|
| `src/techem_forecast/data_loader.py` | Loads raw `property_*.csv` files, normalizes column names, validates schema, converts dates/numbers, and loads optional future weather data. |
| `src/techem_forecast/preprocess.py` | Converts raw room-level records into daily unit-level or property-level time series. It creates `unit_id`, `room_id`, and `series_id`, fills missing calendar days, and marks missing observations. |
| `src/techem_forecast/synthetic_generator.py` | Creates the deterministic 2021-2026 smart-building extension. It adds room temperature, setpoint, radiator valve percentage, humidity, occupancy proxy, window-open risk, heating mode, outside temperature, and daily energy usage. |
| `src/techem_forecast/synthetic_weather.py` | Builds repeatable city-level weather profiles used by the synthetic extension. |
| `src/techem_forecast/features.py` | Builds model features such as day of week, month, heating degree days, lag energy, rolling means, rolling standard deviations, and smart-building covariates. |
| `src/techem_forecast/train.py` | Trains the forecasting model. It prefers `xgboost.XGBRegressor` when XGBoost is installed and falls back to `sklearn.HistGradientBoostingRegressor`. |
| `src/techem_forecast/predict.py` | Creates recursive daily forecasts for each unit/property. Each predicted day becomes part of the rolling history for the next predicted day. |
| `src/techem_forecast/business_logic.py` | Converts predicted energy into cost, CO2, and energy per square meter. |
| `src/techem_forecast/aggregate.py` | Aggregates daily forecasts into monthly, annual, property, landlord, tenant, and portfolio summaries. |
| `src/techem_forecast/demo_exports.py` | Builds demo users, landlords, tenants, property registry, unit registry, forecast summaries, and frontend-ready JSON files. |
| `src/techem_forecast/demo_api.py` | FastAPI server with fake login, role-filtered endpoints, landlord/tenant APIs, risk/advice logic, and deterministic live simulation. |
| `src/techem_forecast/pipeline.py` | Orchestrates the full forecast run: load data, engineer features, train, predict, calculate business values, aggregate, and return metrics. |
| `src/techem_forecast/synthetic_validation.py` | Validates generated synthetic data quality and ranges. |
| `src/techem_forecast/baselines.py` | Calculates baseline model metrics used to compare the ML forecast. |
| `src/techem_forecast/schemas.py` | Defines expected schema and column normalization rules. |

## Important Script Files

| Script | Command purpose |
|---|---|
| `scripts/generate_synthetic_extension.py` | Generates the extended 2021-2026 smart-building dataset from the original CSV data. |
| `scripts/validate_synthetic_extension.py` | Checks the synthetic extension for expected ranges and consistency. |
| `scripts/run_forecast.py` | Runs the forecasting pipeline and writes daily/monthly/annual outputs. |
| `scripts/run_demo_export.py` | Produces the JSON files consumed by the FastAPI backend and frontend demo. |
| `scripts/run_demo_api.py` | Starts the local FastAPI demo server. |

## Important Frontend Files

| File | What it does |
|---|---|
| `evidence.ai-—-executive-trust-infrastructure/src/main.tsx` | React entry point. |
| `evidence.ai-—-executive-trust-infrastructure/src/App.tsx` | Main app shell and routing between experiences. |
| `evidence.ai-—-executive-trust-infrastructure/src/pages/Login.tsx` | Login page for landlord and tenant demo accounts. |
| `evidence.ai-—-executive-trust-infrastructure/src/pages/LandlordDashboard.tsx` | Main landlord view for portfolio/property monitoring, risk, forecasts, and decisions. |
| `evidence.ai-—-executive-trust-infrastructure/src/pages/TenantDashboard.tsx` | Tenant mobile-style dashboard with personal forecast, live state, suggestions, and apartment-level view. |
| `evidence.ai-—-executive-trust-infrastructure/src/pages/ESG.tsx` | ESG/sustainability view. |
| `evidence.ai-—-executive-trust-infrastructure/src/pages/Reports.tsx` | Reporting view. |
| `evidence.ai-—-executive-trust-infrastructure/src/pages/Alarms.tsx` | Alarm/risk-oriented view. |
| `evidence.ai-—-executive-trust-infrastructure/src/components/ApartmentBlueprint.tsx` | Apartment visualization used in the tenant experience. |
| `evidence.ai-—-executive-trust-infrastructure/src/components/SevenDayEnergyOutlook.tsx` | Short-term energy forecast display. |
| `evidence.ai-—-executive-trust-infrastructure/src/components/OptimizationActionPanel.tsx` | Shows suggested optimization actions. |
| `evidence.ai-—-executive-trust-infrastructure/src/components/WeatherImpactModule.tsx` | Connects weather and energy impact for the UI. |
| `evidence.ai-—-executive-trust-infrastructure/src/components/HistoricalConsumptionModule.tsx` | Displays historical consumption context. |
| `evidence.ai-—-executive-trust-infrastructure/src/services/api.ts` | Frontend API client. It points to the same hostname as the frontend on backend port `8000`, which helps laptop and phone demos work on local Wi-Fi. |
| `evidence.ai-—-executive-trust-infrastructure/src/services/*.ts` | UI-side services for history, optimization, evidence, readiness, review dossiers, and local stores. |

## Data Story

The original challenge data contains property CSV files. Each file represents one property and includes room/unit-level energy observations with building metadata such as date, unit number, room number, living space, outside temperature, city, zipcode, energy source, and emission factor.

The backend converts this into a stable unit-day dataset:

| Step | Input | Output |
|---|---|---|
| Load | `dataset/property_*.csv` | One combined dataframe with `property_id` from the filename |
| Normalize | Raw CSV columns | Consistent snake-case columns and numeric/date types |
| Identify | Property + unit + room numbers | `unit_id`, `room_id`, `series_id` |
| Aggregate | Room-level records | One row per unit per day |
| Complete calendar | Sparse daily history | Continuous daily series with `is_missing_observation` flags |
| Extend | Original historical patterns from `2019-12-31` to `2020-12-30` | Synthetic smart-building history from `2021-01-01` to `2026-04-24` |
| Forecast | Extended daily history | Future energy, cost, CO2, and risk/advice values |

The synthetic extension is demo-only. It does not claim to be real IoT sensor data. It was created so the project can show a realistic smart-building product experience beyond a small static historical dataset.

## Why Synthetic Data Was Added

The original data covers 20 property CSV files with dates from `2019-12-31` to `2020-12-30`. This gives the project a real historical base, but it is not enough to demonstrate a modern forecasting and smart-building workflow up to 2026. To make the demo useful, the backend script uses the original historical patterns as the behavioral anchor and generates a deterministic extension from `2021-01-01` through `2026-04-24`.

The generated data keeps important real structure:

| Preserved from source data | Added for smart-building demo |
|---|---|
| Property IDs | Room temperature |
| Unit IDs and unit numbers | Heater setpoint |
| City and zipcode | Radiator valve opening percentage |
| Living space | Humidity |
| Room count | Occupancy proxy |
| Energy source | Window-open risk |
| Emission factor | Heating mode: `off`, `eco`, `comfort`, `boost` |
| Seasonal energy behavior | City-level synthetic weather calendar |
| Weekday/weekend behavior | Deterministic live simulation inputs |

The generator uses a fixed seed, so the same input data creates the same demo dataset again. That is important because the frontend, demo credentials, tenant examples, and dashboard behavior stay reproducible.

## Putting It Live

The easiest production-style setup for this repo is:

1. Deploy the React frontend on Netlify from GitHub
2. Deploy the FastAPI backend on Render from the same GitHub repo
3. Connect them with environment variables

This repo now includes:

- `netlify.toml` for the frontend build
- `render.yaml` for the backend service
- `scripts/start_demo_server.py` so Render can generate demo JSON automatically before starting the API

### 1. Push the repo to GitHub

Make sure the repository includes:

- `dataset/`
- `src/`
- `scripts/`
- `requirements.txt`
- `evidence.ai-—-executive-trust-infrastructure/`

The generated `outputs/` folder does not need to be committed. The backend can recreate the demo artifacts at startup.

### 2. Deploy the frontend on Netlify

Create a new site from GitHub and select this repository.

Netlify should pick up `netlify.toml`, but the important values are:

- Base directory: `evidence.ai-—-executive-trust-infrastructure`
- Build command: `npm run build`
- Publish directory: `dist`

Set this environment variable in Netlify:

```bash
VITE_API_BASE=https://YOUR-RENDER-SERVICE.onrender.com
```

After deploy, Netlify will give you a URL like:

```text
https://your-site-name.netlify.app
```

### 3. Deploy the backend on Render

Create a new Web Service from the same GitHub repo. Render can read `render.yaml`, or you can enter the settings manually.

Important backend settings:

- Runtime: Python
- Build command: `pip install -r requirements.txt`
- Start command: `python3.11 scripts/start_demo_server.py --output-dir /tmp/techem-demo`

Set this environment variable in Render:

```bash
DEMO_ALLOWED_ORIGINS=https://YOUR-NETLIFY-SITE.netlify.app
```

If you later add a custom domain, include it too as a comma-separated list:

```bash
DEMO_ALLOWED_ORIGINS=https://YOUR-NETLIFY-SITE.netlify.app,https://app.yourdomain.com
```

### 4. Redeploy both sides

Once Render gives you the backend URL:

1. Copy that URL into Netlify as `VITE_API_BASE`
2. Copy the Netlify URL into Render as `DEMO_ALLOWED_ORIGINS`
3. Trigger redeploys

### 5. What GitHub Pages can and cannot do

GitHub Pages can host the frontend, but not the FastAPI backend. So if you want a full live system, GitHub Pages alone is not enough for this repo.

### 6. Simplest recommendation

If you want something that feels like `something.netlify.app`, use:

- Netlify for the frontend
- Render for the backend

That is the cleanest match for this project structure.

## Core Calculations

### Unit-Day Aggregation

Raw room records are converted into unit-day records.

| Output field | Formula / logic |
|---|---|
| `energy_usage_kwh` | Sum of room energy for the same property, unit, and date |
| `living_space_m2` | Sum of room living space for the unit |
| `outside_temp_c` | Mean outside temperature for the unit-day |
| `room_count` | Number of distinct rooms in the unit |
| `emission_factor_g_per_kwh` | Mean emission factor for the unit-day |
| `series_id` | `unit_id`, used as the time-series key |

### Weather and Calendar Features

The model receives weather and calendar context:

| Feature | Formula / logic |
|---|---|
| `day_of_week` | Monday to Sunday index from the date |
| `is_weekend` | `1` if Saturday/Sunday, otherwise `0` |
| `month`, `quarter`, `day_of_year`, `week_of_year` | Derived from date |
| `is_heating_season` | `1` for October-April, otherwise `0` |
| `heating_degree_days` | `max(0, 18.0 - outside_temp_c)` |
| `cooling_degree_days` | `max(0, outside_temp_c - 22.0)` |

### Lag and Rolling Features

The model also learns from recent energy behavior:

| Feature | Meaning |
|---|---|
| `lag_1`, `lag_2`, `lag_3`, `lag_7`, `lag_14`, `lag_28` | Energy usage from previous days |
| `rolling_mean_3`, `rolling_mean_7`, `rolling_mean_14`, `rolling_mean_28` | Average recent energy usage |
| `rolling_std_3`, `rolling_std_7`, `rolling_std_14`, `rolling_std_28` | Variability in recent energy usage |
| `energy_intensity_lag_1` | `lag_1 / living_space_m2` |
| `temp_rolling_mean_3`, `temp_rolling_mean_7` | Recent outside temperature averages |

### Synthetic Demand Logic

For each unit, the synthetic generator estimates base behavior from the historical data and building structure.

| Concept | Simplified explanation |
|---|---|
| Base load | Normal non-heating demand estimated from summer usage and unit size |
| Heating slope | How strongly energy increases when outside temperature gets colder |
| Seasonal profile | Day-of-year energy pattern smoothed from historical behavior |
| Weekday factor | Difference between weekday and weekend/weekly behavior |
| Occupancy proxy | Deterministic estimate based on room count, living space, weekend, season, and stable unit seed |
| Heating mode | Chosen from temperature demand and occupancy pressure |
| Valve opening | Increases when heating demand, setpoint, and occupancy are higher |
| Window-open risk | Increases when occupancy/room temperature are high and ventilation behavior is likely |

Important simplified formulas:

```text
heating_degree_days = max(0, 18.0 - outside_temp_c)

demand_core =
  (base_load_kwh + heating_slope_kwh_per_hdd * heating_degree_days)
  * seasonal_factor
  * weekday_factor
  * year_factor

energy_usage_kwh =
  max(demand_core * sensor_adjustment * deterministic_residual, size_safety_floor)
```

### Forecasting

The model predicts future daily energy for each unit. It uses:

| Feature group | Examples |
|---|---|
| Identity/category | `property_id`, `unit_id`, `zipcode`, `city`, `energy_source`, `heating_mode` |
| Building metadata | `living_space_m2`, `room_count`, `emission_factor_g_per_kwh` |
| Weather/calendar | outside temperature, month, heating degree days, weekend flag |
| Time-series memory | lag values and rolling averages |
| Smart-building context | room temperature, setpoint, radiator valve, humidity, occupancy proxy, window-open risk |

The training logic uses a strict time-based validation split. That means the model trains on older dates and validates on newer dates, which is closer to the real forecasting problem than random splitting.

The model choice is:

| Priority | Model |
|---|---|
| Preferred | `xgboost.XGBRegressor` |
| Fallback | `sklearn.HistGradientBoostingRegressor` |

The forecast is recursive:

```text
Predict day 1
Add predicted day 1 back into the working series
Use that updated history to predict day 2
Repeat until the horizon is complete
```

### Business Values

After energy is predicted, the backend calculates money and emissions:

| Output | Formula |
|---|---|
| `predicted_cost_eur` | `predicted_energy_kwh * price_eur_per_kwh` |
| `predicted_co2_kg` | `predicted_energy_kwh * emission_factor_g_per_kwh / 1000` |
| `predicted_energy_per_m2_kwh` | `predicted_energy_kwh / living_space_m2` |

The default demo electricity/energy price is:

```text
price_eur_per_kwh = 0.12
```

## Suggestions and Risk Logic

The tenant advice and landlord risk views are built from forecast and live simulation values.

| Signal | Why it matters | Example suggestion |
|---|---|---|
| Forecast above baseline | The unit may consume more than expected | Reduce setpoint or switch to eco mode |
| High window-open risk | Heating may be active while ventilation is high | Check windows or reduce over-ventilation |
| High radiator valve opening | Heating system is working hard | Lower setpoint slightly to reduce demand |
| Cold snap scenario | Weather-driven heating demand rises | Warn landlord and tenant about higher demand |
| Eco mode scenario | Lower demand and comfort tradeoff | Show reduced projection and efficiency benefit |

Example tenant advice rule from the API:

```text
if projected_end_of_day_kwh > predicted_energy_kwh * 1.08:
    show high-priority advice
```

This makes the demo explainable: a user can see the forecast, the live state, and the reason for the recommendation.

## Demo JSON Database

There is no external database server in this demo. Instead, the project generates a local JSON "demo database" in `outputs/demo_synthetic/`. The FastAPI backend loads those JSON files into memory and serves them through endpoints.

| Generated JSON file | Purpose |
|---|---|
| `demo_users.json` | Fake login users for landlord and tenant demo accounts |
| `landlords.json` | Landlord registry |
| `tenants.json` | Tenant registry |
| `property_registry.json` | Property metadata |
| `unit_registry.json` | Unit/apartment metadata |
| `daily_forecast.json` | Unit-level daily forecast rows |
| `monthly_summary.json` | Unit-level monthly forecast totals |
| `annual_summary.json` | Unit-level annual forecast totals |
| `property_summaries.json` | Property-level forecast totals |
| `unit_summaries.json` | Unit-level forecast totals |
| `landlord_summaries.json` | Forecast totals grouped by landlord |
| `tenant_summaries.json` | Forecast totals grouped by tenant |
| `property_monthly_summary.json` | Property monthly totals |
| `property_annual_summary.json` | Property annual totals |
| `landlord_monthly_summary.json` | Landlord monthly totals |
| `landlord_annual_summary.json` | Landlord annual totals |
| `tenant_monthly_summary.json` | Tenant monthly totals |
| `tenant_annual_summary.json` | Tenant annual totals |
| `metrics.json` | Model name, validation metrics, config, and export metadata |
| `contract_manifest.json` | Data contract for generated demo files |

This design was chosen because it is easy to run during a presentation: no Docker database, no cloud dependency, and no fragile setup step.

## Backend API

### Auth

| Endpoint | Purpose |
|---|---|
| `POST /auth/login` | Fake local login. Returns bearer token and user object. |
| `GET /auth/me` | Returns the current user from the bearer token. |

### Landlord

| Endpoint | Purpose |
|---|---|
| `GET /landlord/dashboard` | Landlord portfolio summary and assigned properties. |
| `GET /landlord/properties` | Properties visible to the logged-in landlord. |
| `GET /landlord/risk` | Risk/advice view for landlord actions. |
| `GET /landlord/live` | Current landlord live simulation state. |
| `POST /landlord/live/start` | Starts landlord live simulation. |
| `POST /landlord/live/stop` | Stops landlord live simulation. |

### Tenant

| Endpoint | Purpose |
|---|---|
| `GET /tenant/dashboard` | Tenant apartment summary. |
| `GET /tenant/daily` | Tenant daily forecast rows. |
| `GET /tenant/monthly` | Tenant monthly summary. |
| `GET /tenant/prediction` | 2-day, 3-day, and 7-day prediction windows. |
| `GET /tenant/live` | Current tenant live simulation state. |
| `POST /tenant/live/start` | Starts tenant live simulation. |
| `POST /tenant/live/stop` | Stops tenant live simulation. |
| `GET /tenant/advice` | Tenant advice cards. |

### Property and Shared

| Endpoint | Purpose |
|---|---|
| `GET /properties/{property_id}` | Property detail. |
| `GET /properties/{property_id}/daily` | Property daily forecast. |
| `GET /properties/{property_id}/monthly` | Property monthly forecast. |
| `POST /live/scenario` | Changes live scenario: `normal`, `cold_snap`, `high_usage`, or `eco_mode`. |
| `GET /live/status` | Shows active live sessions and current scenario. |
| `GET /health` | Health check. |

## Demo Credentials

| Role | Username | Password |
|---|---|---|
| Landlord | `landlord01` | `Demo-Techem-2026!` |
| Tenant | `tenant_p03_u09` | `Demo-Techem-2026!` |

The tenant account above is intentionally useful for the demo because it maps to a higher-usage unit, which makes forecast, risk, live state, and advice flows easier to present.

## How To Run

### 1. Python setup

```bash
cd /Users/alankritsharma/tud/sem4/techem-t2
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
```

### 2. Frontend setup

```bash
cd /Users/alankritsharma/tud/sem4/techem-t2/evidence.ai-—-executive-trust-infrastructure
npm install
```

### 3. Generate the 2021-2026 synthetic smart-building dataset

```bash
cd /Users/alankritsharma/tud/sem4/techem-t2
python3.11 scripts/generate_synthetic_extension.py \
  --dataset-dir dataset \
  --output-dir outputs/synthetic
```

Expected generated dataset:

```text
outputs/synthetic/unit_daily_extended_2021_2026.csv
```

or, if a Parquet engine is available:

```text
outputs/synthetic/unit_daily_extended_2021_2026.parquet
```

### 4. Generate demo JSON exports

```bash
cd /Users/alankritsharma/tud/sem4/techem-t2
python3.11 scripts/run_demo_export.py \
  --history-path outputs/synthetic/unit_daily_extended_2021_2026.csv \
  --output-dir outputs/demo_synthetic \
  --validation-cutoff-date 2025-12-31 \
  --horizon-days 30
```

### 5. Start the backend

For laptop-only use:

```bash
cd /Users/alankritsharma/tud/sem4/techem-t2
python3.11 scripts/run_demo_api.py \
  --output-dir outputs/demo_synthetic \
  --host 127.0.0.1 \
  --port 8000
```

For phone and laptop on the same Wi-Fi:

```bash
cd /Users/alankritsharma/tud/sem4/techem-t2
python3.11 scripts/run_demo_api.py \
  --output-dir outputs/demo_synthetic \
  --host 0.0.0.0 \
  --port 8000
```

### 6. Start the frontend

```bash
cd /Users/alankritsharma/tud/sem4/techem-t2/evidence.ai-—-executive-trust-infrastructure
npm run dev
```

Open the Vite URL shown in the terminal, usually:

```text
http://localhost:3000/
```

For a phone demo, open the Network URL printed by Vite, for example:

```text
http://192.168.x.x:3000/
```

## Presentation Flow

1. Start backend and frontend.
2. Log in as `landlord01`.
3. Show the portfolio forecast, property summaries, cost, CO2, and risk/advice cards.
4. Start or change the live scenario from the landlord side.
5. Log in on a phone or narrow browser as `tenant_p03_u09`.
6. Show the tenant forecast, live projected usage, apartment view, and advice.
7. Explain that the same forecast output supports both landlord decisions and tenant-facing guidance.

## Validation and Build Checks

Backend syntax check:

```bash
cd /Users/alankritsharma/tud/sem4/techem-t2
python3.11 -m py_compile \
  src/techem_forecast/demo_api.py \
  src/techem_forecast/demo_exports.py
```

Frontend production build:

```bash
cd /Users/alankritsharma/tud/sem4/techem-t2/evidence.ai-—-executive-trust-infrastructure
npm run build
```

Backend health check after starting the API:

```bash
curl -s http://127.0.0.1:8000/health
```

## What Should Be Committed

Commit these:

| Path | Reason |
|---|---|
| `.gitignore` | Keeps generated and scratch files out of git |
| `README.md` | Main project explanation |
| `requirements.txt` | Python dependencies |
| `config/` | Sample config |
| `docs/` | API/demo contract |
| `scripts/` | Reproducible command-line workflows |
| `src/` | Backend source code |
| `dataset/` | Input data, if the project is allowed to include it |
| `evidence.ai-—-executive-trust-infrastructure/` | Main frontend app |

Do not commit these:

| Path | Reason |
|---|---|
| `outputs/` | Generated files; can be recreated |
| `node_modules/` | Installed frontend dependencies |
| `dist/` | Frontend build output |
| `.venv/` | Local Python environment |
| `app_interface/` | Scratch/reference interface work |
| `trusted-building-dashboard(2)/` | Scratch/reference dashboard copy |
| `remix_-trusted-building-dashboard--cs-energy-prgnose-update(5)/` | Scratch/reference dashboard copy |
| `.DS_Store`, `.vscode/`, `.idea/` | Local machine/editor files |

## Current Limitations

| Limitation | Explanation |
|---|---|
| Synthetic smart-building data | Room temperature, valve, humidity, occupancy, and window risk are generated for the demo, not measured IoT values. |
| Fake authentication | Login is local and demo-only. It is not production security. |
| JSON instead of database server | Good for presentation simplicity, but a production system would use a real database. |
| Local live simulation | Live mode is deterministic and in-memory. It explains product behavior but is not connected to real sensors. |
| Forecast depends on generated history | The 2026 demo works because the original data is extended using the Python generator. |

## One-Sentence Summary

Team Techem T2 created a reproducible smart-building forecasting demo that transforms original 2019/2020 property energy data into a 2021-2026 synthetic smart-building history, trains an XGBoost-style forecasting model, calculates cost and CO2 impact, and serves landlord and tenant decision views through a local FastAPI + React application.
