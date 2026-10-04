import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { firebaseAuth } from '../lib/firebase.ts';
import { resolveActiveExpertWorkspaceId } from '../services/expertsWorkspaceCore.ts';
import {
  installExpertWorkspaceStorageIsolation,
  setActiveExpertWorkspaceStorageScope
} from '../services/expertsWorkspaceStorage.ts';
import { ExpertsWorkspace as ExpertsWorkspacePilotV3 } from './experts/ExpertsWorkspacePilotV3.tsx';
import { WorkspacePersistenceStatus } from './experts/WorkspacePersistenceStatus.tsx';

export function ExpertsWorkspace({ onExit }: { onExit: () => void }) {
  const [scopeReady, setScopeReady] = useState(false);
  installExpertWorkspaceStorageIsolation();

  useEffect(() => {
    let cancelled = false;
    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      if (!user) {
        if (!cancelled) setScopeReady(true);
        return;
      }
      void resolveActiveExpertWorkspaceId(user)
        .then((workspaceId) => {
          if (cancelled) return;
          if (workspaceId) setActiveExpertWorkspaceStorageScope(workspaceId);
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
  }, []);

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

        .gkais-experts-interactions .gkais-formations-shell > div > p[class*="bg-[#F7F7F5]"],
        .gkais-experts-interactions .gkais-webinars-shell > div > p[class*="bg-[#F7F7F5]"],
        .gkais-experts-interactions .gkais-relationships-shell div[class*="fixed"][class*="right-6"][class*="top-24"],
        .gkais-experts-interactions .gkais-relationships-shell p[class*="text-[10px]"][class*="text-[#8D332C]"] {
          position: fixed !important;
          right: 24px !important;
          bottom: 24px !important;
          top: auto !important;
          z-index: 160 !important;
          width: max-content;
          max-width: min(380px, calc(100vw - 48px));
          border: 1px solid rgba(255,255,255,0.08) !important;
          border-radius: 14px !important;
          background: #111413 !important;
          color: #ffffff !important;
          padding: 12px 16px !important;
          box-shadow: 0 16px 44px rgba(0,0,0,0.20) !important;
          font-size: 12px !important;
          line-height: 1.45 !important;
        }

        @media (max-width: 640px) {
          .gkais-experts-interactions .gkais-formations-shell > div > p[class*="bg-[#F7F7F5]"],
          .gkais-experts-interactions .gkais-webinars-shell > div > p[class*="bg-[#F7F7F5]"],
          .gkais-experts-interactions .gkais-relationships-shell div[class*="fixed"][class*="right-6"][class*="top-24"],
          .gkais-experts-interactions .gkais-relationships-shell p[class*="text-[10px]"][class*="text-[#8D332C]"] {
            right: 16px !important;
            bottom: 16px !important;
            max-width: calc(100vw - 32px);
          }
        }
      `}</style>
      <ExpertsWorkspacePilotV3 onExit={onExit} />
      <WorkspacePersistenceStatus />
    </>
  );
}
