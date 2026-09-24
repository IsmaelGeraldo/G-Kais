import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';

const clamp = {
  extrapolateLeft: 'clamp' as const,
  extrapolateRight: 'clamp' as const,
};

const TransitionToneBridge: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [112, 132, 194, 238], [0, 1, 0.72, 0], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });

  if (opacity <= 0.001) return null;

  return (
    <AbsoluteFill
      style={{
        zIndex: 80,
        opacity,
        pointerEvents: 'none',
        background:
          'linear-gradient(135deg, rgba(92,96,93,0.055) 0%, rgba(112,116,112,0.035) 48%, rgba(255,255,255,0.015) 100%)',
        backdropFilter: 'brightness(0.945) saturate(0.985)',
      }}
    />
  );
};

const GalleryBackdrop: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [320, 344, 492, 520], [0, 1, 1, 0], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });

  if (opacity <= 0.001) return null;

  return (
    <div
      style={{
        position: 'absolute',
        left: -110,
        right: -110,
        top: -180,
        height: 1080,
        zIndex: 3,
        opacity,
        borderRadius: 72,
        background:
          'radial-gradient(circle at 72% 42%, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.42) 28%, transparent 48%), linear-gradient(135deg, #CFD0CD 0%, #E8E9E5 50%, #C8CBC8 100%)',
        boxShadow:
          'inset 0 1px 0 rgba(255,255,255,0.34), 0 0 90px rgba(28,34,31,0.025)',
        pointerEvents: 'none',
      }}
    />
  );
};

export const FinalVisualClosure: React.FC = () => (
  <AbsoluteFill style={{pointerEvents: 'none'}}>
    <style>{`
      div[style*="width: 34px"][style*="height: 34px"][style*="place-items: center"] {
        filter: blur(0.55px) saturate(0.94) !important;
        opacity: 0.88 !important;
      }
    `}</style>
    <GalleryBackdrop />
    <TransitionToneBridge />
  </AbsoluteFill>
);
