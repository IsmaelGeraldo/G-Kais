import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { firebaseAuth } from '../lib/firebase.ts';
import { resolveValidExpertWorkspaceId } from '../services/expertsWorkspaceMembers.ts';
import {
  installExpertWorkspaceStorageIsolation,
  setActiveExpertWorkspaceStorageScope
} from '../services/expertsWorkspaceStorage.ts';
import { ExpertsWorkspace as ExpertsWorkspacePilotV3 } from './experts/ExpertsWorkspacePilotV3.tsx';
import { WorkspacePersistenceStatus } from './experts/WorkspacePersistenceStatus.tsx';

const WORKSPACE_NOTIFICATION_DURATION_MS = 4000;

function WorkspaceNotificationRelay() {
  const [message, setMessage] = useState('');
  const lastMessage = useRef('');
  const hideTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const selectors = [
      '.gkais-action-toast',
      '.gkais-formations-shell p[class*="bg-[#F7F7F5]"][class*="text-black/60"]',
      '.gkais-webinars-shell p[class*="bg-[#F7F7F5]"][class*="text-black/60"]',
      '.gkais-relationships-shell div[class*="fixed"][class*="right-6"][class*="top-24"]',
      '.gkais-relationships-shell p[class*="text-[10px]"][class*="text-[#8D332C]"]'
    ];

    const sync = () => {
      const nodes = selectors.flatMap((selector) => Array.from(document.querySelectorAll<HTMLElement>(selector)));
      const source = nodes.find((node) => {
        const text = (node.textContent || '').trim();
        return Boolean(text) && node.dataset.gkaisRelayedText !== text;
      });
      if (!source) return;
      const text = (source.textContent || '').trim();
      if (!text) return;

      source.dataset.gkaisRelayedText = text;
      source.style.display = 'none';
      if (text === lastMessage.current) return;

      lastMessage.current = text;
      setMessage(text);
      nodes.forEach((node) => { node.style.display = 'none'; });
      if (hideTimer.current !== undefined) window.clearTimeout(hideTimer.current);
      hideTimer.current = window.setTimeout(() => {
        setMessage('');
        lastMessage.current = '';
      }, WORKSPACE_NOTIFICATION_DURATION_MS);
    };

    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    sync();
    return () => {
      observer.disconnect();
      if (hideTimer.current !== undefined) window.clearTimeout(hideTimer.current);
    };
  }, []);

  if (!message || typeof document === 'undefined') return null;
  return createPortal(
    <div
      translate="no"
      className="notranslate fixed bottom-6 right-6 z-[9999] max-w-[380px] rounded-[14px] border border-white/10 bg-[#111413] px-4 py-3 text-xs leading-5 text-white shadow-[0_16px_44px_rgba(0,0,0,0.20)]"
      role="status"
      aria-live="polite"
    >
      {message}
    </div>,
    document.body
  );
}

export function ExpertsWorkspace({ onExit }: { onExit: () => void }) {
  const inviteFlow = new URLSearchParams(window.location.search).has('invite');
  const [scopeReady, setScopeReady] = useState(inviteFlow);
  const [verifiedWorkspaceId, setVerifiedWorkspaceId] = useState('');
  installExpertWorkspaceStorageIsolation();

  useEffect(() => {
    if (inviteFlow) {
      setScopeReady(true);
      return;
    }

    let cancelled = false;
    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      if (!user) {
        if (!cancelled) { setVerifiedWorkspaceId(''); setScopeReady(true); }
        return;
      }
      // Discard the previous member's scope while validating a new session.
      if (!cancelled) { setVerifiedWorkspaceId(''); setScopeReady(false); }
      void resolveValidExpertWorkspaceId(user)
        .then((workspaceId) => {
          if (cancelled) return;
          if (workspaceId) setActiveExpertWorkspaceStorageScope(workspaceId);
          setVerifiedWorkspaceId(workspaceId || '');
          setScopeReady(true);
        })
        .catch(() => {
          if (!cancelled) setScopeReady(true);
        });
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [inviteFlow]);

  if (!scopeReady) {
    return <div className="grid min-h-screen place-items-center bg-[#F6F6F3] text-sm text-black/45">Preparando Workspace…</div>;
  }

  return (
    <>
      <style>{`
        .gkais-experts-interactions .gkais-world-map {
          transform: scale(1.10) !important;
          transform-origin: center center !important;
        }
      `}</style>
      <ExpertsWorkspacePilotV3 onExit={onExit} verifiedWorkspaceId={verifiedWorkspaceId} />
      <WorkspaceNotificationRelay />
      <WorkspacePersistenceStatus />
    </>
  );
}
