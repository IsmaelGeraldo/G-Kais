import React from "react";
import { ArrowRight, Play, Sparkles, Target } from "lucide-react";
import { HeroSystemVisual } from "./HeroSystemVisual";
import { useLanguage } from "../i18n/LanguageContext";
import "./hero-conversations.css";

interface HeroProps {
  onOpenAudit: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenAudit }) => {
  const { language } = useLanguage();
  const es = language === "es";
  const showDemo = () => {
    const demo = document.getElementById("hero-system-visual");
    demo?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "center",
    });
    const replay = document.getElementById("hero-demo-replay");
    replay?.click();
    replay?.focus({ preventScroll: true });
  };
  return (
    <section className="gk-hero" aria-labelledby="gk-hero-title">
      <div className="gk-hero-layout">
        <div className="gk-hero-copy">
          <p className="gk-eyebrow">
            <span /> G-KAIS /{" "}
            {es
              ? "OPORTUNIDADES QUE SABEN QUÉ PASA DESPUÉS"
              : "OPPORTUNITIES THAT KNOW WHAT HAPPENS NEXT"}
          </p>
          <h1 id="gk-hero-title">
            {es ? "Cada oportunidad," : "Every opportunity,"}
            <br />
            <span>{es ? "un siguiente paso." : "a clear next step."}</span>
          </h1>
          <p className="gk-hero-description">
            {es
              ? "G-KAIS convierte conversaciones y leads en contexto, prioridad y próximas acciones. Tu equipo entiende qué está pasando, qué falta saber y qué debería ocurrir después."
              : "G-KAIS turns conversations and leads into context, priority and next actions. Your team understands what is happening, what is still unknown and what should happen next."}
          </p>
          <div className="gk-hero-actions">
            <button
              type="button"
              id="hero-book-audit-btn"
              onClick={onOpenAudit}
              className="gk-primary"
            >
              {es ? "Evaluar mi negocio" : "Assess my business"}
              <ArrowRight size={17} aria-hidden="true" />
            </button>
            <button
              type="button"
              id="hero-see-how-it-works-btn"
              onClick={showDemo}
              className="gk-secondary"
            >
              <Play size={15} aria-hidden="true" />
              {es ? "Ver cómo funciona" : "See how it works"}
            </button>
          </div>
          <p className="gk-hero-note">
            {es
              ? "Auditoría gratuita · Piloto con leads reales · Implementación según tu negocio"
              : "Free audit · Pilot with real leads · Implementation tailored to your business"}
          </p>
          <div className="gk-channel-line">
            <Target size={15} aria-hidden="true" />
            <span>{es ? "Prioridad" : "Priority"}</span>
            <span className="gk-channel-divider" />
            <Sparkles size={15} aria-hidden="true" />
            <span>AI Brief</span>
            <span className="gk-channel-divider" />
            <span>{es ? "Próxima acción clara" : "Clear next action"}</span>
          </div>
        </div>
        <HeroSystemVisual />
      </div>
      <div className="gk-hero-foot">
        <span>
          01 /{" "}
          {es ? "DE LA SEÑAL A LA DECISIÓN" : "FROM SIGNAL TO DECISION"}
        </span>
        <p>
          {es
            ? "Entiende. Prioriza. Actúa."
            : "Understand. Prioritize. Act."}
        </p>
        <span>{es ? "IA + CONTROL HUMANO" : "AI + HUMAN CONTROL"}</span>
      </div>
    </section>
  );
};
