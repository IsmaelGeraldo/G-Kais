import React, { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Inbox,
  ListChecks,
  Sparkles,
  Target,
  User
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

type StageId = 'signal' | 'context' | 'decision' | 'execution' | 'learning';

interface Stage {
  id: StageId;
  num: string;
  labelEs: string;
  labelEn: string;
  titleEs: string;
  titleEn: string;
  descriptionEs: string;
  descriptionEn: string;
}

const STAGES: Stage[] = [
  {
    id: 'signal',
    num: '01',
    labelEs: 'SEÑAL',
    labelEn: 'SIGNAL',
    titleEs: 'Una oportunidad entra al sistema.',
    titleEn: 'An opportunity enters the system.',
    descriptionEs:
      'Puede venir de un formulario, una importación o un canal conectado. La señal se convierte en un registro que G-KAIS puede gestionar.',
    descriptionEn:
      'It can come from a form, an import or a connected channel. The signal becomes a record G-KAIS can manage.'
  },
  {
    id: 'context',
    num: '02',
    labelEs: 'CONTEXTO',
    labelEn: 'CONTEXT',
    titleEs: 'G-KAIS organiza lo que sabemos.',
    titleEn: 'G-KAIS organizes what is known.',
    descriptionEs:
      'Tipo de negocio, problema, solución actual, objetivo, volumen, canal y notas quedan reunidos en una ficha operativa.',
    descriptionEn:
      'Business type, problem, current solution, goal, volume, channel and notes are gathered into one operational record.'
  },
  {
    id: 'decision',
    num: '03',
    labelEs: 'DECISIÓN',
    labelEn: 'DECISION',
    titleEs: 'Prioriza y ayuda a decidir qué hacer.',
    titleEn: 'Prioritize and decide what should happen.',
    descriptionEs:
      'Priority Work, calificación progresiva y AI Brief ayudan a identificar urgencia, vacíos y la mejor próxima acción.',
    descriptionEn:
      'Priority Work, progressive qualification and AI Brief help identify urgency, gaps and the best next action.'
  },
  {
    id: 'execution',
    num: '04',
    labelEs: 'EJECUCIÓN',
    labelEn: 'EXECUTION',
    titleEs: 'Cada oportunidad recibe un siguiente paso.',
    titleEn: 'Every opportunity gets a next step.',
    descriptionEs:
      'Responsable, próxima acción, fecha de seguimiento y Task Engine mantienen el trabajo comercial en movimiento.',
    descriptionEn:
      'Owner, next action, follow-up date and Task Engine keep commercial work moving.'
  },
  {
    id: 'learning',
    num: '05',
    labelEs: 'APRENDIZAJE',
    labelEn: 'LEARNING',
    titleEs: 'El contexto se conserva y mejora.',
    titleEn: 'Context is retained and improved.',
    descriptionEs:
      'Bitácora, historial y resultados dejan trazabilidad para entender qué ocurrió y qué debería pasar después.',
    descriptionEn:
      'Notes, activity history and outcomes preserve traceability so the team knows what happened and what should happen next.'
  }
];

export const TheSystemSection: React.FC = () => {
  const { language } = useLanguage();
  const es = language === 'es';
  const [selectedStageId, setSelectedStageId] = useState<StageId>('decision');

  const selectedStage =
    STAGES.find((stage) => stage.id === selectedStageId) || STAGES[2];
  const selectedIndex = STAGES.findIndex((stage) => stage.id === selectedStageId);

  const stageLabel = (stage: Stage) =>
    es ? stage.labelEs : stage.labelEn;

  const stageTitle = (stage: Stage) =>
    es ? stage.titleEs : stage.titleEn;

  const stageDescription = (stage: Stage) =>
    es ? stage.descriptionEs : stage.descriptionEn;

  return (
    <section
      id="the-system"
      className="py-24 md:py-32 lg:py-40 border-b border-[#0A0A0A]/10 bg-[#F7F7F5]"
    >
      <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8">
        <div className="mb-14 lg:mb-20 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-end">
          <div className="lg:col-span-7">
            <span className="font-mono-code text-xs uppercase tracking-[0.24em] text-[#0A3F4D] font-semibold block mb-4">
              {es ? 'EL SISTEMA' : 'THE SYSTEM'}
            </span>
            <h2 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-[-0.04em] text-[#0A0A0A] leading-[1.02]">
              {es
                ? 'De una señal a una próxima acción clara.'
                : 'From a signal to a clear next action.'}
            </h2>
          </div>

          <p className="lg:col-span-5 text-lg text-[#707570] leading-relaxed max-w-xl">
            {es
              ? 'G-KAIS no es solo una bandeja de entrada ni un CRM. Es la capa que organiza contexto, prioridad y ejecución para que cada oportunidad sepa qué pasa después.'
              : 'G-KAIS is not just an inbox or a CRM. It is the layer that organizes context, priority and execution so every opportunity knows what happens next.'}
          </p>
        </div>

        <div className="rounded-[30px] border border-[#D9DCDA] bg-[#DEDFDD] p-3 sm:p-4 shadow-[0_24px_70px_-50px_rgba(0,0,0,0.55)]">
          <div className="rounded-[24px] border border-[#E5E7E4] bg-white overflow-hidden">
            <div className="px-5 sm:px-7 py-4 border-b border-[#ECEDEB] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-[#0A3F4D]" />
                <span className="font-mono-code text-[10px] uppercase tracking-[0.16em] font-bold">
                  {es ? 'MAPA DEL FLUJO COMERCIAL' : 'COMMERCIAL WORKFLOW MAP'}
                </span>
              </div>
              <span className="font-mono-code text-[9px] uppercase tracking-wider text-[#777]">
                {es ? 'DEL INGRESO A LA EJECUCIÓN' : 'FROM INTAKE TO EXECUTION'}
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12">
              <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-[#ECEDEB] p-4 sm:p-6">
                <div className="space-y-2">
                  {STAGES.map((stage, index) => {
                    const isSelected = stage.id === selectedStageId;
                    const isReached = index <= selectedIndex;

                    return (
                      <button
                        type="button"
                        key={stage.id}
                        onClick={() => setSelectedStageId(stage.id)}
                        className={
                          'w-full rounded-2xl border p-4 text-left transition-all ' +
                          (isSelected
                            ? 'border-[#0A3F4D]/30 bg-[#F4F8F8] shadow-sm'
                            : 'border-transparent bg-transparent hover:border-[#E3E5E2] hover:bg-[#FAFAF9]')
                        }
                      >
                        <div className="flex items-center gap-4">
                          <span
                            className={
                              'w-9 h-9 shrink-0 rounded-xl flex items-center justify-center font-mono-code text-[10px] font-bold ' +
                              (isReached
                                ? 'bg-[#0A3F4D] text-white'
                                : 'bg-[#F0F1EF] text-[#777]')
                            }
                          >
                            {stage.num}
                          </span>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-mono-code text-[9px] uppercase tracking-[0.14em] text-[#0A3F4D] font-bold">
                                {stageLabel(stage)}
                              </span>
                              {isSelected && (
                                <ArrowRight className="w-4 h-4 text-[#0A3F4D]" />
                              )}
                            </div>
                            <p className="text-sm sm:text-base font-bold tracking-tight mt-1">
                              {stageTitle(stage)}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <p className="mt-5 px-1 text-xs leading-relaxed text-[#777]">
                  {es
                    ? 'Haz clic en cada etapa. La vista de la derecha muestra qué parte de G-KAIS participa en ese momento.'
                    : 'Click each stage. The view on the right shows which part of G-KAIS is involved at that moment.'}
                </p>
              </div>

              <div className="lg:col-span-7 p-4 sm:p-6 lg:p-7 bg-[#FAFAF9]">
                <div className="rounded-3xl border border-[#E1E3E0] bg-white overflow-hidden shadow-[0_18px_45px_-38px_rgba(0,0,0,0.55)]">
                  <div className="px-5 py-4 border-b border-[#ECEDEB] flex items-center justify-between gap-3">
                    <div>
                      <p className="font-mono-code text-[9px] uppercase tracking-[0.16em] text-[#0A3F4D] font-bold">
                        {stageLabel(selectedStage)}
                      </p>
                      <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight mt-1">
                        {stageTitle(selectedStage)}
                      </h3>
                    </div>
                    <span className="font-mono-code text-[9px] text-[#777]">
                      {selectedStage.num}/05
                    </span>
                  </div>

                  <div className="p-5 sm:p-6">
                    <p className="text-sm sm:text-base leading-relaxed text-[#666]">
                      {stageDescription(selectedStage)}
                    </p>

                    <div className="mt-6">
                      {selectedStage.id === 'signal' && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {[
                            [es ? 'Formulario' : 'Form', 'Lead nuevo'],
                            [es ? 'Importación CSV' : 'CSV import', 'Base existente'],
                            [es ? 'Canal conectado' : 'Connected channel', 'Señal entrante']
                          ].map(([label, value]) => (
                            <div
                              key={label}
                              className="rounded-2xl border border-[#E5E5E5] bg-[#F7F7F5] p-4"
                            >
                              <Inbox className="w-4 h-4 text-[#0A3F4D]" />
                              <p className="font-mono-code text-[8px] uppercase tracking-wider text-[#777] mt-3">
                                {label}
                              </p>
                              <p className="text-xs font-bold mt-1">{value}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {selectedStage.id === 'context' && (
                        <div className="rounded-2xl border border-[#E5E5E5] bg-[#F7F7F5] p-4 sm:p-5">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-[#0A3F4D]" />
                              <span className="font-mono-code text-[9px] uppercase tracking-wider font-bold">
                                {es ? 'Ficha del lead' : 'Lead record'}
                              </span>
                            </div>
                            <span className="rounded-full border border-[#0A3F4D]/20 bg-white px-2.5 py-1 text-[9px] font-bold text-[#0A3F4D]">
                              {es ? 'Contexto 6/9' : 'Context 6/9'}
                            </span>
                          </div>

                          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {[
                              es ? 'Tipo de negocio' : 'Business type',
                              es ? 'Servicio' : 'Service',
                              es ? 'Canal' : 'Channel',
                              es ? 'Problema' : 'Problem',
                              es ? 'Solución actual' : 'Current solution',
                              es ? 'Objetivo' : 'Goal'
                            ].map((item) => (
                              <div
                                key={item}
                                className="rounded-xl border border-[#E6E7E5] bg-white px-3 py-2.5"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-[#0A3F4D]" />
                                <p className="text-[10px] font-semibold mt-1.5">{item}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedStage.id === 'decision' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="rounded-2xl border border-[#0A3F4D]/20 bg-[#F4F8F8] p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Target className="w-4 h-4 text-[#0A3F4D]" />
                                <span className="font-mono-code text-[9px] uppercase tracking-wider font-bold">
                                  Priority Work
                                </span>
                              </div>
                              <span className="rounded-full bg-[#0A3F4D] text-white px-2 py-1 text-[8px] font-bold">
                                {es ? 'ALTA' : 'HIGH'}
                              </span>
                            </div>
                            <p className="text-xs font-bold leading-relaxed mt-4">
                              {es
                                ? '120 consultas/día + seguimiento manual + demoras.'
                                : '120 inquiries/day + manual follow-up + delays.'}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-[#E5E5E5] bg-white p-4">
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-[#0A3F4D]" />
                              <span className="font-mono-code text-[9px] uppercase tracking-wider font-bold">
                                AI Brief
                              </span>
                            </div>
                            <p className="text-xs leading-relaxed mt-4 text-[#555]">
                              {es
                                ? 'El problema principal está en la capacidad de respuesta y continuidad del seguimiento.'
                                : 'The main issue is response capacity and follow-up continuity.'}
                            </p>
                            <div className="mt-3 pt-3 border-t border-[#EFEFEF]">
                              <span className="font-mono-code text-[8px] uppercase tracking-wider text-[#777]">
                                {es ? 'FALTA SABER' : 'STILL UNKNOWN'}
                              </span>
                              <p className="text-[10px] mt-1">
                                {es
                                  ? 'Tiempo promedio de respuesta'
                                  : 'Average response time'}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {selectedStage.id === 'execution' && (
                        <div className="rounded-2xl border border-[#E5E5E5] bg-[#F7F7F5] p-4 sm:p-5">
                          <div className="flex items-center gap-2">
                            <ListChecks className="w-4 h-4 text-[#0A3F4D]" />
                            <span className="font-mono-code text-[9px] uppercase tracking-wider font-bold">
                              {es ? 'QUÉ TOCA HACER AHORA' : 'WHAT HAPPENS NEXT'}
                            </span>
                          </div>

                          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="rounded-xl bg-white border border-[#E5E5E5] p-3">
                              <span className="text-[8px] uppercase tracking-wider text-[#777]">
                                {es ? 'Responsable' : 'Owner'}
                              </span>
                              <div className="flex items-center gap-2 mt-2">
                                <User className="w-3.5 h-3.5 text-[#0A3F4D]" />
                                <strong className="text-xs">
                                  {es ? 'Equipo comercial' : 'Sales team'}
                                </strong>
                              </div>
                            </div>
                            <div className="rounded-xl bg-white border border-[#E5E5E5] p-3 sm:col-span-2">
                              <span className="text-[8px] uppercase tracking-wider text-[#777]">
                                {es ? 'Próxima acción' : 'Next action'}
                              </span>
                              <p className="text-xs font-bold mt-2">
                                {es
                                  ? 'Revisar flujo actual y confirmar reunión'
                                  : 'Review current flow and confirm meeting'}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {selectedStage.id === 'learning' && (
                        <div className="rounded-2xl border border-[#E5E5E5] bg-[#F7F7F5] p-4 sm:p-5">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-[#0A3F4D]" />
                            <span className="font-mono-code text-[9px] uppercase tracking-wider font-bold">
                              {es ? 'HISTORIAL DE ACTIVIDAD' : 'ACTIVITY HISTORY'}
                            </span>
                          </div>

                          <div className="mt-4 space-y-3">
                            {[
                              es ? 'Lead revisado y perfil actualizado' : 'Lead reviewed and profile updated',
                              es ? 'AI Brief generado con contexto del negocio' : 'AI Brief generated with business context',
                              es ? 'Próxima acción definida para el equipo' : 'Next action defined for the team'
                            ].map((item, index) => (
                              <div key={item} className="flex items-start gap-3">
                                <span className="mt-1.5 w-2 h-2 rounded-full bg-[#0A3F4D]" />
                                <div>
                                  <p className="text-xs font-semibold">{item}</p>
                                  <p className="text-[9px] text-[#777] mt-1">
                                    {es ? 'Contexto preservado' : 'Context preserved'} · 0{index + 1}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-6 pt-5 border-t border-[#ECEDEB] flex flex-wrap items-center justify-between gap-3">
                      <span className="text-[10px] text-[#777]">
                        {es
                          ? 'La IA apoya la decisión. El equipo mantiene el control.'
                          : 'AI supports the decision. The team stays in control.'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const nextIndex = (selectedIndex + 1) % STAGES.length;
                          setSelectedStageId(STAGES[nextIndex].id);
                        }}
                        className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#0A3F4D]"
                      >
                        {es ? 'Siguiente etapa' : 'Next stage'}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                <p className="mt-4 text-[10px] leading-relaxed text-[#777]">
                  {es
                    ? 'Ejemplo ilustrativo. Las fuentes y automatizaciones disponibles dependen de la configuración e integraciones activas de cada implementación.'
                    : 'Illustrative example. Available sources and automations depend on the configuration and active integrations of each implementation.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
