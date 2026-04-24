import { useMemo, useState } from 'react';

type UtilityType = 'heating' | 'electricity' | 'water';
type RiskLevel = 'Low' | 'Medium' | 'High';

interface ApartmentBlueprintProps {
  roomCount: number;
  unitName: string;
  tenantName?: string;
  unitNumber?: string | number;
  livingSpaceM2?: number;
  totalEnergyKwh?: number;
  totalCostEur?: number;
  totalCo2Kg?: number;
  liveState?: {
    room_temperature_c?: number;
    heater_setpoint_c?: number;
    radiator_valve_open_pct?: number;
    humidity_pct?: number;
    occupancy_proxy?: number;
    window_open_risk?: number;
    heating_mode?: string;
  };
}

interface RoomZone {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface RoomMetric extends RoomZone {
  value: number;
  share: number;
  risk: RiskLevel;
}

const BASE_ROOMS = [
  'Living / Dining',
  'Kitchen',
  'Bedroom 1',
  'Bedroom 2',
  'Bathroom',
  'Office',
  'Storage',
  'Laundry / Utility',
];

const BLUEPRINT_ZONES: RoomZone[] = [
  { id: 'living', label: 'Living / Dining', x: 220, y: 170, w: 290, h: 210 },
  { id: 'kitchen', label: 'Kitchen', x: 220, y: 42, w: 170, h: 128 },
  { id: 'bedroom1', label: 'Bedroom 1', x: 30, y: 250, w: 190, h: 130 },
  { id: 'bedroom2', label: 'Bedroom 2', x: 30, y: 42, w: 190, h: 126 },
  { id: 'bathroom', label: 'Bathroom', x: 510, y: 42, w: 120, h: 126 },
  { id: 'office', label: 'Office', x: 30, y: 168, w: 190, h: 82 },
  { id: 'storage', label: 'Storage', x: 630, y: 42, w: 100, h: 126 },
  { id: 'laundry', label: 'Laundry / Utility', x: 510, y: 250, w: 220, h: 130 },
];

export function ApartmentBlueprint({
  roomCount,
  unitName,
  tenantName = 'Demo tenant',
  unitNumber,
  livingSpaceM2,
  totalEnergyKwh = 0,
  totalCostEur,
  totalCo2Kg,
  liveState,
}: ApartmentBlueprintProps) {
  const [selectedUtility, setSelectedUtility] = useState<UtilityType>('heating');
  const visibleRooms = useMemo(() => buildRooms(roomCount), [roomCount]);
  const roomMetrics = useMemo(
    () => buildRoomMetrics(visibleRooms, selectedUtility, totalEnergyKwh),
    [visibleRooms, selectedUtility, totalEnergyKwh]
  );
  const visibleCount = visibleRooms.length;
  const capped = roomCount > visibleCount;

  return (
    <section className="rounded-xl border border-surface-variant bg-white shadow-sm overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-surface-variant px-4 py-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-primary">
            Demo apartment blueprint
          </div>
          <h2 className="mt-1 text-xl font-black text-on-surface">{unitName}</h2>
          <div className="mt-1 text-sm text-outline">
            {tenantName}
            {unitNumber != null ? ` · Unit ${unitNumber}` : ''}
            {roomCount ? ` · ${roomCount} registered rooms` : ''}
            {livingSpaceM2 ? ` · ${Math.round(livingSpaceM2).toLocaleString('de-DE')} m2` : ''}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <UtilityToggle value={selectedUtility} onChange={setSelectedUtility} />
          <div className="rounded-lg border border-surface-variant bg-background px-3 py-2 text-xs font-bold text-outline">
            {capped ? `Showing ${visibleCount} of ${roomCount} rooms` : `${visibleCount} zones shown`}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 p-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.45fr)]">
        <div>
          <div className="rounded-xl border border-red-100 bg-[#fffafa] p-3">
            <svg viewBox="0 0 760 430" role="img" aria-label={`${unitName} demo apartment blueprint`} className="h-auto w-full">
              <rect x="12" y="22" width="736" height="384" fill="#fffdfd" stroke="#8b0000" strokeWidth="4" />
              <path d="M220 22V406M510 22V406M12 168H220M12 250H220M220 170H748M510 250H748M390 22V170M630 22V170" fill="none" stroke="#b00012" strokeWidth="3" />
              <path d="M220 262 q44 0 44 44M510 248 q-42 0 -42 42M390 170 q0 -38 38 -38M630 170 q0 36 -36 36" fill="none" stroke="#b00012" strokeWidth="2" opacity="0.75" />
              <path d="M222 384H508" stroke="#b00012" strokeWidth="3" strokeDasharray="14 10" opacity="0.65" />
              <circle cx="360" cy="278" r="4" fill="#8b0000" opacity="0.65" />
              <circle cx="456" cy="278" r="4" fill="#8b0000" opacity="0.65" />

              {roomMetrics.map((room) => (
                <g key={room.id}>
                  <rect
                    x={room.x + 8}
                    y={room.y + 8}
                    width={room.w - 16}
                    height={room.h - 16}
                    rx="2"
                    fill={riskFill(room.risk)}
                    stroke={riskStroke(room.risk)}
                    strokeWidth="1"
                    opacity="0.88"
                  />
                  <text x={room.x + room.w / 2} y={room.y + room.h / 2 - 16} textAnchor="middle" className="fill-on-surface text-[13px] font-black">
                    {room.label}
                  </text>
                  <text x={room.x + room.w / 2} y={room.y + room.h / 2 + 6} textAnchor="middle" className="fill-on-surface text-[12px] font-bold">
                    {formatRoomValue(room.value, selectedUtility)}
                  </text>
                  <g transform={`translate(${room.x + room.w / 2 - 33}, ${room.y + room.h / 2 + 18})`}>
                    <rect width="66" height="22" rx="11" fill={riskBadgeFill(room.risk)} stroke={riskStroke(room.risk)} />
                    <text x="33" y="15" textAnchor="middle" className="text-[10px] font-black" fill={riskText(room.risk)}>
                      {room.risk}
                    </text>
                  </g>
                </g>
              ))}
            </svg>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-bold text-outline">
            <LegendDot risk="High" />
            <LegendDot risk="Medium" />
            <LegendDot risk="Low" />
          </div>

          <p className="mt-3 text-xs text-outline">
            Demo room-level breakdown derived from unit-level forecast/live data. This is not measured room-level billing data.
          </p>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-surface-variant bg-background p-4">
            <div className="text-sm font-black text-on-surface">Room-wise comparison</div>
            <div className="mt-1 text-xs text-outline">{formatUtility(selectedUtility)} estimate from unit total</div>
            <div className="mt-4 space-y-3">
              {[...roomMetrics].sort((a, b) => b.value - a.value).map((room) => (
                <div key={room.id}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                    <span className="font-bold text-on-surface">{room.label}</span>
                    <span className="font-black text-on-surface">{formatRoomValue(room.value, selectedUtility)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(8, room.share * 100)}%` }} />
                  </div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: riskText(room.risk) }}>
                    {room.risk} visual priority
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-surface-variant bg-white p-4">
            <div className="text-sm font-black text-on-surface">Unit forecast source</div>
            <div className="mt-3 grid grid-cols-1 gap-2 text-sm">
              <SourceRow label="Energy" value={formatKwh(totalEnergyKwh)} />
              <SourceRow label="Cost" value={formatCurrency(totalCostEur)} />
              <SourceRow label="CO2" value={formatKg(totalCo2Kg)} />
              {liveState?.room_temperature_c != null && <SourceRow label="Temp" value={`${liveState.room_temperature_c.toFixed(1)}°C`} />}
              {liveState?.heating_mode && <SourceRow label="Mode" value={liveState.heating_mode} />}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function UtilityToggle({ value, onChange }: { value: UtilityType; onChange: (value: UtilityType) => void }) {
  const options: Array<{ value: UtilityType; label: string }> = [
    { value: 'heating', label: 'Heating' },
    { value: 'electricity', label: 'Electricity' },
    { value: 'water', label: 'Water' },
  ];
  return (
    <div className="inline-flex rounded-xl border border-surface-variant bg-white p-1">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`rounded-lg px-3 py-2 text-xs font-black transition-colors ${
            value === option.value ? 'bg-primary text-white' : 'text-outline hover:text-on-surface'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function SourceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-outline">{label}</span>
      <span className="font-black text-on-surface">{value}</span>
    </div>
  );
}

function LegendDot({ risk }: { risk: RiskLevel }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: riskStroke(risk) }} />
      {risk}
    </div>
  );
}

function buildRooms(roomCount: number): RoomZone[] {
  const practicalCount = Math.max(3, Math.min(Math.round(roomCount || 3), 8));
  const labels = BASE_ROOMS.slice(0, practicalCount);
  return BLUEPRINT_ZONES.filter((zone) => labels.includes(zone.label));
}

function buildRoomMetrics(rooms: RoomZone[], utility: UtilityType, totalEnergyKwh: number): RoomMetric[] {
  const weights = allocationWeights(rooms, utility);
  const total = utility === 'water' ? totalEnergyKwh * 10 : utility === 'electricity' ? totalEnergyKwh * 0.26 : totalEnergyKwh;
  const maxShare = Math.max(...weights, 0);
  const averageShare = 1 / Math.max(rooms.length, 1);

  return rooms.map((room, index) => {
    const share = weights[index] ?? 0;
    return {
      ...room,
      value: total * share,
      share,
      risk: roomRisk(share, maxShare, averageShare),
    };
  });
}

function allocationWeights(rooms: RoomZone[], utility: UtilityType): number[] {
  const profiles: Record<UtilityType, Record<string, number>> = {
    heating: {
      'Living / Dining': 0.3,
      Kitchen: 0.12,
      'Bedroom 1': 0.2,
      'Bedroom 2': 0.16,
      Bathroom: 0.1,
      Office: 0.08,
      Storage: 0.03,
      'Laundry / Utility': 0.04,
    },
    electricity: {
      'Living / Dining': 0.22,
      Kitchen: 0.34,
      'Bedroom 1': 0.12,
      'Bedroom 2': 0.1,
      Bathroom: 0.06,
      Office: 0.14,
      Storage: 0.02,
      'Laundry / Utility': 0.12,
    },
    water: {
      'Living / Dining': 0.03,
      Kitchen: 0.3,
      'Bedroom 1': 0.02,
      'Bedroom 2': 0.02,
      Bathroom: 0.46,
      Office: 0.02,
      Storage: 0.01,
      'Laundry / Utility': 0.18,
    },
  };
  const raw = rooms.map((room) => profiles[utility][room.label] ?? 0.04);
  const total = raw.reduce((sum, value) => sum + value, 0) || 1;
  return raw.map((value) => value / total);
}

function roomRisk(share: number, maxShare: number, averageShare: number): RiskLevel {
  if (share === maxShare || share >= averageShare * 1.35) return 'High';
  if (share >= averageShare * 0.8) return 'Medium';
  return 'Low';
}

function riskFill(risk: RiskLevel) {
  if (risk === 'High') return '#fff1f1';
  if (risk === 'Medium') return '#fff8ed';
  return '#f9fffb';
}

function riskBadgeFill(risk: RiskLevel) {
  if (risk === 'High') return '#ffe1e1';
  if (risk === 'Medium') return '#fff1d6';
  return '#dcfce7';
}

function riskStroke(risk: RiskLevel) {
  if (risk === 'High') return '#e30613';
  if (risk === 'Medium') return '#d97706';
  return '#16a34a';
}

function riskText(risk: RiskLevel) {
  if (risk === 'High') return '#b00012';
  if (risk === 'Medium') return '#b45309';
  return '#15803d';
}

function formatUtility(value: UtilityType) {
  if (value === 'heating') return 'Heating';
  if (value === 'electricity') return 'Electricity';
  return 'Water';
}

function formatRoomValue(value: number, utility: UtilityType) {
  if (!Number.isFinite(value)) return '-';
  if (utility === 'water') return `${Math.round(value).toLocaleString('de-DE')} L`;
  return `${Math.round(value).toLocaleString('de-DE')} kWh`;
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
