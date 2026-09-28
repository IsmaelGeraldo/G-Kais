import React, { useEffect, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { SessionMemoryWorkspace } from './SessionMemoryWorkspace';
import { useLanguage } from '../i18n/LanguageContext';
import { requestSessionCopilot, type SessionCopilotClient } from '../services/sessionCopilot';

type Props = { onBack: () => void };
type JournalEntry = { clientId: string; title?: string; body?: string; createdAt?: string };

type StoredClient = SessionCopilotClient & {
  commitments: Array<{ id: string; label: string; status: 'pending' | 'done' | 'overdue' }>;
  copilot: {
    summary: string;
    gap: string;
    known: string[];
    risks: string[];
    questions: string[];
    howHelp: string[];
    plan: string[];
    callOpening: string;
  };
};

const CLIENT_STORAGE_KEY = 'gkais-experts-session-clients-v2';
const JOURNAL_STORAGE_KEY = 'gkais-experts-client-journal-v1';

const DEFAULT_CLIENTS: StoredClient[] = [
  {
    id: 'sofia', name: 'Sofía Martínez', company: 'Sofía Martínez Consulting', program: 'Mentoría Escala', week: 'Semana 7 / 24', goal: 'Crear adquisición predecible y llegar a US$15k/mes.', nextAction: 'Revisar compromisos antes de la próxima sesión.', blockers: ['Ejecución inconsistente', 'Dificultad para proteger tiempo comercial'],
    commitments: [{ id: 'sofia-c1', label: 'Publicar 3 piezas de contenido', status: 'overdue' }, { id: 'sofia-c2', label: 'Contactar 25 prospectos', status: 'pending' }, { id: 'sofia-c3', label: 'Revisión comercial cada viernes', status: 'done' }],
    copilot: {
      summary: 'Sofía tiene el funnel activo, pero el progreso se frenó por una ejecución semanal insuficiente.',
      gap: 'Quiere adquisición predecible, pero todavía no existe suficiente volumen de ejecución para evaluar el funnel con una muestra fiable.',
      known: ['El funnel ya está activo.', 'Dos compromisos no llegaron al nivel acordado.', 'No existe una actualización de progreso reciente.'],
      risks: ['No sabemos si la baja ejecución viene de tiempo, claridad o resistencia a la estrategia.', 'Cambiar el funnel ahora podría ocultar el problema real.'],
      questions: ['¿Qué ocurrió concretamente cuando intentaste ejecutar lo acordado?', '¿Qué parte fue difícil: tiempo, claridad o disciplina?', '¿Qué resultados reales generó el funnel con el volumen alcanzado?'],
      howHelp: ['Separar si el problema es estrategia o ejecución.', 'Convertir la próxima semana en compromisos medibles.', 'Detectar bloqueadores repetidos en la bitácora.'],
      plan: ['Diagnosticar por qué no se ejecutó.', 'Revisar datos reales del funnel.', 'Cerrar con un compromiso semanal concreto.'],
      callOpening: 'Quiero partir revisando qué pasó desde la última sesión y entender qué te frenó antes de tocar la estrategia.'
    }
  },
  {
    id: 'andres', name: 'Andrés Silva', company: 'Silva Growth', program: 'Mentoría Escala', week: 'Semana 11 / 24', goal: 'Aumentar la tasa de cierre y estabilizar ingresos mensuales.', nextAction: 'Revisar llamadas recientes y estandarizar follow-up.', blockers: ['Seguimiento irregular', 'Propuestas poco estandarizadas'],
    commitments: [{ id: 'andres-c1', label: 'Revisar 5 llamadas grabadas', status: 'done' }, { id: 'andres-c2', label: 'Enviar follow-up dentro de 24h', status: 'pending' }],
    copilot: {
      summary: 'Andrés mantiene un buen volumen de oportunidades; la mejora principal está en seguimiento y conversión.',
      gap: 'La generación de reuniones funciona, pero la conversión depende demasiado de cómo se gestiona cada oportunidad después de la llamada.',
      known: ['Existe volumen suficiente de reuniones.', 'El seguimiento no está completamente estandarizado.'],
      risks: ['Puede estar intentando escalar adquisición antes de estabilizar conversión.', 'No está claro qué objeciones concentran la mayor pérdida.'],
      questions: ['¿En qué momento se enfrían más oportunidades?', '¿Qué objeciones se repitieron?', '¿Qué sucede durante las primeras 24 horas después de una llamada?'],
      howHelp: ['Detectar patrones en oportunidades perdidas.', 'Convertir decisiones de sesión en seguimiento repetible.'],
      plan: ['Revisar evidencia de llamadas.', 'Definir follow-up estándar.', 'Medir el cambio antes de aumentar volumen.'],
      callOpening: 'Hoy quiero concentrarnos menos en conseguir más reuniones y más en qué está pasando con las que ya tenemos.'
    }
  },
  {
    id: 'diego', name: 'Diego Rojas', company: 'Rojas Advisory', program: 'Mentoría Escala', week: 'Semana 22 / 24', goal: 'Delegar operación y mantener crecimiento sin aumentar carga personal.', nextAction: 'Preparar conversación de renovación basada en la siguiente brecha real.', blockers: ['Decisiones centralizadas', 'Documentación incompleta'],
    commitments: [{ id: 'diego-c1', label: 'Documentar SOP de onboarding', status: 'pending' }, { id: 'diego-c2', label: 'Preparar métricas de cierre del programa', status: 'done' }],
    copilot: {
      summary: 'Diego está cerca del cierre del programa; la sesión debe conectar resultados logrados, brechas abiertas y una posible segunda etapa.',
      gap: 'La operación está más delegada, pero aún existen decisiones críticas y documentación que dependen del fundador.',
      known: ['El programa está cerca de finalizar.', 'La delegación mejoró.', 'Quedan procesos concentrados en Diego.'],
      risks: ['Una renovación sin una nueva brecha clara puede sentirse como continuidad sin propósito.', 'Falta cuantificar parte del progreso.'],
      questions: ['¿Qué cambió realmente en tu carga operativa?', '¿Qué sigue dependiendo de ti?', '¿Cuál es el siguiente problema que vale la pena resolver?'],
      howHelp: ['Convertir el cierre en una revisión de resultados.', 'Identificar el próximo cuello de botella.'],
      plan: ['Cuantificar resultados.', 'Identificar la siguiente brecha.', 'Definir si existe una segunda etapa concreta.'],
      callOpening: 'Quiero que hoy hagamos una revisión muy concreta de qué cambió, qué sigue dependiendo de ti y qué problema queda realmente por resolver.'
    }
  }
];

function loadClients(): StoredClient[] {
  try {
    const raw = localStorage.getItem(CLIENT_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) && parsed.length ? parsed as StoredClient[] : DEFAULT_CLIENTS;
  } catch {
    return DEFAULT_CLIENTS;
  }
}

function loadJournal(): JournalEntry[] {
  try {
    const raw = localStorage.getItem(JOURNAL_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed as JournalEntry[] : [];
  } catch {
    return [];
  }
}

export function SessionMemoryWorkspaceAI({ onBack }: Props) {
  const { language } = useLanguage();
  const [ready, setReady] = useState(false);
  const [usingAI, setUsingAI] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      const clients = loadClients();
      const journal = loadJournal();
      try {
        const enriched = await Promise.all(clients.map(async (client) => {
          const brief = await requestSessionCopilot(
            client,
            journal.filter((entry) => entry.clientId === client.id),
            language
          );
          return { ...client, copilot: brief };
        }));

        if (!cancelled) {
          localStorage.setItem(CLIENT_STORAGE_KEY, JSON.stringify(enriched));
          setUsingAI(true);
        }
      } catch {
        if (!cancelled) setUsingAI(false);
      } finally {
        if (!cancelled) setReady(true);
      }
    };

    hydrate();
    return () => { cancelled = true; };
  }, [language]);

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#F4F4F1] px-6 text-[#0A0A0A]">
        <div className="max-w-md text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#0A3F4D]/8 text-[#0A3F4D]">
            <Sparkles className="h-5 w-5" />
          </div>
          <h1 className="mt-4 text-xl font-semibold">{language === 'es' ? 'G-KAIS está preparando la sesión' : 'G-KAIS is preparing the session'}</h1>
          <p className="mt-2 text-sm leading-6 text-black/50">{language === 'es' ? 'Analizando contexto, brechas, compromisos y bitácora del cliente.' : 'Analyzing client context, gaps, commitments and journal.'}</p>
          <Loader2 className="mx-auto mt-5 h-5 w-5 animate-spin text-[#0A3F4D]" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <SessionMemoryWorkspace onBack={onBack} />
      {!usingAI && (
        <div className="fixed bottom-4 right-4 z-[95] max-w-[290px] rounded-xl border border-black/10 bg-white/95 px-3 py-2 text-[10px] leading-4 text-black/45 shadow-lg backdrop-blur">
          {language === 'es'
            ? 'Copilot contextual activo. El análisis Gemini se habilita automáticamente cuando el Workspace tiene una sesión administrativa autenticada.'
            : 'Contextual Copilot active. Gemini analysis enables automatically when the Workspace has an authenticated admin session.'}
        </div>
      )}
    </div>
  );
}
