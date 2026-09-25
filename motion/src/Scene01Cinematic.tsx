import React from 'react';
import {loadFont} from '@remotion/google-fonts/MPLUSRounded1c';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';

type ChannelKind = 'instagram' | 'whatsapp' | 'email' | 'form';

const {fontFamily: roundedHeadlineFamily} = loadFont('normal', {
  weights: ['700', '800', '900'],
  subsets: ['latin'],
});

const clamp = {
  extrapolateLeft: 'clamp' as const,
  extrapolateRight: 'clamp' as const,
};

const snapToRenderPixel = (value: number) => Math.round(value * 2) / 2;

const palette = {
  ink: '#101211',
  muted: '#747B77',
};

const ChannelIcon: React.FC<{kind: ChannelKind}> = ({kind}) => {
  const styles: Record<ChannelKind, {background: string; label: string}> = {
    instagram: {
      background: 'linear-gradient(135deg, #7A42F4 0%, #E1306C 52%, #F6A52A 100%)',
      label: 'IG',
    },
    whatsapp: {
      background: 'linear-gradient(145deg, #2DCB70 0%, #159447 100%)',
      label: 'WA',
    },
    email: {
      background: 'linear-gradient(145deg, #72808B 0%, #3D4850 100%)',
      label: '@',
    },
    form: {
      background: 'linear-gradient(145deg, #155E70 0%, #0A3F4D 100%)',
      label: 'F',
    },
  };

  const current = styles[kind];

  return (
    <div
      style={{
        width: 34,
        height: 34,
        borderRadius: 11,
        background: current.background,
        boxShadow:
          'inset 0 1px 0 rgba(255,255,255,0.40), 0 7px 18px rgba(11,19,17,0.16)',
        display: 'grid',
        placeItems: 'center',
        color: '#fff',
        fontWeight: 900,
        fontSize: kind === 'email' ? 17 : 11,
        letterSpacing: kind === 'instagram' || kind === 'whatsapp' ? 0.4 : 0,
        flex: '0 0 auto',
        position: 'relative',
        zIndex: 1,
      }}
    >
      {current.label}
    </div>
  );
};

const GlassNotification: React.FC<{
  channel: ChannelKind;
  eyebrow: string;
  message: string;
  x: number;
  y: number;
  width: number;
  start: number;
  depth: number;
  seed: number;
}> = ({channel, eyebrow, message, x, y, width, start, depth, seed}) => {
  const frame = useCurrentFrame();
  const reveal = interpolate(frame, [start, start + 13], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  const driftY = 0;
  const driftX = 0;
  const perspectiveScale = 0.91 + depth * 0.12;
  const revealScale = 1;
  const blur = interpolate(depth, [0.45, 1], [0.5, 0]);

  return (
    <div
      style={{
        position: 'absolute',
        left: snapToRenderPixel(x + driftX),
        top: snapToRenderPixel(y),
        width,
        minHeight: 66,
        padding: '11px 14px 11px 11px',
        borderRadius: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        background:
          'linear-gradient(180deg, rgba(255,255,255,0.88) 0%, rgba(247,248,247,0.69) 100%)',
        border: `1.25px solid rgba(255,255,255,${0.80 + depth * 0.1})`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.90), inset 0 -1px 0 rgba(21,28,25,0.035), 0 ${
          12 + depth * 14
        }px ${28 + depth * 18}px rgba(18,24,21,${0.075 + depth * 0.055})`,
        backdropFilter: 'blur(16px) saturate(1.04)',
        opacity: reveal * (0.7 + depth * 0.3),
        filter: `blur(${blur}px)`,
        transform: `translateZ(0) scale(${perspectiveScale * revealScale})`,
        transformOrigin: 'left center',
        overflow: 'hidden',
        backfaceVisibility: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 1,
          borderRadius: 18.8,
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.30), rgba(255,255,255,0.04) 48%, rgba(255,255,255,0))',
          pointerEvents: 'none',
        }}
      />

      <ChannelIcon kind={channel} />

      <div style={{minWidth: 0, position: 'relative', zIndex: 1}}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 850,
            letterSpacing: 1.05,
            color: '#68716C',
            textTransform: 'uppercase',
          }}
        >
          {eyebrow}
        </div>
        <div
          style={{
            fontSize: 15,
            fontWeight: 760,
            color: palette.ink,
            marginTop: 3,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {message}
        </div>
      </div>

      <div
        style={{
          marginLeft: 'auto',
          alignSelf: 'flex-start',
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: '#0A3F4D',
          boxShadow: '0 0 0 4px rgba(10,63,77,0.075)',
          position: 'relative',
          zIndex: 1,
        }}
      />
    </div>
  );
};

export const Scene01Cinematic: React.FC<{accent?: string}> = ({accent = '#0A3F4D'}) => {
  const frame = useCurrentFrame();
  const phoneReveal = interpolate(frame, [0, 28], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  const copyOpacity = interpolate(frame, [22, 48], [0, 1], clamp);
  const secondLineOpacity = interpolate(frame, [66, 92], [0, 1], clamp);
  const cameraX = 0;
  const cameraY = 0;
  const phoneFloat = 0;
  const unread = frame < 34 ? 2 : frame < 70 ? 4 : 7;

  const notifications = [
    {
      channel: 'instagram' as const,
      eyebrow: 'Instagram',
      message: '¿Tienen disponibilidad?',
      x: 338,
      y: 106,
      width: 292,
      start: 17,
      depth: 0.92,
      seed: 1,
    },
    {
      channel: 'whatsapp' as const,
      eyebrow: 'WhatsApp',
      message: 'Hola, quiero cotizar',
      x: 286,
      y: 455,
      width: 306,
      start: 27,
      depth: 1,
      seed: 2,
    },
    {
      channel: 'email' as const,
      eyebrow: 'Email',
      message: 'Consulta por servicios',
      x: 398,
      y: 205,
      width: 272,
      start: 42,
      depth: 0.68,
      seed: 3,
    },
    {
      channel: 'form' as const,
      eyebrow: 'Formulario web',
      message: 'Nuevo lead recibido',
      x: 356,
      y: 350,
      width: 286,
      start: 54,
      depth: 0.84,
      seed: 4,
    },
    {
      channel: 'instagram' as const,
      eyebrow: 'Instagram',
      message: 'Vi su anuncio y quiero saber más',
      x: 32,
      y: 250,
      width: 272,
      start: 62,
      depth: 0.62,
      seed: 5,
    },
    {
      channel: 'whatsapp' as const,
      eyebrow: 'WhatsApp',
      message: '¿Podemos hablar hoy?',
      x: 72,
      y: 88,
      width: 258,
      start: 76,
      depth: 0.58,
      seed: 6,
    },
    {
      channel: 'email' as const,
      eyebrow: 'Email',
      message: 'Necesito más información',
      x: 82,
      y: 570,
      width: 280,
      start: 94,
      depth: 0.5,
      seed: 7,
    },
  ];

  const rows = [
    ['WhatsApp', 'Quiero cotizar'],
    ['Instagram', '¿Tienen disponibilidad?'],
    ['Email', 'Consulta por servicios'],
    ['Formulario', 'Nuevo contacto'],
    ['WhatsApp', '¿Podemos hablar hoy?'],
  ];

  return (
    <AbsoluteFill
      style={{
        overflow: 'hidden',
        color: palette.ink,
        fontFamily: 'Arial, Helvetica, sans-serif',
        background:
          'radial-gradient(circle at 78% 22%, rgba(255,255,255,0.82), transparent 28%), linear-gradient(135deg, #CFCFCB 0%, #E9E9E5 48%, #C9CBC8 100%)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 26,
          borderRadius: 38,
          border: '1px solid rgba(255,255,255,0.58)',
          boxShadow:
            'inset 0 0 0 1px rgba(0,0,0,0.04), 0 22px 70px rgba(32,37,35,0.14)',
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

      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `translate3d(${cameraX}px, ${cameraY}px, 0)`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: -130,
            top: 86,
            width: 680,
            height: 560,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.18) 42%, transparent 70%)',
            filter: 'blur(7px)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 126,
            bottom: 48,
            width: 400,
            height: 54,
            borderRadius: '50%',
            background: 'rgba(27,34,31,0.16)',
            filter: 'blur(26px)',
            transform: `scaleX(${0.9 + phoneReveal * 0.1})`,
          }}
        />

        <div
          style={{
            position: 'absolute',
            left: 150,
            top: 89 + phoneFloat,
            width: 284,
            height: 548,
            opacity: phoneReveal,
            transform: `perspective(1250px) translateX(${interpolate(
              phoneReveal,
              [0, 1],
              [-82, 0],
            )}px) rotateY(-10deg) rotateX(1.5deg) rotateZ(-3.1deg) scale(1)`,
            transformStyle: 'preserve-3d',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: -4,
              top: 94,
              width: 5,
              height: 68,
              borderRadius: 4,
              background: 'linear-gradient(#737A77,#252927)',
              boxShadow: '-2px 0 4px rgba(0,0,0,0.16)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              right: -5,
              top: 132,
              width: 6,
              height: 91,
              borderRadius: 4,
              background: 'linear-gradient(#777D79,#202422)',
              boxShadow: '2px 0 4px rgba(0,0,0,0.16)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 50,
              padding: 8,
              background:
                'linear-gradient(145deg, #686D6A 0%, #171B19 20%, #050706 58%, #5D625F 100%)',
              boxShadow:
                '0 44px 95px rgba(6,9,8,0.32), inset 0 1px 1px rgba(255,255,255,0.48)',
            }}
          >
            <div
              style={{
                height: '100%',
                position: 'relative',
                overflow: 'hidden',
                borderRadius: 42,
                background: 'linear-gradient(180deg, #F8F9F7 0%, #E9EBE8 100%)',
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.65)',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'linear-gradient(110deg, transparent 14%, rgba(255,255,255,0.48) 29%, transparent 43%)',
                  opacity: 0.65,
                  transform: 'translateX(-18px)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: 11,
                  left: '50%',
                  width: 94,
                  height: 26,
                  transform: 'translateX(-50%)',
                  borderRadius: 18,
                  background: '#0B0D0C',
                  boxShadow: '0 1px 0 rgba(255,255,255,0.12)',
                }}
              />

              <div
                style={{
                  position: 'absolute',
                  top: 57,
                  left: 22,
                  right: 22,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 10,
                      color: '#7A827E',
                      fontWeight: 850,
                      letterSpacing: 1.5,
                    }}
                  >
                    BANDEJA
                  </div>
                  <div
                    style={{
                      fontSize: 25,
                      color: palette.ink,
                      fontWeight: 900,
                      marginTop: 5,
                      letterSpacing: -0.8,
                    }}
                  >
                    Consultas
                  </div>
                </div>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 15,
                    background: accent,
                    display: 'grid',
                    placeItems: 'center',
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: 900,
                    boxShadow: `0 10px 22px ${accent}33`,
                  }}
                >
                  {unread}
                </div>
              </div>

              <div
                style={{
                  position: 'absolute',
                  top: 126,
                  left: 17,
                  right: 17,
                  display: 'grid',
                  gap: 10,
                }}
              >
                {rows.map(([source, text], i) => (
                  <div
                    key={source + i}
                    style={{
                      height: 64,
                      padding: '0 13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      borderRadius: 19,
                      background:
                        i === 0 ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.62)',
                      border: '1px solid rgba(16,18,17,0.07)',
                      boxShadow: i === 0 ? '0 12px 24px rgba(24,30,27,0.08)' : 'none',
                    }}
                  >
                    <div
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 10,
                        background:
                          i === 0
                            ? '#1FA855'
                            : i === 1
                              ? '#C44A75'
                              : i === 2
                                ? '#65717B'
                                : accent,
                        opacity: 0.94,
                      }}
                    />
                    <div style={{minWidth: 0}}>
                      <div
                        style={{
                          fontSize: 9,
                          textTransform: 'uppercase',
                          color: '#858C88',
                          letterSpacing: 0.9,
                          fontWeight: 850,
                        }}
                      >
                        {source}
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          color: '#1B1F1D',
                          fontWeight: 760,
                          marginTop: 4,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {text}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div
                style={{
                  position: 'absolute',
                  left: 18,
                  right: 18,
                  bottom: 17,
                  height: 44,
                  borderRadius: 18,
                  background:
                    'linear-gradient(180deg, rgba(255,255,255,0.76), rgba(244,245,243,0.82))',
                  border: '1px solid rgba(255,255,255,0.78)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  color: '#737B77',
                  fontWeight: 800,
                }}
              >
                7 señales nuevas
              </div>
            </div>
          </div>
        </div>

        {notifications.map((item) => (
          <GlassNotification key={item.seed} {...item} />
        ))}
      </div>

      <div
        style={{
          position: 'absolute',
          right: 72,
          top: 184,
          width: 530,
          opacity: copyOpacity,
          transform: `translateY(${interpolate(copyOpacity, [0, 1], [14, 0])}px)`,
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 900,
            letterSpacing: 2.2,
            color: accent,
            marginBottom: 18,
          }}
        >
          OPORTUNIDADES ENTRANTES
        </div>
        <div
          style={{
            fontSize: 64,
            lineHeight: 0.97,
            fontWeight: 800,
            letterSpacing: -2.25,
            maxWidth: 530,
            fontFamily: roundedHeadlineFamily,
            WebkitFontSmoothing: 'antialiased',
          }}
        >
          Cada consulta compite por atención.
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 30,
            lineHeight: 1.18,
            fontWeight: 700,
            color: palette.muted,
            opacity: secondLineOpacity,
            transform: `translateY(${interpolate(secondLineOpacity, [0, 1], [8, 0])}px)`,
            fontFamily: roundedHeadlineFamily,
            WebkitFontSmoothing: 'antialiased',
          }}
        >
          Algunas esperan.
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 70,
          right: 70,
          bottom: 44,
          height: 1,
          background:
            'linear-gradient(90deg, transparent, rgba(16,18,17,0.10) 28%, rgba(16,18,17,0.10) 72%, transparent)',
        }}
      />
    </AbsoluteFill>
  );
};