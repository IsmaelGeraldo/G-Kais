import React, { useRef } from 'react';
import {
  ArrowRight,
  FileText,
  ListChecks,
  Sparkles,
  Target,
  X
} from 'lucide-react';
import { useModalAccessibility } from '../utils/useModal';
import { useLanguage } from '../i18n/LanguageContext';

interface LeadFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAudit: () => void;
}

export const LeadFlowModal: React.FC<LeadFlowModalProps> = ({
  isOpen,
  onClose,
  onOpenAudit
}) => {
  const { language } = useLanguage();
  const es = language === 'es';
  const modalRef = useRef<HTMLDivElement | null>(null);

  useModalAccessibility({ isOpen, onClose, containerRef: modalRef });

  if (!isOpen) return null;

  const blocks = [
    {
      icon: FileText,
      title: es ? '1. Contexto estructurado' : '1. Structured context',
      body: es
        ? 'La ficha del lead reúne información del negocio, problema, solución actual, objetivo, notas e historial. La calificación progresiva muestra qué sabemos y qué falta descubrir.'
        : 'The lead record brings together business information, problem, current solution, goal, notes and history. Progressive qualification shows what is known and what is still missing.'
    },
    {
      icon: Target,
      title: es ? '2. Prioridad y decisión' : '2. Priority and decision',
      body: es
        ? 'Priority Work identifica oportunidades que requieren atención. AI Brief usa el contexto disponible y la Knowledge Base para apoyar la decisión comercial sin modificar el CRM automáticamente.'
        : 'Priority Work identifies opportunities that need attention. AI Brief uses available context and the Knowledge Base to support commercial decisions without automatically changing the CRM.'
    },
    {
      icon: ListChecks,
      title: es ? '3. Ejecución y seguimiento' : '3. Execution and follow-up',
      body: es
        ? 'Responsable, próxima acción, seguimiento, Task Engine y actividad histórica mantienen visible qué debe ocurrir después y qué resultado tuvo cada acción.'
        : 'Owner, next action, follow-up, Task Engine and activity history keep visible what should happen next and what result each action produced.'
    },
    {
      icon: Sparkles,
      title: es ? '4. IA con contexto del negocio' : '4. AI with business context',
      body: es
        ? 'La Knowledge Base entrega contexto sobre oferta, cliente ideal, criterios de calificación, objeciones y políticas para que el análisis sea más específico y consistente.'
        : 'The Knowledge Base provides context about offers, ideal customers, qualification criteria, objections and policies so analysis can be more specific and consistent.'
    }
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="leadflow-modal-title"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-3xl bg-[#F7F7F5] border border-[#D8D8D8] p-6 sm:p-9 shadow-2xl rounded-3xl my-8 text-left max-h-[90vh] overflow-y-auto"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-[#777] hover:text-[#0A0A0A]"
          aria-label={es ? 'Cerrar ventana' : 'Close modal'}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-7 pr-8">
          <span className="font-mono-code text-[10px] uppercase tracking-[0.22em] text-[#0A3F4D] font-semibold block mb-2">
            {es ? 'ARQUITECTURA ACTUAL' : 'CURRENT ARCHITECTURE'}
          </span>
          <h3
            id="leadflow-modal-title"
            className="text-3xl sm:text-4xl font-extrabold tracking-tight"
          >
            LeadFlow
          </h3>
          <p className="text-sm sm:text-base text-[#707570] mt-2 leading-relaxed">
            {es
              ? 'La capa operativa donde G-KAIS convierte contexto y análisis en prioridades y próximas acciones.'
              : 'The operating layer where G-KAIS turns context and analysis into priorities and next actions.'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {blocks.map((block) => {
            const Icon = block.icon;
            return (
              <div
                key={block.title}
                className="rounded-2xl border border-[#E3E5E2] bg-white p-5"
              >
                <Icon className="w-4 h-4 text-[#0A3F4D]" />
                <h4 className="text-sm font-extrabold tracking-tight mt-4">
                  {block.title}
                </h4>
                <p className="text-xs leading-relaxed text-[#666] mt-2">
                  {block.body}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-5 rounded-2xl border border-[#0A3F4D]/20 bg-[#F4F8F8] p-4">
          <p className="font-mono-code text-[9px] uppercase tracking-wider text-[#0A3F4D] font-bold">
            {es ? 'ESTADO ACTUAL' : 'CURRENT STATE'}
          </p>
          <p className="text-xs leading-relaxed text-[#566461] mt-2">
            {es
              ? 'La demostración refleja funciones ya presentes en G-KAIS. Integraciones de canales como WhatsApp o Instagram se habilitan por separado cuando estén configuradas y activas.'
              : 'The demo reflects capabilities already present in G-KAIS. Channel integrations such as WhatsApp or Instagram are enabled separately when configured and active.'}
          </p>
        </div>

        <div className="mt-7 pt-5 border-t border-[#E5E5E5] flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={() => {
              onClose();
              onOpenAudit();
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl px-5 py-3 bg-[#0A0A0A] text-white font-semibold text-xs tracking-wider uppercase hover:bg-[#0A3F4D]"
          >
            {es ? 'Evaluar mi negocio' : 'Assess my business'}
            <ArrowRight className="w-3.5 h-3.5 ml-2" />
          </button>

          <button
            onClick={onClose}
            className="text-xs font-mono-code text-[#777] hover:text-[#0A0A0A] uppercase"
          >
            {es ? 'Cerrar resumen' : 'Close overview'}
          </button>
        </div>
      </div>
    </div>
  );
};
