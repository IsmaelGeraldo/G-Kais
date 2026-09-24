import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';

const clamp = {
  extrapolateLeft: 'clamp' as const,
  extrapolateRight: 'clamp' as const,
};

const accent = '#0A3F4D';
const muted = '#777777';
const softBorder = '#E7E7E7';

const Label: React.FC<React.PropsWithChildren<{teal?: boolean}>> = ({children, teal = false}) => (
  <div
    style={{
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: 1.35,
      textTransform: 'uppercase',
      color: teal ? accent : '#6B6B6B',
    }}
  >
    {children}
  </div>
);

const Pill: React.FC<React.PropsWithChildren<{tone?: 'teal' | 'amber' | 'neutral'}>> = ({
  children,
  tone = 'neutral',
}) => {
  const styles =
    tone === 'teal'
      ? {border: 'rgba(10,63,77,0.26)', background: '#F4F8F8', color: accent}
      : tone === 'amber'
        ? {border: '#E7D3A2', background: '#FFF9EC', color: '#8A6215'}
        : {border: softBorder, background: '#FFFFFF', color: '#676767'};

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        border: `1px solid ${styles.border}`,
        background: styles.background,
        color: styles.color,
        borderRadius: 999,
        padding: '5px 9px',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: 0.45,
      }}
    >
      {children}
    </span>
  );
};

const MiniField: React.FC<{label: string; value: string}> = ({label, value}) => (
  <div
    style={{
      border: `1px solid ${softBorder}`,
      borderRadius: 12,
      background: '#FFFFFF',
      padding: '10px 11px',
      minHeight: 54,
      boxSizing: 'border-box',
    }}
  >
    <div style={{fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 9, color: '#8A8A8A'}}>{label}</div>
    <div style={{fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 12, fontWeight: 700, color: '#151515', marginTop: 5, lineHeight: 1.25}}>
      {value}
    </div>
  </div>
);

const LeadCard: React.FC<{name: string; company: string; status: string; selected?: boolean}> = ({
  name,
  company,
  status,
  selected = false,
}) => (
  <div
    style={{
      position: 'relative',
      minHeight: 78,
      border: selected ? '1px solid rgba(10,63,77,0.34)' : `1px solid ${softBorder}`,
      background: selected ? '#F4F8F8' : '#FFFFFF',
      borderRadius: 14,
      padding: '11px 12px',
      boxSizing: 'border-box',
      boxShadow: selected ? '0 0 18px rgba(10,63,77,0.10)' : 'none',
    }}
  >
    {selected ? (
      <div style={{position: 'absolute', left: -1, top: 13, bottom: 13, width: 3, borderRadius: 3, background: accent}} />
    ) : null}
    <div style={{fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 12, fontWeight: 800, color: '#111'}}>{name}</div>
    <div style={{fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 10, color: muted, marginTop: 2}}>{company}</div>
    <div style={{marginTop: 8}}>
      <Pill tone={selected ? 'teal' : 'neutral'}>{status}</Pill>
    </div>
  </div>
);

const DiegoPreview: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [576, 582, 614, 624], [0, 1, 1, 0], clamp);
  const slide = interpolate(frame, [576, 586], [10, 0], {...clamp, easing: Easing.out(Easing.cubic)});

  if (opacity <= 0) return null;

  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: 74,
          top: 158,
          width: 246,
          height: 242,
          background: '#FAFAFA',
          zIndex: 250,
          opacity,
          paddingTop: 4,
          boxSizing: 'border-box',
        }}
      >
        <LeadCard name="Sofía Martínez" company="Clínica Aurora" status="Seguimiento hoy" />
        <div style={{marginTop: 34}}>
          <LeadCard name="Diego Fuentes" company="Diseño Norte" status="Cotización" selected />
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 337,
          top: 107,
          width: 884,
          height: 564,
          background: '#FFFFFF',
          zIndex: 249,
          opacity,
          transform: `translateX(${slide}px)`,
          overflow: 'hidden',
          fontFamily: 'Arial, Helvetica, sans-serif',
          boxSizing: 'border-box',
        }}
      >
        <div style={{padding: '18px 20px 24px'}}>
          <div style={{display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: `1px solid ${softBorder}`, paddingBottom: 14}}>
            <div>
              <Label teal>REGISTRO CRM // Web + email</Label>
              <div style={{fontSize: 23, lineHeight: 1.05, fontWeight: 900, letterSpacing: -0.5, marginTop: 6}}>Diego Fuentes</div>
              <div style={{fontSize: 12, color: muted, marginTop: 5}}>Diseño Norte · Diseño interior</div>
            </div>
            <div style={{display: 'flex', gap: 8}}>
              <Pill tone="teal">Cotización</Pill>
              <Pill tone="amber">Prioridad alta</Pill>
            </div>
          </div>

          <div style={{display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: 14, marginTop: 14}}>
            <section style={{border: '1px solid #D8D8D8', borderRadius: 18, background: '#FFFFFF', padding: 15}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <div>
                  <Label>Perfil del negocio y calificación</Label>
                  <div style={{fontSize: 10, color: muted, marginTop: 4}}>Contexto para AI Brief</div>
                </div>
                <Pill tone="teal">5/9 completo</Pill>
              </div>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12}}>
                <MiniField label="Canal" value="Web + email" />
                <MiniField label="Servicio" value="Diseño interior" />
                <MiniField label="Volumen" value="12 cotizaciones/mes" />
                <MiniField label="CRM actual" value="Email + planilla" />
              </div>
              <div style={{marginTop: 8}}>
                <MiniField label="Problema principal" value="Propuestas enviadas sin próxima acción definida" />
              </div>
            </section>

            <section style={{border: '1px solid rgba(10,63,77,0.20)', borderRadius: 18, background: '#FAFAFA', padding: 15, boxShadow: '0 8px 26px rgba(10,63,77,0.06)'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', gap: 10}}>
                <div>
                  <Label teal>Qué toca hacer ahora</Label>
                  <div style={{fontSize: 10, color: muted, marginTop: 4}}>Resumen operativo del lead</div>
                </div>
                <Pill tone="amber">Alta</Pill>
              </div>
              <div style={{marginTop: 12, border: `1px solid ${softBorder}`, borderRadius: 14, background: '#FFFFFF', padding: 12}}>
                <Label>Tarea pendiente</Label>
                <div style={{fontSize: 16, fontWeight: 900, lineHeight: 1.12, marginTop: 7}}>Revisar propuesta y agendar seguimiento</div>
                <div style={{fontSize: 10, color: muted, marginTop: 7}}>Programada para hoy · 15:00</div>
              </div>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8}}>
                <MiniField label="Responsable" value="Equipo comercial" />
                <MiniField label="Estado" value="Cotización" />
              </div>
            </section>
          </div>

          <section style={{marginTop: 14, border: '1px solid rgba(10,63,77,0.22)', borderRadius: 20, background: '#F4F8F8', padding: 16}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12}}>
              <div>
                <Label teal>G-KAIS AI BRIEF</Label>
                <div style={{fontSize: 11, color: '#657477', marginTop: 5}}>Análisis comercial usando ficha, contexto e historial del lead.</div>
              </div>
              <Pill tone="teal">Intención · Alta</Pill>
            </div>
            <div style={{fontSize: 13, fontWeight: 800, lineHeight: 1.35, marginTop: 12, background: '#FFFFFF', borderRadius: 14, border: '1px solid rgba(10,63,77,0.10)', padding: 12}}>
              Existe interés comercial, pero el proceso posterior a la cotización no está estandarizado. Conviene definir responsable, fecha y próxima acción antes de que la oportunidad se enfríe.
            </div>
          </section>
        </div>
      </div>
    </>
  );
};

const FinalStatusControl: React.FC = () => {
  const frame = useCurrentFrame();
  const uiExit = interpolate(frame, [716, 734], [1, 0], clamp);
  const opacity = interpolate(frame, [648, 658, 716, 726], [0, 1, 1, 0], clamp) * uiExit;
  const dropdownOpen = interpolate(frame, [670, 678, 690, 698], [0, 1, 1, 0], clamp);
  const stateChanged = frame >= 690;
  const stateFlash = interpolate(frame, [688, 696, 708], [0, 1, 0], clamp);
  const gentleScroll = interpolate(frame, [700, 718], [0, -150], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const exitScroll = interpolate(frame, [718, 734], [0, -620], {...clamp, easing: Easing.in(Easing.cubic)});
  const scroll = gentleScroll + exitScroll;

  if (opacity <= 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        left: 1028,
        top: 368 + scroll,
        width: 160,
        zIndex: 270,
        opacity,
      }}
    >
      <div
        style={{
          border: `1px solid ${stateChanged ? 'rgba(10,63,77,0.34)' : '#E7E7E7'}`,
          borderRadius: 12,
          background: stateChanged
            ? 'linear-gradient(180deg, #F8FBFA 0%, #F1F7F6 100%)'
            : 'linear-gradient(180deg, #FFFFFF 0%, #FBFCFB 100%)',
          padding: '10px 11px',
          minHeight: 54,
          boxSizing: 'border-box',
          boxShadow: `0 5px 14px rgba(20,34,31,0.06), 0 0 ${stateFlash * 18}px rgba(10,63,77,${stateFlash * 0.14})`,
        }}
      >
        <div style={{fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 9, color: '#8A8A8A'}}>Estado</div>
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 5}}>
          <div style={{fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 12, fontWeight: 700, color: stateChanged ? accent : '#151515'}}>
            {stateChanged ? 'Reunión agendada' : 'Seguimiento'}
          </div>
          <div style={{fontSize: 10, color: accent}}>⌄</div>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 61,
          borderRadius: 12,
          border: '1px solid rgba(10,63,77,0.18)',
          background: '#FFFFFF',
          boxShadow: '0 14px 28px rgba(17,30,27,0.16)',
          padding: 6,
          opacity: dropdownOpen,
          transform: `translateY(${(1 - dropdownOpen) * -6}px) scale(${0.98 + dropdownOpen * 0.02})`,
          transformOrigin: '50% 0%',
        }}
      >
        {['Seguimiento', 'Reunión agendada', 'Cliente'].map((option) => {
          const active = option === 'Reunión agendada' && frame >= 684;
          return (
            <div
              key={option}
              style={{
                borderRadius: 8,
                padding: '7px 8px',
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: 10,
                fontWeight: active ? 800 : 600,
                color: active ? accent : '#4E5552',
                background: active ? '#F1F7F6' : '#FFFFFF',
              }}
            >
              {option}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const FinalCursor: React.FC = () => {
  const frame = useCurrentFrame();
  const uiExit = interpolate(frame, [716, 734], [1, 0], clamp);
  const opacity = interpolate(frame, [526, 534, 720, 730], [0, 1, 1, 0], clamp) * uiExit;

  const x = interpolate(
    frame,
    [526, 536, 548, 560, 568, 576, 586, 598, 610, 620, 628, 638, 648, 658, 668, 674, 682, 690, 704, 720],
    [-20, 42, 92, 138, 168, 182, 182, 176, 170, 176, 182, 300, 560, 820, 1040, 1100, 1100, 1020, 950, 940],
    {...clamp, easing: Easing.inOut(Easing.cubic)},
  );

  const y = interpolate(
    frame,
    [526, 536, 548, 560, 568, 576, 586, 598, 610, 620, 628, 638, 648, 658, 668, 674, 682, 690, 704, 720],
    [118, 148, 205, 278, 330, 352, 352, 334, 286, 238, 214, 228, 270, 326, 378, 390, 446, 490, 548, 570],
    {...clamp, easing: Easing.inOut(Easing.cubic)},
  );

  const clicking = Math.max(
    interpolate(frame, [574, 578, 582], [0, 1, 0], clamp),
    interpolate(frame, [624, 628, 632], [0, 1, 0], clamp),
    interpolate(frame, [670, 674, 678], [0, 1, 0], clamp),
    interpolate(frame, [686, 690, 694], [0, 1, 0], clamp),
  );

  if (opacity <= 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: 20,
        height: 24,
        zIndex: 290,
        opacity,
        transform: `translate(-1.5px, -1.5px) scale(${1 - clicking * 0.05})`,
        filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.2))',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          width: 15,
          height: 20,
          background: '#111111',
          clipPath: 'polygon(0 0, 0 92%, 29% 69%, 48% 100%, 61% 92%, 42% 63%, 100% 63%)',
          borderRadius: 2,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: -6,
          top: -6,
          width: 25,
          height: 25,
          borderRadius: '50%',
          border: `1.5px solid rgba(10,63,77,${clicking * 0.58})`,
          transform: `scale(${0.72 + clicking * 0.42})`,
        }}
      />
    </div>
  );
};

export const CRMFinalInteractionPolish: React.FC = () => {
  const frame = useCurrentFrame();
  const gentleScroll = interpolate(frame, [700, 718], [0, -150], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const exitScroll = interpolate(frame, [718, 734], [0, -620], {...clamp, easing: Easing.in(Easing.cubic)});
  const scroll = gentleScroll + exitScroll;

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <style>{`
        /* ProductCRMRevealPolish still owns the approved CRM shell; only its old cursor/status timing is suppressed. */
        div[style*="z-index: 90"][style*="width: 20px"][style*="height: 24px"] {
          opacity: 0 !important;
        }
        div[style*="left: 1028px"][style*="width: 160px"][style*="z-index: 82"] {
          opacity: 0 !important;
        }
        .crm-polish-base main > div {
          transform: translateY(${scroll}px) !important;
        }
      `}</style>
      <DiegoPreview />
      <FinalStatusControl />
      <FinalCursor />
    </AbsoluteFill>
  );
};
