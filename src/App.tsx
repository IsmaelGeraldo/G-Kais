/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Header } from './components/Header.tsx';
import { Hero } from './components/Hero.tsx';
import { ProblemSection } from './components/ProblemSection.tsx';
import { OpportunityRecoverySection } from './components/OpportunityRecoverySection.tsx';
import { TheSystemSection } from './components/TheSystemSection.tsx';
import { LeadFlowSection } from './components/LeadFlowSection.tsx';
import { ProductsSection } from './components/ProductsSection.tsx';
import { ExistingToolsSection } from './components/ExistingToolsSection.tsx';
import { ProcessSection } from './components/ProcessSection.tsx';
import { PilotSection } from './components/PilotSection.tsx';
import { AuditCtaSection } from './components/AuditCtaSection.tsx';
import { Footer } from './components/Footer.tsx';
import { AuditModal } from './components/AuditModal.tsx';
import { LeadFlowModal } from './components/LeadFlowModal.tsx';
import { ContactModal } from './components/ContactModal.tsx';
import { AdminPage } from './components/AdminPage.tsx';
import { ExpertsCommercialDemo } from './components/ExpertsCommercialDemo.tsx';
import { ExpertsWorkspace } from './components/ExpertsWorkspace.tsx';
import { SessionMemoryWorkspaceAI } from './components/SessionMemoryWorkspaceAI.tsx';
import { LanguageProvider } from './i18n/LanguageContext.tsx';

function PublicApp({ onOpenAdmin }: { onOpenAdmin: () => void }) {
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isLeadFlowModalOpen, setIsLeadFlowModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  const handleOpenAudit = () => setIsAuditModalOpen(true);
  const handleCloseAudit = () => setIsAuditModalOpen(false);
  const handleOpenLeadFlow = () => setIsLeadFlowModalOpen(true);
  const handleCloseLeadFlow = () => setIsLeadFlowModalOpen(false);
  const handleOpenContact = () => setIsContactModalOpen(true);
  const handleCloseContact = () => setIsContactModalOpen(false);

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#0A0A0A] selection:bg-[#0A3F4D] selection:text-[#F7F7F5] font-sans">
      <Header onOpenAudit={handleOpenAudit} onOpenAdmin={onOpenAdmin} />
      <main>
        <Hero onOpenAudit={handleOpenAudit} />
        <ProblemSection />
        <OpportunityRecoverySection />
        <TheSystemSection />
        <LeadFlowSection onExplore={handleOpenLeadFlow} onOpenAudit={handleOpenAudit} />
        <ExistingToolsSection />
        <ProductsSection />
        <ProcessSection />
        <PilotSection onOpenAudit={handleOpenAudit} />
        <AuditCtaSection onOpenAudit={handleOpenAudit} />
      </main>
      <Footer onOpenAudit={handleOpenAudit} onOpenContact={handleOpenContact} />
      <AuditModal isOpen={isAuditModalOpen} onClose={handleCloseAudit} />
      <LeadFlowModal isOpen={isLeadFlowModalOpen} onClose={handleCloseLeadFlow} onOpenAudit={handleOpenAudit} />
      <ContactModal isOpen={isContactModalOpen} onClose={handleCloseContact} onOpenAudit={handleOpenAudit} />
    </div>
  );
}

function isHqRoute(): boolean {
  return window.location.pathname === '/hq' || window.location.pathname.startsWith('/hq/') || window.location.pathname === '/admin' || window.location.pathname.startsWith('/admin/');
}

function isExpertsDemoRoute(): boolean {
  return window.location.pathname === '/demo/experts' || window.location.pathname.startsWith('/demo/experts/');
}

function isExpertsWorkspaceRoute(): boolean {
  return window.location.pathname === '/workspace' || window.location.pathname === '/workspace/experts' || window.location.pathname.startsWith('/workspace/experts/');
}

function isSessionMemoryRoute(): boolean {
  return window.location.pathname === '/workspace/experts/sessions' || window.location.pathname.startsWith('/workspace/experts/sessions/');
}

function AppContent() {
  const [showAdmin, setShowAdmin] = useState<boolean>(() => isHqRoute() || (import.meta.env.DEV && window.sessionStorage.getItem('gkais-dev-admin') === '1'));
  const [showExpertsDemo, setShowExpertsDemo] = useState<boolean>(() => isExpertsDemoRoute());
  const [showExpertsWorkspace, setShowExpertsWorkspace] = useState<boolean>(() => isExpertsWorkspaceRoute());
  const [showSessionMemory, setShowSessionMemory] = useState<boolean>(() => isSessionMemoryRoute());

  useEffect(() => {
    const handlePopState = () => {
      setShowAdmin(isHqRoute());
      setShowExpertsDemo(isExpertsDemoRoute());
      setShowExpertsWorkspace(isExpertsWorkspaceRoute());
      setShowSessionMemory(isSessionMemoryRoute());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const openAdmin = () => {
    if (import.meta.env.DEV) window.sessionStorage.setItem('gkais-dev-admin', '1');
    window.history.pushState({}, '', '/hq');
    setShowExpertsDemo(false); setShowExpertsWorkspace(false); setShowSessionMemory(false); setShowAdmin(true);
  };

  const openExpertsWorkspace = () => {
    window.history.pushState({}, '', '/workspace/experts');
    setShowAdmin(false); setShowExpertsDemo(false); setShowSessionMemory(false); setShowExpertsWorkspace(true);
  };

  const exitAdmin = () => {
    if (import.meta.env.DEV) window.sessionStorage.removeItem('gkais-dev-admin');
    window.history.pushState({}, '', '/');
    setShowAdmin(false);
  };

  const exitExpertsDemo = () => {
    window.history.pushState({}, '', '/');
    setShowExpertsDemo(false); setShowExpertsWorkspace(false); setShowSessionMemory(false); setShowAdmin(false);
  };

  const exitExpertsWorkspace = () => {
    window.history.pushState({}, '', '/');
    setShowExpertsWorkspace(false); setShowSessionMemory(false); setShowExpertsDemo(false); setShowAdmin(false);
  };

  const backFromSessionMemory = () => {
    window.history.back();
  };

  if (showSessionMemory) return <SessionMemoryWorkspaceAI onBack={backFromSessionMemory} />;
  if (showExpertsWorkspace) return <ExpertsWorkspace onExit={exitExpertsWorkspace} />;
  if (showExpertsDemo) return <ExpertsCommercialDemo onExit={exitExpertsDemo} />;

  return showAdmin
    ? <div className="relative"><AdminPage onExitAdmin={exitAdmin} /><button type="button" onClick={openExpertsWorkspace} className="fixed bottom-5 right-5 z-[80] rounded-full border border-[#0A3F4D]/20 bg-[#0A3F4D] px-4 py-3 text-xs font-semibold text-white shadow-[0_12px_30px_rgba(10,63,77,0.25)] transition hover:bg-[#083540]">Open Experts Workspace</button></div>
    : <PublicApp onOpenAdmin={openAdmin} />;
}

export default function App() {
  return <LanguageProvider><AppContent /></LanguageProvider>;
}
