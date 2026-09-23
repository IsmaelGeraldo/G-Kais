import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';
import {Scene01ToIntelligenceFlow} from './Scene01ToIntelligenceFlow';

const clamp = {
  extrapolateLeft: 'clamp' as const,
  extrapolateRight: 'clamp' as const,
};

const WORLD_WIDTH = 3600;
const ENGINE_X = 1490;
const ENGINE_Y = 178;
const ENGINE_CENTER_X = ENGINE_X + 165;
const ENGINE_CENTER_Y = ENGINE_Y + 173;
const accent = '#0A3F4D';

type SignalSeed = {
  x: number;
  y: number;
  width: number;
  hue: string;
  delay: number;
};

const signalSeeds: SignalSeed[] = [
  {x: 350, y: 116, width: 176, hue: '#C9487F', delay: 0},
  {x: 300, y: 468, width: 188, hue: '#26A866', delay: 4},
  {x: 405, y: 220, width: 165, hue: '#66747D', delay: 8},
  {x: 362, y: 366, width: 174, hue: accent, delay: 12},
  {x: 48, y: 270, width: 170, hue: '#C9487F', delay: 16},
  {x: 84, y: 106, width: 162, hue: '#26A866', delay: 20},
  {x: 92, y: 584, width: 174, hue: '#66747D', delay: 24},
];

const cubic = (a: number, b: number, c: number, d: number, t: number) => {
  const u = 1 - t;
  return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d;
};

const engineShiftAt = (frame: number) =>
  interpolate(frame, [258, 342], [0, -185], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });

const UnifiedSignal: React.FC<{seed: SignalSeed; index: number}> = ({seed, index}) => {
  const frame = useCurrentFrame();
  const launchStart = 132 + seed.delay;
  const arrival = 194 + Math.round(seed.delay * 0.55);
  const flightProgress = interpolate(frame, [launchStart, arrival], [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });

  const startX = seed.x + seed.width / 2;
  const startY = seed.y + 26;
  const initialRadius = 142 - index * 2;
  const orbitStartX = ENGINE_CENTER_X;
  const orbitStartY = ENGINE_CENTER_Y - initialRadius;

  const c1x = startX + 220 + index * 16;
  const c1y = Math.max(58, startY - 80 - index * 5);
  // Approach the top of the motor horizontally so the Bézier tangent
  // already matches the clockwise orbital direction.
  const c2x = orbitStartX - 180 + index * 8;
  const c2y = orbitStartY;

  const path = `M ${startX} ${startY} C ${c1x} ${c1y} ${c2x} ${c2y} ${orbitStartX} ${orbitStartY}`;
  const dash = interpolate(flightProgress, [0, 1], [520, 0]);
  const pathOpacity = interpolate(
    frame,
    [launchStart - 5, launchStart + 8, arrival - 6, arrival + 5],
    [0, 0.26, 0.2, 0],
    clamp,
  );

  let x = cubic(startX, c1x, c2x, orbitStartX, flightProgress);
  let y = cubic(startY, c1y, c2y, orbitStartY, flightProgress);
  let opacity = interpolate(frame, [launchStart - 5, launchStart + 3], [0, 1], clamp);
  let size = interpolate(flightProgress, [0, 0.7, 1], [11.5, 14, 11], clamp);
  let glow = 16;

  if (frame > arrival) {
    const age = frame - arrival;
    const acceleration = interpolate(age, [0, 58], [0, 1], {
      ...clamp,
      easing: Easing.in(Easing.cubic),
    });
    const angleDeg = -90 + age * (1.25 + acceleration * 4.7) + age * age * 0.032;
    const angle = (angleDeg * Math.PI) / 180;
    const radius = interpolate(
      acceleration,
      [0, 1],
      [initialRadius, 108 + (index % 3) * 4],
      clamp,
    );
    const shift = engineShiftAt(frame);

    x = ENGINE_CENTER_X + shift + Math.cos(angle) * radius;
    y = ENGINE_CENTER_Y + Math.sin(angle) * radius;
    opacity = interpolate(age, [0, 78, 98], [1, 1, 0], clamp);
    size = interpolate(acceleration, [0, 1], [11, 8], clamp);
    glow = 12 + acceleration * 18;
  }

  if (frame < launchStart - 5 || opacity <= 0) return null;

  return (
    <>
      {frame <= arrival + 5 ? (
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
      ) : null}
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
          background: `radial-gradient(circle at 35% 30%, #fff 0%, ${seed.hue} 46%, ${accent} 100%)`,
          boxShadow: `0 0 ${glow}px ${seed.hue}AA, 0 0 ${glow + 16}px rgba(10,63,77,0.22)`,
          opacity,
          transform: 'translateZ(0)',
        }}
      />
    </>
  );
};

const SignalContinuityLayer: React.FC = () => {
  const frame = useCurrentFrame();
  const firstCamera = interpolate(frame, [118, 222], [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });
  const secondCamera = interpolate(frame, [232, 350], [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });
  const galleryCamera = interpolate(frame, [344, 466], [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });
  const cameraX =
    interpolate(firstCamera, [0, 1], [0, -930]) +
    interpolate(secondCamera, [0, 1], [0, -110]) +
    interpolate(galleryCamera, [0, 1], [0, -510]);
  const cameraScale = interpolate(frame, [118, 222, 344, 466], [1, 1.032, 1.032, 0.82], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });
  const cameraY = interpolate(frame, [118, 222, 344, 466], [0, -5, -5, 2], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: WORLD_WIDTH,
        height: 720,
        transform: `translate3d(${cameraX}px, ${cameraY}px, 0) scale(${cameraScale})`,
        transformOrigin: '640px 360px',
        pointerEvents: 'none',
        zIndex: 16,
      }}
    >
      {signalSeeds.map((seed, index) => (
        <UnifiedSignal key={index} seed={seed} index={index} />
      ))}
    </div>
  );
};

export const Scene01ToIntelligencePolish: React.FC = () => {
  const frame = useCurrentFrame();
  const columnShift = Math.round(
    interpolate(frame, [382, 466], [0, 80], {
      ...clamp,
      easing: Easing.inOut(Easing.cubic),
    }),
  );

  const x0 = 1760 + columnShift;
  const x1 = 2220 + columnShift;
  const x2 = 2680 + columnShift;

  return (
    <AbsoluteFill>
      <style>{`
        div[style*="z-index: 24"] ,
        div[style*="z-index: 26"] ,
        div[style*="z-index: 28"] ,
        div[style*="z-index: 24"] *,
        div[style*="z-index: 26"] *,
        div[style*="z-index: 28"] * {
          font-family: Arial, Helvetica, sans-serif !important;
        }

        div[style*="z-index: 24"] { left: ${x0}px !important; }
        div[style*="z-index: 26"] { left: ${x1}px !important; }
        div[style*="z-index: 28"] { left: ${x2}px !important; }

        /* Hide the old two-stage signal dots and old incoming paths.
           The continuity layer below replaces them with one persistent node. */
        div[style*="z-index: 14"][style*="border-radius: 50%"],
        div[style*="z-index: 18"][style*="border-radius: 50%"] {
          opacity: 0 !important;
        }
        svg[style*="pointer-events: none"]:not([style*="z-index"]) {
          opacity: 0 !important;
        }
      `}</style>
      <Scene01ToIntelligenceFlow />
      <SignalContinuityLayer />
    </AbsoluteFill>
  );
};
