import React, { useState, useRef } from 'react';
import { X, ArrowRight, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { submitContactRequest } from '../services/contact';
import { useModalAccessibility } from '../utils/useModal';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAudit: () => void;
}

export const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose, onOpenAudit }) => {
  const modalRef = useRef<HTMLDivElement | null>(null);
  const renderedAtRef = useRef<number>(Date.now());
  const [honeypot, setHoneypot] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useModalAccessibility({ isOpen, onClose, containerRef: modalRef });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const result = await submitContactRequest({
        ...formData,
        _formRenderedAt: renderedAtRef.current,
        _hp_website_title: honeypot
      });
      if (result.success && result.submissionId) {
        setSubmissionId(result.submissionId);
      } else {
        throw new Error(result.error || 'Failed to submit inquiry.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setSubmissionId(null);
    setErrorMessage(null);
    renderedAtRef.current = Date.now();
    setHoneypot('');
    setFormData({
      name: '',
      email: '',
      message: ''
    });
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-modal-title"
    >
      <div 
        ref={modalRef}
        className="relative w-full max-w-xl bg-[#F7F7F5] border border-[#0A0A0A] p-6 sm:p-10 shadow-2xl my-8 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-[#777777] hover:text-[#0A0A0A] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A3F4D]"
          aria-label="Close modal"
          id="close-contact-modal-btn"
        >
          <X className="w-5 h-5" />
        </button>

        {submissionId ? (
          <div className="py-8 text-left space-y-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-[#0A0A0A] text-white flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="font-mono-code text-[11px] uppercase tracking-wider text-[#0A3F4D] font-semibold">
                  MESSAGE REGISTERED
                </span>
                <h3 className="text-2xl font-extrabold tracking-tight text-[#0A0A0A]">
                  Thank you, {formData.name}
                </h3>
              </div>
            </div>

            <div className="p-4 bg-white border border-[#0A0A0A]/15 space-y-2 text-xs font-mono-code">
              <div className="flex justify-between">
                <span className="text-[#777777]">TRANSMISSION ID:</span>
                <span className="font-bold text-[#0A0A0A]">{submissionId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#777777]">EMAIL:</span>
                <span className="font-semibold text-[#0A0A0A]">{formData.email}</span>
              </div>
            </div>

            <p className="text-sm text-[#777777] leading-relaxed">
              Your inquiry has been received. G-KAIS reviews your request and follows up with next steps.
            </p>

            <div className="pt-4 flex items-center justify-between border-t border-[#0A0A0A]/10">
              <button
                type="button"
                onClick={handleReset}
                className="text-xs font-mono-code text-[#777777] underline hover:text-[#0A0A0A]"
              >
                Send another message
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
          <div>
            <div className="mb-6 pr-8">
              <span className="font-mono-code text-[11px] uppercase tracking-[0.24em] text-[#0A3F4D] font-semibold block mb-2">
                COMMUNICATIONS
              </span>
              <h3 id="contact-modal-title" className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0A0A0A]">
                Contact Systems Architecture
              </h3>
              <p className="text-sm text-[#777777] mt-2 leading-relaxed">
                Connect directly with our engineering team regarding systems integrations, pilot scopes, or custom workflow design.
              </p>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Honeypot anti-spam field */}
              <input
                type="text"
                name="_hp_website_title"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                style={{ display: 'none', position: 'absolute', opacity: 0, pointerEvents: 'none' }}
              />
              <div>
                <label className="block text-xs font-mono-code uppercase text-[#777777] mb-1.5">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Elena Vance"
                  className="w-full bg-white border border-[#0A0A0A]/15 px-3.5 py-2.5 text-sm text-[#0A0A0A] focus:outline-none focus:border-[#0A3F4D] focus:ring-1 focus:ring-[#0A3F4D]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono-code uppercase text-[#777777] mb-1.5">
                  Work Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="name@company.com"
                  className="w-full bg-white border border-[#0A0A0A]/15 px-3.5 py-2.5 text-sm text-[#0A0A0A] focus:outline-none focus:border-[#0A3F4D] focus:ring-1 focus:ring-[#0A3F4D]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono-code uppercase text-[#777777] mb-1.5">
                  Inquiry or Requirements *
                </label>
                <textarea
                  rows={3}
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Describe your current systems setup or commercial pipeline bottlenecks..."
                  className="w-full bg-white border border-[#0A0A0A]/15 px-3.5 py-2.5 text-sm text-[#0A0A0A] focus:outline-none focus:border-[#0A3F4D] focus:ring-1 focus:ring-[#0A3F4D]"
                />
              </div>

              <div className="pt-2">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 bg-[#0A0A0A] text-[#F7F7F5] font-semibold text-xs tracking-wider uppercase hover:bg-[#0A3F4D] transition-all disabled:opacity-60"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        <span>Transmitting...</span>
                      </>
                    ) : (
                      <>
                        <span>Transmit Inquiry</span>
                        <ArrowRight className="w-3.5 h-3.5 ml-2" />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenAudit();
                    }}
                    className="text-xs text-[#0A3F4D] font-mono-code hover:underline"
                  >
                    Need a full audit instead? →
                  </button>
                </div>
                <p className="font-mono-code text-[10px] text-[#777777] text-center mt-3">
                  Your information is handled confidentially. No spam. No obligation.
                </p>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
