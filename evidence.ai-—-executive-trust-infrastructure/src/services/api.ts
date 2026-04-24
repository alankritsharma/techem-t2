const API_BASE =
  (import.meta as any).env?.VITE_API_BASE ||
  (typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:8000`
    : 'http://127.0.0.1:8000');

export type DemoRole = 'landlord' | 'tenant';

export interface DemoUser {
  user_id: string;
  role: DemoRole;
  display_name: string;
  username: string;
  email: string;
  landlord_id?: string;
  property_ids?: string[];
  tenant_id?: string;
  property_id?: string;
  unit_id?: string;
  demo_token_hint?: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: 'bearer';
  user: DemoUser;
}

export interface LandlordSummary {
  landlord_id: string;
  predicted_energy_kwh: number;
  predicted_cost_eur: number;
  predicted_co2_kg: number;
  property_count: number;
  unit_count: number;
  display_name: string;
  company_name?: string;
  username: string;
  email: string;
  property_ids: string[];
  as_of_date: string;
}

export interface PropertySummary {
  property_id: string;
  predicted_energy_kwh: number;
  predicted_cost_eur: number;
  predicted_co2_kg: number;
  property_number: number;
  display_name: string;
  city: string;
  zipcode: string;
  energy_source: string;
  living_space_m2: number;
  unit_count: number;
  room_count: number;
  landlord_id: string;
  owner_display_name?: string;
  owner_company_name?: string;
  as_of_date: string;
}

export interface DailyForecastRow {
  date: string;
  property_id: string;
  unit_id: string;
  unit_number: number;
  zipcode: string;
  city: string;
  energy_source: string;
  living_space_m2: number;
  outside_temp_c: number;
  room_count: number;
  emission_factor_g_per_kwh: number;
  series_id: string;
  is_missing_observation: number;
  predicted_energy_kwh: number;
  price_eur_per_kwh: number;
  predicted_cost_eur: number;
  predicted_co2_kg: number;
  predicted_energy_per_m2_kwh: number | null;
  room_temperature_c?: number | null;
  heater_setpoint_c?: number | null;
  radiator_valve_open_pct?: number | null;
  humidity_pct?: number | null;
  occupancy_proxy?: number | null;
  window_open_risk?: number | null;
  heating_mode?: string | null;
}

export interface MonthlyPropertyRow {
  property_id: string;
  month: string;
  predicted_energy_kwh: number;
  predicted_cost_eur: number;
  predicted_co2_kg: number;
}

export interface TenantSummary {
  property_id: string;
  unit_id: string;
  predicted_energy_kwh: number;
  predicted_cost_eur: number;
  predicted_co2_kg: number;
  property_number: number;
  unit_display_name: string;
  unit_number: number;
  city: string;
  zipcode: string;
  energy_source: string;
  living_space_m2: number;
  room_count: number;
  tenant_id: string;
  landlord_id: string;
  as_of_date: string;
  tenant_display_name: string;
  tenant_username: string;
  tenant_email: string;
}

export type PropertyUnitSummary = TenantSummary;

export interface TenantMonthlyRow {
  tenant_id: string;
  property_id: string;
  unit_id: string;
  landlord_id: string;
  month: string;
  predicted_energy_kwh: number;
  predicted_cost_eur: number;
  predicted_co2_kg: number;
}

export interface PredictionWindowTotals {
  predicted_energy_kwh: number;
  predicted_cost_eur: number;
  predicted_co2_kg: number;
}

export interface PredictionTotals {
  '2d': PredictionWindowTotals;
  '3d': PredictionWindowTotals;
  '7d': PredictionWindowTotals;
}

export interface UnitRegistry {
  unit_id: string;
  property_id: string;
  property_number: number;
  display_name: string;
  unit_number: number;
  city: string;
  zipcode: string;
  energy_source: string;
  living_space_m2: number;
  room_count: number;
  tenant_id: string;
  landlord_id: string;
}

export interface LiveStatusResponse {
  status: string;
  scenario: LiveScenario;
  active_tenant_sessions: number;
  active_landlord_sessions: number;
  supported_scenarios: LiveScenario[];
  source: string;
}

export type LiveScenario = 'normal' | 'cold_snap' | 'high_usage' | 'eco_mode';

export interface TenantLiveState {
  live_consumption_so_far_kwh: number;
  projected_end_of_day_kwh: number;
  room_temperature_c: number;
  heater_setpoint_c: number;
  radiator_valve_open_pct: number;
  humidity_pct: number;
  occupancy_proxy: number;
  window_open_risk: number;
  heating_mode: string;
}

export interface TenantLiveSession {
  status: string;
  scope: 'tenant';
  scenario: LiveScenario;
  tenant_id: string;
  unit_id: string;
  property_id: string;
  simulated_progress_pct: number;
  baseline: {
    date: string;
    predicted_energy_kwh: number;
    predicted_cost_eur: number;
    predicted_co2_kg: number;
  };
  live_state: TenantLiveState;
  unit_registry: UnitRegistry;
  prediction_totals: PredictionTotals;
  source: string;
}

export interface AdviceCard {
  priority?: string;
  severity?: string;
  title: string;
  message: string;
  reason?: string;
  affected_property_id?: string;
  affected_unit_id?: string;
  evidence?: string;
  confidence?: string | number;
  recommended_action?: string;
  estimated_savings_eur?: number;
  estimated_savings_co2_kg?: number;
}

export interface TenantAdviceResponse {
  tenant_id: string;
  scenario: LiveScenario;
  advice: AdviceCard[];
  source: string;
}

export interface TenantPredictionResponse {
  tenant_id: string;
  unit_id: string;
  scenario: LiveScenario;
  prediction_totals: PredictionTotals;
  source: string;
}

export interface PropertyLiveRollup {
  property_id: string;
  display_name: string;
  city: string;
  baseline_day_kwh: number;
  live_consumption_so_far_kwh: number;
  projected_end_of_day_kwh: number;
  prediction_totals: PredictionTotals;
}

export interface LandlordUnitLiveRollup {
  property_id: string;
  property_display_name: string;
  city: string;
  tenant_id: string;
  unit_id: string;
  unit_display_name: string;
  unit_number: number;
  tenant_display_name: string;
  baseline_day_kwh: number;
  live_consumption_so_far_kwh: number;
  projected_end_of_day_kwh: number;
  prediction_totals: PredictionTotals;
  live_state: {
    room_temperature_c: number;
    heater_setpoint_c: number;
    radiator_valve_open_pct: number;
    humidity_pct: number;
    occupancy_proxy: number;
    window_open_risk: number;
    heating_mode: string;
  };
}

export interface RiskCard {
  property_id?: string;
  unit_id?: string;
  severity?: string;
  title?: string;
  message: string;
  evidence?: string;
  recommended_action?: string;
}

export interface LandlordLiveSession {
  status: string;
  scope: 'landlord';
  scenario: LiveScenario;
  landlord_id: string;
  property_ids: string[];
  live_state: {
    portfolio_baseline_day_kwh: number;
    portfolio_live_consumption_so_far_kwh: number;
    portfolio_projected_end_of_day_kwh: number;
    risk_flags: RiskCard[];
  };
  property_live: PropertyLiveRollup[];
  unit_live: LandlordUnitLiveRollup[];
  source: string;
}

export interface LandlordRiskResponse {
  landlord_id: string;
  scenario: LiveScenario;
  risk_level: string;
  portfolio_baseline_day_kwh: number;
  portfolio_projected_end_of_day_kwh: number;
  risk_flags: RiskCard[];
  property_rollup: PropertyLiveRollup[];
  source: string;
}

export interface LiveStopResponse {
  status: string;
  scope: 'tenant' | 'landlord';
  source: string;
  had_active_session: boolean;
}

export interface LiveScenarioResponse {
  status: string;
  scenario: LiveScenario;
  updated_by: string;
  active_tenant_sessions: number;
  active_landlord_sessions: number;
  source: string;
}

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let detail = `Request failed: ${response.status}`;
    try {
      const errorBody = await response.json();
      detail = errorBody?.detail || detail;
    } catch {
      // Ignore JSON parse failures for error bodies.
    }
    throw new Error(detail);
  }

  return response.json();
}

export const api = {
  baseUrl: API_BASE,
  login(username: string, password: string) {
    return request<LoginResponse>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      }
    );
  },
  me(token: string) {
    return request<DemoUser>('/auth/me', {}, token);
  },
  landlordDashboard(token: string) {
    return request<LandlordSummary>('/landlord/dashboard', {}, token);
  },
  landlordProperties(token: string) {
    return request<PropertySummary[]>('/landlord/properties', {}, token);
  },
  propertyDetail(propertyId: string, token: string) {
    return request<PropertySummary>(`/properties/${propertyId}`, {}, token);
  },
  propertyDaily(propertyId: string, token: string) {
    return request<DailyForecastRow[]>(`/properties/${propertyId}/daily`, {}, token);
  },
  propertyMonthly(propertyId: string, token: string) {
    return request<MonthlyPropertyRow[]>(`/properties/${propertyId}/monthly`, {}, token);
  },
  propertyUnits(propertyId: string, token: string) {
    return request<PropertyUnitSummary[]>(`/properties/${propertyId}/units`, {}, token);
  },
  tenantDashboard(token: string) {
    return request<TenantSummary>('/tenant/dashboard', {}, token);
  },
  tenantDaily(token: string) {
    return request<DailyForecastRow[]>('/tenant/daily', {}, token);
  },
  tenantMonthly(token: string) {
    return request<TenantMonthlyRow[]>('/tenant/monthly', {}, token);
  },
  liveStatus() {
    return request<LiveStatusResponse>('/live/status');
  },
  tenantLiveStart(token: string) {
    return request<TenantLiveSession>('/tenant/live/start', { method: 'POST' }, token);
  },
  tenantLive(token: string) {
    return request<TenantLiveSession>('/tenant/live', {}, token);
  },
  tenantLiveStop(token: string) {
    return request<LiveStopResponse>('/tenant/live/stop', { method: 'POST' }, token);
  },
  tenantAdvice(token: string) {
    return request<TenantAdviceResponse>('/tenant/advice', {}, token);
  },
  tenantPrediction(token: string) {
    return request<TenantPredictionResponse>('/tenant/prediction', {}, token);
  },
  landlordLiveStart(token: string) {
    return request<LandlordLiveSession>('/landlord/live/start', { method: 'POST' }, token);
  },
  landlordLive(token: string) {
    return request<LandlordLiveSession>('/landlord/live', {}, token);
  },
  landlordLiveStop(token: string) {
    return request<LiveStopResponse>('/landlord/live/stop', { method: 'POST' }, token);
  },
  landlordRisk(token: string) {
    return request<LandlordRiskResponse>('/landlord/risk', {}, token);
  },
  liveScenario(scenario: LiveScenario, token: string) {
    return request<LiveScenarioResponse>(
      '/live/scenario',
      {
        method: 'POST',
        body: JSON.stringify({ scenario }),
      },
      token
    );
  },
};
