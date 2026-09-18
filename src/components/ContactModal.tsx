import React, { useState } from 'react';
import { X, ArrowRight, CheckCircle2, Mail, MapPin } from 'lucide-react';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAudit: () => void;
}

export const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose, onOpenAudit }) => {
  const [sent, setSent] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-xl bg-[#F7F7F5] border border-[#0A0A0A] p-6 sm:p-10 shadow-2xl my-8 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-[#777777] hover:text-[#0A0A0A] transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {!sent ? (
          <div>
            <div className="mb-6">
              <span className="font-mono-code text-[11px] uppercase tracking-[0.24em] text-[#0A3F4D] font-semibold block mb-2">
                COMMUNICATIONS
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0A0A0A]">
                Contact Systems Architecture
              </h3>
              <p className="text-sm text-[#777777] mt-2">
                Speak directly with our engineering team regarding bespoke integrations, custom SLAs, or enterprise pilots.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono-code uppercase text-[#777777] mb-1.5">
                  Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Your name"
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
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="name@company.com"
                  className="w-full bg-white border border-[#0A0A0A]/15 px-3.5 py-2.5 text-sm text-[#0A0A0A] focus:outline-none focus:border-[#0A3F4D]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono-code uppercase text-[#777777] mb-1.5">
                  Inquiry or Requirements
                </label>
                <textarea
                  rows={3}
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Describe your current systems or workflow automation needs..."
                  className="w-full bg-white border border-[#0A0A0A]/15 px-3.5 py-2.5 text-sm text-[#0A0A0A] focus:outline-none focus:border-[#0A3F4D]"
                />
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                <button
                  type="submit"
                  className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 bg-[#0A0A0A] text-[#F7F7F5] font-semibold text-xs tracking-wider uppercase hover:bg-[#0A3F4D] transition-all"
                >
                  <span>Transmit Inquiry</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-2" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAudit();
                  }}
                  className="text-xs text-[#0A3F4D] hover:underline"
                >
                  Need a full audit instead? →
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="py-8 text-center space-y-4">
            <div className="w-12 h-12 bg-[#0A0A0A] text-white flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6 text-[#F7F7F5]" />
            </div>
            <h4 className="text-2xl font-bold text-[#0A0A0A]">Inquiry Logged</h4>
            <p className="text-sm text-[#777777] max-w-sm mx-auto">
              Thank you {formData.name}. Our systems engineering team will review your requirements and respond shortly.
            </p>
            <button
              onClick={() => {
                setSent(false);
                onClose();
              }}
              className="mt-4 px-6 py-2 border border-[#0A0A0A] text-xs font-semibold uppercase tracking-wider text-[#0A0A0A] hover:bg-[#0A0A0A] hover:text-white transition-all"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
