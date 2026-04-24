/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EvidenceAuthorityAssessment,
  HistoricalTrustAssessment,
  ForecastReadinessAssessment,
  EconomicValueAssessment,
  AdversarialObjection,
  AdversarialObjectionResult,
} from '../types';

interface AdversarialInput {
  objectId: string;
  evidence: EvidenceAuthorityAssessment;
  trust: HistoricalTrustAssessment;
  readiness: ForecastReadinessAssessment;
  economic: EconomicValueAssessment;
}

function buildSeverityRank(severity: AdversarialObjection['severity']) {
  return { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 }[severity];
}

export function assessAdversarialObjections(input: AdversarialInput): AdversarialObjectionResult {
  const objections: AdversarialObjection[] = [];
  const { objectId, evidence, trust, readiness, economic } = input;

  // Audit Hardening: Check for simulated truth barriers
  if (trust.trustStatus === 'REVIEW' && economic.annualCostExposureEur > 10000) {
    objections.push({
      id: `obj-sim-${objectId}`,
      type: 'GOVERNANCE',
      severity: 'HIGH',
      title: 'Operational data source is not verified',
      objection: 'The current optimization findings are based on simulated or fallback sensor logic. Decisions based on these inputs lack live evidence authority.',
      whyItMatters: 'Jury and Board members will reject cost-saving claims if they are derived from unvalidated telemetry.',
      requiredResolution: 'Confirm live sensor connectivity or acknowledge simulation boundaries in the final dossier.',
    });
  }

  if (economic.annualCostExposureEur > 50000 && evidence.proofLevel !== 'FULLY_VERIFIED') {
    objections.push({
      id: `obj-cfo-${objectId}`,
      type: 'CFO',
      severity: 'HIGH',
      title: 'Financial exposure exceeds evidence confidence',
      objection:
        'The projected annual cost exposure is material, but the evidence base is not strong enough to treat this as investment-grade truth.',
      whyItMatters:
        'A CFO will challenge budget impact claims if the underlying evidence remains review-bound.',
      requiredResolution:
        'Strengthen evidence completeness and confirm the forecast baseline before using the value in investment or budget decisions.',
    });
  }

  if (trust.trustStatus !== 'TRUST') {
    objections.push({
      id: `obj-governance-${objectId}`,
      type: 'GOVERNANCE',
      severity: trust.trustStatus === 'HIGH RISK' ? 'CRITICAL' : 'HIGH',
      title: 'Historical evidence governance is incomplete',
      objection:
        'Historical evidence quality and traceability are not strong enough to support unqualified executive recommendations.',
      whyItMatters:
        'Governance review will question whether the system can prove why its conclusions are safe to act on.',
      requiredResolution:
        'Resolve historical trust weaknesses, mapping ambiguity, and missing evidence before escalation.',
    });
  }

  if (readiness.readinessStatus !== 'READY') {
    objections.push({
      id: `obj-regulatory-${objectId}`,
      type: 'REGULATORY',
      severity: readiness.readinessStatus === 'NOT READY' ? 'CRITICAL' : 'MEDIUM',
      title: 'Forecast readiness is not fully established',
      objection:
        'Forecast-dependent statements are not yet fully supportable because readiness checks are not satisfied.',
      whyItMatters:
        'Regulatory and reporting-sensitive outputs should not rely on forecast logic that is still review-bound.',
      requiredResolution:
        'Restore forecast readiness before using future-facing claims in management or reporting contexts.',
    });
  }

  if (economic.decisionPriority === 'HIGH' && economic.businessConfidence !== 'TRUST') {
    objections.push({
      id: `obj-investment-${objectId}`,
      type: 'INVESTMENT',
      severity: 'HIGH',
      title: 'High-priority action is suggested under constrained confidence',
      objection:
        'The business case looks important, but recommendation confidence is not yet strong enough for direct capital action.',
      whyItMatters:
        'Investment committees will reject decisions that are economically strong but evidentially fragile.',
      requiredResolution:
        'Run human review and confirm unresolved assumptions before investment escalation.',
    });
  }

  if (!objections.length) {
    objections.push({
      id: `obj-default-${objectId}`,
      type: 'GOVERNANCE',
      severity: 'LOW',
      title: 'No critical objection currently active',
      objection:
        'No major unresolved objection is currently blocking managed recommendation use.',
      whyItMatters:
        'The system can explain its current decision path without a major contradiction.',
      requiredResolution:
        'Continue routine monitoring and preserve traceability for future reviews.',
    });
  }

  const sorted = [...objections].sort(
    (a, b) => buildSeverityRank(b.severity) - buildSeverityRank(a.severity)
  );

  const top = sorted[0];
  const criticalBlocker =
    sorted.find((item) => item.severity === 'CRITICAL')?.title ?? null;

  return {
    objectId,
    weakestObjection: top.objection,
    objectionSeverity: top.severity,
    criticalBlocker,
    objections: sorted,
    answerabilityStatus:
      criticalBlocker
        ? 'UNANSWERABLE'
        : top.severity === 'HIGH'
        ? 'PARTIALLY_ANSWERABLE'
        : 'ANSWERABLE',
    boardEscalationRequired:
      Boolean(criticalBlocker) || top.severity === 'HIGH' || top.severity === 'CRITICAL',
    calculatedAt: new Date().toISOString(),
  };
}
