import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './services/expertsClientReconstruction';
import './services/expertsRelationshipAuthBridge';
import './services/expertsRelationshipFoundation';
import './services/expertsTaskMemory';
import './services/expertsWorkspaceSettings';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
