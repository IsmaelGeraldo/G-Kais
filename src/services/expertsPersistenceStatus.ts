export const EXPERTS_PERSISTENCE_EVENT = 'gkais:experts-persistence-status';

export type ExpertsPersistenceStatus = 'saving' | 'saved' | 'error';

export type ExpertsPersistenceDetail = {
  status: ExpertsPersistenceStatus;
  message?: string;
};

export function emitExpertsPersistenceStatus(status: ExpertsPersistenceStatus, message?: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<ExpertsPersistenceDetail>(EXPERTS_PERSISTENCE_EVENT, {
    detail: { status, message }
  }));
}
