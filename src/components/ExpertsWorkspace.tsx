import React from 'react';
import { ExpertsWorkspace as ExpertsWorkspacePilotV3 } from './experts/ExpertsWorkspacePilotV3.tsx';
import { WorkspacePersistenceStatus } from './experts/WorkspacePersistenceStatus.tsx';

export function ExpertsWorkspace({ onExit }: { onExit: () => void }) {
  return (
    <>
      <ExpertsWorkspacePilotV3 onExit={onExit} />
      <WorkspacePersistenceStatus />
    </>
  );
}
