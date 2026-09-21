import React, { useState, useRef } from 'react';
import { ArrowRight, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { submitAuditRequest } from '../services/audit';
import { ContactChannel } from '../types/audit';
import { useLanguage } from '../i18n/LanguageContext';

interface AuditCtaSectionProps {
  onOpenAudit?: () => void;
}

const CONTACT_CHANNELS: ContactChannel[] = [
  'WhatsApp',
  '{tr('Sitio web', 'Website')}',
  'Email',
  'Instagram',
  'Phone',
  'Multiple channels'
];

export const AuditCtaSection: React.FC<AuditCtaSectionProps> = () => {
  const { language } = useLanguage();
  const tr = (es: string, en: string) => (language === 'es' ? es : en);
  const renderedAtRef = useRef<number>(Date.now());
  const [honeypot, setHoneypot] = useState('');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const result = await submitAuditRequest({
        ...formData,
        _formRenderedAt: renderedAtRef.current,
        _hp_website_title: honeypot
      });
      if (result.success && result.submissionId) {
        setSubmissionId(result.submissionId);
      } else {
        throw new Error(result.error || tr('No se pudo enviar la solicitud de auditoría.', 'Failed to submit audit request.'));
      }
    } catch (err: any) {
      setErrorMessage(err.message || tr('Algo salió mal. Inténtalo nuevamente.', 'Something went wrong. Please try again.'));
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
      company: '',
      website: '',
      email: '',
      contactChannel: 'WhatsApp',
      inquiryNotes: ''
    });
  };

  return (
    <section id="audit" className="bg-[#000000] text-white py-28 md:py-40 lg:py-48 selection:bg-white selection:text-black border-t border-white/10">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* Left Column: Editorial Headline & Subtitle */}
          <div className="lg:col-span-6">
            <span className="font-mono-code text-xs uppercase tracking-[0.28em] text-white/50 font-semibold block mb-8">
              {tr('DIAGNÓSTICO Y AUDITORÍA DEL SISTEMA', 'SYSTEM DIAGNOSTIC & AUDIT')}
            </span>

            <h2 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-[-0.03em] leading-[1.08] text-white mb-8">
              {tr('Encuentra 3 oportunidades de automatización en tu negocio.', 'Find 3 automation opportunities in your business.')}
            </h2>

            <p className="text-lg sm:text-xl text-white/70 leading-relaxed font-normal mb-10 max-w-xl">
              We'll review your current commercial process and identify where AI and automation can remove friction, recover opportunities, and keep execution reliable.
            </p>

            {/* {tr('QUÉ RECIBES', 'WHAT YOU RECEIVE')} section */}
            <div className="p-6 bg-white/5 border border-white/15 mb-10">
              <span className="font-mono-code text-xs uppercase tracking-wider text-white font-bold block mb-4">
                {tr('QUÉ RECIBES', 'WHAT YOU RECEIVE')}:
              </span>
              <ul className="space-y-3 font-mono-code text-xs text-white/80">
                <li className="flex items-start">
                  <span className="w-1.5 h-1.5 rounded-full bg-white mt-1.5 mr-3 shrink-0" />
                  <span>1. Thorough review of your current lead flow</span>
                </li>
                <li className="flex items-start">
                  <span className="w-1.5 h-1.5 rounded-full bg-white mt-1.5 mr-3 shrink-0" />
                  <span>2. {tr('Tres posibles fugas de oportunidades', 'Three potential opportunity leaks')} pinpointed</span>
                </li>
                <li className="flex items-start">
                  <span className="w-1.5 h-1.5 rounded-full bg-white mt-1.5 mr-3 shrink-0" />
                  <span>3. Clear automation & recovery opportunities</span>
                </li>
                <li className="flex items-start">
                  <span className="w-1.5 h-1.5 rounded-full bg-white mt-1.5 mr-3 shrink-0" />
                  <span>4. {tr('Primer sistema recomendado', 'Recommended first system')} architecture</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3 font-mono-code text-xs text-white/50 border-t border-white/10 pt-6">
              <div className="flex items-center space-x-3">
                <span className="w-1 h-1 rounded-full bg-white/60" />
                <span>Direct review of your workflow</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="w-1 h-1 rounded-full bg-white/60" />
                <span>No software installation required</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="w-1 h-1 rounded-full bg-white/60" />
                <span>Confidential review of your workflow</span>
              </div>
            </div>
          </div>

          {/* Right Column: Direct Form */}
          <div className="lg:col-span-6">
            <div className="border border-white/20 bg-[#0A0A0A] p-8 sm:p-10">
              {submissionId ? (
                <div className="py-12 text-center">
                  <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center mx-auto mb-6 bg-white/10">
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold tracking-tight text-white mb-2">
                    {tr('Solicitud de auditoría recibida', 'Audit Request Received')}
                  </h3>
                  <p className="text-xs font-mono-code text-white/60 mb-6">
                    {tr('ID DE ENVÍO:', 'SUBMISSION ID:')} <span className="text-white font-bold">{submissionId}</span>
                  </p>
                  <p className="text-sm text-white/70 leading-relaxed max-w-sm mx-auto mb-8">
                    {tr('G-KAIS revisa tu flujo actual de leads y continúa con los próximos pasos.', 'G-KAIS reviews your current lead flow and follows up with next steps.')}
                  </p>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="font-mono-code text-xs text-white/50 underline hover:text-white"
                  >
                    {tr('Enviar otra consulta', 'Submit another inquiry')}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
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
                  <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
                    <span className="font-mono-code text-xs tracking-wider text-white/60 uppercase">
                      {tr('SOLICITAR AUDITORÍA // INGRESO DIRECTO', 'REQUEST AUDIT // DIRECT INTAKE')}
                    </span>
                    <span className="font-mono-code text-[10px] text-white/40">
                      {tr('PIPELINE SEGURO', 'SECURE PIPELINE')}
                    </span>
                  </div>

                  {errorMessage && (
                    <div className="p-3 bg-red-950/80 border border-red-800 text-red-200 text-xs flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-mono-code text-white/80 uppercase tracking-wider mb-2">
                      {tr('Nombre *', 'Name *')}
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Jane Doe"
                      className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder-white/30 text-sm focus:outline-none focus:border-white transition-colors"
                      id="audit-input-name"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono-code text-white/80 uppercase tracking-wider mb-2">
                        {tr('Empresa *', 'Company *')}
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        placeholder="Acme Corp"
                        className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder-white/30 text-sm focus:outline-none focus:border-white transition-colors"
                        id="audit-input-company"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-mono-code text-white/80 uppercase tracking-wider mb-2">
                        {tr('Sitio web', 'Website')}
                      </label>
                      <input
                        type="text"
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                        placeholder="https://company.com"
                        className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder-white/30 text-sm focus:outline-none focus:border-white transition-colors"
                        id="audit-input-website"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono-code text-white/80 uppercase tracking-wider mb-2">
                      {tr('Email comercial *', 'Business Email *')}
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="jane@company.com"
                      className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder-white/30 text-sm focus:outline-none focus:border-white transition-colors"
                      id="audit-input-email"
                    />
                  </div>

                  {/* {tr('¿Cómo suelen contactarte tus clientes? *', 'How do customers usually contact you? *')}/}
                  <div>
                    <label className="block text-xs font-mono-code text-white/80 uppercase tracking-wider mb-2">
                      {tr('¿Cómo suelen contactarte tus clientes? *', 'How do customers usually contact you? *')}
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
                                ? 'border-white bg-white text-black font-semibold'
                                : 'border-white/20 bg-black text-white/80 hover:border-white/50'
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
                    <label className="block text-xs font-mono-code text-white/80 uppercase tracking-wider mb-2">
                      {tr('¿Qué sucede después de que alguien hace una consulta?', 'What happens after someone makes an inquiry?')} <span className="text-white/40 lowercase">{tr('(opcional)', '(optional)')}</span>
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Inquiries wait in our inbox, sales reps follow up when free, leads get dropped after 1 touch..."
                      value={formData.inquiryNotes}
                      onChange={(e) => setFormData({ ...formData, inquiryNotes: e.target.value })}
                      className="w-full px-4 py-2.5 bg-black border border-white/20 text-white placeholder-white/30 text-xs focus:outline-none focus:border-white transition-colors"
                      id="audit-input-notes"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isLoading}
                      id="audit-submit-btn"
                      className="w-full group inline-flex items-center justify-center px-8 py-4 bg-white text-black font-bold text-xs tracking-wider uppercase hover:bg-[#F7F7F5] transition-all duration-200 disabled:opacity-60"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          <span>Processing Request...</span>
                        </>
                      ) : (
                        <>
                          <span>{tr('SOLICITAR AUDITORÍA GRATIS', 'REQUEST FREE AUDIT')}</span>
                          <ArrowRight className="w-4 h-4 ml-3 transition-transform duration-200 group-hover:translate-x-1" />
                        </>
                      )}
                    </button>
                    <p className="font-mono-code text-[10px] text-white/40 text-center mt-2.5">
                      No commitment. We respond within 24–48 hours with concrete recommendations.
                    </p>
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
