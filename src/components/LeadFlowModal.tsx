import React from 'react';
import { X, ArrowRight, Check, Activity, Shield, Layers } from 'lucide-react';

interface LeadFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAudit: () => void;
}

export const LeadFlowModal: React.FC<LeadFlowModalProps> = ({ isOpen, onClose, onOpenAudit }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-3xl bg-[#F7F7F5] border border-[#0A0A0A] p-6 sm:p-10 shadow-2xl my-8 text-left max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-[#777777] hover:text-[#0A0A0A] transition-colors"
          aria-label="Close modal"
          id="close-leadflow-modal-btn"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-8">
          <span className="font-mono-code text-[11px] uppercase tracking-[0.24em] text-[#0A3F4D] font-semibold block mb-2">
            SUBSYSTEM TECHNICAL SPECIFICATION
          </span>
          <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0A0A0A]">
            LeadFlow Architecture
          </h3>
          <p className="text-base text-[#777777] mt-2">
            The autonomous recovery engine that eliminates lead leakage between first touch and booked deal.
          </p>
        </div>

        <div className="space-y-6">
          <div className="border border-[#0A0A0A]/15 bg-white p-5">
            <h4 className="font-mono-code text-xs uppercase tracking-wider text-[#0A0A0A] font-bold mb-3 flex items-center">
              <Layers className="w-4 h-4 mr-2 text-[#0A3F4D]" />
              1. Omnichannel Ingestion Pipeline
            </h4>
            <p className="text-sm text-[#777777] leading-relaxed">
              Connects directly to your Webhooks, Segment, Web forms, direct Gmail/Outlook inboxes, and WhatsApp Business API. Ingests raw multi-modal inquiries within 50 milliseconds with guaranteed zero packet loss.
            </p>
          </div>

          <div className="border border-[#0A0A0A]/15 bg-white p-5">
            <h4 className="font-mono-code text-xs uppercase tracking-wider text-[#0A0A0A] font-bold mb-3 flex items-center">
              <Activity className="w-4 h-4 mr-2 text-[#0A3F4D]" />
              2. Semantic ICP & Intent Classification
            </h4>
            <p className="text-sm text-[#777777] leading-relaxed">
              Analyzes incoming company domain, revenue band, project scope, and urgency level. Inquiries are scored and filtered into deterministic execution tracks: Instant Technical Proposal, Executive Fast-Track, or Polite Self-Serve Routing.
            </p>
          </div>

          <div className="border border-[#0A0A0A]/15 bg-white p-5">
            <h4 className="font-mono-code text-xs uppercase tracking-wider text-[#0A0A0A] font-bold mb-3 flex items-center">
              <Shield className="w-4 h-4 mr-2 text-[#0A3F4D]" />
              3. Context-Grounded Response & Persistent Cadence
            </h4>
            <p className="text-sm text-[#777777] leading-relaxed">
              Uses vector grounding on your internal pricing sheets, case studies, and technical specs to produce flawless, personalized answers in under 60 seconds. If a prospect doesn’t respond, a gentle, high-value 4-step sequence re-engages them automatically.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center pt-2">
            <div className="p-3 bg-white border border-[#0A0A0A]/10">
              <span className="font-mono-code text-[10px] text-[#777777] block">Pipeline Latency</span>
              <span className="font-mono-code text-sm font-bold text-[#0A0A0A]">&lt; 45 sec</span>
            </div>
            <div className="p-3 bg-white border border-[#0A0A0A]/10">
              <span className="font-mono-code text-[10px] text-[#777777] block">Avg. Recovery</span>
              <span className="font-mono-code text-sm font-bold text-[#0A3F4D]">+38.4%</span>
            </div>
            <div className="p-3 bg-white border border-[#0A0A0A]/10">
              <span className="font-mono-code text-[10px] text-[#777777] block">Security</span>
              <span className="font-mono-code text-sm font-bold text-[#0A0A0A]">SOC2 Class</span>
            </div>
            <div className="p-3 bg-white border border-[#0A0A0A]/10">
              <span className="font-mono-code text-[10px] text-[#777777] block">CRM Integrations</span>
              <span className="font-mono-code text-sm font-bold text-[#0A0A0A]">Universal</span>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-[#0A0A0A]/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            onClick={() => {
              onClose();
              onOpenAudit();
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 bg-[#0A0A0A] text-[#F7F7F5] font-semibold text-xs tracking-wider uppercase hover:bg-[#0A3F4D] transition-all"
          >
            <span>Request System Audit for LeadFlow</span>
            <ArrowRight className="w-3.5 h-3.5 ml-2" />
          </button>

          <button
            onClick={onClose}
            className="text-xs font-mono-code text-[#777777] hover:text-[#0A0A0A] uppercase"
          >
            Close Overview
          </button>
        </div>
      </div>
    </div>
  );
};
