import React from "react";
import { ArrowRight, Play, MessageCircle, Instagram } from "lucide-react";
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
              ? "CONVERSACIONES QUE AVANZAN"
              : "CONVERSATIONS THAT MOVE FORWARD"}
          </p>
          <h1 id="gk-hero-title">
            {es ? "Cada conversación," : "Every conversation,"}
            <br />
            <span>{es ? "una oportunidad." : "an opportunity."}</span>
          </h1>
          <p className="gk-hero-description">
            {es
              ? "Convierte el interés de Instagram y WhatsApp en el siguiente paso: una respuesta, una reserva o una venta. Diseñamos el sistema y tu equipo mantiene el control."
              : "Turn interest on Instagram and WhatsApp into the next step: a reply, a booking or a sale. We design the system. Your team stays in control."}
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
              {es ? "Ver en 10 segundos" : "See it in 10 seconds"}
            </button>
          </div>
          <p className="gk-hero-note">
            {es
              ? "Auditoría gratuita · Implementación según tu negocio"
              : "Free audit · Implementation tailored to your business"}
          </p>
          <div className="gk-channel-line">
            <Instagram size={16} aria-hidden="true" />
            <span>Instagram</span>
            <span className="gk-channel-divider" />
            <MessageCircle size={16} aria-hidden="true" />
            <span>WhatsApp</span>
            <span className="gk-channel-divider" />
            <span>{es ? "Tu equipo" : "Your team"}</span>
          </div>
        </div>
        <HeroSystemVisual />
      </div>
      <div className="gk-hero-foot">
        <span>
          01 /{" "}
          {es ? "DEL MENSAJE AL SIGUIENTE PASO" : "FROM MESSAGE TO NEXT STEP"}
        </span>
        <p>
          {es
            ? "Responde. Organiza. Da seguimiento."
            : "Respond. Organize. Follow up."}
        </p>
        <span>{es ? "IA + CONTROL HUMANO" : "AI + HUMAN CONTROL"}</span>
      </div>
    </section>
  );
};
