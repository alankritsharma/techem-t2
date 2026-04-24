# Techem Frontend Demo

React + Vite frontend for the Techem smart-building demo.

This app contains two main product experiences:

- landlord dashboard for portfolio, property, unit, evidence, and tenant notice review
- tenant mobile-style app for home, insights, rooms, forecast, and live guidance

## Local Run

```bash
npm install
npm run dev
```

The app usually starts on port `3000` and will move to `3001` if needed.

## Backend

Expected backend:

- local laptop: `http://127.0.0.1:8000`
- phone / LAN demo: same hostname as the frontend page, port `8000`

The API client is written to use:

1. `VITE_API_BASE` if provided
2. otherwise the current page hostname with port `8000`

## Demo Login

Landlord:

- `landlord01`
- `Demo-Techem-2026!`

Tenant:

- `tenant_p03_u09`
- `Demo-Techem-2026!`

## Important Screens

- `src/pages/Login.tsx`
- `src/pages/LandlordDashboard.tsx`
- `src/pages/TenantDashboard.tsx`
- `src/components/ApartmentBlueprint.tsx`
- `src/services/api.ts`

## Build Check

```bash
npm run build
```
