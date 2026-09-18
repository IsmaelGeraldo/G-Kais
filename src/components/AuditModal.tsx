import React, { useState } from 'react';
import { X, ArrowRight, CheckCircle2, ShieldCheck, Cpu } from 'lucide-react';

interface AuditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuditModal: React.FC<AuditModalProps> = ({ isOpen, onClose }) => {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    volume: '100-500',
    bottleneck: 'Missed follow-ups',
    stack: 'HubSpot / Salesforce'
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const calculateRecoverable = () => {
    switch (formData.volume) {
      case '20-100': return '$35,000 - $65,000';
      case '100-500': return '$90,000 - $220,000';
      case '500-2,000': return '$250,000 - $600,000';
      case '2,000+': return '$750,000+';
      default: return '$120,000 - $300,000';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl bg-[#F7F7F5] border border-[#0A0A0A] p-6 sm:p-10 shadow-2xl my-8 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-[#777777] hover:text-[#0A0A0A] transition-colors"
          aria-label="Close modal"
          id="close-audit-modal-btn"
        >
          <X className="w-5 h-5" />
        </button>

        {!submitted ? (
          <div>
            <div className="mb-6">
              <span className="font-mono-code text-[11px] uppercase tracking-[0.24em] text-[#0A3F4D] font-semibold block mb-2">
                SYSTEM DIAGNOSTIC REVIEW
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0A0A0A]">
                Request Free Business Systems Audit
              </h3>
              <p className="text-sm text-[#777777] mt-2 leading-relaxed">
                We'll analyze your inbound channels, response latency, and follow-up architecture to pinpoint where opportunities disappear.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono-code uppercase text-[#777777] mb-1.5">
                    Your Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="E.g. Elena Vance"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-white border border-[#0A0A0A]/15 px-3.5 py-2.5 text-sm text-[#0A0A0A] focus:outline-none focus:border-[#0A3F4D]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono-code uppercase text-[#777777] mb-1.5">
                    Work Email
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="elena@company.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-white border border-[#0A0A0A]/15 px-3.5 py-2.5 text-sm text-[#0A0A0A] focus:outline-none focus:border-[#0A3F4D]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono-code uppercase text-[#777777] mb-1.5">
                    Company Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Acme Corp"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full bg-white border border-[#0A0A0A]/15 px-3.5 py-2.5 text-sm text-[#0A0A0A] focus:outline-none focus:border-[#0A3F4D]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono-code uppercase text-[#777777] mb-1.5">
                    Monthly Inbound Volume
                  </label>
                  <select
                    value={formData.volume}
                    onChange={(e) => setFormData({ ...formData, volume: e.target.value })}
                    className="w-full bg-white border border-[#0A0A0A]/15 px-3.5 py-2.5 text-sm text-[#0A0A0A] focus:outline-none focus:border-[#0A3F4D]"
                  >
                    <option value="20-100">20 - 100 leads / mo</option>
                    <option value="100-500">100 - 500 leads / mo</option>
                    <option value="500-2,000">500 - 2,000 leads / mo</option>
                    <option value="2,000+">2,000+ leads / mo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono-code uppercase text-[#777777] mb-1.5">
                  Primary Bottleneck
                </label>
                <select
                  value={formData.bottleneck}
                  onChange={(e) => setFormData({ ...formData, bottleneck: e.target.value })}
                  className="w-full bg-white border border-[#0A0A0A]/15 px-3.5 py-2.5 text-sm text-[#0A0A0A] focus:outline-none focus:border-[#0A3F4D]"
                >
                  <option value="Slow response time">01 // Slow response time (&gt; 2 hours)</option>
                  <option value="Missed follow-ups">02 // Missed follow-ups (dropped silent leads)</option>
                  <option value="Scattered info">03 // Scattered information across inboxes</option>
                  <option value="No pipeline visibility">04 // No pipeline visibility for leadership</option>
                </select>
              </div>

              {/* Dynamic Live Benchmark preview */}
              <div className="bg-white border border-[#0A0A0A]/10 p-4 mt-4">
                <div className="flex items-center justify-between text-xs font-mono-code text-[#777777] mb-1">
                  <span>ESTIMATED ANNUAL PIPELINE AT RISK:</span>
                  <span className="text-[#0A3F4D] font-bold text-sm">{calculateRecoverable()}</span>
                </div>
                <p className="text-[11px] text-[#777777]">
                  Based on average 38% recovery benchmark across verified G-KAIS system deployments.
                </p>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <button
                  type="submit"
                  id="submit-audit-form-btn"
                  className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 bg-[#0A0A0A] text-[#F7F7F5] font-semibold text-xs tracking-wider uppercase hover:bg-[#0A3F4D] transition-all"
                >
                  <span>SUBMIT AUDIT REQUEST</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-2" />
                </button>

                <div className="flex items-center text-[11px] font-mono-code text-[#777777]">
                  <ShieldCheck className="w-4 h-4 text-[#0A3F4D] mr-1.5" />
                  <span>Strict NDA Protected // Zero Spam</span>
                </div>
              </div>
            </form>
          </div>
        ) : (
          <div className="py-8 text-center space-y-6">
            <div className="w-12 h-12 bg-[#0A0A0A] text-white flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6 text-[#F7F7F5]" />
            </div>

            <div>
              <span className="font-mono-code text-xs uppercase tracking-widest text-[#0A3F4D] font-semibold block mb-2">
                AUDIT DISPATCHED // PROTOCOL INITIALIZED
              </span>
              <h3 className="text-3xl font-extrabold tracking-tight text-[#0A0A0A]">
                Request Received for {formData.company || 'your team'}
              </h3>
              <p className="text-sm text-[#777777] max-w-md mx-auto mt-3 leading-relaxed">
                A senior AI systems engineer will examine your inbound flow and prepare a three-opportunity automation blueprint within 48 business hours.
              </p>
            </div>

            <div className="bg-white border border-[#0A0A0A]/10 p-4 max-w-md mx-auto text-left font-mono-code text-xs space-y-1.5 text-[#777777]">
              <div>REF: GK-SYS-{(Math.random() * 10000).toFixed(0)}</div>
              <div>TARGET: {formData.email}</div>
              <div>SCOPE: {formData.bottleneck}</div>
              <div>RECOMMENDED CORE: LeadFlow + BookingFlow</div>
            </div>

            <button
              onClick={() => {
                setSubmitted(false);
                onClose();
              }}
              className="px-6 py-2.5 border border-[#0A0A0A] text-xs font-semibold uppercase tracking-wider text-[#0A0A0A] hover:bg-[#0A0A0A] hover:text-white transition-all"
            >
              Close Window
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
