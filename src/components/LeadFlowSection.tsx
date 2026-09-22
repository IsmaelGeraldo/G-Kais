import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  Sparkles,
  Target,
  User
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { LeadFlowHeader } from './leadflow/LeadFlowHeader';

interface LeadFlowSectionProps {
  onExplore?: () => void;
  onOpenAudit?: () => void;
}

interface DemoLead {
  id: string;
  name: string;
  company: string;
  status: string;
  priority: 'HIGH' | 'MEDIUM';
  source: string;
  nextAction: string;
  owner: string;
  followUp: string;
  context: number;
  summaryEs: string;
  summaryEn: string;
  helpEs: string;
  helpEn: string;
  missingEs: string;
  missingEn: string;
}

const DEMO_LEADS: DemoLead[] = [
  {
    id: 'david',
    name: 'David Alarcón',
    company: 'Iberia Logistics',
    status: 'Follow-up',
    priority: 'HIGH',
    source: 'WhatsApp',
    nextAction: 'Confirmar reunión y revisar flujo actual',
    owner: 'Equipo comercial',
    followUp: 'Hoy',
    context: 7,
    summaryEs:
      'Gestiona un alto volumen de consultas con Excel y seguimiento manual. El mayor riesgo está en las demoras y la pérdida de continuidad.',
    summaryEn:
      'Handles a high volume of inquiries with Excel and manual follow-up. The main risk is delay and lack of continuity.',
    helpEs:
      'Centralizar contexto, priorizar qué necesita atención y mantener una próxima acción clara.',
    helpEn:
      'Centralize context, prioritize what needs attention and keep a clear next action.',
    missingEs: 'Tiempo promedio de respuesta y tamaño del equipo comercial.',
    missingEn: 'Average response time and sales team size.'
  },
  {
    id: 'laura',
    name: 'Laura Méndez',
    company: 'Casa Atelier',
    status: 'New',
    priority: 'HIGH',
    source: 'Formulario web',
    nextAction: 'Revisar proceso posterior a cotización',
    owner: 'Sin asignar',
    followUp: 'Sin fecha',
    context: 5,
    summaryEs:
      'Las cotizaciones se envían, pero el seguimiento posterior depende de cada asesor y algunas oportunidades se enfrían.',
    summaryEn:
      'Quotes are sent, but follow-up depends on each advisor and some opportunities go cold.',
    helpEs:
      'Definir responsable, seguimiento y próxima acción para cada propuesta abierta.',
    helpEn:
      'Define owner, follow-up and next action for each open proposal.',
    missingEs: 'Cuántas cotizaciones quedan sin seguimiento cada semana.',
    missingEn: 'How many quotes go without follow-up every week.'
  },
  {
    id: 'camila',
    name: 'Camila Rojas',
    company: 'Clínica Nova',
    status: 'Follow-up',
    priority: 'MEDIUM',
    source: 'Instagram',
    nextAction: 'Completar criterios de calificación',
    owner: 'Recepción',
    followUp: 'Mañana',
    context: 6,
    summaryEs:
      'Hay interés en tratamientos, pero muchas conversaciones no se transforman en oportunidades con seguimiento.',
    summaryEn:
      'There is interest in treatments, but many conversations do not become managed opportunities.',
    helpEs:
      'Convertir cada consulta en una oportunidad con contexto, prioridad y siguiente paso.',
    helpEn:
      'Turn every inquiry into an opportunity with context, priority and a next step.',
    missingEs: 'Qué tratamientos consultan y cuándo se considera un lead calificado.',
    missingEn: 'Which treatments are requested and what qualifies a lead.'
  },
  {
    id: 'mateo',
    name: 'Mateo Morales',
    company: 'North Studio',
    status: 'New',
    priority: 'MEDIUM',
    source: 'CSV import',
    nextAction: 'Revisar perfil y definir responsable',
    owner: 'Sin asignar',
    followUp: 'Sin fecha',
    context: 3,
    summaryEs:
      'Lead importado con contexto parcial. Antes de actuar conviene completar el perfil y entender su problema actual.',
    summaryEn:
      'Imported lead with partial context. Before acting, the team should complete the profile and understand the current problem.',
    helpEs:
      'Usar la calificación progresiva para descubrir lo esencial antes de definir la acción comercial.',
    helpEn:
      'Use progressive qualification to discover the essentials before defining a commercial action.',
    missingEs: 'Problema principal, sistema actual y objetivo.',
    missingEn: 'Primary problem, current system and goal.'
  }
];

export const LeadFlowSection: React.FC<LeadFlowSectionProps> = ({
  onExplore,
  onOpenAudit
}) => {
  const { language } = useLanguage();
  const es = language === 'es';
  const [selectedLeadId, setSelectedLeadId] = useState('david');

  const selectedLead = useMemo(
    () => DEMO_LEADS.find((lead) => lead.id === selectedLeadId) || DEMO_LEADS[0],
    [selectedLeadId]
  );

  const priorityWork = DEMO_LEADS.filter((lead) => lead.priority === 'HIGH');
  const newLeads = DEMO_LEADS.filter((lead) => lead.status === 'New');

  const summary = es ? selectedLead.summaryEs : selectedLead.summaryEn;
  const help = es ? selectedLead.helpEs : selectedLead.helpEn;
  const missing = es ? selectedLead.missingEs : selectedLead.missingEn;

  return (
    <section
      id="leadflow"
      className="py-24 md:py-32 lg:py-40 border-b border-[#0A0A0A]/10 bg-[#F7F7F5]"
    >
      <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8">
        <LeadFlowHeader />

        <div
          className="rounded-[30px] border border-[#D9DCDA] bg-[#DEDFDD] p-3 sm:p-4 shadow-[0_24px_70px_-50px_rgba(0,0,0,0.55)]"
          id="leadflow-dashboard-container"
        >
          <div className="rounded-[24px] overflow-hidden border border-[#E5E7E4] bg-white">
            <div className="px-5 sm:px-6 py-4 border-b border-[#ECEDEB] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-[#0A3F4D]" />
                <span className="font-mono-code text-[10px] uppercase tracking-[0.16em] font-bold">
                  LEADFLOW // {es ? 'ESPACIO OPERATIVO' : 'OPERATING WORKSPACE'}
                </span>
              </div>
              <span className="font-mono-code text-[9px] uppercase tracking-wider text-[#777]">
                {es ? 'DEMO · DATOS SIMULADOS' : 'DEMO · SIMULATED DATA'}
              </span>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 border-b border-[#ECEDEB]">
              {[
                [es ? 'Nuevos leads' : 'New leads', '12'],
                [es ? 'Prioridad alta' : 'High priority', '4'],
                [es ? 'Seguimientos hoy' : 'Follow-ups today', '3'],
                [es ? 'Contexto incompleto' : 'Incomplete context', '5']
              ].map(([label, value], index) => (
                <div
                  key={label}
                  className={
                    'p-4 sm:p-5 ' +
                    (index < 3 ? 'border-r border-[#ECEDEB] ' : '') +
                    (index < 2 ? 'border-b lg:border-b-0 border-[#ECEDEB] ' : '')
                  }
                >
                  <p className="font-mono-code text-[8px] uppercase tracking-wider text-[#777]">
                    {label}
                  </p>
                  <p className="text-2xl font-extrabold tracking-tight mt-1">
                    {value}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12">
              <div className="xl:col-span-5 border-b xl:border-b-0 xl:border-r border-[#ECEDEB] bg-[#FAFAF9] p-4 sm:p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-4">
                  <div className="rounded-2xl border border-[#E3E5E2] bg-white overflow-hidden">
                    <div className="px-4 py-3 border-b border-[#ECEDEB] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-[#0A3F4D]" />
                        <span className="font-mono-code text-[9px] uppercase tracking-wider font-bold">
                          Priority Work
                        </span>
                      </div>
                      <span className="text-[9px] text-[#777]">{priorityWork.length}</span>
                    </div>

                    <div className="divide-y divide-[#EFEFEF]">
                      {priorityWork.map((lead) => (
                        <button
                          type="button"
                          key={lead.id}
                          onClick={() => setSelectedLeadId(lead.id)}
                          className={
                            'w-full p-4 text-left transition-colors ' +
                            (selectedLead.id === lead.id
                              ? 'bg-[#F4F8F8]'
                              : 'hover:bg-[#FAFAF9]')
                          }
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-bold">{lead.name}</p>
                              <p className="text-[10px] text-[#777] mt-1">
                                {lead.company} · {lead.source}
                              </p>
                            </div>
                            <span className="rounded-full bg-[#0A3F4D] text-white px-2 py-1 text-[8px] font-bold">
                              {es ? 'ALTA' : 'HIGH'}
                            </span>
                          </div>
                          <p className="text-[10px] leading-relaxed text-[#555] mt-3">
                            {lead.nextAction}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#E3E5E2] bg-white overflow-hidden">
                    <div className="px-4 py-3 border-b border-[#ECEDEB] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#0A3F4D]" />
                        <span className="font-mono-code text-[9px] uppercase tracking-wider font-bold">
                          {es ? 'Nuevos leads' : 'New leads'}
                        </span>
                      </div>
                      <span className="text-[9px] text-[#777]">{newLeads.length}</span>
                    </div>

                    <div className="divide-y divide-[#EFEFEF]">
                      {newLeads.map((lead) => (
                        <button
                          type="button"
                          key={lead.id}
                          onClick={() => setSelectedLeadId(lead.id)}
                          className={
                            'w-full p-4 text-left transition-colors ' +
                            (selectedLead.id === lead.id
                              ? 'bg-[#F4F8F8]'
                              : 'hover:bg-[#FAFAF9]')
                          }
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-bold">{lead.name}</p>
                              <p className="text-[10px] text-[#777] mt-1">
                                {lead.company} · {lead.source}
                              </p>
                            </div>
                            <span className="rounded-full border border-[#D8D8D8] bg-white px-2 py-1 text-[8px] font-bold text-[#666]">
                              NEW
                            </span>
                          </div>
                          <p className="text-[10px] leading-relaxed text-[#555] mt-3">
                            {lead.nextAction}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="xl:col-span-7 p-4 sm:p-5 lg:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-[#ECEDEB]">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                        {selectedLead.name}
                      </h3>
                      <span className="rounded-full border border-[#D8D8D8] bg-[#F7F7F5] px-2 py-1 text-[8px] font-bold text-[#666]">
                        {selectedLead.status}
                      </span>
                    </div>
                    <p className="text-xs text-[#777] mt-1">
                      {selectedLead.company} · {selectedLead.source}
                    </p>
                  </div>

                  <span
                    className={
                      'rounded-full px-2.5 py-1.5 text-[8px] font-bold ' +
                      (selectedLead.priority === 'HIGH'
                        ? 'bg-[#0A3F4D] text-white'
                        : 'border border-[#D8D8D8] bg-white text-[#666]')
                    }
                  >
                    {selectedLead.priority === 'HIGH'
                      ? es
                        ? 'PRIORIDAD ALTA'
                        : 'HIGH PRIORITY'
                      : es
                        ? 'PRIORIDAD MEDIA'
                        : 'MEDIUM PRIORITY'}
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-xl border border-[#E5E5E5] bg-[#FAFAF9] p-3">
                    <span className="font-mono-code text-[8px] uppercase tracking-wider text-[#777]">
                      {es ? 'Responsable' : 'Owner'}
                    </span>
                    <div className="flex items-center gap-2 mt-2">
                      <User className="w-3.5 h-3.5 text-[#0A3F4D]" />
                      <p className="text-xs font-bold">{selectedLead.owner}</p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-[#E5E5E5] bg-[#FAFAF9] p-3">
                    <span className="font-mono-code text-[8px] uppercase tracking-wider text-[#777]">
                      {es ? 'Seguimiento' : 'Follow-up'}
                    </span>
                    <div className="flex items-center gap-2 mt-2">
                      <Clock className="w-3.5 h-3.5 text-[#0A3F4D]" />
                      <p className="text-xs font-bold">{selectedLead.followUp}</p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-[#E5E5E5] bg-[#FAFAF9] p-3">
                    <span className="font-mono-code text-[8px] uppercase tracking-wider text-[#777]">
                      {es ? 'Calificación' : 'Qualification'}
                    </span>
                    <p className="text-xs font-bold mt-2">
                      {selectedLead.context}/9 {es ? 'contexto' : 'context'}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-[#0A3F4D]/20 bg-[#F4F8F8] p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#0A3F4D]" />
                    <span className="font-mono-code text-[9px] uppercase tracking-wider text-[#0A3F4D] font-bold">
                      {es ? 'QUÉ TOCA HACER AHORA' : 'WHAT HAPPENS NEXT'}
                    </span>
                  </div>
                  <p className="text-sm font-bold leading-relaxed mt-2">
                    {selectedLead.nextAction}
                  </p>
                </div>

                <div className="mt-4 rounded-2xl border border-[#D8E3E5] bg-white overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#E7ECEC] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#0A3F4D]" />
                      <span className="font-mono-code text-[9px] uppercase tracking-wider text-[#0A3F4D] font-bold">
                        G-KAIS AI Brief
                      </span>
                    </div>
                    <span className="text-[8px] uppercase tracking-wider text-[#777]">
                      {es ? 'DEMO' : 'DEMO'}
                    </span>
                  </div>

                  <div className="p-4">
                    <span className="font-mono-code text-[8px] uppercase tracking-wider text-[#777]">
                      {es ? 'Lectura rápida' : 'Quick read'}
                    </span>
                    <p className="text-sm leading-relaxed mt-2">{summary}</p>

                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="rounded-xl border border-[#E5E5E5] bg-[#FAFAF9] p-3">
                        <span className="font-mono-code text-[8px] uppercase tracking-wider text-[#777]">
                          {es ? 'Qué falta saber' : 'What is still unknown'}
                        </span>
                        <p className="text-[11px] leading-relaxed mt-2">{missing}</p>
                      </div>
                      <div className="rounded-xl border border-[#0A3F4D]/15 bg-[#F4F8F8] p-3">
                        <span className="font-mono-code text-[8px] uppercase tracking-wider text-[#0A3F4D] font-bold">
                          {es ? 'Cómo G-KAIS puede ayudar' : 'How G-KAIS can help'}
                        </span>
                        <p className="text-[11px] leading-relaxed mt-2">{help}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <p className="text-[10px] leading-relaxed text-[#777] max-w-lg">
                    {es
                      ? 'Esta vista es ilustrativa, pero refleja el flujo actual del producto: prioridad, ficha, calificación, próxima acción y AI Brief.'
                      : 'This view is illustrative, but reflects the current product flow: priority, lead record, qualification, next action and AI Brief.'}
                  </p>

                  <div className="flex items-center gap-2">
                    {onExplore && (
                      <button
                        type="button"
                        onClick={onExplore}
                        className="rounded-xl border border-[#D8D8D8] bg-white px-3.5 py-2.5 text-[10px] font-semibold uppercase tracking-wider hover:bg-[#F7F7F5]"
                      >
                        {es ? 'Ver arquitectura' : 'View architecture'}
                      </button>
                    )}
                    {onOpenAudit && (
                      <button
                        type="button"
                        onClick={onOpenAudit}
                        className="inline-flex items-center rounded-xl bg-[#0A0A0A] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-white hover:bg-[#0A3F4D]"
                      >
                        {es ? 'Evaluar mi negocio' : 'Assess my business'}
                        <ArrowRight className="w-3.5 h-3.5 ml-2" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
