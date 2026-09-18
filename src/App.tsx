/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Header } from './components/Header.tsx';
import { Hero } from './components/Hero.tsx';
import { ProblemSection } from './components/ProblemSection.tsx';
import { TheSystemSection } from './components/TheSystemSection.tsx';
import { LeadFlowSection } from './components/LeadFlowSection.tsx';
import { HumanControlSection } from './components/HumanControlSection.tsx';
import { ProductsSection } from './components/ProductsSection.tsx';
import { ProcessSection } from './components/ProcessSection.tsx';
import { AuditCtaSection } from './components/AuditCtaSection.tsx';
import { Footer } from './components/Footer.tsx';
import { AuditModal } from './components/AuditModal.tsx';
import { LeadFlowModal } from './components/LeadFlowModal.tsx';
import { ContactModal } from './components/ContactModal.tsx';

export default function App() {
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isLeadFlowModalOpen, setIsLeadFlowModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  const handleOpenAudit = () => {
    setIsAuditModalOpen(true);
  };

  const handleCloseAudit = () => {
    setIsAuditModalOpen(false);
  };

  const handleOpenLeadFlow = () => {
    setIsLeadFlowModalOpen(true);
  };

  const handleCloseLeadFlow = () => {
    setIsLeadFlowModalOpen(false);
  };

  const handleOpenContact = () => {
    setIsContactModalOpen(true);
  };

  const handleCloseContact = () => {
    setIsContactModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#0A0A0A] selection:bg-[#0A3F4D] selection:text-[#F7F7F5] font-sans">
      {/* 1. Header */}
      <Header onOpenAudit={handleOpenAudit} />

      {/* Main Content Sections */}
      <main>
        {/* 2. Hero & Hero System Visual */}
        <Hero onOpenAudit={handleOpenAudit} />

        {/* 3. Problem Section */}
        <ProblemSection />

        {/* 4. The System ("One system. Every opportunity.") */}
        <TheSystemSection />

        {/* 5. LeadFlow Section (SaaS Clean Dark Interface) */}
        <LeadFlowSection onExplore={handleOpenLeadFlow} onOpenAudit={handleOpenAudit} />

        {/* 6. Human + AI ("AI handles the process. Humans keep control.") */}
        <HumanControlSection />

        {/* 7. Product Ecosystem ("One architecture. Multiple systems.") */}
        <ProductsSection />

        {/* 8. Process ("From opportunity to operating system.") */}
        <ProcessSection />

        {/* 9. Free Audit CTA & Form Section */}
        <AuditCtaSection onOpenAudit={handleOpenAudit} />
      </main>

      {/* 10. Footer */}
      <Footer onOpenAudit={handleOpenAudit} onOpenContact={handleOpenContact} />

      {/* Interactive Modals */}
      <AuditModal isOpen={isAuditModalOpen} onClose={handleCloseAudit} />
      <LeadFlowModal 
        isOpen={isLeadFlowModalOpen} 
        onClose={handleCloseLeadFlow} 
        onOpenAudit={handleOpenAudit} 
      />
      <ContactModal 
        isOpen={isContactModalOpen} 
        onClose={handleCloseContact} 
        onOpenAudit={handleOpenAudit} 
      />
    </div>
  );
}
