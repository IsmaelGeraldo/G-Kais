import React from 'react';
import {loadFont} from '@remotion/google-fonts/MPLUSRounded1c';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';
import {Scene01Cinematic} from './Scene01Cinematic';

const {fontFamily: roundedFamily} = loadFont('normal', {
  weights: ['700', '800', '900'],
  subsets: ['latin'],
});

const clamp = {
  extrapolateLeft: 'clamp' as const,
  extrapolateRight: 'clamp' as const,
};

const accent = '#0A3F4D';
const ink = '#111412';
const muted = '#737B77';

type SignalRow = {
  label: string;
  value: string;
  start: number;
  sourceX: number;
  sourceY: number;
  width: number;
};

const rows: SignalRow[] = [
  {
    label: 'CANAL',
    value: 'WhatsApp',
    start: 160,
    sourceX: 1090,
    sourceY: 118,
    width: 170,
  },
  {
    label: 'CONTACTO',
    value: 'Valentina R.',
    start: 173,
    sourceX: 1040,
    sourceY: 550,
    width: 188,
  },
  {
    label: 'CONTEXTO',
    value: 'Clínica estética',
    start: 185,
    sourceX: 1130,
    sourceY: 220,
    width: 202,
  },
  {
    label: 'INTENCIÓN',
    value: 'Quiero reservar una evaluación',
    start: 197,
    sourceX: 1010,
    sourceY: 445,
    width: 282,
  },
  {
    label: 'FRESCURA',
    value: 'Ahora',
    start: 209,
    sourceX: 1160,
    sourceY: 334,
    width: 154,
  },
];

const SourceChip: React.FC<SignalRow & {index: number}> = ({
  label,
  value,
  start,
  sourceX,
  sourceY,
  width,
  index,
}) => {
  const frame = useCurrentFrame();
  const enter = interpolate(frame, [start - 24, start - 8], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  const settle = interpolate(frame, [start, start + 22], [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });
  const opacity = interpolate(frame, [start + 12, start + 24], [1, 0], clamp);

  const targetX = 475;
  const targetY = 210 + index * 66;
  const x = interpolate(settle, [0, 1], [sourceX, targetX]);
  const y = interpolate(settle, [0, 1], [sourceY, targetY]);
  const scale = interpolate(settle, [0, 1], [1, 0.92]);

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width,
        height: 54,
        borderRadius: 17,
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        padding: '0 15px',
        opacity: enter * opacity,
        transform: `translateZ(0) scale(${scale})`,
        background:
          'linear-gradient(180deg, rgba(255,255,255,0.91), rgba(246,247,245,0.73))',
        border: '1px solid rgba(255,255,255,0.92)',
        boxShadow:
          'inset 0 1px 0 rgba(255,255,255,0.92), 0 18px 42px rgba(20,26,23,0.11)',
        backdropFilter: 'blur(18px)',
      }}
    >
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: accent,
          boxShadow: '0 0 0 5px rgba(10,63,77,0.08)',
          flex: '0 0 auto',
        }}
      />
      <div style={{minWidth: 0}}>
        <div
          style={{
            fontSize: 9,
            letterSpacing: 1.15,
            fontWeight: 900,
            color: '#7B837F',
          }}
        >
          {label}
        </div>
        <div
          style={{
            marginTop: 3,
            fontSize: 13,
            fontWeight: 800,
            color: ink,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
};

const SignalField: React.FC<{
  row: SignalRow;
  index: number;
}> = ({row, index}) => {
  const frame = useCurrentFrame();
  const appear = interpolate(frame, [row.start + 10, row.start + 28], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });

  return (
    <div
      style={{
        height: 58,
        padding: '0 16px',
        borderRadius: 17,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 18,
        background:
          index === 3
            ? 'linear-gradient(180deg, rgba(249,252,251,0.96), rgba(239,245,243,0.82))'
            : 'rgba(255,255,255,0.61)',
        border:
          index === 3
            ? '1px solid rgba(10,63,77,0.16)'
            : '1px solid rgba(17,20,18,0.065)',
        opacity: appear,
        transform: `translateX(${interpolate(appear, [0, 1], [16, 0])}px)`,
        boxShadow: index === 3 ? '0 12px 30px rgba(18,31,27,0.06)' : 'none',
      }}
    >
      <div
        style={{
          fontSize: 10,
          letterSpacing: 1.25,
          fontWeight: 900,
          color: '#7A827E',
          flex: '0 0 auto',
        }}
      >
        {row.label}
      </div>
      <div
        style={{
          minWidth: 0,
          textAlign: 'right',
          fontSize: index === 3 ? 15 : 14,
          fontWeight: index === 3 ? 800 : 760,
          color: index === 3 ? accent : ink,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {row.value}
      </div>
    </div>
  );
};

const InputSignalScene: React.FC = () => {
  const frame = useCurrentFrame();

  const panelEnter = interpolate(frame, [118, 188], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  const panelX = interpolate(panelEnter, [0, 1], [560, 0]);
  const panelScale = interpolate(panelEnter, [0, 1], [0.94, 1]);
  const panelBlur = interpolate(panelEnter, [0, 1], [7, 0]);
  const titleOpacity = interpolate(frame, [166, 190], [0, 1], clamp);
  const complete = interpolate(frame, [224, 238], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  const pulse = 0.5 + Math.sin(frame / 4.2) * 0.5;

  const signalTravel = interpolate(frame, [236, 254], [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });
  const signalX = interpolate(signalTravel, [0, 1], [898, 1290]);
  const signalOpacity = interpolate(frame, [234, 239, 252, 254], [0, 1, 1, 0], clamp);

  return (
    <AbsoluteFill
      style={{
        overflow: 'hidden',
        background:
          'radial-gradient(circle at 82% 32%, rgba(255,255,255,0.90), transparent 28%), radial-gradient(circle at 16% 66%, rgba(255,255,255,0.50), transparent 35%), linear-gradient(135deg, #CFD0CD 0%, #E8E9E5 52%, #C8CBC8 100%)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 26,
          borderRadius: 38,
          border: '1px solid rgba(255,255,255,0.62)',
          background: 'rgba(242,243,240,0.34)',
          boxShadow:
            'inset 0 0 0 1px rgba(0,0,0,0.035), 0 24px 74px rgba(29,35,32,0.11)',
          backdropFilter: 'blur(15px)',
        }}
      />

      <div
        style={{
          position: 'absolute',
          left: -110,
          top: 140,
          width: 610,
          height: 430,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(255,255,255,0.64), rgba(255,255,255,0.12) 48%, transparent 72%)',
          filter: 'blur(12px)',
        }}
      />

      <div
        style={{
          position: 'absolute',
          left: 92,
          top: 134,
          width: 330,
          opacity: titleOpacity,
          transform: `translateX(${interpolate(titleOpacity, [0, 1], [26, 0])}px)`,
        }}
      >
        <div
          style={{
            fontSize: 12,
            letterSpacing: 2.15,
            fontWeight: 900,
            color: accent,
            marginBottom: 17,
          }}
        >
          SEÑAL ENTRANTE
        </div>
        <div
          style={{
            fontFamily: roundedFamily,
            fontSize: 46,
            lineHeight: 1.01,
            letterSpacing: -1.8,
            fontWeight: 800,
            color: ink,
          }}
        >
          De mensajes sueltos a una oportunidad con contexto.
        </div>
        <div
          style={{
            marginTop: 21,
            width: 275,
            fontSize: 15,
            lineHeight: 1.55,
            fontWeight: 650,
            color: muted,
          }}
        >
          G-KAIS consolida lo importante antes de decidir qué debe pasar después.
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 446 + panelX,
          top: 88,
          width: 474,
          height: 552,
          borderRadius: 34,
          opacity: panelEnter,
          filter: `blur(${panelBlur}px)`,
          transform: `perspective(1200px) rotateY(-3deg) scale(${panelScale})`,
          transformOrigin: 'center center',
          background:
            'linear-gradient(160deg, rgba(255,255,255,0.88), rgba(236,239,236,0.66))',
          border: '1px solid rgba(255,255,255,0.88)',
          boxShadow:
            'inset 0 1px 0 rgba(255,255,255,0.95), 0 46px 95px rgba(18,24,21,0.18)',
          backdropFilter: 'blur(24px)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 1,
            borderRadius: 33,
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.23), transparent 34%)',
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            position: 'absolute',
            left: 25,
            right: 25,
            top: 23,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10,
                letterSpacing: 1.55,
                fontWeight: 900,
                color: '#7A827E',
              }}
            >
              INPUT SIGNAL
            </div>
            <div
              style={{
                marginTop: 6,
                fontFamily: roundedFamily,
                fontSize: 25,
                fontWeight: 800,
                color: ink,
                letterSpacing: -0.6,
              }}
            >
              Nueva oportunidad
            </div>
          </div>

          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 17,
              display: 'grid',
              placeItems: 'center',
              background: complete > 0.15 ? accent : 'rgba(16,20,18,0.07)',
              color: complete > 0.15 ? '#fff' : '#6F7773',
              fontSize: 17,
              fontWeight: 900,
              boxShadow:
                complete > 0.15
                  ? `0 0 0 ${5 + pulse * 4}px rgba(10,63,77,${0.04 + pulse * 0.025}), 0 12px 28px rgba(10,63,77,0.18)`
                  : 'none',
            }}
          >
            {complete > 0.65 ? '✓' : '···'}
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            left: 25,
            right: 25,
            top: 102,
            height: 1,
            background:
              'linear-gradient(90deg, rgba(17,20,18,0.08), rgba(17,20,18,0.03), transparent)',
          }}
        />

        <div
          style={{
            position: 'absolute',
            left: 25,
            right: 25,
            top: 126,
            display: 'grid',
            gap: 8,
          }}
        >
          {rows.map((row, index) => (
            <SignalField key={row.label} row={row} index={index} />
          ))}
        </div>

        <div
          style={{
            position: 'absolute',
            left: 25,
            right: 25,
            bottom: 25,
            height: 68,
            borderRadius: 21,
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            gap: 13,
            background: `rgba(10,63,77,${0.035 + complete * 0.05})`,
            border: `1px solid rgba(10,63,77,${0.08 + complete * 0.13})`,
            opacity: interpolate(frame, [216, 236], [0, 1], clamp),
          }}
        >
          <div
            style={{
              position: 'relative',
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: accent,
              boxShadow: `0 0 0 ${5 + pulse * 5}px rgba(10,63,77,${0.055 + pulse * 0.025})`,
              flex: '0 0 auto',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 10,
                borderRadius: '50%',
                background: '#fff',
              }}
            />
          </div>
          <div>
            <div
              style={{
                fontSize: 9,
                fontWeight: 900,
                letterSpacing: 1.25,
                color: accent,
              }}
            >
              OPORTUNIDAD ESTRUCTURADA
            </div>
            <div
              style={{
                marginTop: 4,
                fontSize: 13,
                fontWeight: 760,
                color: ink,
              }}
            >
              Contexto listo para el Motor G-KAIS
            </div>
          </div>
        </div>
      </div>

      {rows.map((row, index) => (
        <SourceChip key={row.label} {...row} index={index} />
      ))}

      <div
        style={{
          position: 'absolute',
          left: 892,
          top: 554,
          width: 410,
          height: 2,
          opacity: interpolate(frame, [228, 240], [0, 1], clamp),
          background:
            'linear-gradient(90deg, rgba(10,63,77,0.26), rgba(10,63,77,0.08), transparent)',
          transform: 'rotate(-9deg)',
          transformOrigin: 'left center',
        }}
      />

      <div
        style={{
          position: 'absolute',
          left: signalX,
          top: interpolate(signalTravel, [0, 1], [552, 490]),
          width: 18,
          height: 18,
          borderRadius: '50%',
          opacity: signalOpacity,
          background: '#0E596B',
          boxShadow:
            '0 0 0 7px rgba(14,89,107,0.09), 0 0 28px rgba(14,89,107,0.32)',
        }}
      />

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

export const Scene01To03Cinematic: React.FC = () => {
  const frame = useCurrentFrame();

  const exit = interpolate(frame, [108, 188], [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });
  const scene01X = interpolate(exit, [0, 1], [0, -610]);
  const scene01Scale = interpolate(exit, [0, 1], [1, 0.945]);
  const scene01Blur = interpolate(exit, [0, 1], [0, 8]);
  const scene01Opacity = interpolate(frame, [142, 188], [1, 0], clamp);
  const inputOpacity = interpolate(frame, [112, 148], [0, 1], clamp);

  return (
    <AbsoluteFill style={{overflow: 'hidden', background: '#D9DAD6'}}>
      <InputSignalScene />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: scene01Opacity,
          filter: `blur(${scene01Blur}px)`,
          transform: `translateX(${scene01X}px) scale(${scene01Scale})`,
          transformOrigin: 'center center',
          zIndex: 2,
        }}
      >
        <Scene01Cinematic accent={accent} />
      </div>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: inputOpacity,
          pointerEvents: 'none',
          boxShadow: 'inset 0 0 120px rgba(255,255,255,0.04)',
          zIndex: 3,
        }}
      />
    </AbsoluteFill>
  );
};
