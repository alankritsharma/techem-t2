/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useState } from 'react';
import { Tab, BuildingObject } from './types';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { Floorplan } from './pages/Floorplan';
import { Alarms } from './pages/Alarms';
import { ESG } from './pages/ESG';
import { Login } from './pages/Login';
import { LandlordDashboard } from './pages/LandlordDashboard';
import { TenantDashboard } from './pages/TenantDashboard';
import {
  api,
  AdviceCard,
  DailyForecastRow,
  DemoUser,
  LandlordLiveSession,
  LandlordRiskResponse,
  LandlordSummary,
  LiveScenario,
  LiveStatusResponse,
  MonthlyPropertyRow,
  PropertyUnitSummary,
  PropertySummary,
  TenantLiveSession,
  TenantPredictionResponse,
  TenantMonthlyRow,
  TenantSummary,
} from './services/api';
import { clearSession, getSession, saveSession } from './services/sessionStore';

const LANDLORD_TABS: Tab[] = ['dashboard', 'floorplan', 'alarms', 'esg'];
const TENANT_TABS: Tab[] = ['dashboard'];

export default function App() {
  const [currentTab, setCurrentTab] = useState<Tab>('dashboard');
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<DemoUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const [landlordSummary, setLandlordSummary] = useState<LandlordSummary | null>(null);
  const [landlordProperties, setLandlordProperties] = useState<PropertySummary[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [selectedProperty, setSelectedProperty] = useState<PropertySummary | null>(null);
  const [propertyDaily, setPropertyDaily] = useState<DailyForecastRow[]>([]);
  const [propertyMonthly, setPropertyMonthly] = useState<MonthlyPropertyRow[]>([]);
  const [propertyUnits, setPropertyUnits] = useState<PropertyUnitSummary[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [landlordLoading, setLandlordLoading] = useState(false);

  const [tenantSummary, setTenantSummary] = useState<TenantSummary | null>(null);
  const [tenantDaily, setTenantDaily] = useState<DailyForecastRow[]>([]);
  const [tenantMonthly, setTenantMonthly] = useState<TenantMonthlyRow[]>([]);
  const [tenantLoading, setTenantLoading] = useState(false);
  const [liveStatus, setLiveStatus] = useState<LiveStatusResponse | null>(null);
  const [tenantLiveSession, setTenantLiveSession] = useState<TenantLiveSession | null>(null);
  const [tenantAdvice, setTenantAdvice] = useState<AdviceCard[]>([]);
  const [tenantPrediction, setTenantPrediction] = useState<TenantPredictionResponse | null>(null);
  const [landlordLiveSession, setLandlordLiveSession] = useState<LandlordLiveSession | null>(null);
  const [landlordRisk, setLandlordRisk] = useState<LandlordRiskResponse | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<LiveScenario>('normal');

useEffect(() => {
  // Do not auto-restore a session if the URL explicitly provides a token
  // This ensures the login gate is respected in demo mode and avoids
  // unintended auto-login via URL parameters.
  const urlParams = new URLSearchParams(window.location.search);
  const urlToken = urlParams.get('token');

  const existingSession = getSession();
  if (!existingSession?.token || urlToken) {
    // If there is no stored session or a URL token is present, require login
    setAuthLoading(false);
    return;
  }

  async function restoreSession() {
    try {
      const user = await api.me(existingSession.token);
      setSessionToken(existingSession.token);
      setCurrentUser(user);
    } catch {
      clearSession();
      setSessionToken(null);
      setCurrentUser(null);
    } finally {
      setAuthLoading(false);
    }
  }

  restoreSession();
}, []);

  useEffect(() => {
    if (!sessionToken || !currentUser) return;

    if (currentUser.role === 'landlord') {
      setCurrentTab((tab) => (LANDLORD_TABS.includes(tab) ? tab : 'dashboard'));
      void loadLandlordData(sessionToken);
    } else {
      setCurrentTab('dashboard');
      void loadTenantData(sessionToken);
    }
    void loadLiveStatus();
  }, [sessionToken, currentUser?.user_id]);

  useEffect(() => {
    if (!sessionToken || !currentUser || currentUser.role !== 'landlord' || !selectedPropertyId) {
      return;
    }
    void loadPropertyData(selectedPropertyId, sessionToken);
  }, [sessionToken, currentUser?.user_id, selectedPropertyId]);

  async function loadLandlordData(token: string) {
    setLandlordLoading(true);
    try {
      const [summary, properties] = await Promise.all([
        api.landlordDashboard(token),
        api.landlordProperties(token),
      ]);
      setLandlordSummary(summary);
      setLandlordProperties(properties);
      const nextPropertyId =
        selectedPropertyId && properties.some((property) => property.property_id === selectedPropertyId)
          ? selectedPropertyId
          : properties[0]?.property_id ?? '';
      setSelectedPropertyId(nextPropertyId);
    } finally {
      setLandlordLoading(false);
    }
  }

  async function loadPropertyData(propertyId: string, token: string) {
    setLandlordLoading(true);
    try {
      const [property, daily, monthly, units] = await Promise.all([
        api.propertyDetail(propertyId, token),
        api.propertyDaily(propertyId, token),
        api.propertyMonthly(propertyId, token),
        api.propertyUnits(propertyId, token),
      ]);
      setSelectedProperty(property);
      setPropertyDaily(daily);
      setPropertyMonthly(monthly);
      setPropertyUnits(units);
      setSelectedUnitId((current) =>
        current && units.some((unit) => unit.unit_id === current)
          ? current
          : units[0]?.unit_id ?? ''
      );
    } finally {
      setLandlordLoading(false);
    }
  }

  async function loadTenantData(token: string) {
    setTenantLoading(true);
    try {
      const [summary, daily, monthly] = await Promise.all([
        api.tenantDashboard(token),
        api.tenantDaily(token),
        api.tenantMonthly(token),
      ]);
      setTenantSummary(summary);
      setTenantDaily(daily);
      setTenantMonthly(monthly);
    } finally {
      setTenantLoading(false);
    }
  }

  async function loadLiveStatus() {
    try {
      const status = await api.liveStatus();
      setLiveStatus(status);
      setSelectedScenario(status.scenario);
    } catch {
      // Leave live UI in a safe default state if status is unavailable.
    }
  }

  async function refreshTenantLive(token: string) {
    const [session, prediction, advice, status] = await Promise.all([
      ignoreNotFound(() => api.tenantLive(token), null),
      api.tenantPrediction(token),
      ignoreNotFound(() => api.tenantAdvice(token), { advice: [] as AdviceCard[], source: 'fallback', tenant_id: '', scenario: selectedScenario }),
      api.liveStatus(),
    ]);
    setTenantLiveSession(session);
    setTenantPrediction(prediction);
    setTenantAdvice(advice.advice);
    setLiveStatus(status);
    setSelectedScenario(status.scenario);
    if (!session) {
      setTenantAdvice([]);
    }
    setLiveError(null);
  }

  async function refreshLandlordLive(token: string) {
    const [session, risk, status] = await Promise.all([
      ignoreNotFound(() => api.landlordLive(token), null),
      ignoreNotFound(
        () => api.landlordRisk(token),
        {
          landlord_id: currentUser?.landlord_id ?? '',
          scenario: selectedScenario,
          risk_level: 'normal',
          portfolio_baseline_day_kwh: 0,
          portfolio_projected_end_of_day_kwh: 0,
          risk_flags: [],
          property_rollup: [],
          source: 'fallback',
        }
      ),
      api.liveStatus(),
    ]);
    setLandlordLiveSession(session);
    setLandlordRisk(risk);
    setLiveStatus(status);
    setSelectedScenario(status.scenario);
    setLiveError(null);
  }

  async function handleLogin(username: string, password: string) {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const loginResponse = await api.login(username, password);
      const user = await api.me(loginResponse.access_token);
      saveSession({ token: loginResponse.access_token, user });
      setSessionToken(loginResponse.access_token);
      setCurrentUser(user);
      setSelectedPropertyId('');
      setSelectedProperty(null);
      setPropertyDaily([]);
      setPropertyMonthly([]);
      setPropertyUnits([]);
      setSelectedUnitId('');
      setTenantSummary(null);
      setTenantDaily([]);
      setTenantMonthly([]);
      setTenantLiveSession(null);
      setTenantAdvice([]);
      setTenantPrediction(null);
      setLandlordLiveSession(null);
      setLandlordRisk(null);
      setLiveError(null);
      await loadLiveStatus();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Login failed');
      clearSession();
      setSessionToken(null);
      setCurrentUser(null);
    } finally {
      setAuthLoading(false);
    }
  }

  function handleLogout() {
    clearSession();
    setSessionToken(null);
    setCurrentUser(null);
    setLandlordSummary(null);
    setLandlordProperties([]);
    setSelectedPropertyId('');
    setSelectedProperty(null);
    setPropertyDaily([]);
    setPropertyMonthly([]);
    setPropertyUnits([]);
    setSelectedUnitId('');
    setTenantSummary(null);
    setTenantDaily([]);
    setTenantMonthly([]);
    setTenantLiveSession(null);
    setTenantAdvice([]);
    setTenantPrediction(null);
    setLandlordLiveSession(null);
    setLandlordRisk(null);
    setLiveStatus(null);
    setLiveError(null);
    setSelectedScenario('normal');
    setCurrentTab('dashboard');
  }

  useEffect(() => {
    if (!sessionToken || !currentUser) return;

    const isTenantLiveActive =
      currentUser.role === 'tenant' && tenantLiveSession?.status === 'active';
    const isLandlordLiveActive =
      currentUser.role === 'landlord' && landlordLiveSession?.status === 'active';

    if (!isTenantLiveActive && !isLandlordLiveActive) return;

    let cancelled = false;
    const run = async () => {
      try {
        if (currentUser.role === 'tenant') {
          await refreshTenantLive(sessionToken);
        } else {
          await refreshLandlordLive(sessionToken);
        }
      } catch (error) {
        if (!cancelled) {
          setLiveError(error instanceof Error ? error.message : 'LIVE refresh failed');
        }
      }
    };

    void run();
    const intervalId = window.setInterval(() => {
      void run();
    }, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [sessionToken, currentUser?.role, tenantLiveSession?.status, landlordLiveSession?.status]);

  async function handleTenantLiveStart() {
    if (!sessionToken) return;
    setLiveLoading(true);
    setLiveError(null);
    try {
      await api.tenantLiveStart(sessionToken);
      await refreshTenantLive(sessionToken);
    } catch (error) {
      setLiveError(error instanceof Error ? error.message : 'Unable to start tenant LIVE mode');
    } finally {
      setLiveLoading(false);
    }
  }

  async function handleTenantLiveStop() {
    if (!sessionToken) return;
    setLiveLoading(true);
    setLiveError(null);
    try {
      await api.tenantLiveStop(sessionToken);
      setTenantLiveSession(null);
      setTenantAdvice([]);
      setTenantPrediction(null);
      await loadLiveStatus();
    } catch (error) {
      setLiveError(error instanceof Error ? error.message : 'Unable to stop tenant LIVE mode');
    } finally {
      setLiveLoading(false);
    }
  }

  async function handleLandlordLiveStart() {
    if (!sessionToken) return;
    setLiveLoading(true);
    setLiveError(null);
    try {
      await api.landlordLiveStart(sessionToken);
      await refreshLandlordLive(sessionToken);
    } catch (error) {
      setLiveError(error instanceof Error ? error.message : 'Unable to start landlord LIVE mode');
    } finally {
      setLiveLoading(false);
    }
  }

  async function handleLandlordLiveStop() {
    if (!sessionToken) return;
    setLiveLoading(true);
    setLiveError(null);
    try {
      await api.landlordLiveStop(sessionToken);
      setLandlordLiveSession(null);
      setLandlordRisk(null);
      await loadLiveStatus();
    } catch (error) {
      setLiveError(error instanceof Error ? error.message : 'Unable to stop landlord LIVE mode');
    } finally {
      setLiveLoading(false);
    }
  }

  async function handleScenarioChange(nextScenario: LiveScenario) {
    if (!sessionToken) return;
    setLiveLoading(true);
    setLiveError(null);
    try {
      const response = await api.liveScenario(nextScenario, sessionToken);
      setSelectedScenario(response.scenario);
      await loadLiveStatus();
      if (currentUser?.role === 'tenant' && tenantLiveSession?.status === 'active') {
        await refreshTenantLive(sessionToken);
      }
      if (currentUser?.role === 'landlord' && landlordLiveSession?.status === 'active') {
        await refreshLandlordLive(sessionToken);
      }
    } catch (error) {
      setLiveError(error instanceof Error ? error.message : 'Unable to change LIVE scenario');
    } finally {
      setLiveLoading(false);
    }
  }

  const visibleTabs = currentUser?.role === 'landlord' ? LANDLORD_TABS : TENANT_TABS;
  const useLandlordConsole = currentUser?.role === 'landlord' && currentTab === 'dashboard';
  const useTenantAppShell = currentUser?.role === 'tenant' && currentTab === 'dashboard';
  const currentObject = useMemo(
    () =>
      currentUser?.role === 'landlord' && selectedProperty
        ? propertyToBuildingObject(selectedProperty)
        : tenantSummary
        ? tenantToBuildingObject(tenantSummary)
        : null,
    [currentUser?.role, selectedProperty, tenantSummary]
  );

  const objectOptions = useMemo(
    () => landlordProperties.map(propertyToBuildingObject),
    [landlordProperties]
  );

  if (!currentUser) {
    return <Login onLogin={handleLogin} loading={authLoading} error={authError} />;
  }

  return (
    <div className="min-h-screen bg-background">
      {!useLandlordConsole && !useTenantAppShell && (
        <Header
          currentTab={currentTab}
          setTab={setCurrentTab}
          visibleTabs={visibleTabs}
          objects={objectOptions}
          projects={[]}
          currentObject={currentObject}
          currentObjectId={selectedPropertyId}
          currentUserName={currentUser.display_name}
          currentUserRole={currentUser.role}
          demoMode
          onSelectObject={(id) => setSelectedPropertyId(id)}
          onCreateObject={() => undefined}
          onCreateProject={() => undefined}
          onLogout={handleLogout}
        />
      )}

      <main className={useLandlordConsole || useTenantAppShell ? 'min-h-screen' : 'pt-16 pb-20 md:pb-0'}>
        {currentUser.role === 'landlord' && currentTab === 'dashboard' && (
          <LandlordDashboard
            summary={landlordSummary}
            properties={landlordProperties}
            selectedProperty={selectedProperty}
            dailyForecast={propertyDaily}
            monthlyForecast={propertyMonthly}
            units={propertyUnits}
            selectedUnitId={selectedUnitId}
            onSelectProperty={setSelectedPropertyId}
            onSelectUnit={setSelectedUnitId}
            loading={landlordLoading}
            liveSession={landlordLiveSession}
            risk={landlordRisk}
            liveStatus={liveStatus}
            selectedScenario={selectedScenario}
            liveLoading={liveLoading}
            liveError={liveError}
            onStartLive={handleLandlordLiveStart}
            onStopLive={handleLandlordLiveStop}
            onScenarioChange={handleScenarioChange}
            onLogout={handleLogout}
          />
        )}

        {currentUser.role === 'tenant' && currentTab === 'dashboard' && (
          <TenantDashboard
            summary={tenantSummary}
            dailyForecast={tenantDaily}
            monthlyForecast={tenantMonthly}
            liveSession={tenantLiveSession}
            advice={tenantAdvice}
            prediction={tenantPrediction}
            liveStatus={liveStatus}
            selectedScenario={selectedScenario}
            liveLoading={liveLoading}
            liveError={liveError}
            onStartLive={handleTenantLiveStart}
            onStopLive={handleTenantLiveStop}
            onScenarioChange={handleScenarioChange}
            onLogout={handleLogout}
          />
        )}

        {currentUser.role === 'landlord' && currentTab === 'floorplan' && currentObject && (
          <Floorplan
            currentObject={currentObject}
            historyRecords={[]}
            historyDatasets={[]}
            optimizationFindings={[]}
          />
        )}

        {currentUser.role === 'landlord' && currentTab === 'alarms' && currentObject && (
          <Alarms
            currentObject={currentObject}
            historyRecords={[]}
            historyDatasets={[]}
            optimizationFindings={[]}
            sourceMode="FALLBACK"
          />
        )}

        {currentUser.role === 'landlord' && currentTab === 'esg' && currentObject && (
          <ESG
            currentObject={currentObject}
            historyRecords={[]}
            historyDatasets={[]}
            optimizationFindings={[]}
          />
        )}
      </main>

      {!useLandlordConsole && !useTenantAppShell && (
        <BottomNav currentTab={currentTab} setTab={setCurrentTab} visibleTabs={visibleTabs} />
      )}
    </div>
  );
}

function propertyToBuildingObject(property: PropertySummary): BuildingObject {
  const now = new Date().toISOString();
  return {
    id: property.property_id,
    name: property.display_name,
    addressOriginal: `${property.city}, ${property.zipcode}`,
    addressValidated: `${property.city}, ${property.zipcode}`,
    locationLabel: property.city,
    coordinates: null,
    validationStatus: 'REVIEW',
    solarPosition: null,
    weatherProfile: null,
    trustStatus: 'REVIEW',
    createdAt: now,
    updatedAt: now,
    source: 'import',
    isLocalDraft: false,
    type: `${property.energy_source} Property`,
    description: `Demo property ${property.display_name}`,
    historicalDatasetIds: [],
    historyStatus: 'REVIEW',
    historyCoverage: {
      start: null,
      end: null,
      recordCount: 0,
    },
    importMetadata: {
      propertyId: property.property_id,
      datasetId: `dataset-${property.property_id}`,
      derivedFromCsv: true,
      sourceFile: `${property.property_id}.csv`,
    },
  };
}

async function ignoreNotFound<T>(run: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof Error && /404|not found/i.test(error.message)) {
      return fallback;
    }
    throw error;
  }
}

function tenantToBuildingObject(summary: TenantSummary): BuildingObject {
  const now = new Date().toISOString();
  return {
    id: summary.unit_id,
    name: summary.unit_display_name,
    addressOriginal: `${summary.city}, ${summary.zipcode}`,
    addressValidated: `${summary.city}, ${summary.zipcode}`,
    locationLabel: summary.city,
    coordinates: null,
    validationStatus: 'REVIEW',
    solarPosition: null,
    weatherProfile: null,
    trustStatus: 'REVIEW',
    createdAt: now,
    updatedAt: now,
    source: 'import',
    isLocalDraft: false,
    type: `${summary.energy_source} Unit`,
    description: `Tenant unit ${summary.unit_display_name}`,
    historicalDatasetIds: [],
    historyStatus: 'REVIEW',
    historyCoverage: {
      start: null,
      end: null,
      recordCount: 0,
    },
    importMetadata: {
      propertyId: summary.property_id,
      datasetId: `dataset-${summary.property_id}`,
      derivedFromCsv: true,
      sourceFile: `${summary.property_id}.csv`,
    },
  };
}
