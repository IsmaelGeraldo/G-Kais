import React, { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  CalendarCheck,
  Check,
  CheckCheck,
  Instagram,
  MessageCircle,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext";
import "./hero-conversations.css";

const stories = {
  es: [
    {
      label: "Nueva consulta",
      business: "Estudio Norte",
      channel: "Instagram",
      source: "Anuncio en Instagram",
      ad: "Un espacio para ti.",
      offer: "Conoce nuestras clases. Encuentra tu horario.",
      incoming: "¡Hola! Vi el anuncio. ¿Tienen una clase de prueba?",
      reply: "¡Sí! Puedes venir el jueves a las 18:00. ¿Te reservo un lugar?",
      answer: "¡Perfecto, a las 18:00!",
      result: "Reserva confirmada",
      detail: "Jueves · 18:00 · Clase de prueba",
      next: "Recordatorio antes de la clase",
      intent: "Quiere probar una clase",
      steps: [
        "Ve el anuncio",
        "Pregunta por Instagram",
        "G-Kais responde",
        "Elige un horario",
        "Reserva confirmada",
      ],
    },
    {
      label: "Cotización pendiente",
      business: "Casa Atelier",
      channel: "WhatsApp",
      source: "Consulta por WhatsApp",
      ad: "Tu próximo espacio.",
      offer: "Una propuesta a medida, con atención cercana.",
      incoming: "Hola, me interesa la cotización que me enviaron.",
      reply:
        "¡Hola! ¿Quieres revisar algún detalle? Puedo coordinar una llamada con tu asesora.",
      answer: "Sí, mañana por la tarde.",
      result: "Conversación retomada",
      detail: "El cliente solicita hablar con su asesora",
      next: "Coordinar llamada · Equipo comercial",
      intent: "Interés en la propuesta",
      steps: [
        "Recibe la propuesta",
        "Retoma la conversación",
        "G-Kais da seguimiento",
        "Pide hablar con alguien",
        "Tu equipo continúa",
      ],
    },
    {
      label: "Recuperar una reserva",
      business: "Estudio Norte",
      channel: "WhatsApp",
      source: "Seguimiento por WhatsApp",
      ad: "Siempre puedes volver.",
      offer: "Una nueva oportunidad para encontrar tu momento.",
      incoming: "Hola, al final no pude asistir a la clase.",
      reply: "Podemos buscar otro horario. ¿Te acomoda el sábado a las 10:00?",
      answer: "Sí, ese horario me sirve.",
      result: "Reserva reprogramada",
      detail: "Sábado · 10:00 · Clase de prueba",
      next: "Recordatorio actualizado",
      intent: "Necesita otro horario",
      steps: [
        "Reserva sin asistir",
        "El cliente escribe",
        "G-Kais propone opciones",
        "Confirma otro horario",
        "Reserva recuperada",
      ],
    },
  ],
  en: [
    {
      label: "New inquiry",
      business: "Estudio Norte",
      channel: "Instagram",
      source: "Instagram ad",
      ad: "A space for you.",
      offer: "Discover our classes. Find your time.",
      incoming: "Hi! I saw your ad. Do you offer a trial class?",
      reply: "Yes! You can join us Thursday at 6 pm. Shall I save you a spot?",
      answer: "Perfect, 6 pm works!",
      result: "Booking confirmed",
      detail: "Thursday · 6 pm · Trial class",
      next: "Reminder before the class",
      intent: "Interested in a trial class",
      steps: [
        "Sees the ad",
        "Asks on Instagram",
        "G-Kais responds",
        "Chooses a time",
        "Booking confirmed",
      ],
    },
    {
      label: "Pending quote",
      business: "Casa Atelier",
      channel: "WhatsApp",
      source: "WhatsApp inquiry",
      ad: "Your next space.",
      offer: "A tailored proposal, with personal attention.",
      incoming: "Hi, I’m interested in the quote you sent me.",
      reply:
        "Hi! Would you like to review any details? I can arrange a call with your advisor.",
      answer: "Yes, tomorrow afternoon.",
      result: "Conversation reopened",
      detail: "The customer wants to speak with their advisor",
      next: "Arrange a call · Sales team",
      intent: "Interested in the proposal",
      steps: [
        "Receives the quote",
        "Reopens the conversation",
        "G-Kais follows up",
        "Asks to speak to someone",
        "Your team takes over",
      ],
    },
    {
      label: "Recover a booking",
      business: "Estudio Norte",
      channel: "WhatsApp",
      source: "WhatsApp follow-up",
      ad: "There’s another chance.",
      offer: "A new opportunity to find your moment.",
      incoming: "Hi, I couldn’t make it to the class after all.",
      reply: "Let’s find another time. Would Saturday at 10 am work for you?",
      answer: "Yes, that works for me.",
      result: "Booking rescheduled",
      detail: "Saturday · 10 am · Trial class",
      next: "Reminder updated",
      intent: "Needs a different time",
      steps: [
        "Misses the booking",
        "Customer writes",
        "G-Kais offers options",
        "Confirms another time",
        "Booking recovered",
      ],
    },
  ],
};

/** Self-contained illustrative demo. Never reads leads or sends messages. */
export const HeroSystemVisual: React.FC = () => {
  const { language } = useLanguage();
  const es = language === "es";
  const [scenario, setScenario] = useState(0);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const story = stories[language][scenario];

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
        } else if (!entry.isIntersecting && started) setPlaying(false);
      },
      { threshold: 0.35 },
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
      setStep(step + 1);
      if (step === 3) setPlaying(false);
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [playing, step, scenario]);

  const selectStory = (index: number) => {
    setScenario(index);
    setStep(reducedMotion ? 4 : 0);
    setPlaying(!reducedMotion);
  };
  const replay = () => {
    setStep(0);
    setPlaying(true);
  };
  const Channel = story.channel === "Instagram" ? Instagram : MessageCircle;

  return (
    <div
      ref={root}
      id="hero-system-visual"
      className="gk-demo"
      aria-label={
        es ? "Demostración del Motor G-Kais" : "G-Kais engine demonstration"
      }
    >
      <div className="gk-demo-heading">
        <span>
          <Sparkles size={15} aria-hidden="true" /> MOTOR G-KAIS
        </span>
        <span className="gk-demo-tag">{es ? "SIMULACIÓN" : "SIMULATION"}</span>
      </div>
      <div
        className="gk-scenarios"
        aria-label={es ? "Elegir escenario" : "Choose a scenario"}
      >
        {stories[language].map((item, index) => (
          <button
            type="button"
            key={index}
            aria-pressed={scenario === index}
            onClick={() => selectStory(index)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="gk-story-stage">
        <div className="gk-phone">
          <div className="gk-chat-heading">
            <div className="gk-avatar">{scenario === 1 ? "ca" : "n."}</div>
            <div>
              <strong>{story.business}</strong>
              <span>
                {story.channel} ·{" "}
                {es ? "Ejemplo de conversación" : "Example conversation"}
              </span>
            </div>
            <Channel size={19} aria-hidden="true" />
          </div>
          <div className="gk-chat-content" key={scenario}>
            <div className="gk-ad">
              <div className="gk-ad-art">
                <span>{story.business.toUpperCase()}</span>
                <strong>{story.ad}</strong>
                <ArrowUpRight size={26} aria-hidden="true" />
              </div>
              <div className="gk-ad-caption">
                <span>{story.source}</span>
                <p>{story.offer}</p>
              </div>
            </div>
            {step >= 1 && (
              <div className="gk-bubble gk-incoming">{story.incoming}</div>
            )}
            {step >= 2 && (
              <div className="gk-bubble gk-outgoing">
                <span className="gk-ai-label">
                  <Sparkles size={11} aria-hidden="true" /> G-KAIS
                </span>
                {story.reply}
                <CheckCheck size={13} className="gk-read" aria-hidden="true" />
              </div>
            )}
            {step >= 3 && (
              <div className="gk-bubble gk-incoming">{story.answer}</div>
            )}
            {step === 0 && (
              <p className="gk-chat-wait">
                {es
                  ? "Todo comienza con una conversación."
                  : "It all starts with a conversation."}
              </p>
            )}
          </div>
        </div>
        <div className="gk-engine-panel">
          <div
            className={`gk-engine-mark ${playing ? "is-running" : ""}`}
            aria-hidden="true"
          >
            <span>G</span>
            <i />
          </div>
          <p className="gk-engine-caption">
            {es ? "DEL INTERÉS A LA ACCIÓN" : "FROM INTEREST TO ACTION"}
          </p>
          <ol className="gk-story-steps">
            {story.steps.map((label, index) => (
              <li key={index} className={index <= step ? "is-reached" : ""}>
                <button
                  type="button"
                  aria-current={index === step ? "step" : undefined}
                  onClick={() => {
                    setStep(index);
                    setPlaying(false);
                  }}
                >
                  <span className="gk-step-number">
                    {index < step ? (
                      <Check size={12} aria-hidden="true" />
                    ) : (
                      index + 1
                    )}
                  </span>
                  {label}
                </button>
              </li>
            ))}
          </ol>
          <div className="gk-result" aria-live="polite" aria-atomic="true">
            {step === 4 ? (
              <>
                <CalendarCheck size={21} aria-hidden="true" />
                <strong>{story.result}</strong>
                <p>{story.detail}</p>
                <span>{story.next}</span>
              </>
            ) : (
              <>
                <span className="gk-result-label">
                  {es ? "SIGUIENTE PASO" : "NEXT STEP"}
                </span>
                <strong>{story.steps[Math.min(step + 1, 4)]}</strong>
                <p>
                  {step >= 2
                    ? story.intent
                    : es
                      ? "Cada mensaje mantiene el contexto."
                      : "Every message keeps the context."}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="gk-demo-controls">
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
            {playing ? <Pause size={15} /> : <Play size={15} />}
          </button>
          <button type="button" id="hero-demo-replay" onClick={replay}>
            <RotateCcw size={14} aria-hidden="true" />
            {es ? "Repetir" : "Replay"}
          </button>
        </div>
        <span>
          {step === 4
            ? es
              ? "Tu equipo siempre en control"
              : "Your team always in control"
            : `${step + 1} / 5`}
        </span>
      </div>
      <p className="gk-demo-disclaimer">
        {es
          ? "Ejemplo ilustrativo. Canales y automatizaciones se configuran durante la implementación."
          : "Illustrative example. Channels and automations are configured during implementation."}
      </p>
    </div>
  );
};
