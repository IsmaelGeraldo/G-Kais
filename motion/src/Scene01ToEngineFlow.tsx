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

const ENGINE_X = 930;
const ENGINE_Y = 354;
const ENTRY_RADIUS = 164;
const ENTRY_X = ENGINE_X;
const ENTRY_Y = ENGINE_Y - ENTRY_RADIUS;

type SignalSeed = {
  x: number;
  y: number;
  hue: string;
  delay: number;
  controlX: number;
  controlY: number;
};

const signals: SignalSeed[] = [
  {x: 438, y: 142, hue: '#C9487F', delay: 0, controlX: 640, controlY: 74},
  {x: 394, y: 493, hue: '#26A866', delay: 3, controlX: 655, controlY: 355},
  {x: 486, y: 246, hue: '#66747D', delay: 6, controlX: 694, controlY: 132},
  {x: 445, y: 391, hue: accent, delay: 9, controlX: 706, controlY: 268},
  {x: 132, y: 296, hue: '#C9487F', delay: 12, controlX: 520, controlY: 126},
  {x: 168, y: 132, hue: '#26A866', delay: 15, controlX: 555, controlY: 54},
  {x: 178, y: 606, hue: '#66747D', delay: 18, controlX: 548, controlY: 394},
];

const bezier = (a: number, b: number, c: number, t: number) => {
  const u = 1 - t;
  return u * u * a + 2 * u * t * b + t * t * c;
};

const orbitPoint = (angleDeg: number, radius: number) => {
  const radians = (angleDeg * Math.PI) / 180;
  return {
    x: ENGINE_X + Math.cos(radians) * radius,
    y: ENGINE_Y + Math.sin(radians) * radius,
  };
};

const SignalDot: React.FC<{seed: SignalSeed; index: number}> = ({seed, index}) => {
  const frame = useCurrentFrame();
  const appearStart = 148 + seed.delay;
  const travelStart = 154 + seed.delay;
  const travelEnd = 193 + Math.round(seed.delay * 0.48);
  const orbitStart = travelEnd - 1;

  const appear = interpolate(frame, [appearStart, appearStart + 9], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });

  const travel = interpolate(frame, [travelStart, travelEnd], [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });

  const orbitElapsed = Math.max(0, frame - orbitStart);
  const orbitRamp = interpolate(frame, [orbitStart, 278], [0, 1], {
    ...clamp,
    easing: Easing.in(Easing.quad),
  });
  const radius = 164 - orbitRamp * 18 + (index - 3) * 1.7;
  const angle = -90 + orbitElapsed * 2.7 + orbitElapsed * orbitElapsed * 0.11 + index * 4.6;
  const orbital = orbitPoint(angle, radius);

  const travelX = bezier(seed.x, seed.controlX, ENTRY_X, travel);
  const travelY = bezier(seed.y, seed.controlY, ENTRY_Y, travel);

  const x = travel < 1 ? travelX : orbital.x;
  const y = travel < 1 ? travelY : orbital.y;

  const absorb = interpolate(frame, [270, 287], [1, 0], clamp);
  const opacity = appear * absorb;
  const size = interpolate(frame, [appearStart, travelStart + 8, 260, 287], [8, 12, 13, 8], clamp);
  const pathOpacity = interpolate(
    frame,
    [travelStart - 4, travelStart + 6, travelEnd - 2, travelEnd + 8],
    [0, 0.38, 0.24, 0],
    clamp,
  );
  const path = `M ${seed.x} ${seed.y} Q ${seed.controlX} ${seed.controlY} ${ENTRY_X} ${ENTRY_Y}`;
  const dash = interpolate(travel, [0, 1], [350, 0]);

  const trail = [10, 19, 28].map((angleOffset, trailIndex) => {
    const point = orbitPoint(angle - angleOffset, radius + trailIndex * 1.2);
    return {
      ...point,
      opacity: orbitElapsed > 0 ? opacity * (0.34 - trailIndex * 0.085) : 0,
      size: Math.max(3, size - 4 - trailIndex * 1.4),
    };
  });

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
          strokeWidth={1.1}
          strokeLinecap="round"
          strokeDasharray="30 22"
          strokeDashoffset={dash}
          opacity={0.5}
        />
        <path
          d={path}
          fill="none"
          stroke="rgba(255,255,255,0.92)"
          strokeWidth={0.55}
          strokeLinecap="round"
          strokeDasharray="11 54"
          strokeDashoffset={dash * 1.16}
          opacity={0.68}
        />
      </svg>

      {trail.map((dot, trailIndex) => (
        <div
          key={trailIndex}
          style={{
            position: 'absolute',
            left: dot.x,
            top: dot.y,
            width: dot.size,
            height: dot.size,
            borderRadius: '50%',
            transform: 'translate(-50%, -50%)',
            background: seed.hue,
            opacity: dot.opacity,
            filter: 'blur(0.4px)',
            boxShadow: `0 0 12px rgba(10,63,77,${0.14 + orbitRamp * 0.18})`,
            zIndex: 12,
          }}
        />
      ))}

      <div
        style={{
          position: 'absolute',
          left: x,
          top: y,
          width: size,
          height: size,
          borderRadius: '50%',
          transform: 'translate(-50%, -50%)',
          opacity,
          zIndex: 13,
          background: `radial-gradient(circle at 34% 28%, #FFFFFF 0%, ${seed.hue} 42%, ${accent} 100%)`,
          border: '1px solid rgba(255,255,255,0.82)',
          boxShadow: `0 0 ${14 + orbitRamp * 18}px rgba(10,63,77,${0.26 + orbitRamp * 0.28}), inset 0 1px 1px rgba(255,255,255,0.9)`,
        }}
      />
    </>
  );
};

const MechanicalRing: React.FC<{
  size: number;
  thickness: number;
  baseSpeed: number;
  accel: number;
  activation: number;
  opacity: number;
  dashed?: boolean;
}> = ({size, thickness, baseSpeed, accel, activation, opacity, dashed = false}) => {
  const frame = useCurrentFrame();
  const elapsed = Math.max(0, frame - 184);
  const angle = elapsed * baseSpeed + elapsed * elapsed * accel * activation;

  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: size,
        height: size,
        marginLeft: -size / 2,
        marginTop: -size / 2,
        borderRadius: '50%',
        border: `${thickness}px ${dashed ? 'dashed' : 'solid'} rgba(68,77,73,${0.18 + activation * 0.17})`,
        boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.34), inset 0 0 18px rgba(0,0,0,0.07), 0 0 ${10 + activation * 22}px rgba(10,63,77,${activation * 0.12})`,
        opacity,
        transform: `rotate(${angle}deg)`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: activation > 0.12 ? accent : '#737B77',
          top: -thickness / 2 - 4,
          left: '50%',
          marginLeft: -5,
          boxShadow: activation > 0.12 ? `0 0 ${12 + activation * 18}px rgba(10,63,77,0.48)` : 'none',
        }}
      />
    </div>
  );
};

const GKAISSystemCore: React.FC = () => {
  const frame = useCurrentFrame();
  const enter = interpolate(frame, [166, 204], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  const activation = interpolate(frame, [208, 282], [0, 1], {
    ...clamp,
    easing: Easing.in(Easing.cubic),
  });
  const pulse = Math.sin((frame - 218) / 3.7) * 0.5 + 0.5;
  const impact = interpolate(frame, [212, 226, 250, 283], [0, 1, 0.58, 0.2], clamp);
  const coreScale = 1 + activation * 0.035 + activation * pulse * 0.025;
  const shellRotation = Math.max(0, frame - 184) * 0.24 + Math.pow(Math.max(0, frame - 214), 2) * 0.014;

  return (
    <div
      style={{
        position: 'absolute',
        left: 740 + interpolate(enter, [0, 1], [310, 0]),
        top: 154,
        width: 380,
        height: 410,
        opacity: enter,
        transform: `perspective(1200px) rotateX(4deg) scale(${interpolate(enter, [0, 1], [0.9, 1])})`,
        transformOrigin: 'center center',
        transformStyle: 'preserve-3d',
        zIndex: 8,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 42,
          right: 42,
          bottom: 8,
          height: 42,
          borderRadius: '50%',
          background: 'rgba(20,26,23,0.22)',
          filter: 'blur(18px)',
          transform: 'scaleX(1.08)',
          opacity: 0.55,
        }}
      />

      <div
        style={{
          position: 'absolute',
          width: 350,
          height: 350,
          left: 15,
          top: 10,
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(10,63,77,${0.08 + activation * 0.18}) 0%, rgba(10,63,77,0.05) 36%, transparent 72%)`,
          filter: `blur(${18 - activation * 7}px)`,
        }}
      />

      <div
        style={{
          position: 'absolute',
          left: 33,
          top: 29,
          width: 314,
          height: 314,
          borderRadius: '50%',
          background:
            'radial-gradient(circle at 38% 25%, rgba(255,255,255,0.82), rgba(174,181,177,0.74) 12%, rgba(75,83,79,0.94) 42%, rgba(21,27,24,0.99) 74%, #0A0D0B 100%)',
          boxShadow:
            'inset 0 3px 3px rgba(255,255,255,0.44), inset 0 -20px 34px rgba(0,0,0,0.34), 0 30px 58px rgba(12,17,14,0.26)',
          transform: 'translateY(9px)',
        }}
      />

      <div
        style={{
          position: 'absolute',
          left: 26,
          top: 20,
          width: 326,
          height: 326,
          borderRadius: '50%',
          background:
            'conic-gradient(from 8deg, #AEB5B1 0deg, #343B37 32deg, #D8DDDA 66deg, #202622 108deg, #929B96 152deg, #2D3531 206deg, #D5D9D6 254deg, #303733 310deg, #AEB5B1 360deg)',
          boxShadow:
            'inset 0 0 0 1px rgba(255,255,255,0.55), inset 0 -14px 28px rgba(0,0,0,0.22), 0 16px 34px rgba(18,23,20,0.18)',
          transform: `rotate(${shellRotation}deg)`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 18,
            borderRadius: '50%',
            background:
              'radial-gradient(circle at 42% 28%, rgba(245,247,245,0.95), rgba(196,201,198,0.88) 13%, rgba(73,80,76,0.96) 44%, #171C19 72%, #0B0E0C 100%)',
            boxShadow:
              'inset 0 4px 8px rgba(255,255,255,0.28), inset 0 -20px 34px rgba(0,0,0,0.36)',
          }}
        />
      </div>

      <MechanicalRing size={278} thickness={7} baseSpeed={0.48} accel={0.035} activation={activation} opacity={0.62 + activation * 0.26} />
      <MechanicalRing size={232} thickness={5} baseSpeed={0.68} accel={0.052} activation={activation} opacity={0.52 + activation * 0.31} dashed />
      <MechanicalRing size={192} thickness={4} baseSpeed={0.92} accel={0.068} activation={activation} opacity={0.44 + activation * 0.36} />

      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 170,
          height: 170,
          marginLeft: -85,
          marginTop: -85,
          borderRadius: '50%',
          transform: `translateY(3px) scale(${coreScale})`,
          background:
            'radial-gradient(circle at 34% 26%, rgba(255,255,255,0.98), rgba(207,214,210,0.92) 15%, rgba(82,91,86,0.94) 37%, rgba(21,28,24,0.99) 62%, #090C0A 100%)',
          border: '1px solid rgba(255,255,255,0.68)',
          boxShadow: `inset 0 4px 5px rgba(255,255,255,0.42), inset 0 -22px 38px rgba(0,0,0,0.34), 0 22px 46px rgba(10,15,12,0.34), 0 0 ${18 + activation * 58}px rgba(10,63,77,${0.04 + activation * 0.28})`,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 12,
            borderRadius: '50%',
            background:
              'repeating-conic-gradient(from 0deg, rgba(255,255,255,0.26) 0deg 2deg, transparent 2deg 14deg)',
            opacity: 0.34 + activation * 0.42,
            transform: `rotate(${Math.max(0, frame - 184) * (0.34 + activation * 1.45)}deg)`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 35,
            borderRadius: '50%',
            background: `radial-gradient(circle at 40% 31%, rgba(255,255,255,0.98), rgba(17,94,108,${0.10 + activation * 0.56}) 36%, #0F1714 78%)`,
            boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.16), 0 0 ${12 + activation * 34}px rgba(10,63,77,${0.12 + activation * 0.40})`,
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
            letterSpacing: 1.1,
            fontSize: 15,
            textShadow: '0 2px 12px rgba(0,0,0,0.42)',
          }}
        >
          G-KAIS
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 31,
          top: 23,
          width: 318,
          height: 318,
          borderRadius: '50%',
          border: `1px solid rgba(10,63,77,${0.06 + impact * 0.34})`,
          transform: `scale(${1 + impact * 0.12})`,
          opacity: impact,
          boxShadow: `0 0 ${16 + impact * 34}px rgba(10,63,77,${impact * 0.14})`,
        }}
      />
    </div>
  );
};

const FlowScene: React.FC = () => {
  const frame = useCurrentFrame();
  const sceneExit = interpolate(frame, [122, 160], [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });
  const sceneOpacity = interpolate(frame, [126, 158], [1, 0], clamp);
  const blur = interpolate(sceneExit, [0, 1], [0, 7]);
  const rightGlow = interpolate(frame, [162, 224, 287], [0, 0.16, 0.11], clamp);

  return (
    <AbsoluteFill
      style={{
        overflow: 'hidden',
        background:
          'radial-gradient(circle at 77% 42%, rgba(255,255,255,0.88), transparent 27%), linear-gradient(135deg, #CFD0CD 0%, #E8E9E5 52%, #C8CBC8 100%)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: sceneOpacity,
          filter: `blur(${blur}px)`,
          transform: `translateX(${interpolate(sceneExit, [0, 1], [0, -160])}px) scale(${interpolate(sceneExit, [0, 1], [1, 0.975])})`,
        }}
      >
        <Scene01Cinematic />
      </div>

      <div
        style={{
          position: 'absolute',
          inset: 26,
          borderRadius: 38,
          border: '1px solid rgba(255,255,255,0.54)',
          background: 'rgba(242,243,240,0.17)',
          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.028), 0 22px 72px rgba(28,34,31,0.09)',
          opacity: interpolate(frame, [132, 160], [0, 1], clamp),
        }}
      />

      <div
        style={{
          position: 'absolute',
          width: 540,
          height: 540,
          right: -62,
          top: 76,
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(10,63,77,${rightGlow}), transparent 70%)`,
          filter: 'blur(26px)',
        }}
      />

      {signals.map((seed, index) => (
        <SignalDot key={index} seed={seed} index={index} />
      ))}

      <GKAISSystemCore />
    </AbsoluteFill>
  );
};

export const Scene01ToEngineFlow: React.FC = () => {
  return <FlowScene />;
};
