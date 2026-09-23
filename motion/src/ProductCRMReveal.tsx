import React from 'react';
import {Easing, interpolate, useCurrentFrame} from 'remotion';

const clamp = {
  extrapolateLeft: 'clamp' as const,
  extrapolateRight: 'clamp' as const,
};

const accent = '#0A3F4D';
const border = '#D8D8D8';
const softBorder = '#E7E7E7';
const muted = '#777777';

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

const MiniField: React.FC<{label: string; value: string}> = ({label, value}) => (
  <div
    style={{
      border: `1px solid ${softBorder}`,
      borderRadius: 12,
      background: '#FFFFFF',
      padding: '10px 11px',
      minHeight: 54,
    }}
  >
    <div style={{fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 9, color: '#8A8A8A'}}>{label}</div>
    <div
      style={{
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: 12,
        fontWeight: 700,
        color: '#151515',
        marginTop: 5,
        lineHeight: 1.25,
      }}
    >
      {value}
    </div>
  </div>
);

const StatusPill: React.FC<{children: React.ReactNode; tone?: 'teal' | 'amber' | 'neutral'}> = ({
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

const LeadRow: React.FC<{
  name: string;
  company: string;
  status: string;
  selected?: boolean;
  selectedGlow?: number;
}> = ({name, company, status, selected = false, selectedGlow = 0}) => (
  <div
    style={{
      position: 'relative',
      border: selected ? '1px solid rgba(10,63,77,0.34)' : `1px solid ${softBorder}`,
      background: selected ? '#F4F8F8' : '#FFFFFF',
      borderRadius: 14,
      padding: '11px 12px',
      boxShadow: selected
        ? `0 0 ${10 + selectedGlow * 10}px rgba(10,63,77,${0.05 + selectedGlow * 0.08})`
        : 'none',
    }}
  >
    {selected ? (
      <div
        style={{
          position: 'absolute',
          left: -1,
          top: 13,
          bottom: 13,
          width: 3,
          borderRadius: 3,
          background: accent,
        }}
      />
    ) : null}
    <div style={{fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 12, fontWeight: 800, color: '#111'}}>{name}</div>
    <div style={{fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 10, color: muted, marginTop: 2}}>{company}</div>
    <div style={{marginTop: 8}}>
      <StatusPill tone={selected ? 'teal' : 'neutral'}>{status}</StatusPill>
    </div>
  </div>
);

const MouseCursor: React.FC<{x: number; y: number; opacity: number; clicking: number}> = ({
  x,
  y,
  opacity,
  clicking,
}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width: 28,
      height: 34,
      zIndex: 30,
      opacity,
      transform: `translate(-2px, -2px) scale(${1 - clicking * 0.08})`,
      filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.2))',
      pointerEvents: 'none',
    }}
  >
    <div
      style={{
        width: 21,
        height: 28,
        background: '#111111',
        clipPath: 'polygon(0 0, 0 92%, 29% 69%, 48% 100%, 61% 92%, 42% 63%, 100% 63%)',
        borderRadius: 2,
      }}
    />
    <div
      style={{
        position: 'absolute',
        left: -8,
        top: -8,
        width: 34,
        height: 34,
        borderRadius: '50%',
        border: `1.5px solid rgba(10,63,77,${clicking * 0.55})`,
        transform: `scale(${0.7 + clicking * 0.5})`,
      }}
    />
  </div>
);

export const ProductCRMReveal: React.FC = () => {
  const frame = useCurrentFrame();

  const reveal = interpolate(frame, [488, 528], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  const settle = interpolate(frame, [528, 550], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  const scroll = interpolate(frame, [604, 646], [0, -112], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });
  const selectedGlow = interpolate(frame, [563, 571, 583], [0, 1, 0.35], clamp);
  const cursorOpacity = interpolate(frame, [544, 552, 648, 658], [0, 1, 1, 0], clamp);
  const cursorX = interpolate(frame, [550, 570, 588, 612, 640], [182, 182, 928, 930, 902], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });
  const cursorY = interpolate(frame, [550, 570, 588, 612, 640], [214, 214, 308, 490, 548], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });
  const clicking = interpolate(frame, [566, 570, 574], [0, 1, 0], clamp);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        opacity: reveal,
        transform: `perspective(1400px) translateY(${interpolate(reveal, [0, 1], [30, 0])}px) scale(${interpolate(
          reveal,
          [0, 1],
          [0.82, 1],
        )}) rotateX(${interpolate(reveal, [0, 1], [3.5, 0])}deg)`,
        transformOrigin: '50% 50%',
        fontFamily: 'Arial, Helvetica, sans-serif',
        zIndex: 40,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 58,
          top: 48,
          width: 1164,
          height: 624,
          borderRadius: 28,
          border: '1px solid rgba(10,63,77,0.18)',
          background: '#F7F7F5',
          boxShadow: `0 34px 88px rgba(14,24,22,${0.12 + settle * 0.06}), 0 4px 14px rgba(10,63,77,0.06)`,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: 58,
            background: '#FFFFFF',
            borderBottom: `1px solid ${softBorder}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 20px',
          }}
        >
          <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 10,
                background: accent,
                color: '#FFFFFF',
                display: 'grid',
                placeItems: 'center',
                fontSize: 13,
                fontWeight: 900,
              }}
            >
              G
            </div>
            <div>
              <Label teal>CRM // INTERNO</Label>
              <div style={{fontSize: 14, fontWeight: 800, marginTop: 2}}>Oportunidades</div>
            </div>
          </div>

          <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
            <StatusPill tone="teal">12 activas</StatusPill>
            <StatusPill>Firestore conectado</StatusPill>
          </div>
        </div>

        <div style={{display: 'flex', height: 566}}>
          <aside
            style={{
              width: 278,
              borderRight: `1px solid ${softBorder}`,
              background: '#FAFAFA',
              padding: 16,
              boxSizing: 'border-box',
            }}
          >
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: 12}}>
              <div>
                <Label>Lead pipeline</Label>
                <div style={{fontSize: 12, fontWeight: 800, marginTop: 4}}>Trabajo prioritario</div>
              </div>
              <span style={{fontSize: 10, color: muted}}>4 leads</span>
            </div>

            <div style={{display: 'grid', gap: 8}}>
              <LeadRow name="Sofía Martínez" company="Clínica Aurora" status="Seguimiento hoy" selected selectedGlow={selectedGlow} />
              <LeadRow name="Diego Fuentes" company="Diseño Norte" status="Cotización" />
              <LeadRow name="Valentina Ríos" company="Logística Andina" status="Nuevo lead" />
              <LeadRow name="Martín Silva" company="Studio Forma" status="Esperando respuesta" />
            </div>

            <div
              style={{
                marginTop: 12,
                borderRadius: 14,
                border: `1px solid ${softBorder}`,
                background: '#FFFFFF',
                padding: 12,
              }}
            >
              <Label teal>Priority work</Label>
              <div style={{fontSize: 11, lineHeight: 1.4, color: '#5E6662', marginTop: 7}}>
                Ordenado por urgencia operativa y próxima acción.
              </div>
            </div>
          </aside>

          <main style={{position: 'relative', flex: 1, background: '#FFFFFF', overflow: 'hidden'}}>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                transform: `translateY(${scroll}px)`,
              }}
            >
              <div style={{padding: '18px 20px 24px'}}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    borderBottom: `1px solid ${softBorder}`,
                    paddingBottom: 14,
                  }}
                >
                  <div>
                    <Label teal>REGISTRO CRM // Instagram</Label>
                    <div style={{fontSize: 23, lineHeight: 1.05, fontWeight: 900, letterSpacing: -0.5, marginTop: 6}}>
                      Sofía Martínez
                    </div>
                    <div style={{fontSize: 12, color: muted, marginTop: 5}}>Clínica Aurora · Estética facial</div>
                  </div>
                  <div style={{display: 'flex', gap: 8}}>
                    <StatusPill tone="teal">Seguimiento</StatusPill>
                    <StatusPill tone="amber">Prioridad alta</StatusPill>
                  </div>
                </div>

                <div style={{display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: 14, marginTop: 14}}>
                  <section
                    style={{
                      border: `1px solid ${border}`,
                      borderRadius: 18,
                      background: '#FFFFFF',
                      padding: 15,
                    }}
                  >
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                      <div>
                        <Label>Perfil del negocio y calificación</Label>
                        <div style={{fontSize: 10, color: muted, marginTop: 4}}>Contexto para AI Brief</div>
                      </div>
                      <StatusPill tone="teal">6/9 completo</StatusPill>
                    </div>

                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12}}>
                      <MiniField label="Canal" value="Instagram" />
                      <MiniField label="Servicio" value="Estética facial" />
                      <MiniField label="Volumen" value="35 consultas/semana" />
                      <MiniField label="CRM actual" value="WhatsApp + Excel" />
                    </div>
                    <div style={{marginTop: 8}}>
                      <MiniField label="Problema principal" value="Interés detectado sin seguimiento posterior" />
                    </div>
                  </section>

                  <section
                    style={{
                      border: '1px solid rgba(10,63,77,0.20)',
                      borderRadius: 18,
                      background: '#FAFAFA',
                      padding: 15,
                      boxShadow: '0 8px 26px rgba(10,63,77,0.06)',
                    }}
                  >
                    <div style={{display: 'flex', justifyContent: 'space-between', gap: 10}}>
                      <div>
                        <Label teal>Qué toca hacer ahora</Label>
                        <div style={{fontSize: 10, color: muted, marginTop: 4}}>Resumen operativo del lead</div>
                      </div>
                      <StatusPill tone="amber">Alta</StatusPill>
                    </div>

                    <div
                      style={{
                        marginTop: 12,
                        border: `1px solid ${softBorder}`,
                        borderRadius: 14,
                        background: '#FFFFFF',
                        padding: 12,
                      }}
                    >
                      <Label>Tarea pendiente</Label>
                      <div style={{fontSize: 16, fontWeight: 900, lineHeight: 1.12, marginTop: 7}}>
                        Retomar conversación y agendar llamada
                      </div>
                      <div style={{fontSize: 10, color: muted, marginTop: 7}}>Programada para hoy · 16:30</div>
                    </div>

                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8}}>
                      <MiniField label="Responsable" value="Equipo comercial" />
                      <MiniField label="Estado" value="Seguimiento" />
                    </div>

                    <div
                      style={{
                        marginTop: 8,
                        border: `1px solid ${softBorder}`,
                        borderRadius: 12,
                        background: '#FFFFFF',
                        padding: 10,
                      }}
                    >
                      <Label>Última nota</Label>
                      <div style={{fontSize: 11, fontWeight: 700, marginTop: 6}}>Consultó por tratamientos y horarios</div>
                      <div style={{fontSize: 9, color: muted, marginTop: 3}}>Hoy · 11:42</div>
                    </div>
                  </section>
                </div>

                <section
                  style={{
                    marginTop: 14,
                    border: '1px solid rgba(10,63,77,0.22)',
                    borderRadius: 20,
                    background: '#F4F8F8',
                    padding: 16,
                  }}
                >
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12}}>
                    <div>
                      <Label teal>G-KAIS AI BRIEF</Label>
                      <div style={{fontSize: 11, color: '#657477', marginTop: 5}}>
                        Análisis comercial usando ficha, contexto e historial del lead.
                      </div>
                    </div>
                    <StatusPill tone="teal">Intención · Alta</StatusPill>
                  </div>

                  <div style={{display: 'grid', gridTemplateColumns: '1.25fr 0.75fr', gap: 12, marginTop: 12}}>
                    <div
                      style={{
                        borderRadius: 14,
                        background: '#FFFFFF',
                        border: '1px solid rgba(10,63,77,0.10)',
                        padding: 12,
                      }}
                    >
                      <div style={{fontSize: 13, fontWeight: 800, lineHeight: 1.35}}>
                        Hay interés claro, pero la conversación perdió continuidad después del primer contacto.
                      </div>
                      <div style={{height: 1, background: '#E6ECEB', margin: '10px 0'}} />
                      <Label teal>Cómo puede ayudar</Label>
                      <div style={{fontSize: 11, lineHeight: 1.4, color: '#4E5955', marginTop: 5}}>
                        Retomar hoy con contexto, confirmar tratamiento de interés y mantener una próxima acción asignada.
                      </div>
                    </div>

                    <div style={{display: 'grid', gap: 8}}>
                      <MiniField label="Falta saber" value="Tratamiento de interés y urgencia" />
                      <MiniField label="Señal reciente" value="Abrió el mensaje hace 18 min" />
                    </div>
                  </div>
                </section>

                <section
                  style={{
                    marginTop: 14,
                    border: `1px solid ${border}`,
                    borderRadius: 18,
                    background: '#FFFFFF',
                    padding: 14,
                  }}
                >
                  <Label>Actividad del lead</Label>
                  <div style={{display: 'grid', gap: 7, marginTop: 10}}>
                    {[
                      ['11:42', 'Nota añadida', 'Preguntó por horarios y disponibilidad.'],
                      ['11:18', 'Instagram', 'Solicitó información sobre tratamiento facial.'],
                      ['10:56', 'Lead creado', 'Ingreso desde campaña Meta Ads.'],
                    ].map(([time, title, text]) => (
                      <div key={time} style={{display: 'grid', gridTemplateColumns: '48px 108px 1fr', gap: 10, alignItems: 'center'}}>
                        <span style={{fontSize: 9, color: '#8A8A8A'}}>{time}</span>
                        <span style={{fontSize: 10, fontWeight: 800}}>{title}</span>
                        <span style={{fontSize: 10, color: '#5F6663'}}>{text}</span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </main>
        </div>
      </div>

      <MouseCursor x={cursorX} y={cursorY} opacity={cursorOpacity} clicking={clicking} />
    </div>
  );
};
