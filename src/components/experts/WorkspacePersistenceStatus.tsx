import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, CheckCircle2, LoaderCircle } from 'lucide-react';
import {
  EXPERTS_PERSISTENCE_EVENT,
  type ExpertsPersistenceDetail
} from '../../services/expertsPersistenceStatus';

type ViewState = ExpertsPersistenceDetail | null;
const WORKSPACE_NOTIFICATION_DURATION_MS = 4000;

export function WorkspacePersistenceStatus() {
  const [state, setState] = useState<ViewState>(null);
  const hideTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const onStatus = (event: Event) => {
      const detail = (event as CustomEvent<ExpertsPersistenceDetail>).detail;
      if (!detail?.status) return;
      if (hideTimer.current !== undefined) window.clearTimeout(hideTimer.current);
      setState(detail);
      if (detail.status === 'saved' || detail.status === 'error') {
        hideTimer.current = window.setTimeout(() => setState(null), WORKSPACE_NOTIFICATION_DURATION_MS);
      }
    };

    window.addEventListener(EXPERTS_PERSISTENCE_EVENT, onStatus as EventListener);
    return () => {
      window.removeEventListener(EXPERTS_PERSISTENCE_EVENT, onStatus as EventListener);
      if (hideTimer.current !== undefined) window.clearTimeout(hideTimer.current);
    };
  }, []);

  if (!state || typeof document === 'undefined') return null;

  const isSaving = state.status === 'saving';
  const isError = state.status === 'error';
  const text = state.message || (isSaving
    ? 'Guardando…'
    : isError
      ? 'No se pudo guardar. Revisa tu conexión e inténtalo nuevamente.'
      : 'Guardado');

  return createPortal(
    <div className={`fixed bottom-6 right-6 z-[10000] inline-flex max-w-[380px] items-center gap-2 rounded-[14px] border px-4 py-3 text-xs font-medium shadow-[0_16px_44px_rgba(0,0,0,0.20)] ${isError ? 'border-red-300/30 bg-[#111413] text-red-200' : 'border-white/10 bg-[#111413] text-white'}`} role={isError ? 'alert' : 'status'} aria-live={isError ? 'assertive' : 'polite'}>
      {isSaving ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : isError ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
      <span>{text}</span>
    </div>,
    document.body
  );
}
