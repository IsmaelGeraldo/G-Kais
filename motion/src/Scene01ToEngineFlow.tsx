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

type Seed = {
  label: string;
  x: number;
  y: number;
  width: number;
  hue: string;
  delay: number;
  controlY: number;
};

const seeds: Seed[] = [
  {label: 'IG', x: 350, y: 116, width: 176, hue: '#C9487F', delay: 0, controlY: 194},
  {label: 'WA', x: 300, y: 468, width: 188, hue: '#26A866', delay: 4, controlY: 524},
  {label: '@', x: 405, y: 220, width: 165, hue: '#66747D', delay: 8, controlY: 252},
  {label: 'F', x: 362, y: 366, width: 174, hue: accent, delay: 12, controlY: 400},
  {label: 'IG', x: 48, y: 270, width: 170, hue: '#C9487F', delay: 16, controlY: 316},
  {label: 'WA', x: 84, y: 106, width: 162, hue: '#26A866', delay: 20, controlY: 160},
  {label: '@', x: 92, y: 584, width: 174, hue: '#66747D', delay: 24, controlY: 548},
];

const bezier = (a: number, b: number, c: number, t: number) => {
  const u = 1 - t;
  return u * u * a + 2 * u * t * b + t * t * c;
};

const NotificationToSignal: React.FC<{seed: Seed; index: number}> = ({seed, index}) => {
  const frame = useCurrentFrame();
  const morphStart = 124 + seed.delay;
  const travelStart = 142 + seed.delay;
  const travelEnd = 210 + Math.round(seed.delay * 0.45);

  const morph = interpolate(frame, [morphStart, morphStart + 24], [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });
  const travel = interpolate(frame, [travelStart, travelEnd], [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });
  const vanish = interpolate(frame, [travelEnd - 3, travelEnd + 9], [1, 0], clamp);

  const targetX = 911;
  const targetY = 360;
  const controlX = 585 + index * 18;
  const x = bezier(seed.x, controlX, targetX, travel);
  const y = bezier(seed.y, seed.controlY, targetY, travel);

  const width = interpolate(morph, [0, 1], [seed.width, 16]);
  const height = interpolate(morph, [0, 1], [52, 16]);
  const labelOpacity = interpolate(morph, [0, 0.55, 1], [1, 0.35, 0], clamp);
  const glow = interpolate(morph, [0, 1], [0.08, 0.42]);

  const pathOpacity = interpolate(frame, [travelStart - 6, travelStart + 8, travelEnd, travelEnd + 10], [0, 0.48, 0.34, 0], clamp);
  const path = `M ${seed.x + seed.width / 2} ${seed.y + 26} Q ${controlX} ${seed.controlY} ${targetX} ${targetY}`;
  const dash = interpolate(travel, [0, 1], [430, 0]);

  return (
    <>
      <svg
        width="1280"
        height="720"
        viewBox="0 0 1280 720"
        style={{position: 'absolute', inset: 0, opacity: pathOpacity, pointerEvents: 'none'}}
      >
        <path
          d={path}
          fill="none"
          stroke={seed.hue}
          strokeWidth={1.3}
          strokeLinecap="round"
          strokeDasharray="46 24"
          strokeDashoffset={dash}
          opacity={0.72}
        />
        <path
          d={path}
          fill="none"
          stroke="rgba(255,255,255,0.8)"
          strokeWidth={0.65}
          strokeLinecap="round"
          strokeDasharray="16 58"
          strokeDashoffset={dash * 1.15}
          opacity={0.7}
        />
      </svg>

      <div
        style={{
          position: 'absolute',
          left: x,
          top: y,
          width,
          height,
          transform: `translate(-50%, -50%) scale(${interpolate(travel, [0, 1], [1, 0.82])})`,
          borderRadius: interpolate(morph, [0, 1], [18, 99]),
          background:
            morph < 0.66
              ? 'linear-gradient(180deg, rgba(255,255,255,0.94), rgba(244,246,244,0.76))'
              : `radial-gradient(circle at 35% 28%, rgba(255,255,255,0.98), ${seed.hue} 54%, ${accent} 100%)`,
          border: `1px solid rgba(255,255,255,${0.88 - morph * 0.15})`,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.9), 0 12px 30px rgba(18,24,21,0.12), 0 0 ${14 + morph * 24}px rgba(10,63,77,${glow})`,
          display: 'grid',
          placeItems: 'center',
          overflow: 'hidden',
          opacity: vanish,
          zIndex: 12,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            width: '100%',
            padding: '0 13px',
            opacity: labelOpacity,
            whiteSpace: 'nowrap',
          }}
        >
          <div
            style={{
              width: 29,
              height: 29,
              borderRadius: 10,
              background: seed.hue,
              display: 'grid',
              placeItems: 'center',
              color: '#fff',
              fontSize: 10,
              fontWeight: 900,
              flex: '0 0 auto',
            }}
          >
            {seed.label}
          </div>
          <div style={{fontSize: 12, fontWeight: 800, color: ink}}>Nueva oportunidad</div>
        </div>
      </div>
    </>
  );
};

const EngineRing: React.FC<{
  size: number;
  speed: number;
  reverse?: boolean;
  opacity: number;
  activation: number;
  dashed?: boolean;
}> = ({size, speed, reverse = false, opacity, activation, dashed = false}) => {
  const frame = useCurrentFrame();
  const direction = reverse ? -1 : 1;
  const angle = direction * frame * speed * (1 + activation * 2.9);

  return (
    <div
      style={{
        position: 'absolute',
        width: size,
        height: size,
        left: '50%',
        top: '50%',
        marginLeft: -size / 2,
        marginTop: -size / 2,
        borderRadius: '50%',
        border: dashed ? '1px dashed rgba(10,63,77,0.42)' : '1px solid rgba(45,55,51,0.20)',
        boxShadow: activation > 0.35 ? `0 0 ${16 + activation * 18}px rgba(10,63,77,${0.08 + activation * 0.10})` : 'none',
        opacity,
        transform: `rotate(${angle}deg)`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: activation > 0.15 ? accent : '#707875',
          top: -4,
          left: '50%',
          marginLeft: -4,
          boxShadow: activation > 0.15 ? `0 0 ${12 + activation * 12}px rgba(10,63,77,0.55)` : 'none',
        }}
      />
    </div>
  );
};

const GKAISSystemCore: React.FC = () => {
  const frame = useCurrentFrame();
  const enter = interpolate(frame, [166, 207], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  const activation = interpolate(frame, [202, 276], [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });
  const impact = interpolate(frame, [205, 218, 236, 254], [0, 1, 0.64, 0.28], clamp);
  const pulse = Math.sin((frame - 214) / 4.4) * 0.5 + 0.5;
  const corePulse = 1 + activation * 0.026 + activation * pulse * 0.022;

  return (
    <div
      style={{
        position: 'absolute',
        left: 765 + interpolate(enter, [0, 1], [285, 0]),
        top: 180,
        width: 330,
        height: 360,
        opacity: enter,
        transform: `scale(${interpolate(enter, [0, 1], [0.88, 1])})`,
        transformOrigin: 'center center',
        zIndex: 8,
      }}
    >
      <div
        style={{
          position: 'absolute',
          width: 330,
          height: 330,
          left: 0,
          top: 8,
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(10,63,77,${0.08 + activation * 0.11}) 0%, rgba(10,63,77,0.035) 37%, transparent 72%)`,
          filter: `blur(${14 - activation * 5}px)`,
        }}
      />

      <EngineRing size={286} speed={0.16} opacity={0.56 + activation * 0.26} activation={activation} />
      <EngineRing size={238} speed={0.23} reverse opacity={0.46 + activation * 0.30} activation={activation} dashed />
      <EngineRing size={196} speed={0.34} opacity={0.36 + activation * 0.40} activation={activation} />

      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 164,
          height: 164,
          marginLeft: -82,
          marginTop: -82,
          borderRadius: '50%',
          transform: `scale(${corePulse})`,
          background:
            'radial-gradient(circle at 34% 27%, rgba(255,255,255,0.94), rgba(224,228,225,0.83) 17%, rgba(102,111,107,0.88) 38%, rgba(25,31,28,0.98) 63%, #0B0E0C 100%)',
          border: '1px solid rgba(255,255,255,0.72)',
          boxShadow: `inset 0 2px 2px rgba(255,255,255,0.52), inset 0 -18px 36px rgba(0,0,0,0.26), 0 28px 64px rgba(13,18,16,0.30), 0 0 ${20 + activation * 50}px rgba(10,63,77,${0.05 + activation * 0.22})`,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 11,
            borderRadius: '50%',
            background:
              'repeating-conic-gradient(from 12deg, rgba(255,255,255,0.34) 0deg 2deg, transparent 2deg 17deg)',
            opacity: 0.45 + activation * 0.30,
            transform: `rotate(${frame * (0.18 + activation * 0.42)}deg)`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 34,
            borderRadius: '50%',
            background: `radial-gradient(circle at 42% 34%, rgba(255,255,255,0.95), rgba(10,63,77,${0.16 + activation * 0.46}) 38%, #101613 76%)`,
            boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.17), 0 0 ${14 + activation * 28}px rgba(10,63,77,${0.16 + activation * 0.34})`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            color: '#fff',
            fontFamily: roundedFamily,
            fontWeight: 900,
            letterSpacing: 1.2,
            fontSize: 15,
            textShadow: '0 1px 12px rgba(0,0,0,0.34)',
          }}
        >
          G-KAIS
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 17,
          right: 17,
          top: 14,
          bottom: 14,
          borderRadius: '50%',
          border: `1px solid rgba(10,63,77,${0.06 + impact * 0.26})`,
          transform: `scale(${1 + impact * 0.11})`,
          opacity: impact,
        }}
      />

      <div
        style={{
          position: 'absolute',
          left: 70,
          right: 70,
          bottom: -6,
          textAlign: 'center',
          fontFamily: roundedFamily,
          fontSize: 10,
          letterSpacing: 2.2,
          fontWeight: 900,
          color: '#5F6964',
          opacity: interpolate(frame, [205, 226], [0, 1], clamp),
        }}
      >
        SYSTEM CORE
      </div>
    </div>
  );
};

const FlowScene: React.FC = () => {
  const frame = useCurrentFrame();
  const sceneExit = interpolate(frame, [116, 166], [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });
  const sceneOpacity = interpolate(frame, [128, 168], [1, 0], clamp);
  const blur = interpolate(sceneExit, [0, 1], [0, 8]);
  const travelGlow = interpolate(frame, [142, 194, 226], [0, 0.22, 0.05], clamp);
  const rightGlow = interpolate(frame, [164, 220, 287], [0, 0.18, 0.12], clamp);

  return (
    <AbsoluteFill
      style={{
        overflow: 'hidden',
        background:
          'radial-gradient(circle at 78% 44%, rgba(255,255,255,0.90), transparent 25%), linear-gradient(135deg, #CFD0CD 0%, #E8E9E5 52%, #C8CBC8 100%)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: sceneOpacity,
          filter: `blur(${blur}px)`,
          transform: `translateX(${interpolate(sceneExit, [0, 1], [0, -245])}px) scale(${interpolate(sceneExit, [0, 1], [1, 0.96])})`,
        }}
      >
        <Scene01Cinematic />
      </div>

      <div
        style={{
          position: 'absolute',
          inset: 26,
          borderRadius: 38,
          border: '1px solid rgba(255,255,255,0.56)',
          background: `radial-gradient(circle at 55% 48%, rgba(10,63,77,${travelGlow}), transparent 32%), rgba(242,243,240,0.22)`,
          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.03), 0 22px 72px rgba(28,34,31,0.10)',
          opacity: interpolate(frame, [126, 158], [0, 1], clamp),
        }}
      />

      <div
        style={{
          position: 'absolute',
          width: 520,
          height: 520,
          right: -50,
          top: 92,
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(10,63,77,${rightGlow}), transparent 68%)`,
          filter: 'blur(24px)',
        }}
      />

      {seeds.map((seed, index) => (
        <NotificationToSignal key={`${seed.label}-${index}`} seed={seed} index={index} />
      ))}

      <GKAISSystemCore />

      <div
        style={{
          position: 'absolute',
          left: 74,
          bottom: 46,
          fontFamily: roundedFamily,
          fontSize: 12,
          letterSpacing: 1.8,
          fontWeight: 900,
          color: accent,
          opacity: interpolate(frame, [144, 170, 214, 238], [0, 0.72, 0.72, 0], clamp),
        }}
      >
        SEÑALES EN MOVIMIENTO
      </div>
    </AbsoluteFill>
  );
};

export const Scene01ToEngineFlow: React.FC = () => {
  return <FlowScene />;
};
