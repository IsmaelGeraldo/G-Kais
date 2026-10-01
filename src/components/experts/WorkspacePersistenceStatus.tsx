import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, LoaderCircle } from 'lucide-react';
import {
  EXPERTS_PERSISTENCE_EVENT,
  type ExpertsPersistenceDetail
} from '../../services/expertsPersistenceStatus';

type ViewState = ExpertsPersistenceDetail | null;

export function WorkspacePersistenceStatus() {
  const [state, setState] = useState<ViewState>(null);
  const hideTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const onStatus = (event: Event) => {
      const detail = (event as CustomEvent<ExpertsPersistenceDetail>).detail;
      if (!detail?.status) return;
      if (hideTimer.current !== undefined) window.clearTimeout(hideTimer.current);
      setState(detail);
      if (detail.status === 'saved') {
        hideTimer.current = window.setTimeout(() => setState(null), 1500);
      } else if (detail.status === 'error') {
        hideTimer.current = window.setTimeout(() => setState(null), 7000);
      }
    };

    window.addEventListener(EXPERTS_PERSISTENCE_EVENT, onStatus as EventListener);
    return () => {
      window.removeEventListener(EXPERTS_PERSISTENCE_EVENT, onStatus as EventListener);
      if (hideTimer.current !== undefined) window.clearTimeout(hideTimer.current);
    };
  }, []);

  if (!state) return null;

  const isSaving = state.status === 'saving';
  const isError = state.status === 'error';
  const text = state.message || (isSaving
    ? 'Guardando…'
    : isError
      ? 'No se pudo guardar. Revisa tu conexión e inténtalo nuevamente.'
      : 'Guardado');

  return (
    <div className={`fixed bottom-5 right-5 z-[120] inline-flex max-w-[360px] items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium shadow-lg backdrop-blur ${isError ? 'border-red-200 bg-white text-red-700' : 'border-black/10 bg-white/95 text-black/60'}`} role={isError ? 'alert' : 'status'}>
      {isSaving ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : isError ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
      <span>{text}</span>
    </div>
  );
}
