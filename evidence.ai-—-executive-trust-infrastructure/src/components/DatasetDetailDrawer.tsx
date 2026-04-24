/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, FileText, Database, MapPin, Gauge, Thermometer, ShieldCheck, AlertTriangle } from 'lucide-react';
import { HistoricalDataset, HistoricalRecord, BuildingObject, TrustDecision } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface DatasetDetailDrawerProps {
  dataset: HistoricalDataset;
  records: HistoricalRecord[];
  linkedObject: BuildingObject | null;
  onClose: () => void;
  onAutoCreate?: () => void;
}

export function DatasetDetailDrawer({
  dataset,
  records,
  linkedObject,
  onClose,
  onAutoCreate,
}: DatasetDetailDrawerProps) {
  const stats = {
    avgUsage: records.length ? (records.reduce((acc, r) => acc + r.energyUsageKwh, 0) / records.length).toFixed(1) : '0',
    avgTemp: records.length ? (records.reduce((acc, r) => acc + r.meanOutsideTemperatureC, 0) / records.length).toFixed(1) : '0',
    totalCo2: records.length ? (records.reduce((acc, r) => acc + r.co2EmissionsG, 0) / 1000).toFixed(1) : '0',
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex justify-end">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="relative w-full max-w-xl bg-white h-full shadow-2xl flex flex-col"
        >
          <div className="p-6 border-b border-surface-variant flex items-center justify-between bg-background/50">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-xl text-primary">
                <Database size={20} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-on-surface leading-tight">Dataset: {dataset.name}</h3>
                <p className="text-[10px] font-bold text-outline uppercase tracking-[0.2em] mt-0.5">Historical Evidence Artifact</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-surface-variant rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-background rounded-2xl border border-surface-variant">
                <div className="text-[10px] font-black text-outline uppercase tracking-widest mb-1">Status</div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={dataset.validationStatus} />
                </div>
              </div>
              <div className="p-4 bg-background rounded-2xl border border-surface-variant">
                <div className="text-[10px] font-black text-outline uppercase tracking-widest mb-1">Object Link</div>
                <div className="text-sm font-bold text-on-surface">
                  {linkedObject ? linkedObject.name : 'Unlinked Dataset'}
                </div>
              </div>
            </div>

            <section>
              <SectionTitle icon={MapPin} title="Property Context" />
              <div className="grid grid-cols-2 gap-y-4 mt-4">
                <StatItem label="Property ID" value={dataset.propertyId} />
                <StatItem label="Location" value={`${dataset.city} (${dataset.zipcode})`} />
                <StatItem label="Energy Source" value={dataset.energySource} />
                <StatItem label="Imported At" value={new Date(dataset.importedAt).toLocaleDateString()} />
              </div>
            </section>

            <section>
              <SectionTitle icon={Gauge} title="Time Series Summary" />
              <div className="grid grid-cols-3 gap-3 mt-4">
                <MetricCard icon={Database} label="Records" value={String(dataset.recordCount)} />
                <MetricCard icon={Gauge} label="Avg Usage" value={stats.avgUsage} unit="kWh" />
                <MetricCard icon={Thermometer} label="Avg Temp" value={stats.avgTemp} unit="°C" />
              </div>
              <div className="mt-4 p-4 bg-background rounded-2xl border border-surface-variant flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-black text-outline uppercase tracking-widest mb-0.5">Coverage Span</div>
                  <div className="text-sm font-bold text-on-surface">
                    {dataset.dateRange.start} — {dataset.dateRange.end}
                  </div>
                </div>
                <div className="text-right">
                    <div className="text-[10px] font-black text-outline uppercase tracking-widest mb-0.5">Total Emissions</div>
                    <div className="text-sm font-bold text-on-surface">{stats.totalCo2} kg CO2e</div>
                </div>
              </div>
            </section>

            <section>
              <SectionTitle icon={ShieldCheck} title="Validation & Trust" />
              <div className="mt-4 space-y-3">
                {dataset.issues.length === 0 ? (
                  <div className="flex items-center gap-3 p-4 bg-green-50 rounded-2xl border border-green-100 text-green-800">
                    <ShieldCheck size={20} className="text-green-600" />
                    <div>
                      <div className="text-sm font-bold">No structural issues detected</div>
                      <div className="text-[11px]">Dataset aligns with sample portfolio schema reference.</div>
                    </div>
                  </div>
                ) : (
                  dataset.issues.map((issue, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-4 bg-orange-50 rounded-2xl border border-orange-100 text-orange-800">
                      <AlertTriangle size={20} className="text-orange-600 shrink-0 mt-0.5" />
                      <div className="text-sm font-medium">{issue}</div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          <div className="p-6 border-t border-surface-variant bg-white flex items-center gap-3">
            {!dataset.objectId && onAutoCreate && (
              <button
                onClick={onAutoCreate}
                className="flex-1 bg-primary text-white font-bold py-3 rounded-xl shadow-lg hover:bg-primary/90 transition-all active:scale-95"
              >
                Generate Building Object
              </button>
            )}
            <button
              onClick={onClose}
              className="flex-1 bg-background text-on-surface border border-surface-variant font-bold py-3 rounded-xl transition-all hover:border-on-surface"
            >
              Close Details
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: any; title: string }) {
  return (
    <div className="flex items-center gap-2 pb-2 border-b border-surface-variant">
      <Icon size={16} className="text-outline" />
      <h4 className="text-[11px] font-black text-outline uppercase tracking-widest">{title}</h4>
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-bold text-outline mb-0.5">{label}</div>
      <div className="text-sm font-bold text-on-surface">{value}</div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, unit }: { icon: any, label: string; value: string; unit?: string }) {
  return (
    <div className="p-3 bg-white border border-surface-variant rounded-xl shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <Icon size={14} className="text-outline/50" />
      </div>
      <div className="text-[9px] font-black text-outline uppercase tracking-widest mb-1">{label}</div>
      <div className="text-lg font-black text-on-surface leading-none">
        {value}
        {unit && <span className="text-[10px] ml-1 font-bold text-outline">{unit}</span>}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: TrustDecision }) {
  const styles = {
    TRUST: "bg-green-100 text-green-800 border-green-200",
    REVIEW: "bg-orange-100 text-orange-800 border-orange-200",
    "HIGH RISK": "bg-red-100 text-red-800 border-red-200",
  };
  return (
    <span className={cn("text-[10px] font-black px-2 py-1 rounded-lg border uppercase tracking-widest", styles[status])}>
      {status === 'TRUST' ? 'Approved' : status}
    </span>
  );
}
