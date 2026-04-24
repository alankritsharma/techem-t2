/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Droplets, Car, Flame, Home, Sparkles } from 'lucide-react';
import { OptimizationSnapshot } from '../types';
import { cn } from '../lib/utils';

interface OptimizationActionPanelProps {
  snapshot: OptimizationSnapshot;
}

export function OptimizationActionPanel({ snapshot }: OptimizationActionPanelProps) {
  return (
    <section id="optimization-action-panel" className="bg-white rounded-xl border border-surface-variant shadow-sm overflow-hidden">
      <div className="p-5 border-b border-surface-variant bg-background/30">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-xl text-primary">
            <Sparkles size={20} />
          </div>
          <div>
            <div className="text-lg font-bold text-on-surface">Optimization Action Panel</div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-outline mt-1">
              Preventive tenant and usage optimization
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {snapshot.topPriority && (
          <div className="rounded-2xl border border-surface-variant bg-background p-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-outline mb-2">
              Top Priority
            </div>
            <div className="text-base font-black text-on-surface mb-1">
              {snapshot.topPriority.issue}
            </div>
            <div className="text-sm text-outline mb-2">
              {snapshot.topPriority.recommendedAction}
            </div>
            <div className="text-sm font-bold text-primary">
              {snapshot.topPriority.economicImpact}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {snapshot.recommendations.map((rec, index) => (
            <div key={`${rec.category}-${index}`} className="rounded-xl border border-surface-variant bg-background p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <CategoryIcon category={rec.category} />
                  <div className="text-sm font-bold text-on-surface capitalize">{rec.category}</div>
                </div>
                <span
                  className={cn(
                    'text-[9px] font-black px-2 py-1 rounded uppercase tracking-widest border',
                    rec.severity === 'HIGH'
                      ? 'bg-error-container text-error border-error/30'
                      : rec.severity === 'MEDIUM'
                      ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                      : 'bg-green-50 text-green-700 border-green-200'
                  )}
                >
                  {rec.severity}
                </span>
              </div>

              <div className="text-sm font-bold text-on-surface mb-2">{rec.issue}</div>
              <div className="text-sm text-outline mb-3">{rec.recommendedAction}</div>
              <div className="text-sm font-bold text-primary">{rec.economicImpact}</div>
              {rec.co2Impact && <div className="text-xs text-outline mt-2">{rec.co2Impact}</div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CategoryIcon({ category }: { category: 'water' | 'moisture' | 'heating' | 'ev' }) {
  switch (category) {
    case 'water':
      return <Droplets size={16} className="text-primary" />;
    case 'moisture':
      return <Home size={16} className="text-primary" />;
    case 'heating':
      return <Flame size={16} className="text-primary" />;
    case 'ev':
      return <Car size={16} className="text-primary" />;
    default:
      return <Sparkles size={16} className="text-primary" />;
  }
}
