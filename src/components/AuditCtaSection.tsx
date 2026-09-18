import React, { useState } from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

interface AuditCtaSectionProps {
  onOpenAudit?: () => void;
}

export const AuditCtaSection: React.FC<AuditCtaSectionProps> = () => {
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    website: '',
    email: '',
    leadManagementTool: ''
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;
    setIsSubmitted(true);
  };

  return (
    <section id="audit" className="bg-[#000000] text-white py-28 md:py-40 lg:py-48 selection:bg-white selection:text-black border-t border-white/10">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* Left Column: Editorial Headline & Subtitle */}
          <div className="lg:col-span-6">
            <span className="font-mono-code text-xs uppercase tracking-[0.28em] text-white/50 font-semibold block mb-8">
              SYSTEM DIAGNOSTIC & AUDIT
            </span>

            <h2 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-[-0.03em] leading-[1.08] text-white mb-8">
              Find 3 automation opportunities in your business.
            </h2>

            <p className="text-lg sm:text-xl text-white/70 leading-relaxed font-normal mb-12 max-w-xl">
              We'll review your current process and identify where AI and automation can remove friction, recover opportunities and improve execution.
            </p>

            <div className="space-y-4 font-mono-code text-xs text-white/60 border-t border-white/10 pt-8">
              <div className="flex items-center space-x-3">
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                <span>3-day diagnostic turnaround</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                <span>Custom architecture blueprint included</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                <span>Zero software installation required</span>
              </div>
            </div>
          </div>

          {/* Right Column: Direct Form */}
          <div className="lg:col-span-6">
            <div className="border border-white/20 bg-[#0A0A0A] p-8 sm:p-10">
              {isSubmitted ? (
                <div className="py-12 text-center">
                  <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold tracking-tight text-white mb-3">
                    Audit Request Received
                  </h3>
                  <p className="text-sm text-white/70 leading-relaxed max-w-sm mx-auto mb-8">
                    Our systems architecture team will review your commercial pipeline and deliver your 3 automation opportunities within 3 business days.
                  </p>
                  <button
                    onClick={() => {
                      setIsSubmitted(false);
                      setFormData({
                        name: '',
                        company: '',
                        website: '',
                        email: '',
                        leadManagementTool: ''
                      });
                    }}
                    className="font-mono-code text-xs text-white/50 underline hover:text-white"
                  >
                    Submit another inquiry
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
                    <span className="font-mono-code text-xs tracking-wider text-white/60 uppercase">
                      REQUEST AUDIT // STEP 01
                    </span>
                    <span className="font-mono-code text-[10px] text-white/40">
                      ENCRYPTED TRANSMISSION
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-mono-code text-white/80 uppercase tracking-wider mb-2">
                      Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Jane Doe"
                      className="w-full px-4 py-3.5 bg-black border border-white/20 text-white placeholder-white/30 text-sm focus:outline-none focus:border-white transition-colors"
                      id="audit-input-name"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono-code text-white/80 uppercase tracking-wider mb-2">
                        Company *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        placeholder="Acme Corp"
                        className="w-full px-4 py-3.5 bg-black border border-white/20 text-white placeholder-white/30 text-sm focus:outline-none focus:border-white transition-colors"
                        id="audit-input-company"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-mono-code text-white/80 uppercase tracking-wider mb-2">
                        Website
                      </label>
                      <input
                        type="text"
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                        placeholder="https://company.com"
                        className="w-full px-4 py-3.5 bg-black border border-white/20 text-white placeholder-white/30 text-sm focus:outline-none focus:border-white transition-colors"
                        id="audit-input-website"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono-code text-white/80 uppercase tracking-wider mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="jane@company.com"
                      className="w-full px-4 py-3.5 bg-black border border-white/20 text-white placeholder-white/30 text-sm focus:outline-none focus:border-white transition-colors"
                      id="audit-input-email"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono-code text-white/80 uppercase tracking-wider mb-2">
                      What do you currently use to manage leads?
                    </label>
                    <select
                      value={formData.leadManagementTool}
                      onChange={(e) => setFormData({ ...formData, leadManagementTool: e.target.value })}
                      className="w-full px-4 py-3.5 bg-black border border-white/20 text-white text-sm focus:outline-none focus:border-white transition-colors"
                      id="audit-input-lead-tool"
                    >
                      <option value="" disabled className="text-white/30">Select lead management setup</option>
                      <option value="CRM (HubSpot, Salesforce, Pipedrive)">CRM (HubSpot, Salesforce, Pipedrive, etc.)</option>
                      <option value="Spreadsheets (Google Sheets, Excel)">Spreadsheets (Google Sheets, Excel)</option>
                      <option value="Direct Email & WhatsApp (Manual)">Direct Email & WhatsApp (Manual)</option>
                      <option value="ERP / Custom Internal Software">ERP / Custom Internal Software</option>
                      <option value="No formal system currently">No formal system currently</option>
                    </select>
                  </div>

                  <div className="pt-4">
                    <button
                      type="submit"
                      id="audit-submit-btn"
                      className="w-full group inline-flex items-center justify-center px-8 py-4.5 bg-white text-black font-bold text-xs tracking-wider uppercase hover:bg-[#F7F7F5] transition-all duration-200"
                    >
                      <span>BOOK A FREE AUDIT</span>
                      <ArrowRight className="w-4 h-4 ml-3 transition-transform duration-200 group-hover:translate-x-1" />
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
