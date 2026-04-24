import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Bell,
  Bolt,
  Building2,
  CalendarDays,
  ChevronDown,
  ClipboardCheck,
  Droplets,
  Euro,
  Flame,
  Gauge,
  HelpCircle,
  Home,
  LayoutDashboard,
  Leaf,
  LogOut,
  ShieldAlert,
  Send,
  Star,
  Thermometer,
  User,
  Wrench,
  X,
} from 'lucide-react';
import {
  DailyForecastRow,
  LandlordLiveSession,
  LandlordRiskResponse,
  LandlordSummary,
  LiveScenario,
  LiveStatusResponse,
  MonthlyPropertyRow,
  PropertySummary,
  PropertyUnitSummary,
} from '../services/api';
import { ApartmentBlueprint } from '../components/ApartmentBlueprint';

type UtilityType = 'heating' | 'electricity' | 'water';
type LandlordView = 'dashboard' | 'properties' | 'property' | 'units' | 'unit' | 'live' | 'actions';
type UnitRiskFilter = 'all' | 'high' | 'attention' | 'stable';
type RoomStatus = 'very-high' | 'high' | 'medium' | 'low';
type RoomComparisonRange = '7d' | '30d' | 'previous';

interface LandlordDashboardProps {
  summary: LandlordSummary | null;
  properties: PropertySummary[];
  selectedProperty: PropertySummary | null;
  dailyForecast: DailyForecastRow[];
  monthlyForecast: MonthlyPropertyRow[];
  units: PropertyUnitSummary[];
  selectedUnitId: string;
  onSelectProperty: (propertyId: string) => void;
  onSelectUnit: (unitId: string) => void;
  loading?: boolean;
  liveSession: LandlordLiveSession | null;
  risk: LandlordRiskResponse | null;
  liveStatus: LiveStatusResponse | null;
  selectedScenario: LiveScenario;
  liveLoading?: boolean;
  liveError?: string | null;
  onStartLive: () => void;
  onStopLive: () => void;
  onScenarioChange: (scenario: LiveScenario) => void;
  onLogout?: () => void;
}

interface ForecastTotals {
  predicted_energy_kwh: number;
  predicted_cost_eur: number;
  predicted_co2_kg: number;
}

interface UnitForecastRow extends PropertyUnitSummary {
  sevenDay: ForecastTotals;
  thirtyDay: ForecastTotals;
  share_pct: number;
  cost_share_pct: number;
  co2_share_pct: number;
  risk_label: string;
  avg_room_temperature_c: number | null;
  avg_humidity_pct: number | null;
  avg_valve_open_pct: number | null;
  avg_window_open_risk: number | null;
}

interface RoomBreakdownItem {
  room: string;
  value: number;
  temperature_c: number;
  share_pct: number;
  status: RoomStatus;
  note: string;
}

interface Recommendation {
  title: string;
  context: string;
  message: string;
  priority: 'High' | 'Medium' | 'Low';
  savings_eur: [number, number];
  savings_co2_kg: [number, number];
  icon: ReactNode;
}

interface UnitEvidence {
  peak_day: DailyForecastRow | null;
  peak_day_index: number;
  peak_week_index: number;
  peak_week: ForecastTotals;
  average_day_kwh: number;
  daily_delta_pct: number;
  room_driver: RoomBreakdownItem | null;
  signals: string[];
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

export function LandlordDashboard({
  summary,
  properties,
  selectedProperty,
  dailyForecast,
  units,
  selectedUnitId,
  onSelectProperty,
  onSelectUnit,
  loading = false,
  liveSession,
  risk,
  liveStatus,
  selectedScenario,
  liveLoading = false,
  liveError = null,
  onStartLive,
  onStopLive,
  onScenarioChange,
  onLogout,
}: LandlordDashboardProps) {
  const [activeView, setActiveView] = useState<LandlordView>('unit');
  const [utilityType, setUtilityType] = useState<UtilityType>('heating');
  const [roomComparisonRange, setRoomComparisonRange] = useState<RoomComparisonRange>('7d');
  const [unitRiskFilter, setUnitRiskFilter] = useState<UnitRiskFilter>('all');
  const [unitInsightPanel, setUnitInsightPanel] = useState<'why' | 'evidence' | null>(null);
  const [sentNoticeByUnit, setSentNoticeByUnit] = useState<Record<string, TenantNotice>>(() =>
    readTenantNoticeMap()
  );

  const rankedProperties = useMemo(
    () => [...properties].sort((a, b) => b.predicted_cost_eur - a.predicted_cost_eur),
    [properties]
  );
  const propertyDailySeries = useMemo(() => aggregateDaily(dailyForecast), [dailyForecast]);
  const propertyTotals = useMemo(
    () => ({
      '7d': sumDailyWindow(propertyDailySeries, 7),
      '30d': sumDailyWindow(propertyDailySeries, 30),
    }),
    [propertyDailySeries]
  );
  const unitRows = useMemo(() => buildUnitRows(units, dailyForecast), [units, dailyForecast]);
  const filteredUnitRows = useMemo(
    () => filterUnitRows(unitRows, unitRiskFilter),
    [unitRows, unitRiskFilter]
  );
  const selectedUnit =
    unitRows.find((unit) => unit.unit_id === selectedUnitId) ??
    filteredUnitRows[0] ??
    unitRows[0] ??
    null;
  const liveProgress = useMemo(() => {
    const projected = liveSession?.live_state.portfolio_projected_end_of_day_kwh ?? 0;
    const soFar = liveSession?.live_state.portfolio_live_consumption_so_far_kwh;
    if (typeof soFar === 'number' && Number.isFinite(soFar) && projected > 0) {
      return clampLiveValue(soFar / projected, 0.18, 0.82);
    }
    return fallbackLiveProgress(selectedScenario);
  }, [
    liveSession?.live_state.portfolio_live_consumption_so_far_kwh,
    liveSession?.live_state.portfolio_projected_end_of_day_kwh,
    selectedScenario,
  ]);
  const livePropertyRows = useMemo(
    () =>
      (liveSession?.property_live ?? []).map((item) => ({
        ...item,
        live_consumption_so_far_kwh:
          typeof item.live_consumption_so_far_kwh === 'number' && Number.isFinite(item.live_consumption_so_far_kwh)
            ? item.live_consumption_so_far_kwh
            : roundLiveValue((item.projected_end_of_day_kwh ?? 0) * liveProgress),
      })),
    [liveSession?.property_live, liveProgress]
  );
  const selectedPropertyLive = livePropertyRows.find(
    (item) => item.property_id === selectedProperty?.property_id
  );
  const livePortfolioSevenDay = useMemo(
    () =>
      livePropertyRows.reduce(
        (total, item) => total + (item.prediction_totals?.['7d']?.predicted_energy_kwh ?? 0),
        0
      ),
    [livePropertyRows]
  );
  const livePropertyId = selectedProperty?.property_id ?? livePropertyRows[0]?.property_id ?? '';
  const fallbackUnitLiveRows = useMemo(
    () =>
      selectedProperty && livePropertyId === selectedProperty.property_id
        ? buildFallbackUnitLiveRows(unitRows, dailyForecast, selectedProperty, selectedScenario, liveProgress)
        : [],
    [dailyForecast, liveProgress, livePropertyId, selectedProperty, selectedScenario, unitRows]
  );
  const liveUnitRows = useMemo(
    () =>
      ((liveSession?.unit_live ?? []).length
        ? (liveSession?.unit_live ?? []).map((item) => ({
            ...item,
            live_consumption_so_far_kwh:
              typeof item.live_consumption_so_far_kwh === 'number' && Number.isFinite(item.live_consumption_so_far_kwh)
                ? item.live_consumption_so_far_kwh
                : roundLiveValue((item.projected_end_of_day_kwh ?? 0) * liveProgress),
          }))
        : fallbackUnitLiveRows
      ).filter((item) => (livePropertyId ? item.property_id === livePropertyId : true)),
    [fallbackUnitLiveRows, liveProgress, livePropertyId, liveSession?.unit_live]
  );
  const selectedLiveUnit =
    liveUnitRows.find((item) => item.unit_id === selectedUnitId) ??
    liveUnitRows[0] ??
    null;
  const relevantRiskCards = (risk?.risk_flags ?? []).filter(
    (item) =>
      !selectedProperty ||
      !item.property_id ||
      item.property_id === selectedProperty.property_id ||
      item.unit_id === selectedUnit?.unit_id
  );
  const roomBreakdown = selectedUnit ? buildRoomBreakdown(selectedUnit, utilityType, roomComparisonRange) : [];
  const displayedRoomCount = roomBreakdown.length;
  const selectedUnitForecastRows = useMemo(
    () =>
      selectedUnit
        ? dailyForecast
            .filter((row) => row.unit_id === selectedUnit.unit_id)
            .sort((a, b) => a.date.localeCompare(b.date))
        : [],
    [dailyForecast, selectedUnit?.unit_id]
  );
  const unitEvidence = selectedUnit
    ? buildUnitEvidence(selectedUnit, selectedUnitForecastRows, roomBreakdown)
    : null;
  const recommendations = selectedUnit ? buildRecommendations(selectedUnit, roomBreakdown, utilityType, selectedProperty) : [];
  const whyHigh = selectedUnit ? buildWhyHigh(selectedUnit, roomBreakdown, utilityType) : [];
  const savingsRange = selectedUnit ? estimateSavingsRange(selectedUnit) : [0, 0] as [number, number];
  const tenantNoticeDraft =
    selectedUnit && unitEvidence
      ? buildTenantNoticeDraft(selectedUnit, selectedProperty, unitEvidence, recommendations)
      : '';
  const sentNotice = selectedUnit ? sentNoticeByUnit[selectedUnit.unit_id] : null;
  const selectedPropertyRank = selectedProperty
    ? rankedProperties.findIndex((property) => property.property_id === selectedProperty.property_id) + 1
    : 0;

  function chooseProperty(propertyId: string) {
    onSelectProperty(propertyId);
    setActiveView('units');
  }

  function chooseUnit(unitId: string) {
    onSelectUnit(unitId);
    setActiveView('unit');
    setUnitInsightPanel(null);
  }

  function syncLiveProperty(propertyId: string) {
    onSelectProperty(propertyId);
  }

  function syncLiveUnit(unitId: string) {
    onSelectUnit(unitId);
  }

  function sendTenantNotice() {
    if (!selectedUnit || !tenantNoticeDraft) return;
    const notice: TenantNotice = {
      id: `notice-${selectedUnit.unit_id}-${Date.now()}`,
      unit_id: selectedUnit.unit_id,
      tenant_name: selectedUnit.tenant_display_name,
      property_name: selectedProperty?.display_name ?? selectedUnit.property_id,
      title: `Energy forecast notice for ${selectedUnit.unit_display_name}`,
      message: tenantNoticeDraft,
      created_at: new Date().toISOString(),
      status: 'sent',
    };
    const next = { ...sentNoticeByUnit, [selectedUnit.unit_id]: notice };
    setSentNoticeByUnit(next);
    writeTenantNoticeMap(next);
  }

  const content =
    activeView === 'dashboard'
      ? renderPortfolioOverview()
      : activeView === 'properties'
      ? renderProperties()
      : activeView === 'property'
      ? renderPropertyOverview()
      : activeView === 'units'
      ? renderUnits()
      : activeView === 'live'
      ? renderLiveMonitor()
      : activeView === 'actions'
      ? renderActions()
      : renderSelectedUnit();

  return (
    <div className="min-h-screen bg-[#f8fafc] text-on-surface lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
      <LandlordSidebar
        summary={summary}
        selectedProperty={selectedProperty}
        activeView={activeView}
        setActiveView={setActiveView}
        onLogout={onLogout}
      />

      <div className="min-w-0">
        <LandlordTopbar
          summary={summary}
          selectedProperty={selectedProperty}
          selectedUnit={selectedUnit}
          activeView={activeView}
          liveActive={liveSession?.status === 'active'}
        />
        <main className="px-4 py-5 md:px-7 md:py-6">
          {content}
        </main>
      </div>
    </div>
  );

  function renderPortfolioOverview() {
    return (
      <div className="space-y-5">
        <PageHeading
          eyebrow="Portfolio overview"
          title={`Hi ${summary?.display_name ?? 'there'}`}
          subtitle={
            summary
              ? `${summary.company_name ?? 'Your portfolio'} covers ${summary.property_count} properties and ${summary.unit_count} flats.`
              : 'Loading portfolio forecast.'
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard icon={<Flame size={20} />} label="Energy 30d" value={formatKwh(summary?.predicted_energy_kwh)} detail="Portfolio forecast" tone="orange" />
          <KpiCard icon={<Euro size={20} />} label="Cost 30d" value={formatCurrency(summary?.predicted_cost_eur)} detail="Expected spend" tone="red" />
          <KpiCard icon={<Leaf size={20} />} label="CO2 30d" value={formatKg(summary?.predicted_co2_kg)} detail="Forecast emissions" tone="green" />
          <KpiCard icon={<Building2 size={20} />} label="Assigned properties" value={summary?.property_count ?? properties.length} detail={`${summary?.unit_count ?? unitRows.length} flats`} tone="blue" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <Panel className="xl:col-span-2">
            <PanelHeader title="Highest cost properties" subtitle="Sorted by 30-day forecast cost" />
            <div className="divide-y divide-surface-variant">
              {rankedProperties.slice(0, 6).map((property, index) => (
                <button
                  key={property.property_id}
                  onClick={() => chooseProperty(property.property_id)}
                  className="w-full px-4 py-3 text-left hover:bg-background transition-colors"
                >
                  <PropertyRow property={property} rank={index + 1} active={property.property_id === selectedProperty?.property_id} />
                </button>
              ))}
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Current focus" subtitle="Selected building and flat" />
            <div className="p-4 space-y-3">
              <MiniStat label="Property" value={selectedProperty?.display_name ?? '-'} />
              <MiniStat label="Property rank" value={selectedPropertyRank ? `#${selectedPropertyRank}` : '-'} />
              <MiniStat label="Selected flat" value={selectedUnit ? unitTitle(selectedUnit) : '-'} />
            </div>
          </Panel>
        </div>
      </div>
    );
  }

  function renderProperties() {
    return (
      <div className="space-y-5">
        <PageHeading
          eyebrow="Assigned properties"
          title="Properties"
          subtitle="Select a property to inspect flats, forecast, live risk, and actions."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {rankedProperties.map((property, index) => (
            <button
              key={property.property_id}
              onClick={() => chooseProperty(property.property_id)}
              className={`text-left rounded-xl border bg-white p-4 shadow-sm transition-colors ${
                property.property_id === selectedProperty?.property_id
                  ? 'border-primary'
                  : 'border-surface-variant hover:border-primary/40'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-primary">Property rank #{index + 1}</div>
                  <div className="mt-1 text-lg font-black text-on-surface">{property.display_name}</div>
                  <div className="mt-1 text-xs text-outline">{property.city} {property.zipcode} · {property.unit_count} flats</div>
                </div>
                <RiskPill label={riskLabelForRank(index, rankedProperties.length)} />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <MiniStat label="Energy" value={formatKwh(property.predicted_energy_kwh)} />
                <MiniStat label="Cost" value={formatCurrency(property.predicted_cost_eur)} />
                <MiniStat label="CO2" value={formatKg(property.predicted_co2_kg)} />
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  function renderPropertyOverview() {
    return (
      <div className="space-y-5">
        <PageHeading
          eyebrow={selectedProperty ? `Property rank #${selectedPropertyRank || '-'}` : 'Selected property'}
          title={selectedProperty?.display_name ?? 'Select a property'}
          subtitle={
            selectedProperty
              ? `${selectedProperty.city} ${selectedProperty.zipcode} · ${selectedProperty.unit_count} flats · Owned by ${selectedProperty.owner_display_name ?? summary?.display_name ?? '-'}`
              : 'Choose an assigned property from the property list.'
          }
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KpiCard icon={<Flame size={20} />} label="Energy 7d" value={formatKwh(propertyTotals['7d'].predicted_energy_kwh)} detail="Selected property" tone="orange" />
          <KpiCard icon={<Euro size={20} />} label="Cost 30d" value={formatCurrency(propertyTotals['30d'].predicted_cost_eur)} detail="Forecast cost" tone="red" />
          <KpiCard icon={<Leaf size={20} />} label="CO2 30d" value={formatKg(propertyTotals['30d'].predicted_co2_kg)} detail="Forecast emissions" tone="green" />
        </div>
        {renderUnits()}
      </div>
    );
  }

  function renderUnits() {
    return (
      <Panel>
        <div className="flex flex-col gap-4 border-b border-surface-variant p-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-primary">Property: {selectedProperty?.display_name ?? '-'}</div>
            <h2 className="mt-1 text-xl font-black text-on-surface">Units / Flats</h2>
            <p className="mt-1 text-sm text-outline">Ranked by 7-day forecast cost. Select a flat to open the room-level view.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={unitRiskFilter}
              onChange={(event) => setUnitRiskFilter(event.target.value as UnitRiskFilter)}
              className="rounded-lg border border-surface-variant bg-white px-3 py-2 text-sm font-bold text-on-surface outline-none"
            >
              <option value="all">All flats</option>
              <option value="high">Highest risk</option>
              <option value="attention">Needs attention</option>
              <option value="stable">Stable forecast</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-background text-[10px] uppercase tracking-widest text-outline">
              <tr>
                <th className="px-4 py-3">Unit</th>
                <th className="px-4 py-3">Tenant</th>
                <th className="px-4 py-3">Rooms</th>
                <th className="px-4 py-3">Space</th>
                <th className="px-4 py-3">7d Cost</th>
                <th className="px-4 py-3">30d Cost</th>
                <th className="px-4 py-3">CO2</th>
                <th className="px-4 py-3">Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-variant">
              {filteredUnitRows.map((unit) => (
                <tr
                  key={unit.unit_id}
                  onClick={() => chooseUnit(unit.unit_id)}
                  className={`cursor-pointer transition-colors ${
                    unit.unit_id === selectedUnit?.unit_id ? 'bg-primary-fixed/20' : 'hover:bg-background'
                  }`}
                >
                  <td className="px-4 py-3 font-black text-on-surface">{unit.unit_display_name}</td>
                  <td className="px-4 py-3 text-outline">{unit.tenant_display_name}</td>
                  <td className="px-4 py-3 text-outline">{unit.room_count}</td>
                  <td className="px-4 py-3 text-outline">{formatM2(unit.living_space_m2)}</td>
                  <td className="px-4 py-3 font-bold text-on-surface">{formatCurrency(unit.sevenDay.predicted_cost_eur)}</td>
                  <td className="px-4 py-3 text-outline">{formatCurrency(unit.thirtyDay.predicted_cost_eur)}</td>
                  <td className="px-4 py-3 text-outline">{formatKg(unit.sevenDay.predicted_co2_kg)}</td>
                  <td className="px-4 py-3"><RiskPill label={unit.risk_label} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filteredUnitRows.length && <EmptyState text={loading ? 'Loading units...' : 'No flats match this filter.'} />}
        </div>
      </Panel>
    );
  }

  function renderSelectedUnit() {
    if (!selectedUnit) {
      return <EmptyState text={loading ? 'Loading selected flat...' : 'No flat selected yet.'} />;
    }

    return (
      <div className="space-y-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <button
              onClick={() => setActiveView('units')}
              className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-primary"
            >
              <ArrowLeft size={16} />
              Back to all units
            </button>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-black text-on-surface">{unitTitle(selectedUnit)}</h1>
              <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-black text-green-700">Active</span>
            </div>
            <p className="mt-2 text-sm font-medium text-outline">
              {selectedProperty?.display_name ?? `Property ${selectedUnit.property_id}`} · {selectedUnit.room_count} rooms
              {selectedUnit.room_count > displayedRoomCount ? ' (capped view)' : ''} · {formatM2(selectedUnit.living_space_m2)}
            </p>
          </div>
          <select className="w-full rounded-lg border border-surface-variant bg-white px-3 py-2 text-sm font-bold text-on-surface outline-none md:w-auto">
            <option>Last 7 days forecast</option>
            <option>Next 30 days forecast</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          <KpiCard
            icon={<Flame size={20} />}
            label="Energy (7d)"
            value={formatKwh(selectedUnit.sevenDay.predicted_energy_kwh)}
            detail={`${selectedUnit.share_pct.toFixed(0)}% of property`}
            tone="orange"
          />
          <KpiCard
            icon={<Euro size={20} />}
            label="Cost (7d)"
            value={formatCurrency(selectedUnit.sevenDay.predicted_cost_eur)}
            detail={`${selectedUnit.cost_share_pct.toFixed(0)}% of property`}
            tone="red"
          />
          <KpiCard
            icon={<Leaf size={20} />}
            label="CO2 (7d)"
            value={formatKg(selectedUnit.sevenDay.predicted_co2_kg)}
            detail={`${selectedUnit.co2_share_pct.toFixed(0)}% of property`}
            tone="green"
          />
          <KpiCard
            icon={<ShieldAlert size={20} />}
            label="Risk level"
            value={shortRiskLabel(selectedUnit.risk_label)}
            detail={riskDetail(selectedUnit.risk_label)}
            tone="red"
          />
          <KpiCard
            icon={<Leaf size={20} />}
            label="Potential savings"
            value={`${formatCurrency(savingsRange[0])} - ${formatCurrency(savingsRange[1])}`}
            detail="If actions are taken"
            tone="green"
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <InsightToggleButton
            label="Why this unit is high"
            active={unitInsightPanel === 'why'}
            icon={<AlertTriangle size={15} />}
            onClick={() =>
              setUnitInsightPanel((current) => (current === 'why' ? null : 'why'))
            }
          />
          <InsightToggleButton
            label="Evidence & tenant notice"
            active={unitInsightPanel === 'evidence'}
            icon={<ClipboardCheck size={15} />}
            onClick={() =>
              setUnitInsightPanel((current) => (current === 'evidence' ? null : 'evidence'))
            }
          />
        </div>

        <div className="space-y-5">
          <div className="relative">
            <ApartmentBlueprint
              roomCount={selectedUnit.room_count}
              unitName={selectedUnit.unit_display_name}
              tenantName={selectedUnit.tenant_display_name}
              unitNumber={selectedUnit.unit_number}
              livingSpaceM2={selectedUnit.living_space_m2}
              totalEnergyKwh={selectedUnit.sevenDay.predicted_energy_kwh}
              totalCostEur={selectedUnit.sevenDay.predicted_cost_eur}
              totalCo2Kg={selectedUnit.sevenDay.predicted_co2_kg}
              liveState={{
                room_temperature_c: selectedUnit.avg_room_temperature_c ?? undefined,
                radiator_valve_open_pct: selectedUnit.avg_valve_open_pct ?? undefined,
                humidity_pct: selectedUnit.avg_humidity_pct ?? undefined,
                window_open_risk: selectedUnit.avg_window_open_risk ?? undefined,
              }}
            />

            <UnitInsightDrawer
              openPanel={unitInsightPanel}
              onClose={() => setUnitInsightPanel(null)}
              whyHigh={whyHigh}
              unitEvidence={unitEvidence}
              tenantNoticeDraft={tenantNoticeDraft}
              sentNotice={sentNotice}
              onSendTenantNotice={sendTenantNotice}
            />
          </div>

          {unitInsightPanel && (
            <div className="xl:hidden">
              <UnitInsightInlinePanel
                openPanel={unitInsightPanel}
                whyHigh={whyHigh}
                unitEvidence={unitEvidence}
                tenantNoticeDraft={tenantNoticeDraft}
                sentNotice={sentNotice}
                onSendTenantNotice={sendTenantNotice}
              />
            </div>
          )}

          <Panel>
            <PanelHeader title="Recommended actions" subtitle="Savings are estimated for the next 7 days." />
            <div className="space-y-3 p-4">
              {recommendations.map((action) => (
                <RecommendationRow key={action.title} action={action} />
              ))}
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Unit forecast summary" subtitle="Backend forecast totals for the selected flat" />
            <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-3">
              <SummaryTile label="Next 7 days" value={`${formatKwh(selectedUnit.sevenDay.predicted_energy_kwh)} · ${formatCurrency(selectedUnit.sevenDay.predicted_cost_eur)} · ${formatKg(selectedUnit.sevenDay.predicted_co2_kg)}`} />
              <SummaryTile label="Next 30 days" value={`${formatKwh(selectedUnit.thirtyDay.predicted_energy_kwh)} · ${formatCurrency(selectedUnit.thirtyDay.predicted_cost_eur)} · ${formatKg(selectedUnit.thirtyDay.predicted_co2_kg)}`} />
              <SummaryTile label="This month forecast" value={`${formatKwh(selectedUnit.thirtyDay.predicted_energy_kwh * 1.2)} · ${formatCurrency(selectedUnit.thirtyDay.predicted_cost_eur * 1.2)} · ${formatKg(selectedUnit.thirtyDay.predicted_co2_kg * 1.2)}`} />
            </div>
          </Panel>
        </div>
      </div>
    );
  }

  function renderLiveMonitor() {
    return (
      <div className="space-y-5">
        <PageHeading
          eyebrow="Live monitor"
          title="Portfolio LIVE monitor"
          subtitle="Track all assigned properties in one place, then drill into an individual flat when needed."
        />
        <Panel>
          <div className="grid grid-cols-1 gap-4 p-4 xl:grid-cols-[320px_1fr]">
            <div className="rounded-xl border border-surface-variant bg-background p-4">
              <div className="mb-3 text-sm font-black text-on-surface">Live scenario</div>
              <select
                value={selectedScenario}
                onChange={(event) => onScenarioChange(event.target.value as LiveScenario)}
                disabled={liveLoading}
                className="w-full rounded-lg border border-surface-variant bg-white px-3 py-2 text-sm font-bold text-on-surface outline-none"
              >
                {(liveStatus?.supported_scenarios ?? ['normal', 'cold_snap', 'high_usage', 'eco_mode']).map((scenario) => (
                  <option key={scenario} value={scenario}>{formatScenario(scenario)}</option>
                ))}
              </select>
              <button
                onClick={liveSession ? onStopLive : onStartLive}
                disabled={liveLoading}
                className={`mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-black ${
                  liveSession ? 'border border-primary bg-white text-primary' : 'bg-primary text-white'
                }`}
              >
                <span className={`h-2.5 w-2.5 rounded-full ${liveSession ? 'bg-primary animate-pulse' : 'bg-white animate-pulse'}`} />
                {liveSession ? 'Stop LIVE' : 'LIVE'}
              </button>
              <div className="mt-3 text-xs font-medium text-outline">
                {liveSession?.status === 'active'
                  ? 'Portfolio simulation is active across all assigned properties.'
                  : 'Start LIVE to see portfolio-wide simulated demand and unit drilldown.'}
              </div>
              {liveError && <div className="mt-3 rounded-lg border border-error/20 bg-error-container/20 px-3 py-2 text-xs text-error">{liveError}</div>}
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <MiniStat
                label="Portfolio live so far"
                value={formatKwh(liveSession?.live_state.portfolio_live_consumption_so_far_kwh)}
              />
              <MiniStat
                label="Portfolio projected EOD"
                value={formatKwh(liveSession?.live_state.portfolio_projected_end_of_day_kwh)}
              />
              <MiniStat
                label="Portfolio baseline"
                value={formatKwh(liveSession?.live_state.portfolio_baseline_day_kwh)}
              />
              <MiniStat label="7d live pace" value={formatKwh(livePortfolioSevenDay)} />
            </div>
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            title="All property live consumption"
            subtitle="Every assigned property is shown here so you can compare today’s simulated demand at a glance."
          />
          <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 xl:grid-cols-4">
            {livePropertyRows.length > 0 ? (
              livePropertyRows.map((property) => {
                const active = property.property_id === livePropertyId;
                const rising = property.projected_end_of_day_kwh > property.baseline_day_kwh * 1.05;
                return (
                  <button
                    key={property.property_id}
                    onClick={() => syncLiveProperty(property.property_id)}
                    className={`rounded-xl border p-4 text-left transition-colors ${
                      active
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-surface-variant bg-background hover:border-primary/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-black text-on-surface">{property.display_name}</div>
                        <div className="mt-1 text-xs font-medium text-outline">{property.city}</div>
                      </div>
                      <RiskPill label={rising ? 'Higher live' : 'On pace'} />
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <MiniStat label="Live so far" value={formatKwh(property.live_consumption_so_far_kwh)} />
                      <MiniStat label="Projected EOD" value={formatKwh(property.projected_end_of_day_kwh)} />
                      <MiniStat label="Baseline day" value={formatKwh(property.baseline_day_kwh)} />
                      <MiniStat label="7d forecast" value={formatKwh(property.prediction_totals?.['7d']?.predicted_energy_kwh)} />
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="md:col-span-2 xl:col-span-4">
                <EmptyState text="Start LIVE to populate portfolio-wide property demand." />
              </div>
            )}
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            title="Individual unit live consumption"
            subtitle="Select a property and flat to inspect its live pace, forecast, and current simulated room conditions."
          />
          <div className="grid grid-cols-1 gap-4 p-4 xl:grid-cols-[280px_280px_1fr]">
            <div>
              <div className="mb-2 text-[10px] font-black uppercase tracking-widest text-outline">Property</div>
              <select
                value={livePropertyId}
                onChange={(event) => syncLiveProperty(event.target.value)}
                className="w-full rounded-lg border border-surface-variant bg-white px-3 py-2 text-sm font-bold text-on-surface outline-none"
              >
                {livePropertyRows.map((property) => (
                  <option key={property.property_id} value={property.property_id}>
                    {property.display_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="mb-2 text-[10px] font-black uppercase tracking-widest text-outline">Unit / flat</div>
              <select
                value={selectedLiveUnit?.unit_id ?? ''}
                onChange={(event) => syncLiveUnit(event.target.value)}
                disabled={!selectedLiveUnit}
                className="w-full rounded-lg border border-surface-variant bg-white px-3 py-2 text-sm font-bold text-on-surface outline-none disabled:bg-background"
              >
                {liveUnitRows.map((unit) => (
                  <option key={unit.unit_id} value={unit.unit_id}>
                    {unit.unit_display_name} · {unit.tenant_display_name}
                  </option>
                ))}
              </select>
            </div>

            {selectedLiveUnit ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                <MiniStat label="Tenant" value={selectedLiveUnit.tenant_display_name} />
                <MiniStat label="Live so far" value={formatKwh(selectedLiveUnit.live_consumption_so_far_kwh)} />
                <MiniStat label="Projected EOD" value={formatKwh(selectedLiveUnit.projected_end_of_day_kwh)} />
                <MiniStat label="7d live pace" value={formatKwh(selectedLiveUnit.prediction_totals?.['7d']?.predicted_energy_kwh)} />
                <MiniStat label="Room temp" value={`${selectedLiveUnit.live_state.room_temperature_c.toFixed(1)}°C`} />
                <MiniStat label="Humidity" value={`${selectedLiveUnit.live_state.humidity_pct.toFixed(0)}%`} />
                <MiniStat label="Heating mode" value={selectedLiveUnit.live_state.heating_mode} />
                <MiniStat label="Window risk" value={liveRiskLabel(selectedLiveUnit.live_state.window_open_risk)} />
              </div>
            ) : (
              <div className="xl:col-span-1">
                <EmptyState text="No unit-level live data is available yet for this property." />
              </div>
            )}
          </div>
        </Panel>

        {selectedPropertyLive && (
          <Panel>
            <PanelHeader
              title={`Selected property focus: ${selectedPropertyLive.display_name}`}
              subtitle="A quick summary for the currently selected property context."
            />
            <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-4">
              <MiniStat label="Live so far" value={formatKwh(selectedPropertyLive.live_consumption_so_far_kwh)} />
              <MiniStat label="Projected EOD" value={formatKwh(selectedPropertyLive.projected_end_of_day_kwh)} />
              <MiniStat label="7d forecast" value={formatKwh(selectedPropertyLive.prediction_totals?.['7d']?.predicted_energy_kwh)} />
              <MiniStat label="Scenario" value={formatScenario(selectedScenario)} />
            </div>
          </Panel>
        )}
      </div>
    );
  }

  function renderActions() {
    const actionUnit = selectedUnit ?? unitRows[0] ?? null;
    const actionRooms = actionUnit ? buildRoomBreakdown(actionUnit, utilityType, roomComparisonRange) : [];
    const actionList = actionUnit ? buildRecommendations(actionUnit, actionRooms, utilityType, selectedProperty) : [];
    return (
      <div className="space-y-5">
        <PageHeading
          eyebrow="Actions"
          title="Recommended actions"
          subtitle="Prioritized suggestions for the selected flat."
        />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          {actionList.map((action) => (
            <RecommendationCard key={action.title} action={action} />
          ))}
        </div>
        {relevantRiskCards.length > 0 && (
          <Panel>
            <PanelHeader title="Backend live risk cards" subtitle="Visible when LIVE mode has backend risk context." />
            <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2">
              {relevantRiskCards.slice(0, 4).map((item, index) => (
                <ActionCard key={`${item.title ?? item.message}-${index}`} item={item} />
              ))}
            </div>
          </Panel>
        )}
      </div>
    );
  }
}

function InsightToggleButton({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  const isWarning = label.toLowerCase().includes('why');
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2.5 rounded-full border px-4 py-2.5 text-xs font-black uppercase tracking-widest transition-all ${
        active
          ? isWarning
            ? 'border-[#f59e0b] bg-[#fff7e8] text-[#9a3412] shadow-[0_8px_20px_rgba(245,158,11,0.16)]'
            : 'border-primary bg-primary text-white shadow-[0_8px_20px_rgba(227,6,19,0.18)]'
          : 'border-surface-variant bg-white text-outline hover:border-primary/25 hover:text-on-surface'
      }`}
    >
      <span
        className={`flex h-7 w-7 items-center justify-center rounded-full border ${
          isWarning
            ? active
              ? 'border-[#f59e0b]/50 bg-[#fff1c7] text-[#d97706]'
              : 'border-[#f8d38c] bg-[#fff8e8] text-[#d97706]'
            : active
            ? 'border-white/20 bg-white/12 text-white'
            : 'border-primary/15 bg-primary/5 text-primary'
        }`}
      >
        {icon}
      </span>
      {label}
    </button>
  );
}

function UnitInsightDrawer({
  openPanel,
  onClose,
  whyHigh,
  unitEvidence,
  tenantNoticeDraft,
  sentNotice,
  onSendTenantNotice,
}: {
  openPanel: 'why' | 'evidence' | null;
  onClose: () => void;
  whyHigh: string[];
  unitEvidence: UnitEvidence | null;
  tenantNoticeDraft: string;
  sentNotice: TenantNotice | null;
  onSendTenantNotice: () => void;
}) {
  return (
    <div
      className={`fixed bottom-6 right-6 top-24 z-40 hidden w-[380px] rounded-2xl border border-surface-variant bg-white shadow-[0_24px_60px_rgba(0,0,0,0.16)] transition-all duration-300 xl:block ${
        openPanel ? 'translate-x-0 opacity-100' : 'pointer-events-none translate-x-[420px] opacity-0'
      }`}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-surface-variant px-4 py-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-primary">Insight panel</div>
            <div className="mt-1 text-lg font-black text-on-surface">
              {openPanel === 'why' ? 'Why this unit is high' : 'Evidence & Tenant Notice'}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-surface-variant p-2 text-outline transition hover:bg-background hover:text-on-surface"
          >
            <X size={16} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <UnitInsightContent
            openPanel={openPanel}
            whyHigh={whyHigh}
            unitEvidence={unitEvidence}
            tenantNoticeDraft={tenantNoticeDraft}
            sentNotice={sentNotice}
            onSendTenantNotice={onSendTenantNotice}
          />
        </div>
      </div>
    </div>
  );
}

function UnitInsightInlinePanel({
  openPanel,
  whyHigh,
  unitEvidence,
  tenantNoticeDraft,
  sentNotice,
  onSendTenantNotice,
}: {
  openPanel: 'why' | 'evidence';
  whyHigh: string[];
  unitEvidence: UnitEvidence | null;
  tenantNoticeDraft: string;
  sentNotice: TenantNotice | null;
  onSendTenantNotice: () => void;
}) {
  return (
    <Panel>
      <PanelHeader
        title={openPanel === 'why' ? 'Why this unit is high' : 'Evidence & Tenant Notice'}
        subtitle={openPanel === 'why' ? 'Expanded only when needed.' : 'Open this when you want the proof and tenant message.'}
      />
      <div className="p-4">
        <UnitInsightContent
          openPanel={openPanel}
          whyHigh={whyHigh}
          unitEvidence={unitEvidence}
          tenantNoticeDraft={tenantNoticeDraft}
          sentNotice={sentNotice}
          onSendTenantNotice={onSendTenantNotice}
        />
      </div>
    </Panel>
  );
}

function UnitInsightContent({
  openPanel,
  whyHigh,
  unitEvidence,
  tenantNoticeDraft,
  sentNotice,
  onSendTenantNotice,
}: {
  openPanel: 'why' | 'evidence' | null;
  whyHigh: string[];
  unitEvidence: UnitEvidence | null;
  tenantNoticeDraft: string;
  sentNotice: TenantNotice | null;
  onSendTenantNotice: () => void;
}) {
  if (openPanel === 'why') {
    return (
      <div className="space-y-3">
        {whyHigh.map((item, index) => (
          <ReasonRow key={`${item}-${index}`} text={item} />
        ))}
      </div>
    );
  }

  if (openPanel === 'evidence' && unitEvidence) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <EvidenceMetric
            label="Peak day"
            value={unitEvidence.peak_day ? formatFullDate(unitEvidence.peak_day.date) : '-'}
            detail={
              unitEvidence.peak_day
                ? `${formatKwh(unitEvidence.peak_day.predicted_energy_kwh)} · ${unitEvidence.daily_delta_pct.toFixed(0)}% above this flat's daily average`
                : 'No daily forecast available'
            }
          />
          <EvidenceMetric
            label="Peak week"
            value={`Week ${unitEvidence.peak_week_index + 1}`}
            detail={`${formatKwh(unitEvidence.peak_week.predicted_energy_kwh)} · ${formatCurrency(unitEvidence.peak_week.predicted_cost_eur)} forecast`}
          />
        </div>

        <div className="rounded-lg border border-surface-variant bg-background p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-black text-on-surface">
            <ClipboardCheck size={16} className="text-primary" />
            Evidence signals
          </div>
          <div className="space-y-2">
            {unitEvidence.signals.map((signal) => (
              <div key={signal} className="text-sm text-outline">{signal}</div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
          <div className="mb-2 text-sm font-black text-on-surface">Tenant notification draft</div>
          <p className="text-sm leading-6 text-on-surface">{tenantNoticeDraft}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              onClick={onSendTenantNotice}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-black text-white"
            >
              <Send size={15} />
              Send to tenant app
            </button>
            {sentNotice && (
              <span className="text-xs font-bold text-green-700">
                Sent {formatDateTime(sentNotice.created_at)}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return <EmptyState text="Open an insight panel to focus on one story at a time." />;
}

function LandlordSidebar({
  summary,
  selectedProperty,
  activeView,
  setActiveView,
  onLogout,
}: {
  summary: LandlordSummary | null;
  selectedProperty: PropertySummary | null;
  activeView: LandlordView;
  setActiveView: (view: LandlordView) => void;
  onLogout?: () => void;
}) {
  const nav = [
    { label: 'Dashboard', view: 'dashboard' as LandlordView, icon: <LayoutDashboard size={18} /> },
    { label: 'Properties', view: 'properties' as LandlordView, icon: <Building2 size={18} /> },
  ];
  const propertyNav = [
    { label: 'Overview', view: 'property' as LandlordView, icon: <Gauge size={18} /> },
    { label: 'Units / Flats', view: 'units' as LandlordView, icon: <Home size={18} /> },
    { label: 'Live Monitor', view: 'live' as LandlordView, icon: <BarChart3 size={18} /> },
    { label: 'Actions', view: 'actions' as LandlordView, icon: <Wrench size={18} /> },
  ];

  return (
    <aside className="hidden min-h-screen border-r border-surface-variant bg-white lg:flex lg:flex-col">
      <div className="flex h-16 items-center border-b border-surface-variant px-7">
        <TechemLogo />
      </div>

      <div className="flex-1 space-y-7 overflow-y-auto px-5 py-6">
        <SidebarGroup title="Portfolio overview">
          {nav.map((item) => (
            <SidebarButton
              key={item.view}
              icon={item.icon}
              label={item.label}
              active={activeView === item.view}
              onClick={() => setActiveView(item.view)}
            />
          ))}
        </SidebarGroup>

        <SidebarGroup title={`Property: ${selectedProperty?.display_name ?? 'Select one'}`}>
          {propertyNav.map((item) => (
            <SidebarButton
              key={item.view}
              icon={item.icon}
              label={item.label}
              active={activeView === item.view || (item.view === 'units' && activeView === 'unit')}
              onClick={() => setActiveView(item.view)}
            />
          ))}
        </SidebarGroup>

        <SidebarGroup title="Settings">
          {onLogout && (
            <SidebarButton icon={<LogOut size={18} />} label="Logout" active={false} onClick={onLogout} />
          )}
        </SidebarGroup>

        <div className="rounded-xl border border-surface-variant bg-background p-4">
          <div className="mb-3 flex items-center gap-2">
            <div className="rounded-lg bg-orange-50 p-2 text-orange-500">
              <HelpCircle size={18} />
            </div>
            <div className="text-sm font-black text-on-surface">How we help you save</div>
          </div>
          <p className="text-sm leading-6 text-outline">
            We compare forecasts and demo sensor signals to show where energy is likely being wasted.
          </p>
          <div className="mt-4 text-sm font-black text-primary">
            {summary ? `${summary.property_count} properties monitored` : 'Loading portfolio'}
          </div>
        </div>
      </div>
    </aside>
  );
}

function LandlordTopbar({
  summary,
  selectedProperty,
  selectedUnit,
  activeView,
  liveActive,
}: {
  summary: LandlordSummary | null;
  selectedProperty: PropertySummary | null;
  selectedUnit: UnitForecastRow | null;
  activeView: LandlordView;
  liveActive: boolean;
}) {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-surface-variant bg-white px-4 md:px-7">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-xs text-outline">
          <span className="font-black text-primary">Landlord Dashboard</span>
          <span>/</span>
          <span>Properties</span>
          {selectedProperty && (
            <>
              <span>/</span>
              <span className="truncate">{selectedProperty.display_name}</span>
            </>
          )}
          {activeView === 'unit' && selectedUnit && (
            <>
              <span>/</span>
              <span className="truncate font-black text-on-surface">{unitTitle(selectedUnit)}</span>
            </>
          )}
        </div>
        <div className="mt-1 hidden text-xs text-outline sm:block">{summary?.company_name ?? summary?.display_name ?? 'Demo landlord'}</div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden items-center gap-2 text-sm font-black text-on-surface sm:flex">
          <span className={`h-2.5 w-2.5 rounded-full ${liveActive ? 'bg-primary animate-pulse' : 'bg-outline/30'}`} />
          LIVE
        </div>
        <button className="rounded-lg p-2 text-outline hover:bg-background" title="Notifications">
          <Bell size={20} />
        </button>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background text-sm font-black text-outline">
            {initials(summary?.display_name)}
          </div>
          <div className="hidden text-sm md:block">
            <div className="font-black text-on-surface">{summary?.company_name ?? summary?.display_name ?? '-'}</div>
            <div className="text-xs text-outline">Landlord</div>
          </div>
          <ChevronDown size={16} className="text-outline" />
        </div>
      </div>
    </header>
  );
}

function ApartmentMap({ rooms, utilityType }: { rooms: RoomBreakdownItem[]; utilityType: UtilityType }) {
  return (
    <div className="rounded-xl border-[3px] border-neutral-600 bg-neutral-100 p-2">
      <div className="grid grid-cols-2 auto-rows-[118px] gap-1 md:grid-cols-5">
        {rooms.map((room) => (
          <div
            key={room.room}
            className={`${roomMapClass(room.room)} relative flex min-h-[110px] flex-col items-center justify-center border-2 border-neutral-500 bg-white px-3 text-center shadow-inner`}
          >
            <div className="text-sm font-black text-on-surface">{room.room}</div>
            <div className="mt-2 text-sm font-bold text-on-surface">{formatRoomValue(room.value, utilityType)}</div>
            <span className={`mt-2 rounded-full border px-2.5 py-1 text-[10px] font-black ${roomStatusTone(room.status)}`}>
              {formatRoomStatus(room.status)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function UtilityToggle({ value, onChange }: { value: UtilityType; onChange: (value: UtilityType) => void }) {
  const options: Array<{ value: UtilityType; label: string; icon: ReactNode }> = [
    { value: 'heating', label: 'Heating', icon: <Flame size={15} /> },
    { value: 'electricity', label: 'Electricity', icon: <Bolt size={15} /> },
    { value: 'water', label: 'Water', icon: <Droplets size={15} /> },
  ];
  return (
    <div className="inline-flex rounded-xl border border-surface-variant bg-white p-1">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
            value === option.value ? 'bg-primary text-white' : 'text-outline hover:text-on-surface'
          }`}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}

function RoomRangeToggle({
  value,
  onChange,
}: {
  value: RoomComparisonRange;
  onChange: (value: RoomComparisonRange) => void;
}) {
  const options: Array<{ value: RoomComparisonRange; label: string }> = [
    { value: '7d', label: '7 days' },
    { value: '30d', label: '30 days' },
    { value: 'previous', label: 'Previous month' },
  ];
  return (
    <div className="inline-flex rounded-xl border border-surface-variant bg-white p-1">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
            value === option.value ? 'bg-primary text-white' : 'text-outline hover:text-on-surface'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  detail: string;
  tone: 'red' | 'green' | 'orange' | 'blue';
}) {
  const toneClass =
    tone === 'red'
      ? 'bg-red-50 text-primary'
      : tone === 'green'
      ? 'bg-green-50 text-green-600'
      : tone === 'orange'
      ? 'bg-orange-50 text-orange-500'
      : 'bg-blue-50 text-blue-600';
  return (
    <div className="rounded-xl border border-surface-variant bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className={`rounded-xl p-2 ${toneClass}`}>{icon}</div>
        <div className="min-w-0">
          <div className="text-sm font-bold text-outline">{label}</div>
          <div className="mt-1 text-2xl font-black text-on-surface">{value}</div>
          <div className="mt-2 text-sm font-bold text-outline">{detail}</div>
        </div>
      </div>
    </div>
  );
}

function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`overflow-hidden rounded-xl border border-surface-variant bg-white shadow-sm ${className}`}>{children}</section>;
}

function PanelHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="border-b border-surface-variant px-4 py-3">
      <h2 className="text-lg font-black text-on-surface">{title}</h2>
      {subtitle && <p className="mt-1 text-sm font-medium text-outline">{subtitle}</p>}
    </div>
  );
}

function PageHeading({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return (
    <div>
      <div className="text-[10px] font-black uppercase tracking-widest text-primary">{eyebrow}</div>
      <h1 className="mt-1 text-3xl font-black text-on-surface">{title}</h1>
      <p className="mt-2 text-sm font-medium text-outline">{subtitle}</p>
    </div>
  );
}

function SidebarGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-3 text-[10px] font-black uppercase tracking-widest text-outline">{title}</div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function SidebarButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold transition-colors ${
        active ? 'bg-primary/10 text-primary' : 'text-on-surface hover:bg-background'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function PropertyRow({ property, rank, active }: { property: PropertySummary; rank: number; active: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="text-[10px] font-black uppercase tracking-widest text-primary">Rank #{rank}</div>
        <div className="mt-1 font-black text-on-surface">{property.display_name}</div>
        <div className="mt-1 text-xs text-outline">{property.city} {property.zipcode} · {property.unit_count} flats</div>
      </div>
      <div className="text-right">
        <div className="font-black text-on-surface">{formatCurrency(property.predicted_cost_eur)}</div>
        <div className="text-xs text-outline">{formatKwh(property.predicted_energy_kwh)}</div>
        {active && <div className="mt-1 text-[10px] font-black uppercase tracking-widest text-primary">Selected</div>}
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border border-surface-variant bg-white p-3">
      <div className="text-[10px] font-bold uppercase tracking-widest text-outline">{label}</div>
      <div className="mt-1 text-sm font-black text-on-surface break-words">{value}</div>
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-surface-variant bg-background p-4">
      <div className="flex items-center gap-3">
        <CalendarDays size={18} className="text-outline" />
        <div>
          <div className="text-sm font-black text-on-surface">{label}</div>
          <div className="mt-1 text-sm font-bold text-outline">{value}</div>
        </div>
      </div>
    </div>
  );
}

function EvidenceMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-lg border border-surface-variant bg-background p-3">
      <div className="text-[10px] font-black uppercase tracking-widest text-outline">{label}</div>
      <div className="mt-1 text-lg font-black text-on-surface">{value}</div>
      <div className="mt-1 text-xs font-medium text-outline">{detail}</div>
    </div>
  );
}

function ReasonRow({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <Thermometer size={18} className="mt-0.5 text-primary" />
      <div className="font-medium text-on-surface">{text}</div>
    </div>
  );
}

function RecommendationRow({ action }: { action: Recommendation }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-surface-variant bg-background p-3">
      <div className="flex min-w-0 gap-3">
        <div className="rounded-lg bg-white p-2 text-primary">{action.icon}</div>
        <div>
          <div className="text-sm font-black text-on-surface">{action.title}</div>
          <div className="mt-1 text-xs font-bold text-primary">{action.context}</div>
          <div className="mt-1 text-sm text-outline">
            Estimated saving: {formatCurrency(action.savings_eur[0])} - {formatCurrency(action.savings_eur[1])} · {formatKg(action.savings_co2_kg[0])} - {formatKg(action.savings_co2_kg[1])}
          </div>
        </div>
      </div>
      <RiskPill label={action.priority} />
    </div>
  );
}

function RecommendationCard({ action }: { action: Recommendation }) {
  return (
    <Panel>
      <div className="p-4">
        <div className="mb-3 inline-flex rounded-lg bg-primary/10 p-2 text-primary">{action.icon}</div>
        <div className="text-lg font-black text-on-surface">{action.title}</div>
        <div className="mt-1 text-xs font-black uppercase tracking-widest text-primary">{action.context}</div>
        <div className="mt-2 text-sm text-outline">{action.message}</div>
        <div className="mt-4 text-sm font-black text-on-surface">
          {formatCurrency(action.savings_eur[0])} - {formatCurrency(action.savings_eur[1])} · {formatKg(action.savings_co2_kg[0])} - {formatKg(action.savings_co2_kg[1])}
        </div>
      </div>
    </Panel>
  );
}

function ActionCard({ item }: { item: { title?: string; message: string; severity?: string; recommended_action?: string } }) {
  return (
    <div className="rounded-lg border border-surface-variant bg-background p-4">
      <div className="mb-2 flex items-center gap-2 text-primary">
        <AlertTriangle size={16} />
        <div className="text-xs font-black uppercase tracking-widest">{item.severity ?? 'Action'}</div>
      </div>
      <div className="text-sm font-black text-on-surface">{item.title ?? 'Backend action'}</div>
      <div className="mt-1 text-sm text-outline">{item.message}</div>
      {item.recommended_action && <div className="mt-3 text-xs font-bold text-on-surface">{item.recommended_action}</div>}
    </div>
  );
}

function RiskPill({ label }: { label: string }) {
  const lower = label.toLowerCase();
  const high = lower.includes('high');
  const medium = lower.includes('attention') || lower.includes('medium');
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${
      high
        ? 'border-red-200 bg-red-50 text-primary'
        : medium
        ? 'border-orange-200 bg-orange-50 text-orange-600'
        : 'border-green-200 bg-green-50 text-green-700'
    }`}>
      {label}
    </span>
  );
}

function RoomLegend() {
  const items: Array<[RoomStatus, string]> = [
    ['very-high', 'Very High'],
    ['high', 'High'],
    ['medium', 'Medium'],
    ['low', 'Low'],
  ];
  return (
    <div className="mt-4 flex flex-wrap gap-4 text-xs font-bold text-outline">
      {items.map(([status, label]) => (
        <div key={status} className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${roomLegendDot(status)}`} />
          {label}
        </div>
      ))}
    </div>
  );
}

function TechemLogo() {
  return (
    <div className="flex flex-col items-start">
      <span className="text-3xl font-black leading-none tracking-tighter text-black">techem</span>
      <svg width="112" height="8" viewBox="0 0 112 8" fill="none" xmlns="http://www.w3.org/2000/svg" className="-mt-0.5">
        <path d="M4 2C28 7 84 7 108 2" stroke="#e30613" strokeWidth="4" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-xl border border-surface-variant bg-white p-6 text-sm text-outline">{text}</div>;
}

function aggregateDaily(rows: DailyForecastRow[]): Array<ForecastTotals & { date: string }> {
  const byDate = new Map<string, ForecastTotals & { date: string }>();
  for (const row of rows) {
    const date = row.date.slice(0, 10);
    const current = byDate.get(date) ?? {
      date,
      predicted_energy_kwh: 0,
      predicted_cost_eur: 0,
      predicted_co2_kg: 0,
    };
    current.predicted_energy_kwh += row.predicted_energy_kwh ?? 0;
    current.predicted_cost_eur += row.predicted_cost_eur ?? 0;
    current.predicted_co2_kg += row.predicted_co2_kg ?? 0;
    byDate.set(date, current);
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function sumDailyWindow(rows: Array<ForecastTotals>, days: number): ForecastTotals {
  return rows.slice(0, days).reduce(
    (total, row) => ({
      predicted_energy_kwh: total.predicted_energy_kwh + row.predicted_energy_kwh,
      predicted_cost_eur: total.predicted_cost_eur + row.predicted_cost_eur,
      predicted_co2_kg: total.predicted_co2_kg + row.predicted_co2_kg,
    }),
    { predicted_energy_kwh: 0, predicted_cost_eur: 0, predicted_co2_kg: 0 }
  );
}

function buildUnitRows(units: PropertyUnitSummary[], rows: DailyForecastRow[]): UnitForecastRow[] {
  const property7d = sumDailyWindow(aggregateDaily(rows), 7);
  const propertyEnergy7d = property7d.predicted_energy_kwh || 1;
  const propertyCost7d = property7d.predicted_cost_eur || 1;
  const propertyCo27d = property7d.predicted_co2_kg || 1;
  const unitRows = units.map((unit) => {
    const forecasts = rows
      .filter((row) => row.unit_id === unit.unit_id)
      .sort((a, b) => a.date.localeCompare(b.date));
    const sevenDay = sumForecastRows(forecasts.slice(0, 7));
    const thirtyDay = sumForecastRows(forecasts.slice(0, 30));
    return {
      ...unit,
      sevenDay,
      thirtyDay,
      share_pct: (sevenDay.predicted_energy_kwh / propertyEnergy7d) * 100,
      cost_share_pct: (sevenDay.predicted_cost_eur / propertyCost7d) * 100,
      co2_share_pct: (sevenDay.predicted_co2_kg / propertyCo27d) * 100,
      risk_label: 'Stable forecast',
      avg_room_temperature_c: average(forecasts.map((row) => row.room_temperature_c)),
      avg_humidity_pct: average(forecasts.map((row) => row.humidity_pct)),
      avg_valve_open_pct: average(forecasts.map((row) => row.radiator_valve_open_pct)),
      avg_window_open_risk: average(forecasts.map((row) => row.window_open_risk)),
    };
  });

  return unitRows
    .sort((a, b) => b.sevenDay.predicted_cost_eur - a.sevenDay.predicted_cost_eur)
    .map((unit, index, all) => ({
      ...unit,
      risk_label: riskLabelForRank(index, all.length),
    }));
}

function sumForecastRows(rows: DailyForecastRow[]): ForecastTotals {
  return rows.reduce(
    (total, row) => ({
      predicted_energy_kwh: total.predicted_energy_kwh + (row.predicted_energy_kwh ?? 0),
      predicted_cost_eur: total.predicted_cost_eur + (row.predicted_cost_eur ?? 0),
      predicted_co2_kg: total.predicted_co2_kg + (row.predicted_co2_kg ?? 0),
    }),
    { predicted_energy_kwh: 0, predicted_cost_eur: 0, predicted_co2_kg: 0 }
  );
}

function buildFallbackUnitLiveRows(
  rows: UnitForecastRow[],
  dailyForecast: DailyForecastRow[],
  property: PropertySummary,
  scenario: LiveScenario,
  liveProgress: number
) {
  const multiplier = scenarioEnergyMultiplier(scenario);
  return rows
    .map((unit) => {
      const forecasts = dailyForecast
        .filter((row) => row.unit_id === unit.unit_id)
        .sort((a, b) => a.date.localeCompare(b.date));
      const baselineDay =
        forecasts[0]?.predicted_energy_kwh ??
        (unit.sevenDay.predicted_energy_kwh > 0 ? unit.sevenDay.predicted_energy_kwh / 7 : 0);
      const projectedEnd = baselineDay * multiplier;

      return {
        property_id: property.property_id,
        property_display_name: property.display_name,
        city: property.city,
        tenant_id: unit.tenant_id,
        unit_id: unit.unit_id,
        unit_display_name: unit.unit_display_name,
        unit_number: unit.unit_number,
        tenant_display_name: unit.tenant_display_name,
        baseline_day_kwh: roundLiveValue(baselineDay),
        live_consumption_so_far_kwh: roundLiveValue(projectedEnd * liveProgress),
        projected_end_of_day_kwh: roundLiveValue(projectedEnd),
        prediction_totals: {
          '2d': sumForecastRows(forecasts.slice(0, 2)),
          '3d': sumForecastRows(forecasts.slice(0, 3)),
          '7d': sumForecastRows(forecasts.slice(0, 7)),
        },
        live_state: {
          room_temperature_c: roundLiveValue((unit.avg_room_temperature_c ?? 20) + scenarioRoomTempDelta(scenario)),
          heater_setpoint_c: roundLiveValue(20 + scenarioSetpointDelta(scenario)),
          radiator_valve_open_pct: roundLiveValue(
            clampLiveValue((unit.avg_valve_open_pct ?? 35) + scenarioValveDelta(scenario), 0, 100)
          ),
          humidity_pct: roundLiveValue(
            clampLiveValue((unit.avg_humidity_pct ?? 46) + scenarioHumidityDelta(scenario), 25, 70)
          ),
          occupancy_proxy: 0.5,
          window_open_risk: roundLiveValue(
            clampLiveValue((unit.avg_window_open_risk ?? 0.22) + scenarioWindowRiskDelta(scenario), 0, 1)
          ),
          heating_mode: scenarioHeatingMode(scenario),
        },
      };
    })
    .sort((a, b) => a.unit_number - b.unit_number);
}

function buildRoomBreakdown(
  unit: UnitForecastRow,
  utilityType: UtilityType,
  range: RoomComparisonRange
): RoomBreakdownItem[] {
  const labels = roomLabels(unit.room_count);
  const weights = roomWeights(labels, utilityType);
  const totals = unitTotalsForRoomRange(unit, range);
  const base =
    utilityType === 'heating'
      ? totals.predicted_energy_kwh
      : utilityType === 'electricity'
      ? totals.predicted_energy_kwh * 0.24
      : unit.living_space_m2 * waterRangeFactor(range);
  const averageShare = 100 / Math.max(labels.length, 1);

  return labels.map((room, index) => {
    const sharePct = weights[index] * 100;
    const status = roomStatus(sharePct, averageShare);
    return {
      room,
      value: base * weights[index],
      temperature_c: derivedRoomTemperature(room, unit.avg_room_temperature_c ?? 20, utilityType),
      share_pct: sharePct,
      status,
      note: roomNote(room, status, utilityType),
    };
  });
}

function unitTotalsForRoomRange(unit: UnitForecastRow, range: RoomComparisonRange): ForecastTotals {
  if (range === '7d') return unit.sevenDay;
  if (range === '30d') return unit.thirtyDay;
  const factor = unit.risk_label === 'High forecast' ? 0.82 : unit.risk_label === 'Needs attention' ? 0.9 : 0.96;
  return {
    predicted_energy_kwh: unit.thirtyDay.predicted_energy_kwh * factor,
    predicted_cost_eur: unit.thirtyDay.predicted_cost_eur * factor,
    predicted_co2_kg: unit.thirtyDay.predicted_co2_kg * factor,
  };
}

function waterRangeFactor(range: RoomComparisonRange) {
  if (range === '7d') return 0.42;
  if (range === '30d') return 1.8;
  return 1.55;
}

function roomLabels(roomCount: number) {
  const count = Math.max(1, Math.min(Math.round(roomCount || 1), 8));
  if (count === 1) return ['Living / Dining'];
  if (count === 2) return ['Living / Dining', 'Bathroom'];
  if (count === 3) return ['Living / Dining', 'Bedroom 1', 'Bathroom'];
  const base = ['Living / Dining', 'Kitchen', 'Master Bedroom', 'Bedroom 1', 'Bedroom 2', 'Bathroom', 'Laundry', 'Hallway'];
  return base.slice(0, count);
}

function roomWeights(labels: string[], utilityType: UtilityType) {
  const profiles: Record<UtilityType, Record<string, number>> = {
    heating: {
      'Living / Dining': 0.3,
      Kitchen: 0.13,
      'Master Bedroom': 0.2,
      'Bedroom 1': 0.15,
      'Bedroom 2': 0.12,
      Bathroom: 0.08,
      Laundry: 0.04,
      Hallway: 0.05,
    },
    electricity: {
      'Living / Dining': 0.24,
      Kitchen: 0.32,
      'Master Bedroom': 0.12,
      'Bedroom 1': 0.09,
      'Bedroom 2': 0.08,
      Bathroom: 0.06,
      Laundry: 0.14,
      Hallway: 0.03,
    },
    water: {
      'Living / Dining': 0.03,
      Kitchen: 0.3,
      'Master Bedroom': 0.02,
      'Bedroom 1': 0.02,
      'Bedroom 2': 0.02,
      Bathroom: 0.43,
      Laundry: 0.15,
      Hallway: 0.01,
    },
  };
  const raw = labels.map((label) => profiles[utilityType][label] ?? 0.04);
  const total = raw.reduce((sum, value) => sum + value, 0) || 1;
  return raw.map((value) => value / total);
}

function roomStatus(sharePct: number, averageShare: number): RoomStatus {
  if (sharePct >= averageShare * 1.55) return 'very-high';
  if (sharePct >= averageShare * 1.12) return 'high';
  if (sharePct >= averageShare * 0.75) return 'medium';
  return 'low';
}

function roomNote(room: string, status: RoomStatus, utilityType: UtilityType) {
  if (utilityType === 'water' && room === 'Bathroom') return 'Check showers, toilet refill, and leaks.';
  if (utilityType === 'water' && room === 'Kitchen') return 'Check taps and dishwasher cycles.';
  if (utilityType === 'electricity' && room === 'Kitchen') return 'Appliance-heavy room.';
  if (utilityType === 'heating' && room === 'Living / Dining') return 'Main comfort zone.';
  if (status === 'very-high') return 'Highest share in this view.';
  if (status === 'high') return 'Above expected share.';
  if (status === 'medium') return 'Moderate share.';
  return 'Low share.';
}

function derivedRoomTemperature(room: string, baseTemp: number, utilityType: UtilityType) {
  if (utilityType === 'water') {
    if (room === 'Bathroom') return baseTemp + 0.5;
    if (room === 'Kitchen') return baseTemp + 0.2;
    return baseTemp - 0.3;
  }
  if (utilityType === 'electricity') {
    if (room === 'Kitchen') return baseTemp + 0.4;
    if (room === 'Living / Dining') return baseTemp + 0.1;
    return baseTemp - 0.1;
  }
  if (room === 'Living / Dining') return baseTemp + 0.4;
  if (room.startsWith('Bedroom')) return baseTemp - 0.2;
  if (room === 'Bathroom') return baseTemp + 0.3;
  return baseTemp;
}

function buildWhyHigh(unit: UnitForecastRow, rooms: RoomBreakdownItem[], utilityType: UtilityType) {
  const topRoom = [...rooms].sort((a, b) => b.value - a.value)[0];
  const averageTemp = unit.avg_room_temperature_c ?? 21.4;
  const valve = unit.avg_valve_open_pct ?? 58;
  const windowRisk = unit.avg_window_open_risk ?? 0.28;
  const reasons = [
    `Average room temperature is ${formatTemp(averageTemp)}, higher than similar stable flats.`,
    `${formatUtility(utilityType)} is concentrated in ${topRoom?.room ?? 'the top room'} at ${topRoom?.share_pct.toFixed(0) ?? '-'}% of the visible room view.`,
  ];
  if (utilityType === 'heating') {
    reasons.push(`Heating valve opening is around ${Math.round(valve)}%, so heating demand remains elevated.`);
  } else if (utilityType === 'water') {
    reasons.push('Bathroom and kitchen usage should be checked first because they drive most water demand.');
  } else {
    reasons.push('Kitchen and living-area appliance load should be reviewed first.');
  }
  if (windowRisk >= 0.2) reasons.push(`Window-open risk is estimated at ${(windowRisk * 100).toFixed(0)}%, so heat loss may be adding avoidable demand.`);
  return reasons.slice(0, 4);
}

function buildRecommendations(
  unit: UnitForecastRow,
  rooms: RoomBreakdownItem[],
  utilityType: UtilityType,
  property?: PropertySummary | null
): Recommendation[] {
  const baseSavings = estimateSavingsRange(unit);
  const baseCo2 = estimateCo2SavingsRange(unit);
  const topRoom = [...rooms].sort((a, b) => b.value - a.value)[0];
  const context = `${property?.display_name ?? unit.property_id} · ${unit.unit_display_name} · ${unit.tenant_display_name}`;

  if (utilityType === 'water') {
    return [
      {
        title: 'Inspect bathroom fixtures first',
        context,
        message: 'Check showers, toilet refill behaviour, and slow leaks before inspecting other rooms.',
        priority: 'High',
        savings_eur: baseSavings,
        savings_co2_kg: baseCo2,
        icon: <Droplets size={18} />,
      },
      {
        title: 'Review kitchen taps and dishwasher cycles',
        context,
        message: 'Kitchen water use is the second most useful place to check for quick reductions.',
        priority: 'Medium',
        savings_eur: scaleRange(baseSavings, 0.45),
        savings_co2_kg: scaleRange(baseCo2, 0.45),
        icon: <Wrench size={18} />,
      },
      {
        title: 'Message tenant with a simple checklist',
        context,
        message: `${unit.tenant_display_name} can be asked to report dripping taps, toilet refill noise, or unusually long hot-water runs.`,
        priority: 'Low',
        savings_eur: scaleRange(baseSavings, 0.25),
        savings_co2_kg: scaleRange(baseCo2, 0.25),
        icon: <User size={18} />,
      },
    ];
  }

  if (utilityType === 'electricity') {
    return [
      {
        title: 'Check kitchen and always-on appliances',
        context,
        message: `${topRoom?.room ?? 'The top room'} is driving the electricity view. Start with dishwasher, cooking equipment, chargers, and standby devices.`,
        priority: 'High',
        savings_eur: baseSavings,
        savings_co2_kg: baseCo2,
        icon: <Bolt size={18} />,
      },
      {
        title: 'Cut evening peak usage',
        context,
        message: 'Ask the tenant to avoid running multiple high-load appliances at the same time when possible.',
        priority: 'Medium',
        savings_eur: scaleRange(baseSavings, 0.55),
        savings_co2_kg: scaleRange(baseCo2, 0.55),
        icon: <Gauge size={18} />,
      },
      {
        title: 'Review appliance age if usage stays high',
        context,
        message: 'If this flat remains above forecast, old kitchen or laundry appliances are the best next inspection target.',
        priority: 'Low',
        savings_eur: scaleRange(baseSavings, 0.3),
        savings_co2_kg: scaleRange(baseCo2, 0.3),
        icon: <Wrench size={18} />,
      },
    ];
  }

  return [
    {
      title: 'Reduce heating setpoint by 1°C',
      context,
      message: `${topRoom?.room ?? 'The top room'} is carrying the highest heating share. A small setpoint reduction can lower cost without a major comfort drop.`,
      priority: 'High',
      savings_eur: baseSavings,
      savings_co2_kg: baseCo2,
      icon: <Star size={18} />,
    },
    {
      title: 'Encourage eco mode during daytime',
      context,
      message: 'Use eco mode when the flat is likely unoccupied, especially outside morning and evening comfort periods.',
      priority: 'Medium',
      savings_eur: scaleRange(baseSavings, 0.55),
      savings_co2_kg: scaleRange(baseCo2, 0.55),
      icon: <Leaf size={18} />,
    },
    {
      title: 'Check heat loss around windows',
      context,
      message: 'Window sealing and short ventilation habits should be reviewed if the flat stays above forecast.',
      priority: 'Low',
      savings_eur: scaleRange(baseSavings, 0.25),
      savings_co2_kg: scaleRange(baseCo2, 0.25),
      icon: <Wrench size={18} />,
    },
  ];
}

function buildUnitEvidence(
  unit: UnitForecastRow,
  rows: DailyForecastRow[],
  rooms: RoomBreakdownItem[]
): UnitEvidence {
  const sortedRows = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  const peakDay = sortedRows.reduce<DailyForecastRow | null>(
    (peak, row) =>
      !peak || (row.predicted_energy_kwh ?? 0) > (peak.predicted_energy_kwh ?? 0)
        ? row
        : peak,
    null
  );
  const peakDayIndex = peakDay
    ? Math.max(0, sortedRows.findIndex((row) => row.date === peakDay.date))
    : 0;
  const averageDayKwh =
    sortedRows.length > 0
      ? sortedRows.reduce((sum, row) => sum + (row.predicted_energy_kwh ?? 0), 0) / sortedRows.length
      : 0;
  const dailyDeltaPct =
    peakDay && averageDayKwh > 0
      ? (((peakDay.predicted_energy_kwh ?? 0) - averageDayKwh) / averageDayKwh) * 100
      : 0;
  const weeks = chunkForecastRows(sortedRows, 7).map(sumForecastRows);
  const peakWeekIndex = weeks.reduce(
    (maxIndex, week, index) =>
      week.predicted_energy_kwh > (weeks[maxIndex]?.predicted_energy_kwh ?? -1)
        ? index
        : maxIndex,
    0
  );
  const roomDriver = [...rooms].sort((a, b) => b.value - a.value)[0] ?? null;
  const signalSource = peakDay ?? sortedRows[0] ?? null;
  const signals = buildEvidenceSignals(unit, signalSource, roomDriver, dailyDeltaPct);

  return {
    peak_day: peakDay,
    peak_day_index: peakDayIndex,
    peak_week_index: peakWeekIndex,
    peak_week: weeks[peakWeekIndex] ?? { predicted_energy_kwh: 0, predicted_cost_eur: 0, predicted_co2_kg: 0 },
    average_day_kwh: averageDayKwh,
    daily_delta_pct: dailyDeltaPct,
    room_driver: roomDriver,
    signals,
  };
}

function buildEvidenceSignals(
  unit: UnitForecastRow,
  row: DailyForecastRow | null,
  roomDriver: RoomBreakdownItem | null,
  deltaPct: number
) {
  const signals: string[] = [];
  if (row) {
    signals.push(
      `${formatFullDate(row.date)} is the strongest forecast day at ${formatKwh(row.predicted_energy_kwh)}.`
    );
    if (deltaPct > 0) {
      signals.push(`That day is ${deltaPct.toFixed(0)}% above this flat's own daily average.`);
    }
    if (typeof row.heater_setpoint_c === 'number') {
      signals.push(`Setpoint signal: ${formatTemp(row.heater_setpoint_c)} on the peak day.`);
    }
    if (typeof row.radiator_valve_open_pct === 'number') {
      signals.push(`Radiator valve signal: ${Math.round(row.radiator_valve_open_pct)}% opening on the peak day.`);
    }
    if (typeof row.window_open_risk === 'number') {
      signals.push(`Window-open risk signal: ${(row.window_open_risk * 100).toFixed(0)}% estimated risk.`);
    }
  }
  if (roomDriver) {
    signals.push(
      `Likely room driver: ${roomDriver.room} with ${roomDriver.share_pct.toFixed(0)}% of the demo room-level split.`
    );
  }
  if (!signals.length) {
    signals.push(`${unit.unit_display_name} is high mainly because its 7-day forecast is above the selected property average.`);
  }
  return signals.slice(0, 5);
}

function buildTenantNoticeDraft(
  unit: UnitForecastRow,
  property: PropertySummary | null,
  evidence: UnitEvidence,
  recommendations: Recommendation[]
) {
  const firstAction = recommendations[0];
  const room = evidence.room_driver?.room ?? 'the main heated room';
  const peakDate = evidence.peak_day ? formatFullDate(evidence.peak_day.date) : 'the next forecast window';
  const saving = firstAction
    ? `${formatCurrency(firstAction.savings_eur[0])} - ${formatCurrency(firstAction.savings_eur[1])}`
    : `${formatCurrency(estimateSavingsRange(unit)[0])} - ${formatCurrency(estimateSavingsRange(unit)[1])}`;

  return `Hi ${unit.tenant_display_name}, your flat at ${property?.display_name ?? 'the property'} is forecast to use more energy than expected. The highest forecast day is ${peakDate}, and the strongest demo signal points to ${room}. Please ${firstAction?.title.toLowerCase() ?? 'review heating settings'} this week. Estimated saving if addressed: ${saving}. This notice is based on demo forecast and unit-level sensor simulation, not measured room-level billing data.`;
}

function chunkForecastRows(rows: DailyForecastRow[], size: number) {
  const chunks: DailyForecastRow[][] = [];
  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size));
  }
  return chunks;
}

function readTenantNoticeMap(): Record<string, TenantNotice> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem('techem_demo_tenant_notices');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeTenantNoticeMap(notices: Record<string, TenantNotice>) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem('techem_demo_tenant_notices', JSON.stringify(notices));
  } catch {
    // Demo-only queue: ignore storage failure and keep the in-memory state.
  }
}

function estimateSavingsRange(unit: UnitForecastRow): [number, number] {
  const cost = unit.sevenDay.predicted_cost_eur || 0;
  const multiplier = unit.risk_label === 'High forecast' ? [0.14, 0.22] : unit.risk_label === 'Needs attention' ? [0.08, 0.14] : [0.04, 0.08];
  return [cost * multiplier[0], cost * multiplier[1]];
}

function estimateCo2SavingsRange(unit: UnitForecastRow): [number, number] {
  const co2 = unit.sevenDay.predicted_co2_kg || 0;
  const multiplier = unit.risk_label === 'High forecast' ? [0.14, 0.22] : unit.risk_label === 'Needs attention' ? [0.08, 0.14] : [0.04, 0.08];
  return [co2 * multiplier[0], co2 * multiplier[1]];
}

function scaleRange(range: [number, number], scale: number): [number, number] {
  return [range[0] * scale, range[1] * scale];
}

function riskLabelForRank(index: number, total: number) {
  if (total <= 1) return 'Stable forecast';
  if (index === 0) return 'High forecast';
  if (index < Math.ceil(total * 0.35)) return 'Needs attention';
  return 'Stable forecast';
}

function filterUnitRows(rows: UnitForecastRow[], filter: UnitRiskFilter) {
  if (filter === 'all') return rows;
  if (filter === 'high') return rows.filter((row) => row.risk_label === 'High forecast');
  if (filter === 'attention') return rows.filter((row) => row.risk_label === 'Needs attention');
  return rows.filter((row) => row.risk_label === 'Stable forecast');
}

function riskDetail(label: string) {
  if (label === 'High forecast') return 'Above average usage';
  if (label === 'Needs attention') return 'Review this flat';
  return 'Within expected range';
}

function shortRiskLabel(label: string) {
  if (label === 'High forecast') return 'High';
  if (label === 'Needs attention') return 'Medium';
  return 'Low';
}

function roomMapClass(room: string) {
  if (room === 'Living / Dining') return 'md:col-span-2 md:row-span-2';
  if (room === 'Master Bedroom') return 'md:col-span-2';
  if (room === 'Hallway') return 'md:col-span-2';
  return 'md:col-span-1';
}

function roomStatusTone(status: RoomStatus) {
  if (status === 'very-high') return 'border-red-200 bg-red-50 text-primary';
  if (status === 'high') return 'border-orange-200 bg-orange-50 text-orange-600';
  if (status === 'medium') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-green-200 bg-green-50 text-green-700';
}

function roomLegendDot(status: RoomStatus) {
  if (status === 'very-high') return 'bg-red-500';
  if (status === 'high') return 'bg-orange-400';
  if (status === 'medium') return 'bg-amber-400';
  return 'bg-green-500';
}

function formatRoomStatus(status: RoomStatus) {
  if (status === 'very-high') return 'Very High';
  if (status === 'high') return 'High';
  if (status === 'medium') return 'Medium';
  return 'Low';
}

function topUtilityShare(rooms: RoomBreakdownItem[]) {
  const total = rooms.reduce((sum, room) => sum + room.value, 0) || 1;
  const top = rooms.reduce((max, room) => Math.max(max, room.value), 0);
  return `${Math.round((top / total) * 100)}%`;
}

function yAxisLabel(utilityType: UtilityType) {
  if (utilityType === 'water') return 'L';
  return 'kWh';
}

function roomRangeLabel(range: RoomComparisonRange) {
  if (range === '7d') return '7d';
  if (range === '30d') return '30d';
  return 'previous month estimate';
}

function unitTitle(unit: UnitForecastRow | PropertyUnitSummary) {
  return `Unit ${unit.unit_number} - ${unit.tenant_display_name}`;
}

function initials(name?: string | null) {
  if (!name) return 'ND';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'ND';
}

function average(values: Array<number | null | undefined>) {
  const finite = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (!finite.length) return null;
  return finite.reduce((sum, value) => sum + value, 0) / finite.length;
}

function formatKwh(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return '-';
  return `${Math.round(value).toLocaleString('de-DE')} kWh`;
}

function formatCurrency(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return '-';
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
}

function formatKg(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return '-';
  return `${Math.round(value).toLocaleString('de-DE')} kg`;
}

function formatM2(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return '-';
  return `${Math.round(value).toLocaleString('de-DE')} m2`;
}

function formatTemp(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return '-';
  return `${value.toFixed(1)}°C`;
}

function formatFullDate(date: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${date.slice(0, 10)}T00:00:00`));
}

function formatDateTime(date: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

function formatUtility(value: UtilityType) {
  if (value === 'heating') return 'Heating';
  if (value === 'electricity') return 'Electricity';
  return 'Water';
}

function formatScenario(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function fallbackLiveProgress(scenario: LiveScenario) {
  if (scenario === 'high_usage') return 0.56;
  if (scenario === 'cold_snap') return 0.48;
  if (scenario === 'eco_mode') return 0.34;
  return 0.42;
}

function scenarioEnergyMultiplier(scenario: LiveScenario) {
  if (scenario === 'cold_snap') return 1.14;
  if (scenario === 'high_usage') return 1.18;
  if (scenario === 'eco_mode') return 0.88;
  return 1;
}

function scenarioRoomTempDelta(scenario: LiveScenario) {
  if (scenario === 'cold_snap') return -0.25;
  if (scenario === 'high_usage') return 0.35;
  if (scenario === 'eco_mode') return -0.45;
  return 0;
}

function scenarioSetpointDelta(scenario: LiveScenario) {
  if (scenario === 'cold_snap') return 0.25;
  if (scenario === 'high_usage') return 0.5;
  if (scenario === 'eco_mode') return -0.9;
  return 0;
}

function scenarioValveDelta(scenario: LiveScenario) {
  if (scenario === 'cold_snap') return 14;
  if (scenario === 'high_usage') return 12;
  if (scenario === 'eco_mode') return -18;
  return 0;
}

function scenarioHumidityDelta(scenario: LiveScenario) {
  if (scenario === 'cold_snap') return -1;
  if (scenario === 'high_usage') return 0.6;
  if (scenario === 'eco_mode') return 0.8;
  return 0;
}

function scenarioWindowRiskDelta(scenario: LiveScenario) {
  if (scenario === 'cold_snap') return -0.05;
  if (scenario === 'high_usage') return 0.12;
  if (scenario === 'eco_mode') return -0.04;
  return 0;
}

function scenarioHeatingMode(scenario: LiveScenario) {
  if (scenario === 'eco_mode') return 'eco';
  if (scenario === 'cold_snap') return 'boost';
  if (scenario === 'high_usage') return 'comfort';
  return 'comfort';
}

function clampLiveValue(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function roundLiveValue(value: number) {
  return Math.round(value * 1000) / 1000;
}

function liveRiskLabel(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return '-';
  if (value >= 0.6) return 'High';
  if (value >= 0.3) return 'Medium';
  return 'Low';
}

function formatRoomValue(value: number, utilityType: UtilityType) {
  if (utilityType === 'water') return `${Math.round(value).toLocaleString('de-DE')} L`;
  return formatKwh(value);
}
