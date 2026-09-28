import React from 'react';
import { AlertTriangle, ChevronRight, Clock3, Mail, Phone, CalendarCheck2 } from 'lucide-react';
import type { Language } from '../../i18n/LanguageContext';

type PriorityItem = {
  id: string;
  name: string;
  stage: string;
  action: string;
  reason: string;
  nextAction: string;
  severity: 'critical' | 'attention';
  icon: 'email' | 'phone' | 'meeting';
};

const ITEMS: PriorityItem[] = [
  {
    id: 'sofia',
    name: 'Sofía Martínez',
    stage: 'Cliente activo',
    action: 'Enviar email',
    reason: '2 compromisos vencidos y sin actualización de progreso en 9 días.',
    nextAction: 'Revisar compromisos antes de la próxima sesión.',
    severity: 'critical',
    icon: 'email'
  },
  {
    id: 'diego',
    name: 'Diego Rojas',
    stage: 'Renovación',
    action: 'Confirmar reunión',
    reason: 'El programa termina en 16 días y todavía no existe una decisión de continuidad.',
    nextAction: 'Preparar conversación de renovación.',
    severity: 'attention',
    icon: 'meeting'
  },
  {
    id: 'valentina',
    name: 'Valentina Cruz',
    stage: 'Lead',
    action: 'Llamar',
    reason: 'Alta intención detectada y la última conversación quedó sin siguiente paso.',
    nextAction: 'Confirmar disponibilidad para llamada de diagnóstico.',
    severity: 'attention',
    icon: 'phone'
  }
];

function ActionIcon({ kind }: { kind: PriorityItem['icon'] }) {
  if (kind === 'email') return <Mail className="h-4 w-4" />;
  if (kind === 'phone') return <Phone className="h-4 w-4" />;
  return <CalendarCheck2 className="h-4 w-4" />;
}

export function PriorityRadarWorkspace({ language, onOpenClient }: { language: Language; onOpenClient: (id: string) => void }) {
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-black/10 bg-white p-5 md:p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">THE RADAR</p>
            <h3 className="mt-2 text-xl font-semibold">{language === 'es' ? 'Quién necesita atención y qué hacer' : 'Who needs attention and what to do'}</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-black/50">{language === 'es' ? 'La prioridad no es una etapa: puede afectar a un lead, onboarding, cliente activo o renovación.' : 'Priority is not a lifecycle stage: it can affect a lead, onboarding, active client or renewal.'}</p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-[#A23A32]/8 px-3 py-2 text-xs font-semibold text-[#8D332C]"><AlertTriangle className="h-4 w-4" />3 {language === 'es' ? 'requieren acción' : 'need action'}</div>
        </div>
      </section>

      {ITEMS.map((item) => (
        <section key={item.id} className="rounded-2xl border border-black/10 bg-white p-5 shadow-[0_12px_35px_rgba(10,10,10,0.03)] md:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
            <div className={`mt-1 h-3 w-3 shrink-0 rounded-full ${item.severity === 'critical' ? 'bg-[#A23A32]' : 'bg-[#A46F16]'}`} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold">{item.name}</h3>
                <span className="rounded-full bg-black/[0.04] px-2.5 py-1 text-[10px] font-medium text-black/50">{item.stage}</span>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase ${item.severity === 'critical' ? 'bg-[#A23A32]/8 text-[#8D332C]' : 'bg-[#A46F16]/10 text-[#82570F]'}`}>{language === 'es' ? 'Requiere atención' : 'Needs attention'}</span>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-xl bg-[#FFF8F2] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9A5B2D]">{language === 'es' ? 'ACCIÓN REQUERIDA' : 'REQUIRED ACTION'}</p>
                  <div className="mt-2 flex items-center gap-2 text-sm font-semibold"><ActionIcon kind={item.icon} />{item.action}</div>
                  <p className="mt-2 text-xs leading-5 text-black/50">{item.reason}</p>
                </div>
                <div className="rounded-xl bg-[#F4F8F7] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0A3F4D]">{language === 'es' ? 'PRÓXIMA ACCIÓN' : 'NEXT ACTION'}</p>
                  <p className="mt-2 text-sm font-semibold">{item.nextAction}</p>
                  <div className="mt-2 flex items-center gap-2 text-[10px] text-black/35"><Clock3 className="h-3.5 w-3.5" />{language === 'es' ? 'Debe quedar resuelta o reprogramada' : 'Must be resolved or rescheduled'}</div>
                </div>
              </div>
            </div>
            <button type="button" onClick={() => onOpenClient(item.id)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-black/10 px-4 py-2.5 text-xs font-semibold text-black/60 transition hover:border-[#0A3F4D]/30 hover:text-[#0A3F4D]">{language === 'es' ? 'Abrir persona' : 'Open person'}<ChevronRight className="h-3.5 w-3.5" /></button>
          </div>
        </section>
      ))}
    </div>
  );
}
