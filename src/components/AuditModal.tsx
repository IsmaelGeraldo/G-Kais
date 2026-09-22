import React, { useState, useRef } from 'react';
import { X, ArrowRight, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { submitAuditRequest } from '../services/audit';
import { useModalAccessibility } from '../utils/useModal';
import { ContactChannel } from '../types/audit';
import { useLanguage } from '../i18n/LanguageContext';

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
  const { language } = useLanguage();
  const tr = (es: string, en: string) => (language === 'es' ? es : en);
  const channelLabel = (channel: ContactChannel) => {
    if (language === 'en') return channel;
    const labels: Record<ContactChannel, string> = {
      WhatsApp: 'WhatsApp',
      Website: 'Sitio web',
      Email: 'Email',
      Instagram: 'Instagram',
      Phone: 'Teléfono',
      'Multiple channels': 'Múltiples canales'
    };
    return labels[channel];
  };
  const modalRef = useRef<HTMLDivElement | null>(null);
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
  const [confirmationStatus, setConfirmationStatus] = useState<
    'SENT' | 'SKIPPED' | 'FAILED' | 'UNKNOWN'
  >('UNKNOWN');
  const [confirmationIssue, setConfirmationIssue] = useState<
    'TEST_SENDER' | 'PROVIDER_REJECTED' | 'NOT_CONFIGURED' | 'NETWORK_ERROR' | undefined
  >(undefined);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useModalAccessibility({ isOpen, onClose, containerRef: modalRef });

  if (!isOpen) return null;

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
        setConfirmationStatus(result.confirmationStatus || 'UNKNOWN');
        setConfirmationIssue(result.confirmationIssue);
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
    setConfirmationStatus('UNKNOWN');
    setConfirmationIssue(undefined);
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
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="audit-modal-title"
    >
      <div 
        ref={modalRef}
        className="relative w-full max-w-2xl bg-[#F7F7F5] border border-[#0A0A0A] p-6 sm:p-10 shadow-2xl rounded-3xl my-8 text-left max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-[#777777] hover:text-[#0A0A0A] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A3F4D]"
          aria-label={tr('Cerrar ventana', 'Close modal')}
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
                  {tr('SOLICITUD DE AUDITORÍA REGISTRADA', 'AUDIT REQUEST REGISTERED')}
                </span>
                <h3 className="text-2xl font-extrabold tracking-tight text-[#0A0A0A]">
                  {tr('Gracias', 'Thank you')}, {formData.name}
                </h3>
              </div>
            </div>

            <div className="p-4 bg-white border border-[#0A0A0A]/15 rounded-2xl space-y-2 text-xs font-mono-code">
              <div className="flex justify-between">
                <span className="text-[#777777]">{tr('ID DE ENVÍO:', 'SUBMISSION ID:')}</span>
                <span className="font-bold text-[#0A0A0A]">{submissionId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#777777]">{tr('EMPRESA:', 'COMPANY:')}</span>
                <span className="font-semibold text-[#0A0A0A]">{formData.company}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#777777]">EMAIL:</span>
                <span className="font-semibold text-[#0A0A0A]">{formData.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#777777]">{tr('CANAL PRINCIPAL:', 'PRIMARY INBOUND CHANNEL:')}</span>
                <span className="font-semibold text-[#0A0A0A]">{channelLabel(formData.contactChannel)}</span>
              </div>
            </div>

            <div
              className={
                'rounded-2xl border p-4 text-xs leading-relaxed ' +
                (confirmationStatus === 'SENT'
                  ? 'border-[#0A3F4D]/20 bg-[#F4F8F8] text-[#0A3F4D]'
                  : 'border-amber-200 bg-amber-50 text-amber-900')
              }
            >
              <p className="font-mono-code text-[9px] uppercase tracking-wider font-bold">
                {tr('Confirmación por email', 'Email confirmation')}
              </p>
              {confirmationStatus === 'SENT' ? (
                <p className="mt-1.5">
                  {tr(
                    `Enviamos un comprobante a ${formData.email}. Revisa también spam o promociones si no aparece en unos minutos.`,
                    `We sent a receipt to ${formData.email}. Check spam or promotions too if it does not appear shortly.`
                  )}
                </p>
              ) : confirmationIssue === 'TEST_SENDER' ? (
                <p className="mt-1.5">
                  {tr(
                    'Tu solicitud quedó registrada, pero el sistema de correo está en modo de prueba y no pudo enviar la confirmación a esta dirección.',
                    'Your request was recorded, but the email system is in test mode and could not send the confirmation to this address.'
                  )}
                </p>
              ) : (
                <p className="mt-1.5">
                  {tr(
                    'Tu solicitud quedó registrada correctamente, aunque el comprobante automático por email no pudo enviarse.',
                    'Your request was recorded successfully, although the automatic email receipt could not be sent.'
                  )}
                </p>
              )}
            </div>

            <div className="border-t border-[#0A0A0A]/10 pt-4">
              <h4 className="font-mono-code text-xs uppercase tracking-wider text-[#0A0A0A] font-bold mb-3">
                {tr('QUÉ SUCEDE AHORA:', 'WHAT HAPPENS NEXT:')}
              </h4>
              <ul className="space-y-2 text-sm text-[#777777]">
                <li className="flex items-start">
                  <span className="font-mono-code text-xs text-[#0A3F4D] mr-2 font-bold">1.</span>
                  {tr('G-KAIS revisa tu flujo actual de leads y determina si un piloto con casos reales puede ser un buen siguiente paso.', 'G-KAIS reviews your current lead flow and determines whether a pilot with real cases is a useful next step.')}
                </li>
                <li className="flex items-start">
                  <span className="font-mono-code text-xs text-[#0A3F4D] mr-2 font-bold">2.</span>
                  {tr('Identificamos dónde se están deteniendo actualmente tus prospectos.', 'We identify where prospects currently stall in your process.')}
                </li>
                <li className="flex items-start">
                  <span className="font-mono-code text-xs text-[#0A3F4D] mr-2 font-bold">3.</span>
                  {tr('Recibes una recomendación concreta y, si hay encaje, podemos probar G-KAIS con una muestra de tus leads actuales.', 'You receive a concrete recommendation and, if there is a fit, we can test G-KAIS using a sample of your current leads.')}
                </li>
              </ul>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-[#0A0A0A]/10">
              <button
                type="button"
                onClick={handleReset}
                className="text-xs font-mono-code text-[#777777] underline hover:text-[#0A0A0A]"
              >
                {tr('Enviar otra solicitud', 'Submit another request')}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 bg-[#0A0A0A] text-[#F7F7F5] text-xs font-semibold uppercase tracking-wider hover:bg-[#0A3F4D] transition-colors"
              >
                {tr('Cerrar', 'Close')}
              </button>
            </div>
          </div>
        ) : (
          /* Form Content */
          <div>
            <div className="mb-6 pr-8">
              <span className="font-mono-code text-[11px] uppercase tracking-[0.24em] text-[#0A3F4D] font-semibold block mb-2">
                {tr('AUDITORÍA DE SISTEMAS COMERCIALES', 'COMMERCIAL SYSTEMS AUDIT')}
              </span>
              <h3 id="audit-modal-title" className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0A0A0A]">
                {tr('Solicita una auditoría gratuita de tu negocio', 'Request Free AI Business Audit')}
              </h3>
              <p className="text-sm text-[#777777] mt-2 leading-relaxed">
                {tr('Encuentra dónde tu negocio está perdiendo oportunidades comerciales. Revisaremos tu flujo y definiremos qué conviene implementar o probar primero.', "Find where your business is losing commercial opportunities. We'll review your flow and define what is worth implementing or testing first.")}
              </p>
            </div>

            {/* {tr('QUÉ RECIBES', 'WHAT YOU RECEIVE')} Section */}
            <div className="mb-6 p-4 sm:p-5 bg-white border border-[#0A0A0A]/15 rounded-2xl text-left">
              <span className="font-mono-code text-[11px] uppercase tracking-wider text-[#0A3F4D] font-bold block mb-3">
                WHAT YOU RECEIVE
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="flex items-start space-x-2.5">
                  <span className="font-mono-code text-[11px] text-[#0A3F4D] font-bold shrink-0">01</span>
                  <span className="text-[#0A0A0A] font-medium">{tr('Revisión del flujo actual', 'Current workflow review')}</span>
                </div>
                <div className="flex items-start space-x-2.5">
                  <span className="font-mono-code text-[11px] text-[#0A3F4D] font-bold shrink-0">02</span>
                  <span className="text-[#0A0A0A] font-medium">{tr('Tres posibles fugas de oportunidades', 'Three potential opportunity leaks')}</span>
                </div>
                <div className="flex items-start space-x-2.5">
                  <span className="font-mono-code text-[11px] text-[#0A3F4D] font-bold shrink-0">03</span>
                  <span className="text-[#0A0A0A] font-medium">{tr('Oportunidades de automatización', 'Automation opportunities')}</span>
                </div>
                <div className="flex items-start space-x-2.5">
                  <span className="font-mono-code text-[11px] text-[#0A3F4D] font-bold shrink-0">04</span>
                  <span className="text-[#0A0A0A] font-medium">{tr('Siguiente paso: sistema o piloto', 'Next step: system or pilot')}</span>
                </div>
              </div>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex items-center space-x-2">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono-code uppercase text-[#777777] mb-1.5">
                    {tr('Nombre *', 'Name *')}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Elena Vance"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-white border border-[#0A0A0A]/15 rounded-xl px-3.5 py-2.5 text-sm text-[#0A0A0A] focus:outline-none focus:border-[#0A3F4D] focus:ring-1 focus:ring-[#0A3F4D]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono-code uppercase text-[#777777] mb-1.5">
                    {tr('Empresa *', 'Company *')}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Acme Corp"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full bg-white border border-[#0A0A0A]/15 rounded-xl px-3.5 py-2.5 text-sm text-[#0A0A0A] focus:outline-none focus:border-[#0A3F4D] focus:ring-1 focus:ring-[#0A3F4D]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono-code uppercase text-[#777777] mb-1.5">
                    {tr('Email de trabajo *', 'Work Email *')}
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="elena@company.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-white border border-[#0A0A0A]/15 rounded-xl px-3.5 py-2.5 text-sm text-[#0A0A0A] focus:outline-none focus:border-[#0A3F4D] focus:ring-1 focus:ring-[#0A3F4D]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono-code uppercase text-[#777777] mb-1.5">
                    {tr('Sitio web', 'Website')}
                  </label>
                  <input
                    type="text"
                    placeholder="https://company.com"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="w-full bg-white border border-[#0A0A0A]/15 rounded-xl px-3.5 py-2.5 text-sm text-[#0A0A0A] focus:outline-none focus:border-[#0A3F4D] focus:ring-1 focus:ring-[#0A3F4D]"
                  />
                </div>
              </div>

              {/* How do customers usually contact you? */}
              <div>
                <label className="block text-xs font-mono-code uppercase text-[#777777] mb-1.5">
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
                            ? 'border-[#0A0A0A] bg-[#0A0A0A] text-[#F7F7F5] font-semibold'
                            : 'border-[#0A0A0A]/15 bg-white text-[#0A0A0A] hover:border-[#0A0A0A]/40'
                        }`}
                      >
                        {channelLabel(channel)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* What happens after someone contacts? */}
              <div>
                <label className="block text-xs font-mono-code uppercase text-[#777777] mb-1.5">
                  {tr('¿Qué sucede después de que alguien hace una consulta?', 'What happens after someone makes an inquiry?')} <span className="text-[#777777]/70 lowercase">{tr('(opcional)', '(optional)')}</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Sales reps reply when they have time, inquiries wait in a shared inbox, follow-ups are irregular..."
                  value={formData.inquiryNotes}
                  onChange={(e) => setFormData({ ...formData, inquiryNotes: e.target.value })}
                  className="w-full bg-white border border-[#0A0A0A]/15 rounded-xl px-3.5 py-2.5 text-xs text-[#0A0A0A] focus:outline-none focus:border-[#0A3F4D] focus:ring-1 focus:ring-[#0A3F4D]"
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
                      <span>{tr('Enviando solicitud...', 'Submitting Request...')}</span>
                    </>
                  ) : (
                    <>
                      <span>{tr('SOLICITAR AUDITORÍA GRATIS', 'REQUEST FREE AUDIT')}</span>
                      <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>
                <p className="font-mono-code text-[10px] text-[#777777] text-center mt-2.5">
                  {tr('Tu información se maneja de forma confidencial. Sin spam. Sin obligación.', 'Your information is handled confidentially. No spam. No obligation.')}
                </p>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
