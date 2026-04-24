/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HumanReviewDecision, LocalStorageEnvelope } from '../types';

const STORAGE_KEY = 'trusted_building_human_reviews';
const SCHEMA_VERSION = 1;

function isBrowser() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function nowIso() {
  return new Date().toISOString();
}

function safeParse<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function readEnvelope<T>(fallback: T): T {
  if (!isBrowser()) return fallback;
  const parsed = safeParse<LocalStorageEnvelope<T>>(window.localStorage.getItem(STORAGE_KEY));
  if (!parsed || parsed.version !== SCHEMA_VERSION || !('data' in parsed)) return fallback;
  return parsed.data ?? fallback;
}

function writeEnvelope<T>(data: T) {
  if (!isBrowser()) return;
  const envelope: LocalStorageEnvelope<T> = {
    version: SCHEMA_VERSION,
    updatedAt: nowIso(),
    data,
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
}

export function listHumanReviews(): HumanReviewDecision[] {
  const reviews = readEnvelope<HumanReviewDecision[]>([]);
  return Array.isArray(reviews) ? reviews : [];
}

export function getHumanReviewByObjectId(objectId: string): HumanReviewDecision | undefined {
  return listHumanReviews().find((review) => review.objectId === objectId);
}

export function upsertHumanReview(args: {
  objectId: string;
  status: HumanReviewDecision['status'];
  reviewOwner: string;
  comment?: string;
}): HumanReviewDecision {
  const existing = getHumanReviewByObjectId(args.objectId);
  const now = nowIso();

  const review: HumanReviewDecision = existing
    ? {
        ...existing,
        status: args.status,
        reviewOwner: args.reviewOwner,
        comment: args.comment ?? existing.comment,
        updatedAt: now,
      }
    : {
        id: `review-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        objectId: args.objectId,
        status: args.status,
        reviewOwner: args.reviewOwner,
        comment: args.comment ?? '',
        decidedAt: now,
        updatedAt: now,
      };

  const current = listHumanReviews();
  const next = existing
    ? current.map((item) => (item.objectId === args.objectId ? review : item))
    : [...current, review];

  writeEnvelope(next);
  return review;
}
