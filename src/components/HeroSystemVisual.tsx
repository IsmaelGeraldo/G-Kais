import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  FileText,
  MessageCircle,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Target,
  User,
} from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext";
import "./hero-conversations.css";

const scenarios = {
  es: [
    {
      label: "Nuevo lead",
      business: "Iberia Logistics",
      person: "David Alarcón",
      channel: "WhatsApp",
      message:
        "Tenemos cerca de 120 consultas al día y se nos están quedando leads sin responder.",
      context: [
        ["Negocio", "Logística"],
        ["Volumen", "120 consultas/día"],
        ["Sistema actual", "Excel + seguimiento manual"],
      ],
      priority: "ALTA",
      reason: "Demoras + volumen operativo + pérdida de oportunidades",
      brief:
        "El problema principal no es generar más consultas, sino responder y dar seguimiento con consistencia.",
      missing: "Tiempo promedio de respuesta y tamaño del equipo comercial",
      help:
        "Centralizar contexto, priorizar qué necesita atención y mantener una próxima acción clara.",
      next: "Revisar flujo actual y validar dónde se pierden los leads",
    },
    {
      label: "Cotización",
      business: "Casa Atelier",
      person: "Laura Méndez",
      channel: "Formulario web",
      message:
        "Enviamos cotizaciones, pero después el seguimiento depende de cada asesor y muchas se enfrían.",
      context: [
        ["Negocio", "Diseño interior"],
        ["Canal", "Web + email"],
        ["Problema", "Seguimiento irregular"],
      ],
      priority: "ALTA",
      reason: "Propuestas enviadas sin próxima acción definida",
      brief:
        "Existe interés comercial, pero el proceso posterior a la cotización no está estandarizado.",
      missing: "Cuántas cotizaciones quedan sin seguimiento cada semana",
      help:
        "Definir responsable, fecha de seguimiento y próxima acción para cada oportunidad.",
      next: "Medir cotizaciones abiertas y construir una cadencia de seguimiento",
    },
    {
      label: "Lead dormido",
      business: "Clínica Nova",
      person: "Camila Rojas",
      channel: "Instagram",
      message:
        "Nos escriben por tratamientos, preguntan precios y después muchas conversaciones quedan ahí.",
      context: [
        ["Negocio", "Clínica estética"],
        ["Canal", "Instagram"],
        ["Problema", "Conversaciones sin continuidad"],
      ],
      priority: "MEDIA",
      reason: "Interés detectado sin seguimiento posterior",
      brief:
        "Hay demanda, pero falta convertir las conversaciones en oportunidades con contexto y seguimiento.",
      missing: "Qué tratamientos consultan y cuándo se considera un lead calificado",
      help:
        "Convertir cada consulta en una oportunidad con contexto, prioridad y siguiente paso.",
      next: "Definir criterios de calificación y seguimiento por tipo de consulta",
    },
  ],
  en: [
    {
      label: "New lead",
      business: "Iberia Logistics",
      person: "David Alarcón",
      channel: "WhatsApp",
      message:
        "We handle around 120 inquiries a day and some leads are being left unanswered.",
      context: [
        ["Business", "Logistics"],
        ["Volume", "120 inquiries/day"],
        ["Current system", "Excel + manual follow-up"],
      ],
      priority: "HIGH",
      reason: "Delays + operating volume + lost opportunities",
      brief:
        "The main problem is not generating more inquiries, but responding and following up consistently.",
      missing: "Average response time and sales team size",
      help:
        "Centralize context, prioritize what needs attention and keep a clear next action.",
      next: "Review the current workflow and validate where leads are being lost",
    },
    {
      label: "Quote",
      business: "Casa Atelier",
      person: "Laura Méndez",
      channel: "Web form",
      message:
        "We send quotes, but follow-up depends on each advisor and many opportunities go cold.",
      context: [
        ["Business", "Interior design"],
        ["Channel", "Web + email"],
        ["Problem", "Inconsistent follow-up"],
      ],
      priority: "HIGH",
      reason: "Sent proposals with no defined next action",
      brief:
        "There is commercial interest, but the process after sending a quote is not standardized.",
      missing: "How many quotes go without follow-up every week",
      help:
        "Define owner, follow-up date and next action for every opportunity.",
      next: "Measure open quotes and build a follow-up cadence",
    },
    {
      label: "Dormant lead",
      business: "Nova Clinic",
      person: "Camila Rojas",
      channel: "Instagram",
      message:
        "People ask us about treatments and pricing, then many conversations simply stop.",
      context: [
        ["Business", "Aesthetic clinic"],
        ["Channel", "Instagram"],
        ["Problem", "No conversation continuity"],
      ],
      priority: "MEDIUM",
      reason: "Interest detected without follow-up",
      brief:
        "There is demand, but conversations are not consistently turned into managed opportunities.",
      missing: "Which treatments they ask about and what qualifies a lead",
      help:
        "Turn each inquiry into an opportunity with context, priority and a next step.",
      next: "Define qualification and follow-up criteria by inquiry type",
    },
  ],
};

const steps = {
  es: [
    "Conversación",
    "Captura contexto",
    "Prioriza",
    "AI Brief",
    "Próxima acción",
  ],
  en: [
    "Conversation",
    "Capture context",
    "Prioritize",
    "AI Brief",
    "Next action",
  ],
};

export const HeroSystemVisual: React.FC = () => {
  const { language } = useLanguage();
  const es = language === "es";
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  const scenario = scenarios[language][scenarioIndex];
  const flowSteps = steps[language];

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let started = false;

    const sync = () => {
      setReducedMotion(media.matches);
      if (media.matches) {
        setPlaying(false);
        setStep(4);
      }
    };

    sync();
    media.addEventListener("change", sync);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          started = true;
          if (!media.matches) setPlaying(true);
        } else if (!entry.isIntersecting && started) {
          setPlaying(false);
        }
      },
      { threshold: 0.35 }
    );

    if (root.current) observer.observe(root.current);

    const hide = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener("visibilitychange", hide);

    return () => {
      observer.disconnect();
      media.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", hide);
    };
  }, []);

  useEffect(() => {
    if (!playing || step >= 4) return;

    const timer = window.setTimeout(() => {
      setStep((current) => {
        const next = current + 1;
        if (next >= 4) setPlaying(false);
        return next;
      });
    }, 1950);

    return () => window.clearTimeout(timer);
  }, [playing, step, scenarioIndex]);

  const selectScenario = (index: number) => {
    setScenarioIndex(index);
    setStep(reducedMotion ? 4 : 0);
    setPlaying(!reducedMotion);
  };

  const replay = () => {
    setStep(0);
    setPlaying(true);
  };

  const stageLabel = useMemo(
    () => flowSteps[Math.min(step, 4)],
    [flowSteps, step]
  );

  return (
    <div
      ref={root}
      id="hero-system-visual"
      className="gk-engine-demo"
      aria-label={
        es
          ? "Demostración del funcionamiento real del Motor G-KAIS"
          : "Demonstration of how the G-KAIS engine works"
      }
    >
      <div className="gk-engine-shell">
        <div className="gk-engine-topbar">
          <div className="gk-engine-brand">
            <div className="gk-engine-logo">G</div>
            <div>
              <strong>G-KAIS</strong>
              <span>OPPORTUNITY ENGINE</span>
            </div>
          </div>

          <div className="gk-engine-top-status">
            <span className="gk-live-dot" />
            {es ? "SIMULACIÓN DEL SISTEMA" : "SYSTEM SIMULATION"}
          </div>
        </div>

        <div className="gk-engine-scenarios">
          {scenarios[language].map((item, index) => (
            <button
              type="button"
              key={item.label}
              aria-pressed={scenarioIndex === index}
              onClick={() => selectScenario(index)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div
          className={
            "gk-engine-stage gk-step-" +
            step +
            (playing ? " is-playing" : "") +
            (step === 4 ? " is-complete" : "")
          }
        >
          <div className="gk-engine-conversation">
            <div className="gk-engine-panel-label">
              <MessageCircle size={13} />
              <span>{es ? "SEÑAL ENTRANTE" : "INCOMING SIGNAL"}</span>
            </div>

            <div className="gk-engine-contact">
              <div className="gk-engine-avatar">
                {scenario.person
                  .split(" ")
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join("")}
              </div>
              <div>
                <strong>{scenario.person}</strong>
                <span>
                  {scenario.business} · {scenario.channel}
                </span>
              </div>
            </div>

            <div className="gk-engine-message">{scenario.message}</div>

            <div className="gk-engine-conversation-foot">
              <span>{es ? "No se responde todavía." : "No reply yet."}</span>
              <strong>
                {es
                  ? "Primero G-KAIS entiende qué está pasando."
                  : "G-KAIS first understands what is happening."}
              </strong>
            </div>
          </div>

          <div className="gk-engine-core">
            <div className="gk-signal-rail gk-signal-in" aria-hidden="true">
              <span />
            </div>
            <div className="gk-signal-rail gk-signal-out" aria-hidden="true">
              <span />
            </div>

            <div
              className={
                "gk-core-orbit" +
                (playing ? " is-running" : "") +
                (step >= 1 && step < 4 ? " is-processing" : "") +
                (step === 4 ? " is-complete" : "")
              }
            >
              <span>G</span>
            </div>
            <p>{es ? "MOTOR G-KAIS" : "G-KAIS ENGINE"}</p>
            <strong>{stageLabel}</strong>

            <div className="gk-core-line" aria-hidden="true">
              <span className={step >= 1 ? "is-active" : ""} />
              <span className={step >= 2 ? "is-active" : ""} />
              <span className={step >= 3 ? "is-active" : ""} />
              <span className={step >= 4 ? "is-active" : ""} />
            </div>
          </div>

          <div className="gk-engine-workspace">
            <div
              className={
                "gk-work-card gk-context-card" +
                (step >= 1 ? " is-visible" : "")
              }
            >
              <div className="gk-work-card-head">
                <FileText size={13} />
                <span>{es ? "CONTEXTO CAPTURADO" : "CAPTURED CONTEXT"}</span>
                <strong>3/9</strong>
              </div>
              <div className="gk-context-grid">
                {scenario.context.map(([label, value]) => (
                  <div key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div
              className={
                "gk-work-card gk-priority-card" +
                (step >= 2 ? " is-visible" : "")
              }
            >
              <div className="gk-work-card-head">
                <Target size={13} />
                <span>{es ? "PRIORIDAD" : "PRIORITY"}</span>
                <strong className="gk-priority-pill">
                  {scenario.priority}
                </strong>
              </div>
              <p>{scenario.reason}</p>
            </div>

            <div
              className={
                "gk-work-card gk-brief-card" +
                (step >= 3 ? " is-visible" : "")
              }
            >
              <div className="gk-work-card-head">
                <Sparkles size={13} />
                <span>AI BRIEF</span>
                <strong>{es ? "LISTO" : "READY"}</strong>
              </div>
              <p className="gk-brief-summary">{scenario.brief}</p>

              <div className="gk-brief-row">
                <span>{es ? "FALTA SABER" : "STILL UNKNOWN"}</span>
                <p>{scenario.missing}</p>
              </div>

              <div className="gk-brief-row">
                <span>
                  {es ? "CÓMO PUEDE AYUDAR" : "HOW G-KAIS CAN HELP"}
                </span>
                <p>{scenario.help}</p>
              </div>
            </div>

            <div
              className={
                "gk-work-card gk-next-card" +
                (step >= 4 ? " is-visible" : "")
              }
            >
              <div className="gk-next-icon">
                <CheckCircle2 size={18} />
              </div>
              <div>
                <span>{es ? "PRÓXIMA ACCIÓN" : "NEXT ACTION"}</span>
                <strong>{scenario.next}</strong>
              </div>
              <ArrowRight size={17} />
            </div>
          </div>

          <div
            className={
              "gk-floating-card gk-floating-priority" +
              (step >= 2 ? " is-visible" : "")
            }
          >
            <Target size={12} />
            <span>{es ? "Prioridad" : "Priority"}</span>
            <strong>{scenario.priority}</strong>
          </div>

          <div
            className={
              "gk-floating-card gk-floating-owner" +
              (step >= 4 ? " is-visible" : "")
            }
          >
            <User size={12} />
            <span>{es ? "Responsable" : "Owner"}</span>
            <strong>{es ? "Equipo comercial" : "Sales team"}</strong>
          </div>
        </div>

        <div className="gk-engine-progress">
          {flowSteps.map((label, index) => (
            <button
              type="button"
              key={label}
              aria-current={step === index ? "step" : undefined}
              onClick={() => {
                setStep(index);
                setPlaying(false);
              }}
              className={index <= step ? "is-reached" : ""}
            >
              <span>{index < step ? <Check size={11} /> : index + 1}</span>
              {label}
            </button>
          ))}
        </div>

        <div className="gk-engine-controls">
          <div>
            <button
              type="button"
              aria-label={
                playing
                  ? es
                    ? "Pausar demostración"
                    : "Pause demo"
                  : es
                    ? "Reproducir demostración"
                    : "Play demo"
              }
              onClick={() => (step === 4 ? replay() : setPlaying(!playing))}
            >
              {playing ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <button type="button" id="hero-demo-replay" onClick={replay}>
              <RotateCcw size={13} />
              {es ? "Repetir" : "Replay"}
            </button>
          </div>

          <span>
            {step === 4
              ? es
                ? "Oportunidad lista para actuar"
                : "Opportunity ready for action"
              : step + 1 + " / 5"}
          </span>
        </div>
      </div>

      <p className="gk-engine-disclaimer">
        {es
          ? "Ejemplo ilustrativo del flujo G-KAIS. La conversación es una señal de entrada; la decisión y ejecución dependen del contexto, reglas y configuración del negocio."
          : "Illustrative G-KAIS workflow. The conversation is an input signal; decisions and execution depend on business context, rules and configuration."}
      </p>
    </div>
  );
};
