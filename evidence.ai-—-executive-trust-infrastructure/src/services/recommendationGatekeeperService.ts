/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EvidenceAuthorityAssessment,
  HistoricalTrustAssessment,
  ForecastReadinessAssessment,
  AdversarialObjectionResult,
  RecommendationGateResult,
  EconomicValueAssessment,
} from '../types';

interface GateInput {
  objectId: string;
  evidence: EvidenceAuthorityAssessment;
  trust: HistoricalTrustAssessment;
  readiness: ForecastReadinessAssessment;
  objections: AdversarialObjectionResult;
  economic: EconomicValueAssessment;
}

export function evaluateRecommendationGate(input: GateInput): RecommendationGateResult {
  const reasons: string[] = [];
  const { objectId, evidence, trust, readiness, objections, economic } = input;

  if (evidence.proofLevel === 'BLOCKED' || evidence.proofLevel === 'UNVERIFIED') {
    reasons.push('Evidence authority is insufficient for executive recommendation.');
  }

  if (trust.trustStatus === 'HIGH RISK') {
    reasons.push('Historical trust is high risk.');
  }

  if (readiness.readinessStatus === 'NOT READY') {
    reasons.push('Forecast readiness is not established.');
  }

  if (objections.criticalBlocker) {
    reasons.push(`Critical objection active: ${objections.criticalBlocker}`);
  }

  if (economic.businessConfidence === 'HIGH RISK') {
    reasons.push('Economic confidence is too weak for board-safe recommendation.');
  }

  if (reasons.length > 0) {
    return {
      objectId,
      decision: objections.boardEscalationRequired
        ? 'EXECUTIVE_ESCALATION_REQUIRED'
        : 'BLOCKED_DUE_TO_INSUFFICIENT_EVIDENCE',
      allowed: false,
      gateReasons: reasons,
      requiredNextStep:
        objections.boardEscalationRequired
          ? 'Escalate for executive review with explicit blocker handling.'
          : 'Restore evidence and validation integrity before issuing a recommendation.',
      calculatedAt: new Date().toISOString(),
    };
  }

  if (
    evidence.proofLevel === 'REQUIRES_REVIEW' ||
    trust.trustStatus === 'REVIEW' ||
    readiness.readinessStatus === 'REVIEW REQUIRED' ||
    objections.objectionSeverity === 'HIGH'
  ) {
    return {
      objectId,
      decision: 'REVIEW_REQUIRED',
      allowed: true,
      gateReasons: [
        'Recommendation may be shown, but only as review-bound decision support.',
      ],
      requiredNextStep:
        'Route through explicit human review before using the recommendation as board-ready output.',
      calculatedAt: new Date().toISOString(),
    };
  }

  return {
    objectId,
    decision: 'RECOMMENDATION_ALLOWED',
    allowed: true,
    gateReasons: ['Evidence and validation conditions are sufficient for managed recommendation use.'],
    requiredNextStep: 'Proceed with managed executive review and maintain traceability.',
    calculatedAt: new Date().toISOString(),
  };
}
