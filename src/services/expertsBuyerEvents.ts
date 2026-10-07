import { appendExpertRelationshipEvent } from './expertsWorkspaceCore';

export type OperationalBuyerKind = 'formation' | 'mentoring' | 'webinar';

export type OperationalBuyerEventInput = {
  personId: string;
  kind: OperationalBuyerKind;
  sourceType: string;
  sourceId: string;
  occurredAt?: Date;
  metadata?: Record<string, unknown>;
};

export async function recordOperationalBuyerEvent(input: OperationalBuyerEventInput): Promise<void> {
  const sharedMetadata = {
    buyerKind: input.kind,
    operational: true,
    paymentVerified: false,
    evidence: input.kind === 'formation'
      ? 'enrollment'
      : input.kind === 'mentoring'
        ? 'mentoring_onboarding'
        : 'manual_webinar_flag',
    ...(input.metadata || {})
  };

  await appendExpertRelationshipEvent({
    personId: input.personId,
    type: 'buyer_entered',
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    idempotencyKey: `buyer-entered:${input.kind}:${input.sourceId}`,
    occurredAt: input.occurredAt,
    metadata: sharedMetadata
  });

  const lifecycleType = input.kind === 'formation'
    ? 'program_started'
    : input.kind === 'mentoring'
      ? 'mentoring_started'
      : '';

  if (!lifecycleType) return;

  await appendExpertRelationshipEvent({
    personId: input.personId,
    type: lifecycleType,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    idempotencyKey: `${lifecycleType.replace(/_/g, '-')}:${input.sourceId}`,
    occurredAt: input.occurredAt,
    metadata: sharedMetadata
  });
}
