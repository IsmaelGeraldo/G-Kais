import React from 'react';
import { ExpertsWorkspace as ExpertsWorkspacePilotV3 } from './experts/ExpertsWorkspacePilotV3.tsx';
import { WorkspacePersistenceStatus } from './experts/WorkspacePersistenceStatus.tsx';
import { installExpertWorkspaceStorageIsolation } from '../services/expertsWorkspaceStorage.ts';

export function ExpertsWorkspace({ onExit }: { onExit: () => void }) {
  installExpertWorkspaceStorageIsolation();

  return (
    <>
      <ExpertsWorkspacePilotV3 onExit={onExit} />
      <WorkspacePersistenceStatus />
    </>
  );
}
