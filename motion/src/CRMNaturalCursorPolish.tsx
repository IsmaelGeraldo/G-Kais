import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';

const clamp = {
  extrapolateLeft: 'clamp' as const,
  extrapolateRight: 'clamp' as const,
};

const NaturalCursor: React.FC = () => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [530, 538, 708, 724], [0, 1, 1, 0], clamp);

  const x = interpolate(
    frame,
    [530, 538, 546, 552, 558, 566, 572, 580, 588, 594, 600, 606, 616, 626, 660, 700, 720],
    [34, 70, 110, 150, 182, 182, 170, 155, 182, 182, 650, 1096, 1100, 1100, 1010, 948, 940],
    {...clamp, easing: Easing.inOut(Easing.cubic)},
  );

  const y = interpolate(
    frame,
    [530, 538, 546, 552, 558, 566, 572, 580, 588, 594, 600, 606, 616, 626, 660, 700, 720],
    [118, 142, 205, 260, 294, 294, 280, 250, 214, 214, 285, 388, 444, 446, 500, 558, 570],
    {...clamp, easing: Easing.inOut(Easing.cubic)},
  );

  const clicking = Math.max(
    interpolate(frame, [560, 564, 568], [0, 1, 0], clamp),
    interpolate(frame, [588, 592, 596], [0, 1, 0], clamp),
    interpolate(frame, [602, 606, 610], [0, 1, 0], clamp),
    interpolate(frame, [622, 626, 630], [0, 1, 0], clamp),
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
        zIndex: 240,
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

export const CRMNaturalCursorPolish: React.FC = () => (
  <AbsoluteFill style={{pointerEvents: 'none'}}>
    <style>{`
      /* Hide the faster narrative cursor from CRMStoryPolish. */
      div[style*="z-index: 230"][style*="width: 20px"][style*="height: 24px"] {
        opacity: 0 !important;
      }
    `}</style>
    <NaturalCursor />
  </AbsoluteFill>
);
