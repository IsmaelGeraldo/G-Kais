import React from 'react';
import {
  AbsoluteFill,
  Easing,
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

type FilmProps = {
  accent: string;
  headline: string;
};

const palette = {
  bg: '#D9D9D6',
  panel: '#F4F4F1',
  white: '#FFFFFF',
  ink: '#101211',
  muted: '#777D7A',
  graphite: '#252927',
  border: 'rgba(16,18,17,0.12)',
};

const clamp = {
  extrapolateLeft: 'clamp' as const,
  extrapolateRight: 'clamp' as const,
};

const softShadow = '0 30px 80px rgba(18, 23, 21, 0.16)';

const SceneFrame: React.FC<{
  children: React.ReactNode;
  accent: string;
}> = ({children, accent}) => {
  return (
    <AbsoluteFill
      style={{
        background:
          'radial-gradient(circle at 78% 22%, rgba(255,255,255,0.82), transparent 28%), linear-gradient(135deg, #CFCFCB 0%, #E9E9E5 48%, #C9CBC8 100%)',
        color: palette.ink,
        fontFamily: 'Arial, Helvetica, sans-serif',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 26,
          borderRadius: 38,
          border: '1px solid rgba(255,255,255,0.58)',
          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.04), 0 22px 70px rgba(32,37,35,0.14)',
          background: 'rgba(242,242,239,0.40)',
          backdropFilter: 'blur(16px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 420,
          height: 420,
          right: -150,
          top: -150,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${accent}26, transparent 68%)`,
          filter: 'blur(18px)',
        }}
      />
      {children}
    </AbsoluteFill>
  );
};

const Pill: React.FC<{children: React.ReactNode; accent?: string}> = ({
  children,
  accent,
}) => (
  <div
    style={{
      padding: '8px 12px',
      borderRadius: 999,
      border: `1px solid ${accent ? `${accent}44` : palette.border}`,
      background: 'rgba(255,255,255,0.70)',
      boxShadow: '0 8px 24px rgba(20,24,22,0.08)',
      fontSize: 15,
      fontWeight: 700,
      color: accent ?? palette.ink,
      backdropFilter: 'blur(14px)',
      whiteSpace: 'nowrap',
    }}
  >
    {children}
  </div>
);

const Scene01PhoneNotifications: React.FC<{accent: string}> = ({accent}) => {
  const frame = useCurrentFrame();
  const phoneIn = interpolate(frame, [0, 28], [-110, 0], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  const copyOpacity = interpolate(frame, [20, 48], [0, 1], clamp);
  const secondLineOpacity = interpolate(frame, [58, 84], [0, 1], clamp);

  return (
    <SceneFrame accent={accent}>
      <div
        style={{
          position: 'absolute',
          left: 118 + phoneIn,
          top: 112,
          width: 246,
          height: 494,
          borderRadius: 44,
          background: 'linear-gradient(145deg, #1C201E, #454A47)',
          padding: 10,
          boxShadow: '0 38px 85px rgba(10,12,11,0.26)',
          transform: 'rotate(-4deg)',
        }}
      >
        <div
          style={{
            height: '100%',
            borderRadius: 35,
            background: 'linear-gradient(180deg, #F8F8F5 0%, #E6E7E3 100%)',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            style={{
              width: 86,
              height: 22,
              borderRadius: 20,
              background: '#161817',
              position: 'absolute',
              left: 70,
              top: 12,
            }}
          />
          <div style={{padding: '70px 22px 0'}}>
            <div style={{fontSize: 12, color: palette.muted, letterSpacing: 1.5}}>
              INBOX
            </div>
            <div style={{fontSize: 28, fontWeight: 800, marginTop: 8}}>
              Nuevas consultas
            </div>
            <div style={{marginTop: 22, display: 'grid', gap: 12}}>
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  style={{
                    height: 62,
                    borderRadius: 18,
                    background: 'rgba(255,255,255,0.8)',
                    border: `1px solid ${palette.border}`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{position: 'absolute', left: 310, top: 120}}>
        <Pill accent="#E1306C">Instagram · “¿Tienen disponibilidad?”</Pill>
      </div>
      <div style={{position: 'absolute', left: 350, top: 210}}>
        <Pill accent="#1FA855">WhatsApp · “Quiero cotizar”</Pill>
      </div>
      <div style={{position: 'absolute', left: 286, top: 302}}>
        <Pill accent="#637083">Email · Nueva consulta</Pill>
      </div>
      <div style={{position: 'absolute', left: 350, top: 392}}>
        <Pill accent={accent}>Formulario web · Lead nuevo</Pill>
      </div>

      <div
        style={{
          position: 'absolute',
          right: 120,
          top: 210,
          width: 520,
          opacity: copyOpacity,
        }}
      >
        <div style={{fontSize: 56, lineHeight: 1.02, fontWeight: 850, letterSpacing: -2.6}}>
          Cada consulta compite por atención.
        </div>
        <div
          style={{
            marginTop: 22,
            fontSize: 29,
            lineHeight: 1.25,
            fontWeight: 650,
            color: palette.muted,
            opacity: secondLineOpacity,
          }}
        >
          Algunas esperan.
        </div>
      </div>
    </SceneFrame>
  );
};

const Scene02LateralTransition: React.FC<{accent: string}> = ({accent}) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, 65], [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });
  return (
    <SceneFrame accent={accent}>
      <div
        style={{
          position: 'absolute',
          inset: 80,
          display: 'flex',
          alignItems: 'center',
          transform: `translateX(${interpolate(progress, [0, 1], [380, -80])}px)`,
          filter: `blur(${interpolate(progress, [0, 1], [9, 0])}px)`,
          opacity: interpolate(progress, [0, 0.18, 1], [0, 0.7, 1]),
        }}
      >
        <div
          style={{
            width: 760,
            minHeight: 430,
            borderRadius: 34,
            background: 'rgba(255,255,255,0.78)',
            border: `1px solid ${palette.border}`,
            boxShadow: softShadow,
            padding: 44,
          }}
        >
          <div style={{fontSize: 13, letterSpacing: 2.2, color: accent, fontWeight: 800}}>
            SIGNAL INTAKE
          </div>
          <div style={{fontSize: 46, fontWeight: 850, marginTop: 16}}>Señal de entrada</div>
          <div style={{fontSize: 20, color: palette.muted, marginTop: 12}}>
            La información deja de estar dispersa y se convierte en una oportunidad estructurada.
          </div>
        </div>
      </div>
    </SceneFrame>
  );
};

const Scene03InputSignal: React.FC<{accent: string}> = ({accent}) => {
  const frame = useCurrentFrame();
  const fields = ['Canal', 'Lead', 'Problema', 'Objetivo', 'Frescura'];
  return (
    <SceneFrame accent={accent}>
      <div
        style={{
          position: 'absolute',
          left: 170,
          top: 124,
          width: 720,
          borderRadius: 34,
          padding: 42,
          background: 'rgba(255,255,255,0.80)',
          border: `1px solid ${palette.border}`,
          boxShadow: softShadow,
        }}
      >
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
          <div>
            <div style={{fontSize: 13, letterSpacing: 2.1, fontWeight: 800, color: accent}}>
              INPUT SIGNAL
            </div>
            <div style={{fontSize: 42, fontWeight: 850, marginTop: 12}}>Oportunidad recibida</div>
          </div>
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: accent,
              boxShadow: `0 0 0 10px ${accent}14, 0 0 28px ${accent}55`,
            }}
          />
        </div>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginTop: 34}}>
          {fields.map((field, i) => {
            const reveal = interpolate(frame, [i * 8 + 4, i * 8 + 16], [0, 1], clamp);
            return (
              <div
                key={field}
                style={{
                  borderRadius: 20,
                  minHeight: 118,
                  padding: 16,
                  background: '#F3F4F1',
                  border: `1px solid ${palette.border}`,
                  opacity: reveal,
                  transform: `translateY(${interpolate(reveal, [0, 1], [15, 0])}px)`,
                }}
              >
                <div style={{fontSize: 12, color: palette.muted, textTransform: 'uppercase'}}>{field}</div>
                <div style={{fontSize: 16, fontWeight: 760, marginTop: 30}}>
                  {['WhatsApp', 'Camila Rojas', 'Seguimiento manual', 'Agendar evaluación', 'Ahora'][i]}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          right: 120,
          top: 330,
          width: 170,
          height: 2,
          background: `linear-gradient(90deg, ${accent}, transparent)`,
          transformOrigin: 'left center',
          transform: `scaleX(${interpolate(frame, [40, 62], [0, 1], clamp)})`,
        }}
      />
    </SceneFrame>
  );
};

const EngineVisual: React.FC<{accent: string; intensity: number}> = ({accent, intensity}) => {
  const frame = useCurrentFrame();
  const pulse = 1 + Math.sin(frame / 4.8) * 0.035 * intensity;
  const ring = interpolate(frame, [0, 95], [0, 920]);
  return (
    <div
      style={{
        position: 'relative',
        width: 270,
        height: 270,
        display: 'grid',
        placeItems: 'center',
        transform: `scale(${pulse})`,
      }}
    >
      {[0, 1, 2].map((r) => (
        <div
          key={r}
          style={{
            position: 'absolute',
            inset: 18 + r * 24,
            borderRadius: '50%',
            border: `1.5px solid ${accent}${r === 0 ? '88' : '44'}`,
            transform: `rotate(${ring * (r % 2 === 0 ? 1 : -0.72)}deg)`,
            boxShadow: r === 0 ? `0 0 34px ${accent}2F` : 'none',
          }}
        />
      ))}
      <div
        style={{
          width: 124,
          height: 124,
          borderRadius: 40,
          background: `radial-gradient(circle at 35% 30%, #E9F1EF 0%, ${accent} 42%, #071B1F 100%)`,
          boxShadow: `0 0 ${34 + intensity * 24}px ${accent}66`,
          display: 'grid',
          placeItems: 'center',
          color: '#fff',
          fontSize: 46,
          fontWeight: 900,
        }}
      >
        G
      </div>
    </div>
  );
};

const Scene04EngineActivation: React.FC<{accent: string}> = ({accent}) => {
  const frame = useCurrentFrame();
  const intensity = interpolate(frame, [0, 65, 95], [0.2, 1, 0.82], clamp);
  return (
    <SceneFrame accent={accent}>
      <div style={{position: 'absolute', left: 505, top: 205}}>
        <EngineVisual accent={accent} intensity={intensity} />
      </div>
      <div
        style={{
          position: 'absolute',
          left: 260,
          top: 345,
          width: 255,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${accent})`,
          transformOrigin: 'right center',
          transform: `scaleX(${interpolate(frame, [0, 28], [0, 1], clamp)})`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 250,
          top: 250,
          width: 260,
          fontSize: 15,
          color: palette.muted,
          lineHeight: 1.5,
        }}
      >
        La señal rodea el núcleo, acelera y activa el procesamiento.
      </div>
    </SceneFrame>
  );
};

const Scene05IntelligenceWindows: React.FC<{accent: string}> = ({accent}) => {
  const frame = useCurrentFrame();
  const cards = [
    ['CONTEXTO', '6/9 conocido'],
    ['PRIORIDAD', 'Alta'],
    ['AI BRIEF', 'Qué falta saber + cómo ayudar'],
    ['PRÓXIMA ACCIÓN', 'Confirmar llamada y revisar flujo'],
  ];
  return (
    <SceneFrame accent={accent}>
      <div style={{position: 'absolute', left: 175, top: 226}}>
        <EngineVisual accent={accent} intensity={0.86} />
      </div>
      <div
        style={{
          position: 'absolute',
          right: 105,
          top: 115,
          width: 600,
          display: 'grid',
          gap: 16,
        }}
      >
        {cards.map(([title, value], i) => {
          const reveal = interpolate(frame, [i * 22, i * 22 + 18], [0, 1], {
            ...clamp,
            easing: Easing.out(Easing.cubic),
          });
          return (
            <div
              key={title}
              style={{
                minHeight: i === 2 ? 112 : 84,
                borderRadius: 24,
                padding: '18px 22px',
                background: i === 3 ? palette.graphite : 'rgba(255,255,255,0.82)',
                color: i === 3 ? '#fff' : palette.ink,
                border: `1px solid ${i === 3 ? 'rgba(255,255,255,0.08)' : palette.border}`,
                boxShadow: '0 18px 48px rgba(25,30,28,0.13)',
                opacity: reveal,
                transform: `translateX(${interpolate(reveal, [0, 1], [80, 0])}px) translateY(${i * 2}px)`,
              }}
            >
              <div style={{fontSize: 11, letterSpacing: 1.7, fontWeight: 800, color: i === 3 ? '#AFC7C2' : accent}}>
                {title}
              </div>
              <div style={{fontSize: i === 2 ? 19 : 22, fontWeight: 760, marginTop: 8}}>{value}</div>
            </div>
          );
        })}
      </div>
    </SceneFrame>
  );
};

const Scene06ProductCRM: React.FC<{accent: string}> = ({accent}) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, 35], [0.72, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  const y = interpolate(frame, [0, 35], [80, 0], clamp);
  const scroll = interpolate(frame, [48, 120], [0, -145], clamp);

  return (
    <SceneFrame accent={accent}>
      <div
        style={{
          position: 'absolute',
          left: 105,
          top: 72,
          width: 1070,
          height: 580,
          borderRadius: 30,
          background: palette.white,
          border: `1px solid ${palette.border}`,
          boxShadow: softShadow,
          overflow: 'hidden',
          transform: `translateY(${y}px) scale(${scale})`,
        }}
      >
        <div
          style={{
            height: 62,
            padding: '0 24px',
            borderBottom: `1px solid ${palette.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{fontSize: 16, fontWeight: 850}}>G-KAIS · Lead Full Record</div>
          <div style={{fontSize: 12, color: accent, fontWeight: 800}}>OPPORTUNITY OPERATING SYSTEM</div>
        </div>
        <div style={{display: 'grid', gridTemplateColumns: '330px 1fr', height: 518}}>
          <div style={{background: '#F2F3F0', borderRight: `1px solid ${palette.border}`, padding: 20}}>
            {['Priority Work', 'New Leads', 'Follow-up', 'Clients'].map((item, i) => (
              <div
                key={item}
                style={{
                  padding: 16,
                  borderRadius: 16,
                  marginBottom: 10,
                  background: i === 0 ? '#fff' : 'transparent',
                  fontWeight: 760,
                  color: i === 0 ? palette.ink : palette.muted,
                }}
              >
                {item}
              </div>
            ))}
          </div>
          <div style={{position: 'relative', overflow: 'hidden'}}>
            <div style={{padding: 28, transform: `translateY(${scroll}px)`}}>
              {[
                ['Perfil del negocio y calificación', 'Contexto 6/9 · Servicio · Problema · Solución actual'],
                ['Qué toca hacer ahora', 'Confirmar reunión y revisar flujo actual'],
                ['AI Brief', 'Lectura rápida · Qué falta saber · Cómo G-KAIS puede ayudar'],
                ['Bitácora', 'Notas acumulativas e historial de actividad'],
              ].map(([title, body], i) => (
                <div
                  key={title}
                  style={{
                    padding: 22,
                    minHeight: i === 2 ? 150 : 108,
                    borderRadius: 22,
                    border: `1px solid ${palette.border}`,
                    marginBottom: 18,
                    background: i === 1 ? '#EEF5F3' : '#fff',
                  }}
                >
                  <div style={{fontSize: 12, letterSpacing: 1.4, color: accent, fontWeight: 800}}>{title}</div>
                  <div style={{fontSize: 20, marginTop: 10, fontWeight: 700}}>{body}</div>
                </div>
              ))}
            </div>
            <div
              style={{
                position: 'absolute',
                right: 190,
                top: interpolate(frame, [35, 115], [145, 350], clamp),
                width: 18,
                height: 24,
                background: palette.ink,
                clipPath: 'polygon(0 0, 100% 70%, 58% 73%, 73% 100%, 57% 100%, 43% 76%, 0 100%)',
                filter: 'drop-shadow(0 3px 3px rgba(0,0,0,0.25))',
              }}
            />
          </div>
        </div>
      </div>
    </SceneFrame>
  );
};

const Scene07EndFrame: React.FC<{accent: string; headline: string}> = ({
  accent,
  headline,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 28], [0, 1], clamp);
  return (
    <SceneFrame accent={accent}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          textAlign: 'center',
          opacity,
        }}
      >
        <div>
          <div style={{fontSize: 22, fontWeight: 900, letterSpacing: 4}}>G-KAIS</div>
          <div style={{fontSize: 62, fontWeight: 900, letterSpacing: -3.2, marginTop: 20}}>{headline}</div>
          <div style={{fontSize: 20, color: palette.muted, marginTop: 18}}>Contexto. Prioridad. Próxima acción.</div>
        </div>
      </div>
    </SceneFrame>
  );
};

export const GKaisMasterFilm: React.FC<FilmProps> = ({accent, headline}) => {
  useVideoConfig();
  return (
    <AbsoluteFill style={{backgroundColor: palette.bg}}>
      <Sequence from={0} durationInFrames={126}>
        <Scene01PhoneNotifications accent={accent} />
      </Sequence>
      <Sequence from={126} durationInFrames={66}>
        <Scene02LateralTransition accent={accent} />
      </Sequence>
      <Sequence from={192} durationInFrames={63}>
        <Scene03InputSignal accent={accent} />
      </Sequence>
      <Sequence from={255} durationInFrames={96}>
        <Scene04EngineActivation accent={accent} />
      </Sequence>
      <Sequence from={351} durationInFrames={123}>
        <Scene05IntelligenceWindows accent={accent} />
      </Sequence>
      <Sequence from={474} durationInFrames={138}>
        <Scene06ProductCRM accent={accent} />
      </Sequence>
      <Sequence from={612} durationInFrames={63}>
        <Scene07EndFrame accent={accent} headline={headline} />
      </Sequence>
    </AbsoluteFill>
  );
};
