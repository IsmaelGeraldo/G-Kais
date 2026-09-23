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
const WORLD_WIDTH = 2360;
const ENGINE_X = 1540;
const ENGINE_Y = 178;
const ENGINE_CENTER_X = ENGINE_X + 165;
const ENGINE_CENTER_Y = ENGINE_Y + 173;

type Seed = {
  label: string;
  x: number;
  y: number;
  width: number;
  hue: string;
  delay: number;
};

const seeds: Seed[] = [
  {label: 'IG', x: 350, y: 116, width: 176, hue: '#C9487F', delay: 0},
  {label: 'WA', x: 300, y: 468, width: 188, hue: '#26A866', delay: 4},
  {label: '@', x: 405, y: 220, width: 165, hue: '#66747D', delay: 8},
  {label: 'F', x: 362, y: 366, width: 174, hue: accent, delay: 12},
  {label: 'IG', x: 48, y: 270, width: 170, hue: '#C9487F', delay: 16},
  {label: 'WA', x: 84, y: 106, width: 162, hue: '#26A866', delay: 20},
  {label: '@', x: 92, y: 584, width: 174, hue: '#66747D', delay: 24},
];

const cubic = (a: number, b: number, c: number, d: number, t: number) => {
  const u = 1 - t;
  return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d;
};

const SignalFlight: React.FC<{seed: Seed; index: number}> = ({seed, index}) => {
  const frame = useCurrentFrame();
  const launchStart = 132 + seed.delay;
  const launchEnd = 194 + Math.round(seed.delay * 0.55);
  const progress = interpolate(frame, [launchStart, launchEnd], [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });

  const startX = seed.x + seed.width / 2;
  const startY = seed.y + 26;
  const targetX = ENGINE_CENTER_X + (index - 3) * 5;
  const targetY = ENGINE_Y + 16;
  const c1x = startX + 220 + index * 16;
  const c1y = Math.max(58, startY - 80 - index * 5);
  const c2x = 1280 + index * 24;
  const c2y = 58 + index * 11;

  const x = cubic(startX, c1x, c2x, targetX, progress);
  const y = cubic(startY, c1y, c2y, targetY, progress);
  const opacity = interpolate(
    frame,
    [launchStart - 5, launchStart + 3, launchEnd - 3, launchEnd + 5],
    [0, 1, 1, 0],
    clamp,
  );
  const pathOpacity = interpolate(
    frame,
    [launchStart - 5, launchStart + 8, launchEnd - 6, launchEnd + 6],
    [0, 0.28, 0.22, 0],
    clamp,
  );
  const path = `M ${startX} ${startY} C ${c1x} ${c1y} ${c2x} ${c2y} ${targetX} ${targetY}`;
  const dash = interpolate(progress, [0, 1], [520, 0]);
  const scale = interpolate(progress, [0, 0.7, 1], [0.82, 1.08, 0.92], clamp);

  return (
    <>
      <svg
        width={WORLD_WIDTH}
        height="720"
        viewBox={`0 0 ${WORLD_WIDTH} 720`}
        style={{position: 'absolute', inset: 0, opacity: pathOpacity, pointerEvents: 'none'}}
      >
        <path
          d={path}
          fill="none"
          stroke={seed.hue}
          strokeWidth={1.1}
          strokeLinecap="round"
          strokeDasharray="36 22"
          strokeDashoffset={dash}
          opacity={0.58}
        />
        <path
          d={path}
          fill="none"
          stroke="rgba(255,255,255,0.78)"
          strokeWidth={0.55}
          strokeLinecap="round"
          strokeDasharray="10 62"
          strokeDashoffset={dash * 1.22}
          opacity={0.66}
        />
      </svg>

      <div
        style={{
          position: 'absolute',
          left: x,
          top: y,
          width: 14,
          height: 14,
          marginLeft: -7,
          marginTop: -7,
          borderRadius: '50%',
          background: `radial-gradient(circle at 35% 30%, #fff 0%, ${seed.hue} 46%, ${accent} 100%)`,
          boxShadow: `0 0 16px ${seed.hue}88, 0 0 30px rgba(10,63,77,0.20)`,
          opacity,
          transform: `scale(${scale}) translateZ(0)`,
          zIndex: 14,
        }}
      />
    </>
  );
};

const OrbitingSignal: React.FC<{seed: Seed; index: number}> = ({seed, index}) => {
  const frame = useCurrentFrame();
  const arrival = 194 + Math.round(seed.delay * 0.55);
  const age = Math.max(0, frame - arrival);
  const visible = frame >= arrival;
  if (!visible) return null;

  const acceleration = interpolate(age, [0, 58], [0, 1], {
    ...clamp,
    easing: Easing.in(Easing.cubic),
  });
  const angleDeg = -90 + age * (1.25 + acceleration * 4.7) + age * age * 0.032;
  const angle = (angleDeg * Math.PI) / 180;
  const radius = interpolate(acceleration, [0, 1], [142 - index * 2, 108 + (index % 3) * 4], clamp);
  const x = ENGINE_CENTER_X + Math.cos(angle) * radius;
  const y = ENGINE_CENTER_Y + Math.sin(angle) * radius;
  const fade = interpolate(age, [0, 66, 84], [1, 1, 0], clamp);
  const size = interpolate(acceleration, [0, 1], [11, 8], clamp);

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: size,
        height: size,
        marginLeft: -size / 2,
        marginTop: -size / 2,
        borderRadius: '50%',
        background: seed.hue,
        boxShadow: `0 0 ${12 + acceleration * 18}px ${seed.hue}AA, 0 0 ${24 + acceleration * 28}px rgba(10,63,77,0.24)`,
        opacity: fade,
        zIndex: 18,
      }}
    />
  );
};

const EngineRing: React.FC<{
  size: number;
  speed: number;
  opacity: number;
  activation: number;
  dashed?: boolean;
}> = ({size, speed, opacity, activation, dashed = false}) => {
  const frame = useCurrentFrame();
  const angle = frame * speed * (1 + activation * 2.9);

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
  const activation = interpolate(frame, [216, 286], [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });
  const reveal = interpolate(frame, [156, 214], [0.86, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  const impact = interpolate(frame, [214, 228, 248, 274], [0, 1, 0.58, 0.18], clamp);
  const pulse = Math.sin((frame - 224) / 4.6) * 0.5 + 0.5;
  const corePulse = 1 + activation * 0.026 + activation * pulse * 0.021;

  return (
    <div
      style={{
        position: 'absolute',
        left: ENGINE_X,
        top: ENGINE_Y,
        width: 330,
        height: 360,
        transform: `scale(${reveal})`,
        transformOrigin: 'center center',
        zIndex: 10,
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
      <EngineRing size={238} speed={0.23} opacity={0.46 + activation * 0.30} activation={activation} dashed />
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
  const cameraProgress = interpolate(frame, [118, 222], [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });
  const cameraX = interpolate(cameraProgress, [0, 1], [0, -950]);
  const cameraScale = interpolate(cameraProgress, [0, 0.45, 1], [1, 1.018, 1.032], clamp);
  const cameraY = interpolate(cameraProgress, [0, 1], [0, -5]);
  const scene01Opacity = interpolate(frame, [150, 218], [1, 0.12], clamp);
  const scene01Blur = interpolate(frame, [158, 218], [0, 1.7], clamp);

  return (
    <AbsoluteFill
      style={{
        overflow: 'hidden',
        background:
          'radial-gradient(circle at 72% 44%, rgba(255,255,255,0.88), transparent 30%), linear-gradient(135deg, #CFD0CD 0%, #E8E9E5 50%, #C8CBC8 100%)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: WORLD_WIDTH,
          height: 720,
          transform: `translate3d(${cameraX}px, ${cameraY}px, 0) scale(${cameraScale})`,
          transformOrigin: '640px 360px',
          willChange: 'transform',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at 30% 38%, rgba(255,255,255,0.54), transparent 24%), radial-gradient(circle at 78% 46%, rgba(10,63,77,0.055), transparent 28%), linear-gradient(135deg, #CFD0CD 0%, #E8E9E5 54%, #C8CBC8 100%)',
          }}
        />

        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: 1280,
            height: 720,
            opacity: scene01Opacity,
            filter: `blur(${scene01Blur}px)`,
          }}
        >
          <Scene01Cinematic />
        </div>

        <div
          style={{
            position: 'absolute',
            left: 1030,
            top: 0,
            width: 520,
            height: 720,
            background:
              'linear-gradient(90deg, rgba(226,228,224,0) 0%, rgba(226,228,224,0.42) 38%, rgba(226,228,224,0.82) 74%, rgba(226,228,224,0) 100%)',
            filter: 'blur(18px)',
            opacity: interpolate(frame, [128, 174, 220], [0, 0.54, 0.18], clamp),
            pointerEvents: 'none',
            zIndex: 4,
          }}
        />

        <div
          style={{
            position: 'absolute',
            left: 1370,
            top: 70,
            width: 670,
            height: 570,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.58), rgba(10,63,77,0.035) 42%, transparent 70%)',
            filter: 'blur(18px)',
            zIndex: 2,
          }}
        />

        {seeds.map((seed, index) => (
          <SignalFlight key={`flight-${index}`} seed={seed} index={index} />
        ))}

        <GKAISSystemCore />

        {seeds.map((seed, index) => (
          <OrbitingSignal key={`orbit-${index}`} seed={seed} index={index} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

export const Scene01ToEngineFlow: React.FC = () => <FlowScene />;
