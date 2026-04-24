import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Bell,
  BarChart3,
  CheckCircle2,
  Droplets,
  Euro,
  Grid2X2,
  Home,
  Leaf,
  LogOut,
  MessageSquare,
  Play,
  Sparkles,
  Square,
  Thermometer,
  TrendingUp,
  Zap,
} from 'lucide-react';
import {
  AdviceCard,
  DailyForecastRow,
  LiveScenario,
  LiveStatusResponse,
  TenantLiveSession,
  TenantMonthlyRow,
  TenantPredictionResponse,
  TenantSummary,
} from '../services/api';
import { ApartmentBlueprint } from '../components/ApartmentBlueprint';

interface TenantDashboardProps {
  summary: TenantSummary | null;
  dailyForecast: DailyForecastRow[];
  monthlyForecast: TenantMonthlyRow[];
  liveSession: TenantLiveSession | null;
  advice: AdviceCard[];
  prediction: TenantPredictionResponse | null;
  liveStatus: LiveStatusResponse | null;
  selectedScenario: LiveScenario;
  liveLoading?: boolean;
  liveError?: string | null;
  onStartLive: () => void;
  onStopLive: () => void;
  onScenarioChange: (scenario: LiveScenario) => void;
  onLogout?: () => void;
}

interface TenantNotice {
  id: string;
  unit_id: string;
  tenant_name: string;
  property_name: string;
  title: string;
  message: string;
  created_at: string;
  status: 'sent';
}

type ChartWindow = 'week' | 'month';
type TenantAppTab = 'home' | 'insights' | 'rooms' | 'forecast';

interface ForecastTotals {
  predicted_energy_kwh: number;
  predicted_cost_eur: number;
  predicted_co2_kg: number;
}

const PROPERTY_NAMES = [
  'Axiom Heights',
  'Linden Court',
  'Harbor Point',
  'Cedar House',
  'Northgate Residences',
  'Riverside Lofts',
  'Willow Square',
  'Summit Gardens',
  'Aurora Park',
  'Maple Terrace',
  'Beacon Row',
  'Elm Quarter',
  'Parkside Court',
  'Atlas Residences',
  'Stonebridge Heights',
  'Skyline Court',
  'Juniper Place',
  'Westfield House',
  'Crown Terrace',
  'Oakline Residences',
];

export function TenantDashboard({
  summary,
  dailyForecast,
  monthlyForecast,
  liveSession,
  advice,
  prediction,
  liveLoading = false,
  liveError = null,
  onStartLive,
  onStopLive,
  onLogout,
}: TenantDashboardProps) {
  const [chartWindow, setChartWindow] = useState<ChartWindow>('week');
  const [activeTab, setActiveTab] = useState<TenantAppTab>('home');
  const [showNotifications, setShowNotifications] = useState(false);
  const predictionTotals = prediction?.prediction_totals ?? liveSession?.prediction_totals ?? null;
  const tenantNotices = useMemo(
    () => readTenantNoticesForUnit(summary?.unit_id),
    [summary?.unit_id]
  );
  const latestNotice = tenantNotices[0] ?? null;
  const noticeParts = latestNotice ? getNoticeParts(latestNotice) : null;
  const sevenDayTotals = useMemo(
    () => getSevenDayTotals(predictionTotals, dailyForecast),
    [predictionTotals, dailyForecast]
  );
  const monthTotals = useMemo(
    () => getMonthTotals(summary, monthlyForecast),
    [summary, monthlyForecast]
  );
  const usageStatus = getUsageStatusLabel(sevenDayTotals, monthTotals);
  const chartData = useMemo(
    () => buildChartRows(dailyForecast, chartWindow),
    [dailyForecast, chartWindow]
  );
  const weekRangeLabel = getDateRangeLabel(dailyForecast, 7);
  const projectionRangeLabel = getDateRangeLabel(dailyForecast, 30);
  const projectionMonthLabel = getMonthRangeLabel(dailyForecast);
  const blueprintLiveState = getBlueprintLiveState(liveSession, dailyForecast);
  const currentTemperature =
    liveSession?.live_state.room_temperature_c ??
    blueprintLiveState?.room_temperature_c ??
    dailyForecast.find((row) => row.room_temperature_c != null)?.room_temperature_c ??
    20;

  const tenantName = summary?.tenant_display_name ?? 'there';
  const cityLabel = summary ? `${summary.city} ${summary.zipcode}` : 'Loading apartment';
  const propertyLabel = getPropertyDisplayName(summary, latestNotice);
  const propertyNumberLabel = summary ? `Property ${String(summary.property_number).padStart(2, '0')}` : 'Your property';
  const liveActive = liveSession?.status === 'active';

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#f7f4f3] px-3 py-4 md:px-6 md:py-8">
      <div className="mx-auto max-w-[520px] overflow-hidden rounded-[28px] border border-surface-variant bg-[#fbf8f7] shadow-[0_18px_60px_rgba(0,0,0,0.12)]">
        <div className="bg-primary px-6 pb-5 pt-4 text-white">
          <div className="flex items-center justify-between gap-4">
            <TechemMark />
            <div className="flex items-center gap-2">
              <LivePill active={liveActive} compact />
              <button
                type="button"
                onClick={() => setShowNotifications((value) => !value)}
                className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/12 text-white transition hover:bg-white/18"
                aria-label="Open notifications"
              >
                <Bell size={18} />
                {latestNotice && (
                  <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-white ring-2 ring-primary" />
                )}
              </button>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-sm font-black">
                {formatInitials(tenantName)}
              </div>
            </div>
          </div>
          <div className="mt-5 text-[10px] font-black uppercase tracking-[0.24em] text-white/70">
            Tenant app
          </div>
          <h1 className="mt-1 text-2xl font-black leading-tight tracking-tight">
            Hi {tenantName}
          </h1>
          <div className="mt-2 text-sm font-bold text-white/80">
            {summary?.unit_display_name ?? 'Loading unit'} · {propertyLabel}
          </div>
          <div className="mt-1 text-xs font-medium text-white/65">
            {propertyNumberLabel} · {cityLabel}
          </div>

          {showNotifications && (
            <div className="mt-4 rounded-3xl border border-white/15 bg-white/10 p-4 backdrop-blur">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/70">
                    Notifications
                  </div>
                  <div className="mt-1 text-sm font-bold text-white">
                    {latestNotice ? 'Property manager update' : 'No new messages'}
                  </div>
                </div>
                {latestNotice && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('home');
                      setShowNotifications(false);
                    }}
                    className="rounded-full bg-white/14 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white"
                  >
                    View
                  </button>
                )}
              </div>

              {latestNotice && noticeParts ? (
                <div className="space-y-2 text-sm leading-6 text-white/88">
                  <div>{noticeParts.concern}</div>
                  {noticeParts.action && (
                    <div className="font-semibold text-white">{noticeParts.action}</div>
                  )}
                  <div className="text-xs font-bold text-white/65">
                    Sent {formatDateTime(latestNotice.created_at)}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-white/72">
                  Your landlord messages and urgent apartment notices will appear here.
                </div>
              )}
            </div>
          )}
        </div>

        <main className="space-y-4 px-4 py-4 pb-24">
          {activeTab === 'home' && (
            <>
              <section className="rounded-2xl border border-surface-variant bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold text-outline">{projectionMonthLabel || 'Month-end outlook'}</div>
                    <div className="mt-2 text-[10px] font-black uppercase tracking-[0.18em] text-primary">
                      Predicted month-end cost
                    </div>
                    <div className="mt-2 text-5xl font-black tracking-tight text-on-surface">
                      {formatCurrency(monthTotals.predicted_cost_eur)}
                    </div>
                  </div>
                  <StatusBadge label={usageStatus.label} tone={usageStatus.tone} compact />
                </div>
                <div className="mt-4 text-sm text-outline">
                  {projectionRangeLabel
                    ? `${projectionRangeLabel} · ${formatKwh(monthTotals.predicted_energy_kwh)} projected`
                    : `${formatKwh(monthTotals.predicted_energy_kwh)} projected`}
                </div>
              </section>

              {latestNotice && noticeParts && (
                <section className="rounded-2xl border border-primary/10 bg-primary/5 p-5 shadow-sm">
                  <div className="mb-4 flex items-center gap-3">
                    <MessageSquare size={18} className="text-primary" />
                    <div>
                      <div className="text-lg font-black text-on-surface">Message from your property manager</div>
                      <div className="text-sm text-outline">Sent {formatDateTime(latestNotice.created_at)}</div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <MessageBlock label="Concern" value={noticeParts.concern} />
                    {noticeParts.action && <MessageBlock label="Landlord suggestion" value={noticeParts.action} />}
                  </div>
                </section>
              )}

              <section className="grid grid-cols-2 gap-3">
                <HomeMiniCard label="CO2 projected" value={formatKg(monthTotals.predicted_co2_kg)} icon={<Leaf size={17} />} />
                <HomeMiniCard label="Last 7 days" value={formatKwh(sevenDayTotals.predicted_energy_kwh)} icon={<BarChart3 size={17} />} />
              </section>

              <section className="rounded-2xl border border-surface-variant bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xl font-black text-on-surface">This week forecast</div>
                    <div className="mt-1 text-sm leading-6 text-outline">
                      {weekRangeLabel
                        ? `Expected use for ${weekRangeLabel}.`
                        : 'Expected use for the next 7 days.'}
                    </div>
                  </div>
                  <TrendingUp size={18} className="text-primary" />
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2">
                  <TinyMetric label="Energy" value={formatKwh(sevenDayTotals.predicted_energy_kwh)} />
                  <TinyMetric label="Cost" value={formatCurrency(sevenDayTotals.predicted_cost_eur)} />
                  <TinyMetric label="CO2" value={formatKg(sevenDayTotals.predicted_co2_kg)} />
                </div>
              </section>

              <section className="rounded-2xl border border-surface-variant bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-lg font-black text-on-surface">Live apartment</div>
                    <div className="mt-1 text-sm text-outline">Tap LIVE to see today&apos;s values.</div>
                  </div>
                  <button
                    onClick={liveActive ? onStopLive : onStartLive}
                    disabled={liveLoading}
                    className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition-colors disabled:opacity-60 ${
                      liveActive
                        ? 'border border-primary bg-white text-primary'
                        : 'bg-primary text-white'
                    }`}
                  >
                    {liveActive ? <Square size={16} /> : <Play size={16} />}
                    {liveActive ? 'Stop' : 'LIVE'}
                  </button>
                </div>
                {liveError && (
                  <div className="mt-3 rounded-2xl border border-error/20 bg-error-container/20 px-4 py-3 text-sm text-error">
                    {liveError}
                  </div>
                )}
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <LiveValueCard icon={<Zap size={17} />} label="Used so far" value={formatKwh(liveSession?.live_state.live_consumption_so_far_kwh)} />
                  <LiveValueCard icon={<Thermometer size={17} />} label="Temperature" value={formatTemp(liveSession?.live_state.room_temperature_c)} />
                  <LiveValueCard icon={<Droplets size={17} />} label="Humidity" value={formatPercent(liveSession?.live_state.humidity_pct)} />
                  <LiveValueCard icon={<Bell size={17} />} label="Window risk" value={getWindowRiskLabel(liveSession?.live_state.window_open_risk)} />
                </div>
              </section>
            </>
          )}

          {activeTab === 'insights' && (
            <>
              <section className="rounded-2xl border border-primary/10 bg-primary/5 p-5 shadow-sm">
                <div className="flex gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-primary">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Model suggestion</div>
                    <div className="mt-2 text-xl font-black leading-tight text-on-surface">
                      {advice[0]?.title ?? 'No urgent action right now'}
                    </div>
                    <div className="mt-2 text-sm leading-6 text-on-surface-variant">
                      {advice[0]?.recommended_action || advice[0]?.message || 'Start LIVE to receive real-time apartment advice.'}
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-surface-variant bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-3">
                  <Thermometer size={18} className="text-primary" />
                  <div className="text-lg font-black text-on-surface">Adjust target temperature</div>
                </div>
                <TemperatureSavingsCalculator
                  currentTemp={currentTemperature}
                  monthTotals={monthTotals}
                />
              </section>

              <section className="rounded-2xl border border-surface-variant bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-3">
                  <CheckCircle2 size={18} className="text-primary" />
                  <div>
                    <div className="text-lg font-black text-on-surface">Model suggestions</div>
                    <div className="text-sm text-outline">Predictions, savings, and suggested actions for your apartment.</div>
                  </div>
                </div>
                <div className="space-y-3">
                  {advice.length > 0 ? (
                    advice.map((item, index) => (
                      <AdviceCardView key={`${item.title}-${index}`} item={item} />
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-surface-variant bg-background px-4 py-5 text-sm text-outline">
                      No urgent action right now. Start LIVE to get real-time advice.
                    </div>
                  )}
                </div>
              </section>
            </>
          )}

          {activeTab === 'rooms' && (
            <>
              <section className="px-1">
                <div className="text-sm font-bold text-outline">Room breakdown</div>
                <div className="text-3xl font-black tracking-tight text-on-surface">Your rooms</div>
                <div className="mt-2 text-sm leading-6 text-outline">
                  {propertyLabel} · Tap utility toggles to compare heating, electricity, and water estimates.
                </div>
              </section>

              {summary ? (
                <ApartmentBlueprint
                  roomCount={summary.room_count}
                  unitName={summary.unit_display_name}
                  tenantName={summary.tenant_display_name}
                  unitNumber={summary.unit_number}
                  livingSpaceM2={summary.living_space_m2}
                  totalEnergyKwh={sevenDayTotals.predicted_energy_kwh}
                  totalCostEur={sevenDayTotals.predicted_cost_eur}
                  totalCo2Kg={sevenDayTotals.predicted_co2_kg}
                  liveState={blueprintLiveState}
                />
              ) : (
                <div className="rounded-2xl border border-dashed border-surface-variant bg-background px-4 py-8 text-center text-sm text-outline">
                  Apartment room view will appear once tenant data is loaded.
                </div>
              )}

              <ConsumptionChecker
                rows={chartData}
                window={chartWindow}
                onWindowChange={setChartWindow}
                rangeLabel={chartWindow === 'week' ? weekRangeLabel : projectionRangeLabel}
              />
            </>
          )}

          {activeTab === 'forecast' && (
            <>
              <section className="rounded-2xl border border-surface-variant bg-white p-5 shadow-sm">
                <div className="text-sm font-bold text-outline">Forecast</div>
                <div className="mt-1 text-3xl font-black tracking-tight text-on-surface">Month-end outlook</div>
                <div className="mt-5 rounded-2xl bg-background p-5">
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-outline">Predicted month-end cost</div>
                  <div className="mt-2 text-5xl font-black tracking-tight text-on-surface">{formatCurrency(monthTotals.predicted_cost_eur)}</div>
                  <div className="mt-3 text-sm text-outline">{projectionRangeLabel || projectionMonthLabel}</div>
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <SmallMetric label="CO2 projected" value={formatKg(monthTotals.predicted_co2_kg)} />
                    <SmallMetric label="Energy projected" value={formatKwh(monthTotals.predicted_energy_kwh)} />
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-surface-variant bg-white shadow-sm">
                <div className="flex flex-col gap-4 border-b border-surface-variant p-5">
                  <div>
                    <div className="text-xl font-black text-on-surface">Daily usage</div>
                    <div className="mt-1 text-sm text-outline">Daily forecast for your apartment</div>
                  </div>
                  <RangeToggle value={chartWindow} onChange={setChartWindow} />
                </div>
                <div className="h-[280px] p-4">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 12, right: 12, bottom: 4, left: -18 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ececec" />
                        <XAxis dataKey="dayLabel" tick={{ fontSize: 12, fill: '#74777f', fontWeight: 700 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 12, fill: '#74777f', fontWeight: 700 }} axisLine={false} tickLine={false} width={42} />
                        <Tooltip content={<ForecastTooltip />} />
                        <Area type="monotone" dataKey="predicted_energy_kwh" stroke="#e30613" fill="#fee2e2" fillOpacity={0.55} strokeWidth={3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-surface-variant bg-background text-sm text-outline">
                      Forecast chart will appear once apartment data is loaded.
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-surface-variant bg-white p-5 shadow-sm">
                <div className="mb-4 text-lg font-black text-on-surface">Apartment details</div>
                <div className="grid grid-cols-1 gap-3">
                  <InfoCard label="Property" value={propertyLabel} />
                  <InfoCard label="City" value={cityLabel} />
                  <InfoCard label="Energy source" value={summary?.energy_source ?? '—'} />
                  <InfoCard label="Living space" value={summary ? `${summary.living_space_m2.toFixed(0)} m2` : '—'} />
                  <InfoCard label="Room count" value={summary?.room_count?.toString() ?? '—'} />
                </div>
              </section>

              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-surface-variant bg-white px-4 py-4 text-sm font-black uppercase tracking-[0.14em] text-on-surface shadow-sm transition hover:border-primary hover:text-primary"
                >
                  <LogOut size={17} />
                  Logout
                </button>
              )}
            </>
          )}
        </main>

        <TenantBottomNav activeTab={activeTab} onChange={setActiveTab} />
      </div>
    </div>
  );
}

function TechemMark() {
  return (
    <div className="inline-flex flex-col">
      <span className="text-2xl font-black leading-none tracking-tighter text-white">techem</span>
      <svg width="66" height="8" viewBox="0 0 66 8" fill="none" xmlns="http://www.w3.org/2000/svg" className="-mt-0.5">
        <path d="M3 2C16 7 50 7 63 2" stroke="white" strokeWidth="4" strokeLinecap="round" opacity="0.9" />
      </svg>
    </div>
  );
}

function HomeMiniCard({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="rounded-2xl border border-surface-variant bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2 text-outline">
        <span className="text-sm font-bold text-on-surface">{label}</span>
        <span className="text-primary">{icon}</span>
      </div>
      <div className="mt-8 text-3xl font-black tracking-tight text-on-surface">{value}</div>
    </div>
  );
}

function TinyMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-surface-variant bg-background p-3">
      <div className="text-[9px] font-black uppercase tracking-[0.14em] text-outline">{label}</div>
      <div className="mt-2 text-sm font-black text-on-surface">{value}</div>
    </div>
  );
}

function RangeToggle({ value, onChange }: { value: ChartWindow; onChange: (window: ChartWindow) => void }) {
  return (
    <div className="inline-flex w-fit rounded-2xl border border-surface-variant bg-background p-1">
      {(['week', 'month'] as const).map((window) => (
        <button
          key={window}
          onClick={() => onChange(window)}
          className={`rounded-xl px-4 py-2 text-sm font-black capitalize transition-colors ${
            value === window ? 'bg-primary text-white' : 'text-outline hover:text-on-surface'
          }`}
        >
          {window === 'week' ? '7 days' : '30 days'}
        </button>
      ))}
    </div>
  );
}

function TenantBottomNav({
  activeTab,
  onChange,
}: {
  activeTab: TenantAppTab;
  onChange: (tab: TenantAppTab) => void;
}) {
  const tabs: Array<{ tab: TenantAppTab; label: string; icon: ReactNode }> = [
    { tab: 'home', label: 'Home', icon: <Home size={20} /> },
    { tab: 'insights', label: 'Insights', icon: <Sparkles size={20} /> },
    { tab: 'rooms', label: 'Rooms', icon: <Grid2X2 size={20} /> },
    { tab: 'forecast', label: 'Forecast', icon: <BarChart3 size={20} /> },
  ];

  return (
    <nav className="sticky bottom-0 z-10 grid grid-cols-4 border-t border-surface-variant bg-white/95 px-2 py-2 backdrop-blur">
      {tabs.map((item) => (
        <button
          key={item.tab}
          onClick={() => onChange(item.tab)}
          className={`flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-black uppercase tracking-wide transition-colors ${
            activeTab === item.tab ? 'bg-primary/10 text-primary' : 'text-outline'
          }`}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </nav>
  );
}

function HeaderStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-surface-variant bg-background/70 p-4">
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-outline">{label}</div>
      <div className="mt-2 text-xl font-black text-on-surface">{value}</div>
    </div>
  );
}

function LivePill({ active, compact = false }: { active: boolean; compact?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full ${compact ? 'px-2.5 py-1 text-[10px]' : 'px-3 py-1 text-xs'} font-black uppercase tracking-wider ${
        active ? (compact ? 'bg-white text-primary' : 'bg-primary text-white') : 'bg-surface-variant text-outline'
      }`}
    >
      <span className={`h-2.5 w-2.5 rounded-full ${active ? `animate-pulse ${compact ? 'bg-primary' : 'bg-white'}` : 'bg-outline/60'}`} />
      {active ? 'LIVE' : 'Idle'}
    </span>
  );
}

function MessageBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
      <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-primary">{label}</div>
      <div className="text-sm leading-6 text-on-surface">{value}</div>
    </div>
  );
}

function StatusBadge({ label, tone, compact = false }: { label: string; tone: 'ok' | 'warn' | 'high'; compact?: boolean }) {
  const styles =
    tone === 'high'
      ? 'border-primary/30 bg-primary/10 text-primary'
      : tone === 'warn'
      ? 'border-[#f59e0b]/30 bg-[#f59e0b]/10 text-[#92400e]'
      : 'border-[#16a34a]/25 bg-[#16a34a]/10 text-[#166534]';

  return (
    <div className={`inline-flex w-fit items-center gap-2 rounded-full border ${compact ? 'px-2.5 py-1 text-[10px]' : 'px-3 py-1.5 text-xs'} font-black uppercase tracking-wider ${styles}`}>
      <span className="h-2 w-2 rounded-full bg-current" />
      {label}
    </div>
  );
}

function ForecastCard({
  icon,
  label,
  value,
  helper,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-surface-variant bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2 text-outline">
        {icon}
        <span className="text-[10px] font-black uppercase tracking-[0.18em]">{label}</span>
      </div>
      <div className="text-3xl font-black tracking-tight text-on-surface">{value}</div>
      <div className="mt-2 text-sm text-outline">{helper}</div>
    </div>
  );
}

function StrongMetric({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="font-black text-on-surface">{value}</div>
      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-outline">{label}</div>
    </div>
  );
}

function LiveValueCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-surface-variant bg-background/50 p-4">
      <div className="mb-3 flex items-center gap-2 text-outline">
        {icon}
        <span className="text-[10px] font-black uppercase tracking-[0.16em]">{label}</span>
      </div>
      <div className="text-xl font-black text-on-surface">{value}</div>
    </div>
  );
}

function AdviceCardView({ item }: { item: AdviceCard }) {
  const formatted = formatAdviceCard(item);

  return (
    <div className="rounded-2xl border border-surface-variant bg-background/50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-black text-on-surface">{formatted.title}</div>
          <div className="mt-2 text-sm leading-6 text-on-surface-variant">{formatted.message}</div>
        </div>
        {formatted.priority && (
          <div className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-primary">
            {formatted.priority}
          </div>
        )}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-outline sm:grid-cols-2">
        {formatted.savingsEur && <DetailLine label="Estimated saving" value={formatted.savingsEur} />}
        {formatted.savingsCo2 && <DetailLine label="CO2 saving" value={formatted.savingsCo2} />}
        {formatted.confidence && <DetailLine label="Confidence" value={formatted.confidence} />}
      </div>

      {(formatted.reason || formatted.evidence) && (
        <details className="mt-3 text-xs text-outline">
          <summary className="cursor-pointer font-bold text-on-surface-variant">More detail</summary>
          <div className="mt-2 space-y-1">
            {formatted.reason && <div>Reason: {formatted.reason}</div>}
            {formatted.evidence && <div>Evidence: {formatted.evidence}</div>}
          </div>
        </details>
      )}
    </div>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="font-bold text-on-surface-variant">{label}:</span> {value}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-surface-variant bg-background/50 p-4">
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-outline">
        {label}
      </div>
      <div className="mt-2 text-sm font-black text-on-surface">{value}</div>
    </div>
  );
}

function ConsumptionChecker({
  rows,
  window,
  onWindowChange,
  rangeLabel,
}: {
  rows: ReturnType<typeof buildChartRows>;
  window: ChartWindow;
  onWindowChange: (window: ChartWindow) => void;
  rangeLabel: string;
}) {
  const maxEnergy = Math.max(...rows.map((row) => row.predicted_energy_kwh || 0), 1);
  const total = sumForecastRows(rows);

  return (
    <section className="rounded-2xl border border-surface-variant bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-outline">
            <BarChart3 size={16} />
            Consumption checker
          </div>
          <div className="mt-1 text-2xl font-black tracking-tight text-on-surface">
            Your apartment usage
          </div>
          <div className="mt-1 text-sm text-outline">
            {rangeLabel || 'Choose a range to inspect apartment consumption.'}
          </div>
        </div>

        <div className="inline-flex w-fit rounded-2xl border border-surface-variant bg-background p-1">
          {(['week', 'month'] as const).map((option) => (
            <button
              key={option}
              onClick={() => onWindowChange(option)}
              className={`rounded-xl px-4 py-2 text-sm font-black capitalize transition-colors ${
                window === option ? 'bg-primary text-white' : 'text-outline hover:text-on-surface'
              }`}
            >
              {option === 'week' ? '7 days' : '30 days'}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="rounded-2xl border border-surface-variant bg-background/50 p-4">
          {rows.length > 0 ? (
            <div className="flex h-44 items-end gap-2">
              {rows.map((row, index) => (
                <div key={`${row.date}-${index}`} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                  <div
                    className={`w-full rounded-t-xl ${index === rows.length - 1 ? 'bg-primary' : 'bg-outline-variant'}`}
                    style={{ height: `${Math.max(12, (row.predicted_energy_kwh / maxEnergy) * 150)}px` }}
                    title={`${formatFullDate(row.date)}: ${formatKwh(row.predicted_energy_kwh)}`}
                  />
                  {(window === 'week' || index % 4 === 0 || index === rows.length - 1) && (
                    <div className="text-[10px] font-bold text-outline">{row.dayLabel}</div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-44 items-center justify-center text-sm text-outline">
              Usage rows will appear once forecast data is loaded.
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3">
          <SmallMetric label="Energy" value={formatKwh(total.predicted_energy_kwh)} />
          <SmallMetric label="Cost" value={formatCurrency(total.predicted_cost_eur)} />
          <SmallMetric label="CO2" value={formatKg(total.predicted_co2_kg)} />
        </div>
      </div>
    </section>
  );
}

function SmallMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-surface-variant bg-background/50 p-4">
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-outline">{label}</div>
      <div className="mt-2 text-xl font-black text-on-surface">{value}</div>
    </div>
  );
}

function TemperatureSavingsCalculator({
  currentTemp,
  monthTotals,
}: {
  currentTemp: number;
  monthTotals: ForecastTotals;
}) {
  const normalizedCurrent = clamp(Number.isFinite(currentTemp) ? currentTemp : 20, 16, 24);
  const [targetTemp, setTargetTemp] = useState(() =>
    clamp(Math.round((normalizedCurrent - 1) * 2) / 2, 16, 23)
  );
  const estimate = getSavingsEstimate(normalizedCurrent, targetTemp, monthTotals);

  return (
    <div className="space-y-4">
      <div className="rounded-[28px] bg-gradient-to-br from-primary via-[#c80812] to-[#8f020b] p-5 text-white shadow-[0_18px_40px_rgba(227,6,19,0.18)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xl font-black tracking-tight">Heating savings calculator</div>
            <div className="mt-2 text-sm leading-6 text-white/80">
              Lower the target temperature and preview a monthly savings estimate.
            </div>
          </div>
          <div className="rounded-full bg-white/14 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-white/90">
            Current: {normalizedCurrent.toFixed(1)} C
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="rounded-2xl bg-white/10 p-4">
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/70">
              Estimated savings
            </div>
            <div className="mt-2 text-4xl font-black tracking-tight">
              {formatCurrency(estimate.savingsEur)}
            </div>
            <div className="mt-1 text-sm text-white/75">per month</div>
          </div>
          <div className="rounded-2xl bg-white/10 p-4">
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/70">
              CO2 impact
            </div>
            <div className="mt-2 text-4xl font-black tracking-tight">
              {formatKg(estimate.savingsCo2)}
            </div>
            <div className="mt-1 text-sm text-white/75">lower emissions</div>
          </div>
        </div>

        <div className="mt-5 rounded-[24px] bg-white/10 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/70">
                Target temperature
              </div>
              <div className="mt-1 text-4xl font-black tracking-tight">
                {targetTemp.toFixed(1)} C
              </div>
            </div>
            <div className="text-right text-sm text-white/75">
              {estimate.deltaC > 0
                ? `${estimate.deltaC.toFixed(1)} C below current room temperature`
                : 'Match current room temperature'}
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setTargetTemp((value) => clamp(Math.round((value - 0.5) * 2) / 2, 16, 23))}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-white/14 text-2xl font-black text-white transition hover:bg-white/20"
              aria-label="Lower target temperature"
            >
              -
            </button>
            <input
              type="range"
              min={16}
              max={23}
              step={0.5}
              value={targetTemp}
              onChange={(event) => setTargetTemp(Number(event.target.value))}
              className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-black/25 accent-white"
            />
            <button
              type="button"
              onClick={() => setTargetTemp((value) => clamp(Math.round((value + 0.5) * 2) / 2, 16, 23))}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-white/14 text-2xl font-black text-white transition hover:bg-white/20"
              aria-label="Raise target temperature"
            >
              +
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-surface-variant bg-background/60 p-4">
        <div className="text-sm font-black text-on-surface">Confirm and simulate savings</div>
        <div className="mt-2 text-sm leading-6 text-outline">
          This calculator uses your current 30-day apartment forecast. A lower target temperature reduces expected energy, cost, and CO2 in the next month.
        </div>
      </div>
    </div>
  );
}

function ForecastTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;

  return (
    <div className="rounded-2xl border border-surface-variant bg-white p-4 shadow-lg">
      <div className="mb-2 text-sm font-black text-on-surface">{formatFullDate(row.date)}</div>
      <div className="space-y-1 text-xs text-outline">
        <div>Energy: {formatKwh(row.predicted_energy_kwh)}</div>
        <div>Cost: {formatCurrency(row.predicted_cost_eur)}</div>
        <div>CO2: {formatKg(row.predicted_co2_kg)}</div>
      </div>
    </div>
  );
}

function getSevenDayTotals(
  predictionTotals: TenantPredictionResponse['prediction_totals'] | null,
  dailyForecast: DailyForecastRow[]
): ForecastTotals {
  if (predictionTotals?.['7d']) return predictionTotals['7d'];
  return sumForecastRows(dailyForecast.slice(0, 7));
}

function getMonthTotals(
  summary: TenantSummary | null,
  monthlyForecast: TenantMonthlyRow[]
): ForecastTotals {
  if (summary) {
    return {
      predicted_energy_kwh: summary.predicted_energy_kwh,
      predicted_cost_eur: summary.predicted_cost_eur,
      predicted_co2_kg: summary.predicted_co2_kg,
    };
  }

  if (monthlyForecast.length > 0) {
    return sumForecastRows(monthlyForecast);
  }

  return {
    predicted_energy_kwh: 0,
    predicted_cost_eur: 0,
    predicted_co2_kg: 0,
  };
}

function sumForecastRows(rows: Array<Pick<ForecastTotals, 'predicted_energy_kwh' | 'predicted_cost_eur' | 'predicted_co2_kg'>>): ForecastTotals {
  return rows.reduce(
    (total, row) => ({
      predicted_energy_kwh: total.predicted_energy_kwh + (row.predicted_energy_kwh || 0),
      predicted_cost_eur: total.predicted_cost_eur + (row.predicted_cost_eur || 0),
      predicted_co2_kg: total.predicted_co2_kg + (row.predicted_co2_kg || 0),
    }),
    {
      predicted_energy_kwh: 0,
      predicted_cost_eur: 0,
      predicted_co2_kg: 0,
    }
  );
}

function getUsageStatusLabel(
  sevenDayTotals: ForecastTotals,
  monthTotals: ForecastTotals
): { label: 'On track' | 'Slightly high' | 'High usage expected'; tone: 'ok' | 'warn' | 'high'; helper: string } {
  if (!monthTotals.predicted_energy_kwh || !sevenDayTotals.predicted_energy_kwh) {
    return {
      label: 'On track',
      tone: 'ok',
      helper: 'Waiting for forecast data',
    };
  }

  const expectedSevenDayEnergy = (monthTotals.predicted_energy_kwh / 30) * 7;
  const ratio = sevenDayTotals.predicted_energy_kwh / expectedSevenDayEnergy;

  if (ratio >= 1.15) {
    return {
      label: 'High usage expected',
      tone: 'high',
      helper: 'Above your 30-day pace',
    };
  }

  if (ratio >= 1.05) {
    return {
      label: 'Slightly high',
      tone: 'warn',
      helper: 'A little above your 30-day pace',
    };
  }

  return {
    label: 'On track',
    tone: 'ok',
    helper: 'In line with your 30-day pace',
  };
}

function getWindowRiskLabel(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return '—';
  if (value >= 0.67) return 'High';
  if (value >= 0.34) return 'Medium';
  return 'Low';
}

function getSavingsEstimate(
  currentTemp: number,
  targetTemp: number,
  monthTotals: ForecastTotals
) {
  const deltaC = Math.max(0, currentTemp - targetTemp);
  const savingsRatio = clamp(deltaC * 0.06, 0, 0.24);
  return {
    deltaC,
    savingsRatio,
    savingsEur: monthTotals.predicted_cost_eur * savingsRatio,
    savingsCo2: monthTotals.predicted_co2_kg * savingsRatio,
    savingsEnergy: monthTotals.predicted_energy_kwh * savingsRatio,
  };
}

function formatAdviceCard(item: AdviceCard) {
  return {
    title: item.title,
    message: item.recommended_action || item.message,
    reason: item.reason,
    evidence: item.evidence,
    priority: item.priority ?? item.severity,
    confidence: item.confidence == null ? '' : formatConfidence(item.confidence),
    savingsEur: item.estimated_savings_eur == null ? '' : formatCurrency(item.estimated_savings_eur),
    savingsCo2: item.estimated_savings_co2_kg == null ? '' : formatKg(item.estimated_savings_co2_kg),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function buildChartRows(dailyForecast: DailyForecastRow[], chartWindow: ChartWindow) {
  const limit = chartWindow === 'week' ? 7 : 30;
  return dailyForecast.slice(0, limit).map((row) => ({
    ...row,
    dayLabel: formatDay(row.date),
  }));
}

function getPropertyDisplayName(summary: TenantSummary | null, notice: TenantNotice | null) {
  if (!summary) return 'Your property';
  const extended = summary as TenantSummary & {
    property_display_name?: string;
    property_name?: string;
    display_name?: string;
  };
  return (
    extended.property_display_name ||
    extended.property_name ||
    notice?.property_name ||
    PROPERTY_NAMES[summary.property_number - 1] ||
    `Property ${String(summary.property_number).padStart(2, '0')}`
  );
}

function getDateRangeLabel(rows: DailyForecastRow[], days: number) {
  if (!rows.length) return '';
  const rangeRows = rows.slice(0, days);
  const start = parseDate(rangeRows[0]?.date);
  const end = parseDate(rangeRows[rangeRows.length - 1]?.date);
  if (!start || !end) return '';

  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  const startLabel = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: sameMonth ? undefined : 'short',
  }).format(start);
  const endLabel = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(end);

  return `${startLabel} - ${endLabel}`;
}

function getMonthRangeLabel(rows: DailyForecastRow[]) {
  if (!rows.length) return '';
  const start = parseDate(rows[0]?.date);
  const end = parseDate(rows[Math.min(29, rows.length - 1)]?.date);
  if (!start || !end) return '';
  const formatter = new Intl.DateTimeFormat('en-GB', {
    month: 'long',
    year: 'numeric',
  });
  const startLabel = formatter.format(start);
  const endLabel = formatter.format(end);
  return startLabel === endLabel ? startLabel : `${startLabel} - ${endLabel}`;
}

function getBlueprintLiveState(liveSession: TenantLiveSession | null, dailyForecast: DailyForecastRow[]) {
  if (liveSession) {
    return {
      room_temperature_c: liveSession.live_state.room_temperature_c,
      heater_setpoint_c: liveSession.live_state.heater_setpoint_c,
      radiator_valve_open_pct: liveSession.live_state.radiator_valve_open_pct,
      humidity_pct: liveSession.live_state.humidity_pct,
      occupancy_proxy: liveSession.live_state.occupancy_proxy,
      window_open_risk: liveSession.live_state.window_open_risk,
      heating_mode: liveSession.live_state.heating_mode,
    };
  }

  const firstRow = dailyForecast.find((row) => row.room_temperature_c != null || row.heating_mode);
  if (!firstRow) return undefined;

  return {
    room_temperature_c: firstRow.room_temperature_c ?? undefined,
    heater_setpoint_c: firstRow.heater_setpoint_c ?? undefined,
    radiator_valve_open_pct: firstRow.radiator_valve_open_pct ?? undefined,
    humidity_pct: firstRow.humidity_pct ?? undefined,
    occupancy_proxy: firstRow.occupancy_proxy ?? undefined,
    window_open_risk: firstRow.window_open_risk ?? undefined,
    heating_mode: firstRow.heating_mode ?? undefined,
  };
}

function parseDate(date?: string) {
  if (!date) return null;
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getNoticeParts(notice: TenantNotice) {
  const message = notice.message.replace(/^Hi [^,]+,\s*/i, '').trim();
  const actionIndex = message.search(/\bPlease\b/i);
  const savingsIndex = message.search(/\bEstimated saving\b/i);

  if (actionIndex === -1) {
    return {
      concern: message,
      action: '',
    };
  }

  const concern = message.slice(0, actionIndex).trim();
  const actionEnd = savingsIndex > actionIndex ? savingsIndex : message.length;
  const action = message.slice(actionIndex, actionEnd).trim();

  return {
    concern,
    action,
  };
}

function formatTemp(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${value.toFixed(1)} °C`;
}

function formatPercent(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${Math.round(value)}%`;
}

function formatMode(value?: string | null) {
  if (!value) return '—';
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatConfidence(value: number | string) {
  if (typeof value === 'number') {
    return value <= 1 ? `${Math.round(value * 100)}%` : `${Math.round(value)}%`;
  }
  return value;
}

function formatInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'T';
}

function formatCurrency(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatKwh(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${Math.round(value).toLocaleString('de-DE')} kWh`;
}

function formatKg(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${Math.round(value).toLocaleString('de-DE')} kg`;
}

function formatDay(date: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
  }).format(new Date(date));
}

function formatFullDate(date: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

function readTenantNoticesForUnit(unitId?: string): TenantNotice[] {
  if (!unitId || typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem('techem_demo_tenant_notices');
    if (!raw) return [];
    const notices = JSON.parse(raw) as Record<string, TenantNotice>;
    return Object.values(notices)
      .filter((notice) => notice.unit_id === unitId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  } catch {
    return [];
  }
}

function formatDateTime(date: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}
