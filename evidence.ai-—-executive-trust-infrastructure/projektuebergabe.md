Dateiname: projektuebergabe.md

# Projekt-Dokumentation: Trusted Building Dashboard

## 1. Projekt-Metadaten
*   **Name:** Trusted Building Dashboard
*   **Version:** 1.2 (Executive Decision Support Release)
*   **Status:** Prototyp / Deployment Ready
*   **Letztes Update:** 23. April 2026
*   **Email:** luc69work@gmail.com

## 2. Executive Summary
### Vision & Mission
Das **Trusted Building Dashboard** ist kein herkömmliches Monitoring-Tool. Es folgt der „Trusted Building Risk & Energy Dashboard Decision Constitution“. 

**Kern-Vision:** 
Verlagerung des Fokus von reiner Datenanzeige und „KPI Theater“ hin zu **Executive Decision Confidence**. Das System beantwortet nicht nur, *was* passiert, sondern *welches* Gebäude das höchste operative Risiko darstellt – bevor es teuer wird – und ob die vorliegenden Forecasts vertrauenswürdig sind.

### Strategische Ziele
*   **Entscheidungsqualität:** Unterstützung teurer, operativer Managemententscheidungen.
*   **Forecast Trust:** Transparenz darüber, wann Forecasts unzuverlässig sind („When should I NOT trust the forecast?“).
*   **Evidenz-Integrität:** Jede Warnung wird durch verifizierte operative Evidenz (Sensoren, Wartungs-Logs) gestützt.

## 3. Technische Architektur
### Tech-Stack
*   **Framework:** React 19 (Vite Build-System)
*   **Styling:** Tailwind CSS v4 (Präzise Utility-First-Architektur)
*   **Animationen:** `motion/react` (Framer Motion) für Interface-Rhythmus
*   **Icons:** `lucide-react`
*   **Charts:** `recharts` / `d3` (für ESG und Prognose-Visualisierung)
*   **Sprache:** TypeScript (Strict Mode)

### Datenmodell
Das System basiert auf einem multidimensionalen Evidenzmodell. Jedes Gebäude (`BuildingInfo`) verfügt über Metriken zu:
*   **Forecast Trust Score:** Ein berechneter Wert basierend auf Umwelteinflüssen und Daten-Integrität.
*   **Weakest Assumption:** Die strategische Schwachstelle einer aktuellen Prognose.
*   **Decision Impact:** Projektierte Kosten- oder Risikofaktoren bei Nicht-Handeln.

## 4. Feature-Katalog
### Strategy: Critical Decision Hierarchy
*   Priorisierung des Portfolios nach Risikokonzentration statt nach Alphabet.
*   Anzeige von „Trust Scores“ und verifizierter Operativ-Logik.

### Weather Impact & Forecast Trust Module
*   **Echtzeit-Analyse:** Integration von Open-Meteo und Bright Sky APIs.
*   **Impact Scoring:** Berechnung der Belastung für HVAC-Systeme.
*   **Trust Projection:** 24h Risiko-Sichtbarkeit für strategische Planung.

### Spatial Evidence (Floorplan)
*   Visuelle Zuordnung von Anomalien auf Gebäudeebene.
*   Verifizierung von Evidenzkonflikten (z.B. HVAC UNIT A vs. Sensor SN-L4-01).

### Decision Dossiers (Reporting)
*   Erstellung von Executive-Summaries mit harten Evidenzbelegen und Blockchain-verifizierten Logs.

### Compliance Exposure (ESG)
*   Überprüfung der Forecast-Zuverlässigkeit von ESG-Daten zur Vermeidung von Reporting-Risiken.

## 5. Vollständige Dateistruktur
```text
/
├── .env.example                # Umgebungsvariablen-Vorlage
├── index.html                  # Entry Punkt
├── package.json                # Dependencies (React 19, Motion, Lucide)
├── metadata.json               # App Konfiguration
├── vite.config.ts              # Build-Pipeline
├── src/
│   ├── main.tsx                # Client Entry
│   ├── App.tsx                 # Core Routing & State
│   ├── types.ts                # Domain Type System
│   ├── data.ts                 # Musterdaten (Single Source of Truth)
│   ├── index.css               # Global Styles (Tailwind 4)
│   ├── components/
│   │   ├── Header.tsx          # Executive Nav & Portfolio Scope
│   │   ├── BottomNav.tsx       # Bottom UI Navigation
│   │   ├── WeatherImpactModule.tsx # Strategic Risk Module
│   ├── pages/
│   │   ├── Dashboard.tsx       # Strategy / Decision Hierarchy
│   │   ├── Floorplan.tsx       # Spatial Evidence Verification
│   │   ├── Alarms.tsx          # Evidence Anomalies (Alerts)
│   │   ├── ESG.tsx             # Compliance Exposure
│   │   ├── Reports.tsx         # Decision Dossiers
│   ├── services/
│   │   ├── weatherService.ts   # Trust Calculation & Weather API
│   ├── lib/
│   │   ├── utils.ts            # Tailwind Class Merging
```

## 6. Source Code Archiv

### Domain Types (`src/types.ts`)
```typescript
export type Tab = 'dashboard' | 'floorplan' | 'alarms' | 'esg' | 'reports';

export type Status = 'TRUST' | 'REVIEW' | 'HIGH RISK';

export interface BuildingInfo {
  id: string;
  name: string;
  type: string;
  location: string;
  size: string;
  built: string;
  usage: string;
  energyScore: number;
  co2Score: number;
  complianceScore: number;
  status: Status;
  forecastTrustScore: number;
  weakestAssumption: string;
  riskDriver: string;
  recommendedAction: string;
  alerts: { critical: number; warning: number };
  energy: {
    current: string;
    previous: string;
    delta: string;
    cost: string;
    forecast: string;
    deviation: string;
  };
  co2: string;
  complianceRisk: string;
  lastCheck: string;
  description: string;
}
```

### Musterdaten (`src/data.ts`)
```typescript
import { BuildingInfo } from './types';

export const MUSTER_GEBAEUDE: BuildingInfo[] = [
  {
    id: 'hq-frankfurt',
    name: 'HQ Frankfurt',
    type: 'Premium Office Headquarters',
    location: 'Frankfurt am Main',
    size: '18.500 m²',
    built: '2016',
    usage: 'Headquarters / Executive Offices',
    energyScore: 72,
    co2Score: 68,
    complianceScore: 84,
    status: 'REVIEW',
    forecastTrustScore: 61,
    weakestAssumption: 'Stable heating demand between 12:00–18:00',
    riskDriver: 'HVAC instability on Level 4',
    recommendedAction: 'Immediate HVAC maintenance review before 14:00',
    alerts: { critical: 3, warning: 4 },
    energy: {
      current: '118,400 kWh',
      previous: '109,700 kWh',
      delta: '+7.9%',
      cost: '€32,600',
      forecast: '111,000 kWh',
      deviation: '+6.7%'
    },
    co2: '42.8 t',
    complianceRisk: 'Heating efficiency documentation incomplete',
    lastCheck: '2026-04-12',
    description: 'HQ Frankfurt: HVAC instability detected.'
  }
  // Weitere Einträge für Hamburg und München...
];
```

### Strategic Weather Service (`src/services/weatherService.ts`)
```typescript
export async function fetchWeatherImpactData(lat: number = 50.1109, lon: number = 8.6821) {
  const openMeteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m&hourly=precipitation_probability&forecast_days=1`;
  const response = await fetch(openMeteoUrl).then(r => r.json());
  // ... Logic for Trust Score Calculation
}

export function calculateTrustScore(impactScore: number) {
  return 100 - (impactScore * 0.3) - (8 * 2.2); // Simplified Decision Trust Formula
}
```

## 7. Setup-Guide
### Lokale Installation
1.  **Clone / Download** des Projekts.
2.  In das Projektverzeichnis navigieren.
3.  Abhängigkeiten installieren:
    ```bash
    npm install
    ```
4.  **Entwicklungs-Modus** starten:
    ```bash
    npm run dev
    ```
5.  Der Dev-Server läuft standardmäßig auf `http://localhost:3000`.

### Build für Production
```bash
npm run build
```
Die statischen Dateien werden im `/dist` Verzeichnis generiert.

## 8. Handovers & Roadmap
### Bekannte Limitationen
*   **Static Portfolio Mapping:** Das System ist aktuell auf drei Demo-Gebäude optimiert. Eine dynamische Portfolio-Erweiterung erfordert die Anbindung einer Datenbank (z.B. Firestore).
*   **Weather Service Caching:** Keine Caching-Ebene für Wetter-APIs implementiert (Rate-Limits beachten).

### Strategische Roadmap
1.  **Deep-Gemini Integration:** Einsatz von Multimodal-Modellen zur Analyse von Wartungsfotos direkt in der „Spatial Evidence“ Ebene.
2.  **Decision Automation Bridge:** Direkte Anbindung an Gebäudemanagement-Systeme (BMS) zur Umsetzung von freigegebenen Strategien.
3.  **Governance Dashboard:** Erweitertes Rollenmodell für Auditoren und Compliance-Offiziere.

## 9. Annahmen
*   Es wird angenommen, dass der Endnutzer ein Entscheidungsträger im C-Level-Management ist, der weniger an technischen Details als an harten Risiko-Fakten interessiert ist.
*   Die verwendeten Wetter-APIs (Open-Meteo) werden als ausreichend präzise für die Berechnung der "Forecast Trust Scores" eingestuft.
*   Die Währungssymbole und Maßeinheiten folgen dem DACH-Markt Standard.

---
*Dokument generiert am 23. April 2026 für die Techem Challenge.*
