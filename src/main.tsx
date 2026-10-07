import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {AppErrorBoundary} from './components/AppErrorBoundary';
import './index.css';
import './sidebarScroll.css';
import './services/expertsBuyerEventBridge';
import './services/expertsClientReconstruction';
import './services/expertsEnrollmentWelcomeBridge';
import './services/expertsRelationshipAuthBridge';
import './services/expertsRelationshipFoundation';
import './services/expertsTaskMemory';
import './services/expertsWebinarTaskBridge';
import './services/expertsWorkspaceCore';
import './services/expertsWorkspaceSettings';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
);