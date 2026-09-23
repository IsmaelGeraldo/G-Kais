import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  FileText,
  MessageCircle,
  Sparkles,
  Target,
  User,
} from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext";
import { ThreeEngineCore } from "./ThreeEngineCore";
import "./hero-conversations.css";
import "./hero-autoplay-overrides.css";
import "./hero-three-engine.css";

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

const STEP_DELAYS = [1500, 1600, 1500, 2100, 2300];

type Point = { x: number; y: number };
type CircuitTarget = {
  key: "context" | "priority" | "brief" | "next";
  step: number;
  path: string;
  end: Point;
};

type ElementRef = React.RefObject<HTMLDivElement | null>;

interface CircuitLayout {
  width: number;
  height: number;
  inputPath: string;
  inputStart: Point;
  inputEnd: Point;
  targets: CircuitTarget[];
}

const EMPTY_CIRCUIT_LAYOUT: CircuitLayout = {
  width: 1,
  height: 1,
  inputPath: "",
  inputStart: { x: 0, y: 0 },
  inputEnd: { x: 0, y: 0 },
  targets: [],
};

function buildCircuitPath(start: Point, end: Point, laneIndex: number): string {
  const horizontalDistance = Math.max(34, end.x - start.x);
  const firstLane = start.x + Math.min(25 + laneIndex * 2, horizontalDistance * 0.3);
  const finalLane = Math.max(firstLane + 16, end.x - 18 - laneIndex * 1.5);
  const direction = end.y >= start.y ? 1 : -1;
  const firstKinkY = start.y + direction * (6 + laneIndex * 2.2);
  const approachY = end.y - direction * 7;

  return [
    `M ${start.x.toFixed(1)} ${start.y.toFixed(1)}`,
    `H ${firstLane.toFixed(1)}`,
    `L ${(firstLane + 6).toFixed(1)} ${firstKinkY.toFixed(1)}`,
    `H ${finalLane.toFixed(1)}`,
    `V ${approachY.toFixed(1)}`,
    `L ${(finalLane + 7).toFixed(1)} ${end.y.toFixed(1)}`,
    `H ${end.x.toFixed(1)}`,
  ].join(" ");
}

function buildInputCircuitPath(start: Point, end: Point): string {
  const distance = Math.max(28, end.x - start.x);
  const firstLane = start.x + distance * 0.32;
  const secondLane = start.x + distance * 0.68;
  const direction = end.y >= start.y ? 1 : -1;

  return [
    `M ${start.x.toFixed(1)} ${start.y.toFixed(1)}`,
    `H ${firstLane.toFixed(1)}`,
    `L ${(firstLane + 6).toFixed(1)} ${(start.y + direction * 6).toFixed(1)}`,
    `H ${secondLane.toFixed(1)}`,
    `L ${(secondLane + 6).toFixed(1)} ${end.y.toFixed(1)}`,
    `H ${end.x.toFixed(1)}`,
  ].join(" ");
}

interface EngineCircuitNetworkProps {
  stageRef: ElementRef;
  conversationRef: ElementRef;
  coreRef: ElementRef;
  contextRef: ElementRef;
  priorityRef: ElementRef;
  briefRef: ElementRef;
  nextRef: ElementRef;
  step: number;
  running: boolean;
  layoutKey: string;
}

const EngineCircuitNetwork: React.FC<EngineCircuitNetworkProps> = ({
  stageRef,
  conversationRef,
  coreRef,
  contextRef,
  priorityRef,
  briefRef,
  nextRef,
  step,
  running,
  layoutKey,
}) => {
  const [layout, setLayout] = useState<CircuitLayout>(EMPTY_CIRCUIT_LAYOUT);

  useLayoutEffect(() => {
    let frame = 0;

    const measure = () => {
      const stage = stageRef.current;
      const conversation = conversationRef.current;
      const core = coreRef.current;
      const targetElements = [
        { key: "context" as const, step: 1, ref: contextRef },
        { key: "priority" as const, step: 2, ref: priorityRef },
        { key: "brief" as const, step: 3, ref: briefRef },
        { key: "next" as const, step: 4, ref: nextRef },
      ];

      if (!stage || !conversation || !core || window.innerWidth <= 720) {
        setLayout(EMPTY_CIRCUIT_LAYOUT);
        return;
      }

      const stageRect = stage.getBoundingClientRect();
      const conversationRect = conversation.getBoundingClientRect();
      const coreRect = core.getBoundingClientRect();

      const coreCenterY = coreRect.top - stageRect.top + coreRect.height / 2;
      const inputStart = {
        x: conversationRect.right - stageRect.left - 2,
        y: conversationRect.top - stageRect.top + conversationRect.height * 0.48,
      };
      const inputEnd = {
        x: coreRect.left - stageRect.left + 7,
        y: coreCenterY,
      };
      const outputStart = {
        x: coreRect.right - stageRect.left - 7,
        y: coreCenterY,
      };

      const targets = targetElements.flatMap((target, index) => {
        const element = target.ref.current;
        if (!element) return [];
        const rect = element.getBoundingClientRect();
        const end = {
          x: rect.left - stageRect.left + 1,
          y: rect.top - stageRect.top + rect.height / 2,
        };
        return [
          {
            key: target.key,
            step: target.step,
            end,
            path: buildCircuitPath(outputStart, end, index),
          },
        ];
      });

      setLayout({
        width: Math.max(1, stageRect.width),
        height: Math.max(1, stageRect.height),
        inputStart,
        inputEnd,
        inputPath: buildInputCircuitPath(inputStart, inputEnd),
        targets,
      });
    };

    const scheduleMeasure = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(measure);
    };

    scheduleMeasure();
    const resizeObserver = new ResizeObserver(scheduleMeasure);
    [
      stageRef.current,
      conversationRef.current,
      coreRef.current,
      contextRef.current,
      priorityRef.current,
      briefRef.current,
      nextRef.current,
    ].forEach((element) => {
      if (element) resizeObserver.observe(element);
    });
    window.addEventListener("resize", scheduleMeasure);

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener("resize", scheduleMeasure);
    };
  }, [
    briefRef,
    contextRef,
    conversationRef,
    coreRef,
    layoutKey,
    nextRef,
    priorityRef,
    stageRef,
  ]);

  if (!layout.inputPath || layout.targets.length === 0) return null;

  return (
    <svg
      className="gk-circuit-network"
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <filter id="gk-electric-glow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="1.6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter
          id="gk-electric-glow-strong"
          x="-120%"
          y="-120%"
          width="340%"
          height="340%"
        >
          <feGaussianBlur stdDeviation="3.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <path className="gk-circuit-base" d={layout.inputPath} />
      <path
        className={
          "gk-circuit-input" + (step === 0 && running ? " is-active" : "")
        }
        d={layout.inputPath}
      />
      {step === 0 && running && (
        <>
          <circle className="gk-circuit-spark" r="3.2">
            <animateMotion dur="0.72s" repeatCount="indefinite" path={layout.inputPath} />
          </circle>
          <circle className="gk-circuit-spark-secondary" r="2.1">
            <animateMotion
              begin="0.32s"
              dur="0.72s"
              repeatCount="indefinite"
              path={layout.inputPath}
            />
          </circle>
        </>
      )}

      <circle
        className={"gk-circuit-node" + (step === 0 ? " is-active" : "")}
        cx={layout.inputEnd.x}
        cy={layout.inputEnd.y}
        r="3.5"
      />

      {layout.targets.map((target) => {
        const reached = step >= target.step;
        const active = step === target.step && running;

        return (
          <g key={target.key}>
            <path className="gk-circuit-base" d={target.path} />
            {reached && <path className="gk-circuit-reached" d={target.path} />}
            {active && (
              <>
                <path className="gk-circuit-active" d={target.path} />
                <path className="gk-circuit-active gk-circuit-hot" d={target.path} />
                <circle className="gk-circuit-spark" r="3.1">
                  <animateMotion
                    dur="0.64s"
                    repeatCount="indefinite"
                    path={target.path}
                  />
                </circle>
                <circle className="gk-circuit-spark-secondary" r="2">
                  <animateMotion
                    begin="0.26s"
                    dur="0.64s"
                    repeatCount="indefinite"
                    path={target.path}
                  />
                </circle>
              </>
            )}
            <circle
              className={"gk-circuit-node" + (active ? " is-active" : "")}
              cx={target.end.x}
              cy={target.end.y}
              r="3.5"
            />
          </g>
        );
      })}
    </svg>
  );
};

export const HeroSystemVisual: React.FC = () => {
  const { language } = useLanguage();
  const es = language === "es";
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [step, setStep] = useState(0);
  const [inView, setInView] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);

  const root = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const conversationRef = useRef<HTMLDivElement>(null);
  const coreRef = useRef<HTMLDivElement>(null);
  const contextRef = useRef<HTMLDivElement>(null);
  const priorityRef = useRef<HTMLDivElement>(null);
  const briefRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLDivElement>(null);

  const scenario = scenarios[language][scenarioIndex];
  const flowSteps = steps[language];
  const autoRunning = inView && pageVisible;

  useEffect(() => {
    const syncVisibility = () => setPageVisible(!document.hidden);
    syncVisibility();
    document.addEventListener("visibilitychange", syncVisibility);

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.18 }
    );

    if (root.current) observer.observe(root.current);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", syncVisibility);
    };
  }, []);

  useEffect(() => {
    if (!autoRunning) return;

    const timer = window.setTimeout(() => {
      if (step === 4) {
        setScenarioIndex(
          (current) => (current + 1) % scenarios[language].length
        );
        setStep(0);
        return;
      }

      setStep((current) => current + 1);
    }, STEP_DELAYS[step]);

    return () => window.clearTimeout(timer);
  }, [autoRunning, language, step]);

  const selectScenario = (index: number) => {
    setScenarioIndex(index);
    setStep(0);
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
          ? "Demostración automática del funcionamiento real del Motor G-KAIS"
          : "Automatic demonstration of how the G-KAIS engine works"
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
            {es ? "AUTO LOOP · EN VIVO" : "AUTO LOOP · LIVE"}
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
          ref={stageRef}
          className={
            "gk-engine-stage gk-step-" +
            step +
            (autoRunning ? " is-playing" : "") +
            (step === 4 ? " is-complete" : "")
          }
        >
          <EngineCircuitNetwork
            stageRef={stageRef}
            conversationRef={conversationRef}
            coreRef={coreRef}
            contextRef={contextRef}
            priorityRef={priorityRef}
            briefRef={briefRef}
            nextRef={nextRef}
            step={step}
            running={autoRunning}
            layoutKey={`${language}-${scenarioIndex}`}
          />

          <div className="gk-engine-conversation" ref={conversationRef}>
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

            <div className="gk-engine-message">
              {scenario.message}
              <span className="gk-message-ambient-glow" aria-hidden="true" />
            </div>

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
            <div className="gk-engine-core-anchor" ref={coreRef}>
              <ThreeEngineCore
                step={step}
                running={autoRunning}
                complete={step === 4}
              />
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
              ref={contextRef}
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
                  <div className="gk-context-cell" key={label}>
                    <span>{label}</span>
                    <strong style={{ overflowWrap: "anywhere" }}>{value}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div
              ref={priorityRef}
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
              ref={briefRef}
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
              ref={nextRef}
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
              <ArrowRight className="gk-next-arrow" size={17} />
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

        <div
          className="gk-engine-progress"
          role="list"
          aria-label={es ? "Progreso de la demostración" : "Demo progress"}
        >
          {flowSteps.map((label, index) => {
            const reached = index <= step;
            const current = index === step;

            return (
              <div
                key={label}
                role="listitem"
                aria-current={current ? "step" : undefined}
                className={
                  "gk-progress-item" +
                  (reached ? " is-reached" : "") +
                  (current ? " is-current" : "")
                }
              >
                <div className="gk-progress-item-head">
                  <span className="gk-step-indicator">
                    {index < step ? <Check size={11} /> : index + 1}
                  </span>
                  <span className="gk-step-text">{label}</span>
                </div>

                <div className="gk-progress-track" aria-hidden="true">
                  <div
                    className={
                      "gk-progress-fill" +
                      (index < step
                        ? " is-full"
                        : current && autoRunning
                          ? " is-animating"
                          : "")
                    }
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="gk-engine-controls" aria-live="polite">
          <div className="gk-engine-loop-status">
            <span
              className={
                "gk-loop-dot" + (autoRunning ? " is-pulsing" : "")
              }
            />
            <strong>
              {step === 4
                ? es
                  ? "Oportunidad lista para actuar"
                  : "Opportunity ready for action"
                : stageLabel}
            </strong>
          </div>

          <div className="gk-engine-loop-status">
            {es ? "Reproducción automática" : "Automatic playback"}
          </div>
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
