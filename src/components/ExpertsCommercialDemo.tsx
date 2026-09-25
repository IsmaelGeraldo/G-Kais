import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CircleDot,
  MessageCircle,
  Sparkles,
  Target,
  UserCheck
} from 'lucide-react';

type DemoStage = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  status: string;
  owner: string;
  nextAction: string;
  known: string[];
  missing: string[];
  questions: string[];
  copilot: string;
  activity: string[];
};

const STAGES: DemoStage[] = [
  {
    id: 'inquiry',
    eyebrow: '01 · CAPTURAR',
    title: 'Nueva consulta desde Instagram',
    description:
      'Una prospecta pregunta por un programa de consultoría premium después de consumir contenido en Instagram.',
    status: 'Nuevo lead',
    owner: 'Equipo comercial',
    nextAction: 'Responder y completar contexto inicial',
    known: [
      'Llegó desde Instagram.',
      'Dirige una agencia boutique de marketing.',
      'Pregunta por acompañamiento para ordenar ventas y seguimiento.'
    ],
    missing: [
      'Volumen actual de oportunidades.',
      'Cómo gestiona hoy las conversaciones.',
      'Impacto real del problema en ventas.'
    ],
    questions: [
      '¿Cuántas conversaciones comerciales manejan normalmente por semana?',
      '¿Dónde registran hoy cada oportunidad y su próximo paso?',
      '¿Qué suele pasar con los leads que no compran en la primera conversación?'
    ],
    copilot:
      'No vender todavía. Primero confirmar cómo funciona su proceso actual y si el problema principal es volumen, seguimiento o falta de visibilidad.',
    activity: [
      'Consulta recibida desde Instagram.',
      'Lead creado con origen y contexto inicial.',
      'G-KAIS marca información faltante antes de recomendar una solución.'
    ]
  },
  {
    id: 'qualification',
    eyebrow: '02 · ENTENDER',
    title: 'Calificación progresiva',
    description:
      'La conversación ya entregó suficiente contexto para entender el problema sin obligar al equipo a completar un formulario enorme.',
    status: 'Contactado',
    owner: 'Ismael',
    nextAction: 'Revisar aplicación y preparar llamada',
    known: [
      'Recibe 35–50 consultas comerciales al mes.',
      'Instagram y WhatsApp concentran la mayoría de las conversaciones.',
      'Usa planillas y notas personales para seguimiento.',
      'Varias propuestas quedan sin una próxima acción definida.'
    ],
    missing: [
      'Cuánto valor económico queda estancado cada mes.',
      'Quién decide sobre nuevas herramientas/procesos.',
      'Qué parte del proceso quiere mantener bajo control humano.'
    ],
    questions: [
      '¿Cuántas propuestas suelen quedar abiertas sin seguimiento claro?',
      '¿Quién debería ser responsable cuando una oportunidad necesita atención?',
      '¿Qué acciones te sentirías cómoda automatizando y cuáles prefieres aprobar?'
    ],
    copilot:
      'La brecha parece estar entre generar interés y mantener continuidad comercial. La llamada debe cuantificar esa pérdida y validar el nivel de control humano esperado.',
    activity: [
      'Perfil comercial enriquecido durante la conversación.',
      'Problema principal identificado: seguimiento irregular.',
      'Oportunidad movida a calificación.'
    ]
  },
  {
    id: 'copilot',
    eyebrow: '03 · DECIDIR',
    title: 'Copiloto prepara la llamada',
    description:
      'Antes de conversar, G-KAIS separa hechos, vacíos y preguntas para que el operador llegue con claridad y no con un discurso genérico.',
    status: 'Reunión',
    owner: 'Ismael',
    nextAction: 'Realizar llamada de diagnóstico',
    known: [
      'El negocio sí genera demanda.',
      'El seguimiento depende demasiado de memoria y tareas manuales.',
      'Existe una pérdida visible después de enviar propuestas.',
      'La prospecta quiere conservar aprobación humana en comunicaciones sensibles.'
    ],
    missing: [
      'Valor promedio de cada venta.',
      'Tasa de cierre actual.',
      'Cantidad de oportunidades reactivables.'
    ],
    questions: [
      'Si mañana pudiéramos corregir una sola parte del proceso, ¿cuál tendría mayor impacto?',
      '¿Cuánto vale aproximadamente una venta para ustedes?',
      '¿Qué tendría que mejorar para que consideraras exitosa una implementación en 30 días?'
    ],
    copilot:
      'Abrir la conversación desde la pérdida de continuidad, no desde “IA”. Mostrar cómo cada oportunidad puede conservar contexto, responsable y próximo paso antes de hablar de automatización.',
    activity: [
      'Copiloto generado desde ficha + historial + Knowledge Base.',
      'Preguntas de descubrimiento preparadas.',
      'Próxima acción definida: llamada de diagnóstico.'
    ]
  },
  {
    id: 'meeting',
    eyebrow: '04 · CONVERSAR',
    title: 'Resultado de la llamada',
    description:
      'El operador registra el resultado y el sistema transforma la conversación en una decisión operativa concreta.',
    status: 'Seguimiento',
    owner: 'Ismael',
    nextAction: 'Enviar propuesta de piloto',
    known: [
      'Ticket promedio aproximado: US$2.500.',
      'Entre 8 y 12 propuestas quedan abiertas cada mes.',
      'La prioridad es recuperar seguimiento antes de automatizar captación.',
      'La prospecta acepta comenzar con modo Copilot.'
    ],
    missing: [
      'Usuarios que participarán en el piloto.',
      'Canal inicial definitivo para la implementación.',
      'Fecha exacta de inicio.'
    ],
    questions: [
      '¿Quién debe participar en la configuración inicial?',
      '¿Comenzamos por WhatsApp o por el flujo de propuestas?',
      '¿Qué fecha sería razonable para revisar los primeros resultados?'
    ],
    copilot:
      'Proponer un piloto acotado: organizar oportunidades, próxima acción y seguimiento; medir leads sin siguiente paso y oportunidades recuperadas antes de ampliar integraciones.',
    activity: [
      'Resultado de reunión guardado.',
      'Estado actualizado automáticamente a Seguimiento.',
      'Tarea creada: enviar propuesta de piloto.'
    ]
  },
  {
    id: 'followup',
    eyebrow: '05 · ACTUAR',
    title: 'Seguimiento con próxima acción',
    description:
      'La propuesta deja de ser un documento aislado: tiene responsable, fecha y un siguiente movimiento visible para el equipo.',
    status: 'Seguimiento',
    owner: 'Ismael',
    nextAction: 'Seguimiento de propuesta en 48 h',
    known: [
      'Propuesta de piloto enviada.',
      'Alcance: proceso comercial + Copiloto + seguimiento.',
      'Cliente revisará propuesta con su socia.',
      'Seguimiento pactado dentro de 48 horas.'
    ],
    missing: [
      'Decisión final de la socia.',
      'Confirmación del inicio del piloto.'
    ],
    questions: [
      '¿Quedó alguna duda del alcance después de revisarlo juntas?',
      '¿Hay algo que debamos ajustar antes de iniciar?',
      'Si está aprobado, ¿confirmamos responsables y fecha de kickoff?'
    ],
    copilot:
      'No volver a vender desde cero. Retomar el contexto acordado, resolver dudas pendientes y buscar una decisión clara sobre el piloto.',
    activity: [
      'Propuesta registrada como enviada.',
      'Seguimiento programado automáticamente para 48 h.',
      'Oportunidad permanece visible en Priority Work.'
    ]
  },
  {
    id: 'client',
    eyebrow: '06 · CONTINUAR',
    title: 'Venta cerrada → comienza Client Journey',
    description:
      'Cerrar la venta no elimina la oportunidad del sistema. G-KAIS cambia el objetivo: onboarding, adopción, resultados y próxima relación comercial.',
    status: 'Cliente · Onboarding',
    owner: 'Customer Success',
    nextAction: 'Enviar onboarding y agendar kickoff',
    known: [
      'Piloto aprobado.',
      'Objetivo inicial: reducir oportunidades sin próximo paso.',
      'Primer flujo: seguimiento de propuestas.',
      'Revisión de resultados acordada a 30 días.'
    ],
    missing: [
      'Accesos y responsables del equipo cliente.',
      'Baseline final para comparar resultados.'
    ],
    questions: [
      '¿Quién será responsable interno del piloto?',
      '¿Qué datos necesitamos importar para establecer el punto de partida?',
      '¿Qué indicador revisaremos juntos en la reunión de 30 días?'
    ],
    copilot:
      'Cambiar el foco desde cierre comercial a activación. El próximo éxito ya no es “vender”, sino lograr que el cliente use el sistema y pueda medir una mejora concreta.',
    activity: [
      'Resultado aplicado: Venta cerrada.',
      'Lead convertido en Cliente.',
      'Onboarding creado como próxima acción.',
      'Client Journey iniciado.'
    ]
  }
];

export const ExpertsCommercialDemo: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const [stageId, setStageId] = useState(STAGES[0].id);
  const stage = useMemo(
    () => STAGES.find((item) => item.id === stageId) || STAGES[0],
    [stageId]
  );
  const stageIndex = STAGES.findIndex((item) => item.id === stage.id);

  return (
    <div className="min-h-screen bg-[#F3F4F1] text-[#0A0A0A]">
      <header className="sticky top-0 z-30 border-b border-black/10 bg-[#F7F7F5]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-5 py-4 lg:px-8">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onExit}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 bg-white hover:bg-[#F0F1EE]"
              aria-label="Volver a G-KAIS"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <p className="font-mono-code text-[9px] font-bold uppercase tracking-[0.2em] text-[#0A3F4D]">
                G-KAIS FOR EXPERTS
              </p>
              <h1 className="text-lg font-extrabold tracking-tight sm:text-xl">
                Demo comercial · de consulta a cliente
              </h1>
            </div>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <span className="rounded-full border border-[#D6D9D5] bg-white px-3 py-1.5 font-mono-code text-[8px] font-bold uppercase tracking-wider text-[#666]">
              DEMO · DATOS SIMULADOS
            </span>
            <span className="rounded-full bg-[#0A3F4D] px-3 py-1.5 font-mono-code text-[8px] font-bold uppercase tracking-wider text-white">
              MODO COPILOT
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] px-5 py-7 lg:px-8 lg:py-10">
        <section className="mb-6 rounded-[26px] border border-black/10 bg-white p-5 shadow-[0_20px_60px_-46px_rgba(0,0,0,0.5)] lg:p-7">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div className="max-w-3xl">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#0A3F4D]" />
                <p className="font-mono-code text-[9px] font-bold uppercase tracking-[0.18em] text-[#0A3F4D]">
                  CASO SIMULADO · CONSULTORA / NEGOCIO HIGH-TICKET
                </p>
              </div>
              <h2 className="text-2xl font-black tracking-tight sm:text-3xl lg:text-4xl">
                Cada oportunidad sabe qué pasa después.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#5E6662] sm:text-base">
                Lucía Herrera dirige una agencia boutique. La demo muestra cómo G-KAIS conserva contexto,
                prepara la conversación y mantiene una próxima acción desde el primer mensaje hasta el onboarding.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-[#F5F7F5] px-4 py-3">
                <p className="text-xl font-black">6</p>
                <p className="font-mono-code text-[7px] uppercase tracking-wider text-[#777]">Etapas</p>
              </div>
              <div className="rounded-2xl bg-[#F5F7F5] px-4 py-3">
                <p className="text-xl font-black">1</p>
                <p className="font-mono-code text-[7px] uppercase tracking-wider text-[#777]">Próxima acción</p>
              </div>
              <div className="rounded-2xl bg-[#F5F7F5] px-4 py-3">
                <p className="text-xl font-black">100%</p>
                <p className="font-mono-code text-[7px] uppercase tracking-wider text-[#777]">Humano al mando</p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[330px_minmax(0,1fr)]">
          <aside className="rounded-[24px] border border-black/10 bg-[#111513] p-3 text-white shadow-[0_24px_60px_-45px_rgba(0,0,0,0.7)] xl:sticky xl:top-[92px] xl:self-start">
            <div className="px-3 pb-3 pt-2">
              <p className="font-mono-code text-[8px] font-bold uppercase tracking-[0.18em] text-white/45">
                Recorrido comercial
              </p>
            </div>
            <div className="space-y-1.5">
              {STAGES.map((item, index) => {
                const active = item.id === stage.id;
                const completed = index < stageIndex;
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => setStageId(item.id)}
                    className={
                      'w-full rounded-2xl px-3 py-3.5 text-left transition ' +
                      (active ? 'bg-white text-[#111513]' : 'text-white hover:bg-white/7')
                    }
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={
                          'mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ' +
                          (active
                            ? 'border-[#0A3F4D] bg-[#0A3F4D] text-white'
                            : completed
                              ? 'border-white/30 bg-white/12 text-white'
                              : 'border-white/15 text-white/50')
                        }
                      >
                        {completed ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span className="text-[9px] font-bold">{index + 1}</span>}
                      </span>
                      <div>
                        <p className={active ? 'font-mono-code text-[7px] font-bold uppercase tracking-wider text-[#0A3F4D]' : 'font-mono-code text-[7px] font-bold uppercase tracking-wider text-white/40'}>
                          {item.eyebrow}
                        </p>
                        <p className="mt-1 text-xs font-bold leading-snug">{item.title}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-[0_24px_70px_-52px_rgba(0,0,0,0.65)]">
            <div className="border-b border-black/10 bg-[#F8F8F6] p-5 lg:p-7">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                <div>
                  <p className="font-mono-code text-[8px] font-bold uppercase tracking-[0.2em] text-[#0A3F4D]">
                    {stage.eyebrow}
                  </p>
                  <h3 className="mt-2 text-2xl font-black tracking-tight lg:text-3xl">{stage.title}</h3>
                  <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#606864]">{stage.description}</p>
                </div>
                <span className="self-start rounded-full border border-[#0A3F4D]/25 bg-white px-3 py-1.5 text-[9px] font-bold text-[#0A3F4D]">
                  {stage.status}
                </span>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-2xl border border-black/8 bg-white p-4">
                  <div className="flex items-center gap-2 text-[#0A3F4D]">
                    <UserCheck className="h-4 w-4" />
                    <span className="font-mono-code text-[8px] font-bold uppercase tracking-wider">Responsable</span>
                  </div>
                  <p className="mt-2 text-sm font-bold">{stage.owner}</p>
                </div>
                <div className="rounded-2xl border border-black/8 bg-white p-4 sm:col-span-1 lg:col-span-2">
                  <div className="flex items-center gap-2 text-[#0A3F4D]">
                    <Target className="h-4 w-4" />
                    <span className="font-mono-code text-[8px] font-bold uppercase tracking-wider">Próxima acción</span>
                  </div>
                  <p className="mt-2 text-sm font-bold">{stage.nextAction}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-0 lg:grid-cols-12">
              <div className="border-b border-black/10 p-5 lg:col-span-7 lg:border-b-0 lg:border-r lg:p-7">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-[#DDE4DF] bg-[#F7FAF8] p-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#0A3F4D]" />
                      <p className="font-mono-code text-[8px] font-bold uppercase tracking-wider text-[#0A3F4D]">Qué sabemos</p>
                    </div>
                    <div className="mt-3 space-y-2">
                      {stage.known.map((item) => (
                        <p key={item} className="text-xs leading-relaxed text-[#303633]">+ {item}</p>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#E7E2D8] bg-[#FCFAF5] p-4">
                    <div className="flex items-center gap-2">
                      <CircleDot className="h-4 w-4 text-[#836A36]" />
                      <p className="font-mono-code text-[8px] font-bold uppercase tracking-wider text-[#725C30]">Qué falta descubrir</p>
                    </div>
                    <div className="mt-3 space-y-2">
                      {stage.missing.map((item) => (
                        <p key={item} className="text-xs leading-relaxed text-[#5B5549]">– {item}</p>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-black/10 bg-white p-4">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-[#0A3F4D]" />
                    <p className="font-mono-code text-[8px] font-bold uppercase tracking-wider text-[#555]">Preguntas para la llamada</p>
                  </div>
                  <div className="mt-3 space-y-2.5">
                    {stage.questions.map((question, index) => (
                      <div key={question} className="flex gap-3">
                        <span className="font-mono-code text-[8px] font-bold text-[#0A3F4D]">{String(index + 1).padStart(2, '0')}</span>
                        <p className="text-xs leading-relaxed">{question}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 rounded-2xl bg-[#0B100E] p-5 text-white">
                  <div className="flex items-center gap-2 text-white/60">
                    <Sparkles className="h-4 w-4" />
                    <p className="font-mono-code text-[8px] font-bold uppercase tracking-wider">Copiloto comercial</p>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-white/92">{stage.copilot}</p>
                </div>
              </div>

              <div className="bg-[#FAFAF8] p-5 lg:col-span-5 lg:p-7">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-[#0A3F4D]" />
                  <p className="font-mono-code text-[8px] font-bold uppercase tracking-wider text-[#555]">Actividad de la oportunidad</p>
                </div>

                <div className="relative mt-5 space-y-0">
                  {stage.activity.map((item, index) => (
                    <div key={item} className="relative flex gap-3 pb-5 last:pb-0">
                      {index < stage.activity.length - 1 && (
                        <span className="absolute left-[7px] top-4 h-full w-px bg-[#D9DDDA]" />
                      )}
                      <span className="relative z-10 mt-1.5 h-[15px] w-[15px] shrink-0 rounded-full border-[3px] border-[#F7F7F5] bg-[#0A3F4D]" />
                      <div>
                        <p className="text-xs font-semibold leading-relaxed">{item}</p>
                        <p className="mt-1 font-mono-code text-[7px] uppercase tracking-wider text-[#8A8E8B]">Contexto conservado</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 rounded-2xl border border-[#D9E3DF] bg-white p-4">
                  <p className="font-mono-code text-[8px] font-bold uppercase tracking-wider text-[#0A3F4D]">Principio G-KAIS</p>
                  <p className="mt-2 text-sm font-extrabold leading-snug">
                    Cada oportunidad debe saber qué pasa después.
                  </p>
                  {stage.id === 'client' && (
                    <p className="mt-2 text-xs leading-relaxed text-[#606864]">
                      Y después de convertirse en cliente, también.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>

        <p className="mx-auto mt-6 max-w-4xl text-center text-[11px] leading-relaxed text-[#777]">
          Esta es una demostración simulada del flujo operativo objetivo. Las conexiones con Instagram, WhatsApp y calendario se habilitan por implementación y autorización del cliente; no se presentan aquí como integraciones activas.
        </p>
      </main>
    </div>
  );
};
