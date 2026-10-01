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
      <ExpertsWorkspacePilotV3 onExit={onExit} />
      <WorkspacePersistenceStatus />
    </>
  );
}
