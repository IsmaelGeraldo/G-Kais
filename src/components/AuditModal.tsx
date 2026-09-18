import React, { useState } from 'react';
import { X, ArrowRight, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { submitAuditRequest } from '../services/audit';
import { useModalAccessibility } from '../utils/useModal';
import { ContactChannel } from '../types/audit';

interface AuditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CONTACT_CHANNELS: ContactChannel[] = [
  'WhatsApp',
  'Website',
  'Email',
  'Instagram',
  'Phone',
  'Multiple channels'
];

export const AuditModal: React.FC<AuditModalProps> = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    website: '',
    email: '',
    contactChannel: 'WhatsApp' as ContactChannel,
    inquiryNotes: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useModalAccessibility({ isOpen, onClose });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const result = await submitAuditRequest(formData);
      if (result.success && result.submissionId) {
        setSubmissionId(result.submissionId);
      } else {
        throw new Error(result.error || 'Failed to submit audit request.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setSubmissionId(null);
    setErrorMessage(null);
    setFormData({
      name: '',
      company: '',
      website: '',
      email: '',
      contactChannel: 'WhatsApp',
      inquiryNotes: ''
    });
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="audit-modal-title"
    >
      <div 
        className="relative w-full max-w-2xl bg-[#F7F7F5] border border-[#0A0A0A] p-6 sm:p-10 shadow-2xl my-8 text-left max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-[#777777] hover:text-[#0A0A0A] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A3F4D]"
          aria-label="Close modal"
          id="close-audit-modal-btn"
        >
          <X className="w-5 h-5" />
        </button>

        {submissionId ? (
          /* Real Success Confirmation State */
          <div className="py-8 text-left space-y-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-[#0A0A0A] text-[#F7F7F5] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="font-mono-code text-[11px] uppercase tracking-wider text-[#0A3F4D] font-semibold">
                  AUDIT REQUEST REGISTERED
                </span>
                <h3 className="text-2xl font-extrabold tracking-tight text-[#0A0A0A]">
                  Thank you, {formData.name}
                </h3>
              </div>
            </div>

            <div className="p-4 bg-white border border-[#0A0A0A]/15 space-y-2 text-xs font-mono-code">
              <div className="flex justify-between">
                <span className="text-[#777777]">SUBMISSION ID:</span>
                <span className="font-bold text-[#0A0A0A]">{submissionId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#777777]">COMPANY:</span>
                <span className="font-semibold text-[#0A0A0A]">{formData.company}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#777777]">EMAIL:</span>
                <span className="font-semibold text-[#0A0A0A]">{formData.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#777777]">PRIMARY INBOUND CHANNEL:</span>
                <span className="font-semibold text-[#0A0A0A]">{formData.contactChannel}</span>
              </div>
            </div>

            <div className="border-t border-[#0A0A0A]/10 pt-4">
              <h4 className="font-mono-code text-xs uppercase tracking-wider text-[#0A0A0A] font-bold mb-3">
                WHAT HAPPENS NEXT:
              </h4>
              <ul className="space-y-2 text-sm text-[#777777]">
                <li className="flex items-start">
                  <span className="font-mono-code text-xs text-[#0A3F4D] mr-2 font-bold">1.</span>
                  Our systems engineering team reviews your inbound channels within 24–48 hours.
                </li>
                <li className="flex items-start">
                  <span className="font-mono-code text-xs text-[#0A3F4D] mr-2 font-bold">2.</span>
                  We identify where prospects currently stall in your process.
                </li>
                <li className="flex items-start">
                  <span className="font-mono-code text-xs text-[#0A3F4D] mr-2 font-bold">3.</span>
                  You receive a concise opportunity report and recommended system architecture.
                </li>
              </ul>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-[#0A0A0A]/10">
              <button
                type="button"
                onClick={handleReset}
                className="text-xs font-mono-code text-[#777777] underline hover:text-[#0A0A0A]"
              >
                Submit another request
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 bg-[#0A0A0A] text-[#F7F7F5] text-xs font-semibold uppercase tracking-wider hover:bg-[#0A3F4D] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          /* Form Content */
          <div>
            <div className="mb-6 pr-8">
              <span className="font-mono-code text-[11px] uppercase tracking-[0.24em] text-[#0A3F4D] font-semibold block mb-2">
                COMMERCIAL SYSTEMS AUDIT
              </span>
              <h3 id="audit-modal-title" className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0A0A0A]">
                Request Free AI Business Audit
              </h3>
              <p className="text-sm text-[#777777] mt-2 leading-relaxed">
                Find where your business is losing commercial opportunities. We'll examine your lead flow and propose a concrete automated system.
              </p>
            </div>

            {/* WHAT YOU RECEIVE Section */}
            <div className="mb-6 p-4 bg-white border border-[#0A0A0A]/15">
              <span className="font-mono-code text-[10px] uppercase tracking-wider text-[#0A3F4D] font-bold block mb-2">
                WHAT YOU RECEIVE:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#0A0A0A]">
                <div className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0A3F4D]" />
                  <span>1. Review of your current lead flow</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0A3F4D]" />
                  <span>2. 3 potential opportunity leaks</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0A3F4D]" />
                  <span>3. Automation opportunities</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0A3F4D]" />
                  <span>4. Recommended first system</span>
                </div>
              </div>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono-code uppercase text-[#777777] mb-1.5">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Elena Vance"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-white border border-[#0A0A0A]/15 px-3.5 py-2.5 text-sm text-[#0A0A0A] focus:outline-none focus:border-[#0A3F4D] focus:ring-1 focus:ring-[#0A3F4D]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono-code uppercase text-[#777777] mb-1.5">
                    Business Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="elena@company.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-white border border-[#0A0A0A]/15 px-3.5 py-2.5 text-sm text-[#0A0A0A] focus:outline-none focus:border-[#0A3F4D] focus:ring-1 focus:ring-[#0A3F4D]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono-code uppercase text-[#777777] mb-1.5">
                    Company *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Acme Corp"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full bg-white border border-[#0A0A0A]/15 px-3.5 py-2.5 text-sm text-[#0A0A0A] focus:outline-none focus:border-[#0A3F4D] focus:ring-1 focus:ring-[#0A3F4D]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono-code uppercase text-[#777777] mb-1.5">
                    Website
                  </label>
                  <input
                    type="text"
                    placeholder="https://company.com"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="w-full bg-white border border-[#0A0A0A]/15 px-3.5 py-2.5 text-sm text-[#0A0A0A] focus:outline-none focus:border-[#0A3F4D] focus:ring-1 focus:ring-[#0A3F4D]"
                  />
                </div>
              </div>

              {/* How do customers usually contact you? */}
              <div>
                <label className="block text-xs font-mono-code uppercase text-[#777777] mb-1.5">
                  How do customers usually contact you? *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CONTACT_CHANNELS.map((channel) => {
                    const isSelected = formData.contactChannel === channel;
                    return (
                      <button
                        type="button"
                        key={channel}
                        onClick={() => setFormData({ ...formData, contactChannel: channel })}
                        className={`p-2 text-xs font-mono-code border text-left transition-all ${
                          isSelected
                            ? 'border-[#0A0A0A] bg-[#0A0A0A] text-[#F7F7F5] font-semibold'
                            : 'border-[#0A0A0A]/15 bg-white text-[#0A0A0A] hover:border-[#0A0A0A]/40'
                        }`}
                      >
                        {channel}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* What happens after someone contacts? */}
              <div>
                <label className="block text-xs font-mono-code uppercase text-[#777777] mb-1.5">
                  What happens after someone makes an inquiry? <span className="text-[#777777]/70 lowercase">(optional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Sales reps reply when they have time, inquiries wait in a shared inbox, follow-ups are irregular..."
                  value={formData.inquiryNotes}
                  onChange={(e) => setFormData({ ...formData, inquiryNotes: e.target.value })}
                  className="w-full bg-white border border-[#0A0A0A]/15 px-3.5 py-2.5 text-xs text-[#0A0A0A] focus:outline-none focus:border-[#0A3F4D] focus:ring-1 focus:ring-[#0A3F4D]"
                />
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isLoading}
                  id="modal-submit-audit-btn"
                  className="w-full group inline-flex items-center justify-center px-6 py-3.5 bg-[#0A0A0A] text-[#F7F7F5] font-semibold text-xs tracking-wider uppercase hover:bg-[#0A3F4D] transition-all disabled:opacity-60"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      <span>Submitting Request...</span>
                    </>
                  ) : (
                    <>
                      <span>REQUEST FREE AUDIT</span>
                      <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>
                <p className="font-mono-code text-[10px] text-[#777777] text-center mt-2.5">
                  No commitment. We respond within 24–48 hours with actionable insights.
                </p>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
