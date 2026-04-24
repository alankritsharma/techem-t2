/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import {
  AlertCircle,
  Bell,
  Building2,
  CheckCircle2,
  CloudRain,
  FolderKanban,
  MapPin,
  ShieldCheck,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { cn } from '../lib/utils';
import {
  BuildingObject,
  BuildingProject,
  HistoricalDataset,
  HistoricalRecord,
  KPIProps,
  SensorSnapshot,
} from '../types';
import { WeatherImpactModule } from '../components/WeatherImpactModule';
import { HistoricalConsumptionModule } from '../components/HistoricalConsumptionModule';
import { SevenDayEnergyOutlook } from '../components/SevenDayEnergyOutlook';
import { HistoricalTrustCard } from '../components/HistoricalTrustCard';
import { ForecastReadinessCard } from '../components/ForecastReadinessCard';
import { LinkedHistoricalDatasetsCard } from '../components/LinkedHistoricalDatasetsCard';
import { EconomicValueValidationCard } from '../components/EconomicValueValidationCard';
import { EvidenceAuthorityCard } from '../components/EvidenceAuthorityCard';
import { DecisionResiliencePanel } from '../components/DecisionResiliencePanel';
import { ExecutiveDecisionCardV2 } from '../components/ExecutiveDecisionCardV2';
import { HumanReviewCheckpointCard } from '../components/HumanReviewCheckpointCard';
import { AdversarialChallengeModule } from '../components/AdversarialChallengeModule';
import { OptimizationActionPanel } from '../components/OptimizationActionPanel';
import { ReviewDossierCard } from '../components/ReviewDossierCard';
import { assessAdversarialObjections } from '../services/adversarialObjectionService';
import { evaluateRecommendationGate } from '../services/recommendationGatekeeperService';
import { buildExecutiveDecisionModel } from '../services/executiveDecisionModelService';
import { getOptimizationFindingsByObjectId } from '../services/optimizationService';
import { buildReviewDossier } from '../services/reviewDossierService';
import { getHumanReviewByObjectId } from '../services/humanReviewStore';
import { useObjectAssessments } from '../hooks/useObjectAssessments';

interface DashboardProps {
  currentObject: BuildingObject;
  objects: BuildingObject[];
  projects: BuildingProject[];
  historyRecords?: HistoricalRecord[];
  historyDatasets?: HistoricalDataset[];
  optimizationSnapshot: any | null;
  setTab?: (tab: any) => void;
}

export function Dashboard({
  currentObject,
  objects,
  projects,
  historyRecords = [],
  historyDatasets = [],
  optimizationSnapshot,
  setTab,
}: DashboardProps) {
  const [, setRefreshKey] = useState(0);

  const {
    objectDatasets,
    objectHistory,
    historicalTrust,
    forecastReadiness,
    economicValue,
    evidenceAuthority,
  } = useObjectAssessments({
    currentObject,
    historyRecords,
    historyDatasets,
  });

  if (!historicalTrust || !forecastReadiness || !economicValue || !evidenceAuthority) {
    return null;
  }

  const adversarialObjections = assessAdversarialObjections({
    objectId: currentObject.id,
    evidence: evidenceAuthority,
    trust: historicalTrust,
    readiness: forecastReadiness,
    economic: economicValue,
  });

  const optimizationFindings = useMemo(
    () => optimizationSnapshot?.recommendations ?? [],
    [optimizationSnapshot]
  );

  const recommendationGate = evaluateRecommendationGate({
    objectId: currentObject.id,
    evidence: evidenceAuthority,
    trust: historicalTrust,
    readiness: forecastReadiness,
    objections: adversarialObjections,
    economic: economicValue,
  });

  const executiveDecision = buildExecutiveDecisionModel({
    objectId: currentObject.id,
    evidence: evidenceAuthority,
    trust: historicalTrust,
    readiness: forecastReadiness,
    economic: economicValue,
    objections: adversarialObjections,
    gate: recommendationGate,
    optimizationFindings,
  });

  const [dossier, setDossier] = useState<any>(null);

  const handleGenerateDossier = () => {
    const newDossier = buildReviewDossier({
      objectId: currentObject.id,
      objectName: currentObject.name,
      historicalTrust,
      readiness: forecastReadiness,
      economicValue,
      optimizationFindings,
      sensorSource: optimizationSnapshot?.sensorSource ?? 'FALLBACK',
    });
    setDossier(newDossier);
  };

  const humanReview = getHumanReviewByObjectId(currentObject.id);

  const kpis: KPIProps[] = [
    {
      label: 'Managed Assets',
      value: String(objects.length).padStart(2, '0'),
      unit: 'Portfolio Coverage',
      change:
        economicValue.decisionPriority === 'HIGH' && projects.length === 0
          ? 'Exposure: No action project'
          : `${projects.length} Efficiency Projects`,
      trend: 'neutral',
      icon: Building2,
    },
    {
      label: 'Evidence Integrity',
      value: historicalTrust.trustStatus,
      unit: `Trust: ${historicalTrust.confidenceScore}/100`,
      change: `${objectDatasets.length} audit sources`,
      trend: 'neutral',
      icon: FolderKanban,
    },
    {
      label: 'Forecast Trust',
      value: forecastReadiness.readinessStatus,
      unit: currentObject.locationLabel,
      change: objectHistory.length ? `${objectHistory.length} verify points` : 'Zero evidence',
      trend: 'neutral',
      icon: CloudRain,
    },
    {
      label: 'Truth Authority',
      value: evidenceAuthority.proofLevel,
      unit: `Auth: ${evidenceAuthority.evidenceCompletenessScore}/100`,
      change: evidenceAuthority.evidenceClass,
      trend: 'neutral',
      icon: ShieldCheck,
    },
    {
      label: 'Governance State',
      value: executiveDecision.finalStatus,
      unit: humanReview?.status ?? 'AI_ASSESSED',
      change: recommendationGate.decision,
      trend: 'neutral',
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 pb-24 md:pb-8">
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="bg-white rounded-xl shadow-[0px_4px_24px_rgba(0,0,0,0.05)] border border-surface-variant p-6 flex flex-col md:flex-row items-start justify-between gap-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary-fixed/30 rounded-full blur-[80px] -mr-40 -mt-40 pointer-events-none" />

          <div className="flex items-center gap-6 z-10">
            <div className="w-20 h-20 rounded-2xl bg-primary text-white flex items-center justify-center border-4 border-white shadow-lg">
              <ShieldCheck size={40} strokeWidth={1.5} />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">
                  GOVERNANCE FOCUS: ASSET TARGET
                </span>
                <div className="h-[1px] w-12 bg-primary/20" />
              </div>

              <h2 className="text-2xl font-bold text-on-surface">{currentObject.name}</h2>

              <div className="flex flex-wrap items-center gap-3 mt-2">
                <div className="flex items-center gap-2 text-outline">
                  <MapPin size={14} />
                  <span className="text-xs font-medium">{currentObject.addressOriginal}</span>
                </div>

                <div
                  className={cn(
                    'text-[10px] font-extrabold px-3 py-1 rounded-lg border uppercase tracking-widest',
                    executiveDecision.finalStatus === 'TRUST'
                      ? 'bg-green-50 border-green-200 text-green-700'
                      : executiveDecision.finalStatus === 'REVIEW'
                      ? 'bg-yellow-50 border-yellow-200 text-yellow-700'
                      : executiveDecision.finalStatus === 'HIGH RISK'
                      ? 'bg-orange-50 border-orange-200 text-orange-700'
                      : 'bg-error-container border-error text-error'
                  )}
                >
                  {executiveDecision.finalStatus}
                </div>

                {currentObject.isLocalDraft && (
                  <div className="text-[10px] font-extrabold px-3 py-1 rounded-lg border uppercase tracking-widest bg-orange-50 border-orange-200 text-orange-700">
                    Local Draft
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 z-10 w-full md:w-auto min-w-[320px]">
            <div className="bg-background/50 border border-surface-variant rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-outline uppercase">
                  Weakest Assumption
                </span>
                <AlertCircle size={12} className="text-orange-500" />
              </div>
              <div className="text-xs font-bold text-on-surface">
                {executiveDecision.weakestAssumption}
              </div>
            </div>

            <div className="bg-primary text-white rounded-xl p-4 shadow-md">
              <div className="text-[10px] font-bold text-on-primary-container uppercase tracking-wider mb-1">
                Recommended Next Action
              </div>
              <div className="text-sm font-bold leading-snug">
                {executiveDecision.recommendedNextAction}
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold text-outline uppercase tracking-widest">
            Governance and Decision Layers
          </h3>
          <span className="text-xs font-medium text-secondary hover:underline cursor-pointer">
            Validation before recommendation
          </span>
        </div>

        <div className="flex overflow-x-auto gap-4 pb-4 no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
          {kpis.map((kpi, index) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className="min-w-[240px] bg-white rounded-xl p-6 shadow-sm border border-surface-variant flex-shrink-0 group hover:border-primary transition-all"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-outline uppercase tracking-wider">
                    {kpi.label}
                  </span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <CheckCircle2 size={10} className="text-green-600" />
                    <span className="text-[9px] font-bold text-green-700 uppercase">
                      Explicit State
                    </span>
                  </div>
                </div>
                <kpi.icon className="text-outline group-hover:text-primary transition-colors" size={20} />
              </div>

              <div className="text-3xl font-bold text-on-surface mb-2 break-words">{kpi.value}</div>

              <div className="flex justify-between items-end border-t border-surface-variant/30 pt-3 mt-3 gap-4">
                <span className="text-xs font-medium text-outline break-words">{kpi.unit}</span>
                <span className="text-[10px] font-bold text-primary uppercase text-right">
                  {kpi.change}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        <section className="xl:col-span-7 flex flex-col gap-8">
          <HistoricalConsumptionModule object={currentObject} historyRecords={objectHistory} />
          <SevenDayEnergyOutlook object={currentObject} records={objectHistory} />
          <ExecutiveDecisionCardV2 
            decision={executiveDecision} 
            gate={recommendationGate}
            evidence={evidenceAuthority}
          />
          <AdversarialChallengeModule objections={adversarialObjections} />
          <DecisionResiliencePanel
            decision={executiveDecision}
            objections={adversarialObjections}
            gate={recommendationGate}
          />
          
          <OptimizationActionPanel snapshot={optimizationSnapshot} />

          <section id="review-dossier-generation" className="p-8 bg-black text-white rounded-2xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-8 border border-white/10 relative overflow-hidden group">
            <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            <div className="z-10">
              <h3 className="text-xl font-black uppercase tracking-tight mb-2">Final Review Dossier</h3>
              <p className="text-sm text-gray-400 font-medium max-w-md">
                Generate the board-safe evidence dossier for final executive approval. 
                Integrates trust assessments, economic risk, and optimization findings.
              </p>
            </div>
            <button 
              onClick={handleGenerateDossier}
              className="z-10 px-8 py-4 bg-primary text-white text-xs font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-all shadow-lg border border-primary-container/20 group-hover:shadow-primary/20"
            >
              Generate Review Dossier
            </button>
          </section>
        </section>

        <div className="xl:col-span-5 flex flex-col gap-8">
          <EconomicValueValidationCard assessment={economicValue} projectCount={projects.length} />
          <EvidenceAuthorityCard assessment={evidenceAuthority} />
          <WeatherImpactModule object={currentObject} />
          <LinkedHistoricalDatasetsCard
            datasets={objectDatasets}
            onViewAll={() => setTab?.('reports')}
          />
          <HistoricalTrustCard assessment={historicalTrust} />
          <ForecastReadinessCard assessment={forecastReadiness} />
          <HumanReviewCheckpointCard
            objectId={currentObject.id}
            decision={executiveDecision}
            review={humanReview}
            onReviewChanged={() => setRefreshKey((prev) => prev + 1)}
          />

          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                <Bell className="text-primary" size={20} />
                Object Identity
              </h3>
            </div>

            <div className="flex flex-col gap-3">
              <InfoCard title="Original Address" value={currentObject.addressOriginal} status="neutral" />
              <InfoCard
                title="Validated Address"
                value={currentObject.addressValidated || 'Not yet validated'}
                status={currentObject.addressValidated ? 'good' : 'review'}
              />
            </div>
          </section>
        </div>
      </div>
      
      {dossier && (
        <ReviewDossierCard 
          dossier={dossier} 
          onClose={() => setDossier(null)} 
        />
      )}
    </div>
  );
}

function InfoCard({
  title,
  value,
  status,
}: {
  title: string;
  value: string;
  status: 'good' | 'review' | 'neutral';
}) {
  return (
    <div
      className={cn(
        'bg-white rounded-xl p-4 shadow-sm border',
        status === 'good'
          ? 'border-green-200'
          : status === 'review'
          ? 'border-orange-200'
          : 'border-surface-variant'
      )}
    >
      <div className="text-[10px] font-bold uppercase tracking-wider text-outline mb-2">
        {title}
      </div>
      <div className="text-sm font-bold text-on-surface leading-relaxed">{value}</div>
    </div>
  );
}
