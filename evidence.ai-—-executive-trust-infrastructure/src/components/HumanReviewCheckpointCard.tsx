/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { ExecutiveDecisionModelResult, HumanReviewDecision } from '../types';
import { upsertHumanReview } from '../services/humanReviewStore';

interface HumanReviewCheckpointCardProps {
  objectId: string;
  decision: ExecutiveDecisionModelResult;
  review?: HumanReviewDecision;
  onReviewChanged?: () => void;
}

export function HumanReviewCheckpointCard({
  objectId,
  decision,
  review,
  onReviewChanged,
}: HumanReviewCheckpointCardProps) {
  const [owner, setOwner] = useState(review?.reviewOwner ?? 'Operations Lead');
  const [comment, setComment] = useState(review?.comment ?? '');

  function save(status: HumanReviewDecision['status']) {
    upsertHumanReview({
      objectId,
      status,
      reviewOwner: owner,
      comment,
    });
    onReviewChanged?.();
  }

  return (
    <div id="human-review-checkpoint-card" className="bg-white rounded-xl border border-surface-variant shadow-sm overflow-hidden">
      <div className="p-5 border-b border-surface-variant bg-background/30">
        <div className="text-lg font-bold text-on-surface">Human Review Checkpoint</div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-outline mt-1">
          AI proposes. Humans decide.
        </div>
      </div>

      <div className="p-6 space-y-4">
        <div className="rounded-xl border border-surface-variant bg-background p-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-outline mb-2">
            Current Status
          </div>
          <div className="text-sm font-bold text-on-surface">
            {review?.status ?? 'AI_ASSESSED'}
          </div>
          <div className="text-xs text-outline mt-1">
            Decision model status: {decision.finalStatus}
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-outline mb-2">
            Review Owner
          </label>
          <input
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            className="w-full rounded-xl border border-surface-variant px-3 py-2 outline-none"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-outline mb-2">
            Review Comment
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-surface-variant px-3 py-2 outline-none resize-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => save('REVIEW_PENDING')}
            className="px-4 py-2 rounded-xl border border-orange-200 bg-orange-50 text-orange-700 font-bold hover:bg-orange-100 transition-colors cursor-pointer"
          >
            Mark Review Pending
          </button>
          <button
            onClick={() => save('HUMAN_VALIDATED')}
            className="px-4 py-2 rounded-xl border border-green-200 bg-green-50 text-green-700 font-bold hover:bg-green-100 transition-colors cursor-pointer"
          >
            Human Validated
          </button>
          <button
            onClick={() => save('BOARD_READY')}
            className="px-4 py-2 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 font-bold hover:bg-blue-100 transition-colors cursor-pointer"
          >
            Board Ready
          </button>
          <button
            onClick={() => save('BLOCKED')}
            className="px-4 py-2 rounded-xl border border-error/30 bg-error-container/10 text-error font-bold hover:bg-error-container/20 transition-colors cursor-pointer"
          >
            Block
          </button>
        </div>
      </div>
    </div>
  );
}
