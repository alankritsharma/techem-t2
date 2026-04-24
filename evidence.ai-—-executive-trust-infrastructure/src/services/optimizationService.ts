/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { OptimizationRecommendation } from '../types';

/**
 * DEPRECATED: Use optimizationDecisionService with buildOptimizationSnapshot
 * instead of static mocks. This file is kept as a stub for potential seed data
 * but should not be used for production findings.
 */

const SEED_OPTIMIZATIONS: OptimizationRecommendation[] = [
  // Optional: Add purely simulated seed readings here if needed for empty states
];

export function getOptimizationFindingsByObjectId(objectId: string): OptimizationRecommendation[] {
  // We return empty to force the app to use the real decision logic
  // If we wanted to keep seed data, we would filter SEED_OPTIMIZATIONS here.
  return [];
}
