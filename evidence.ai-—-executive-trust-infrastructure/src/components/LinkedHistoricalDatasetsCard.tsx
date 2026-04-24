/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Database, Calendar, MapPin, Gauge, ShieldCheck, ArrowRight } from 'lucide-react';
import { HistoricalDataset, TrustDecision } from '../types';
import { cn } from '../lib/utils';

interface LinkedHistoricalDatasetsCardProps {
  datasets: HistoricalDataset[];
  onViewAll?: () => void;
}

export function LinkedHistoricalDatasetsCard({
  datasets,
  onViewAll,
}: LinkedHistoricalDatasetsCardProps) {
  if (!datasets.length) return null;

  return (
    <div className="bg-white rounded-2xl border border-surface-variant shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-surface-variant bg-background/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database size={16} className="text-secondary" />
          <h3 className="text-xs font-black text-on-surface uppercase tracking-widest">Linked Evidence</h3>
        </div>
        <span className="text-[10px] font-bold text-outline uppercase">{datasets.length} Datasets</span>
      </div>

      <div className="flex-1 divide-y divide-surface-variant overflow-y-auto max-h-[300px]">
        {datasets.map((dataset) => (
          <div key={dataset.id} className="p-4 hover:bg-background/50 transition-colors">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <div className="text-sm font-bold text-on-surface truncate max-w-[200px]">{dataset.name}</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <MapPin size={10} className="text-outline" />
                  <span className="text-[10px] text-outline">{dataset.city}, {dataset.zipcode}</span>
                </div>
              </div>
              <StatusIcon status={dataset.validationStatus} />
            </div>

            <div className="grid grid-cols-2 gap-2 mt-3 text-[10px]">
              <div className="flex items-center gap-1 text-outline">
                <Calendar size={10} />
                <span>{dataset.dateRange.start} - {dataset.dateRange.end}</span>
              </div>
              <div className="flex items-center gap-1 text-outline justify-end">
                <Gauge size={10} />
                <span>{dataset.recordCount} Records</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {onViewAll && (
        <button 
          onClick={onViewAll}
          className="p-3 bg-background border-t border-surface-variant text-[10px] font-black text-outline uppercase tracking-[0.2em] hover:text-primary hover:bg-white transition-all flex items-center justify-center gap-2"
        >
          Manage All Evidence <ArrowRight size={12} />
        </button>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: TrustDecision }) {
  if (status === 'TRUST') return <ShieldCheck size={14} className="text-green-600" />;
  if (status === 'REVIEW') return <ShieldCheck size={14} className="text-orange-500 opacity-50" />;
  return <Database size={14} className="text-error opacity-50" />;
}
