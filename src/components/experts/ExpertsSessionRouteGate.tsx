import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { firebaseAuth } from '../../lib/firebase';
import { loadExpertWorkspaceTeam } from '../../services/expertsWorkspaceCore';

export function ExpertsSessionRouteGate({ children }: { children: React.ReactNode }) {
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    let retryTimer: number | undefined;

    const redirectToWork = () => {
      if (cancelled) return;
      window.history.replaceState({}, '', '/workspace/experts?view=priority');
      window.dispatchEvent(new PopStateEvent('popstate'));
    };

    const verify = async (attempt = 0) => {
      try {
        const team = await loadExpertWorkspaceTeam();
        if (cancelled) return;
        if (team.workspaceId === team.currentUid) setAllowed(true);
        else {
          setAllowed(false);
          redirectToWork();
        }
      } catch {
        if (cancelled) return;
        if (attempt < 4) {
          retryTimer = window.setTimeout(() => void verify(attempt + 1), 250);
          return;
        }
        setAllowed(false);
        redirectToWork();
      }
    };

    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      if (!user) {
        setAllowed(false);
        redirectToWork();
        return;
      }
      void verify();
    });

    return () => {
      cancelled = true;
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
      unsubscribe();
    };
  }, []);

  if (allowed === true) return <>{children}</>;
  return <div className="grid min-h-screen place-items-center bg-[#F6F6F3] text-sm text-black/45">Verificando acceso…</div>;
}
