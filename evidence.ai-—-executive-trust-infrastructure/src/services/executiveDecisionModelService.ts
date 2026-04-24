/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EvidenceAuthorityAssessment,
  HistoricalTrustAssessment,
  ForecastReadinessAssessment,
  EconomicValueAssessment,
  AdversarialObjectionResult,
  RecommendationGateResult,
  ExecutiveDecisionModelResult,
  OptimizationRecommendation,
} from '../types';

interface ExecutiveDecisionInput {
  objectId: string;
  evidence: EvidenceAuthorityAssessment;
  trust: HistoricalTrustAssessment;
  readiness: ForecastReadinessAssessment;
  economic: EconomicValueAssessment;
  objections: AdversarialObjectionResult;
  gate: RecommendationGateResult;
  optimizationFindings: OptimizationRecommendation[];
}

export function buildExecutiveDecisionModel(
  input: ExecutiveDecisionInput
): ExecutiveDecisionModelResult {
  const {
    objectId,
    evidence,
    trust,
    readiness,
    economic,
    objections,
    gate,
    optimizationFindings,
  } = input;

  const highRisks = optimizationFindings.filter((f) => f.severity === 'HIGH');
  const riskLevelPriority = highRisks.length >= 2 ? 'HIGH RISK' : highRisks.length === 1 ? 'REVIEW' : 'TRUST';

  let finalStatus: ExecutiveDecisionModelResult['finalStatus'] = 'TRUST';

  if (gate.decision === 'BLOCKED_DUE_TO_INSUFFICIENT_EVIDENCE') {
    finalStatus = 'BLOCKED';
  } else if (
    trust.trustStatus === 'HIGH RISK' ||
    readiness.readinessStatus === 'NOT READY' ||
    objections.objectionSeverity === 'CRITICAL' ||
    riskLevelPriority === 'HIGH RISK'
  ) {
    finalStatus = 'HIGH RISK';
  } else if (
    trust.trustStatus === 'REVIEW' ||
    readiness.readinessStatus === 'REVIEW REQUIRED' ||
    gate.decision === 'REVIEW_REQUIRED' ||
    evidence.proofLevel === 'REQUIRES_REVIEW' ||
    riskLevelPriority === 'REVIEW'
  ) {
    finalStatus = 'REVIEW';
  }

  const primaryRiskDriver =
    highRisks[0]?.issue ||
    gate.gateReasons[0] ||
    objections.criticalBlocker ||
    trust.weakestPoint ||
    economic.weakestEconomicAssumption;

  return {
    objectId,
    finalStatus,
    primaryRiskDriver,
    weakestAssumption:
      highRisks[0]?.issue ||
      economic.weakestEconomicAssumption ||
      objections.weakestObjection ||
      trust.weakestPoint,
    criticalFailurePoint:
      objections.criticalBlocker ||
      (gate.allowed
        ? 'No critical blocker currently active.'
        : 'Recommendation blocked until evidence integrity is restored.'),
    recommendedNextAction:
      highRisks[0]?.recommendedAction ||
      (finalStatus === 'BLOCKED'
        ? 'Do not issue executive recommendation. Restore evidence integrity first.'
        : finalStatus === 'HIGH RISK'
        ? 'Escalate for governance review and resolve critical blockers before action.'
        : finalStatus === 'REVIEW'
        ? 'Present as review-bound decision support only and assign human reviewer.'
        : economic.recommendedAction),
    confidenceBoundary:
      finalStatus === 'TRUST'
        ? 'Usable for managed executive review.'
        : finalStatus === 'REVIEW'
        ? 'Usable only with explicit review and bounded confidence.'
        : finalStatus === 'HIGH RISK'
        ? 'Decision boundary exceeded. High-risk interpretation.'
        : 'Blocked from board-safe use.',
    decisionExplanation:
      `The high-level governance status is ${finalStatus}. ` +
      `This assessment integrates ${optimizationFindings.length} operational findings (${highRisks.length} HIGH SEVERITY) ` +
      `with a ${evidence.proofLevel} evidence proof level. ` +
      `Trust boundaries are currently ${trust.trustStatus === 'TRUST' ? 'validated' : 'under review'} based on historical integrity.`,
    reviewOwner: 'Unassigned',
    optimizationRiskCount: optimizationFindings.length,
    topOptimizationRisk: highRisks[0]?.issue,
    calculatedAt: new Date().toISOString(),
  };
}
