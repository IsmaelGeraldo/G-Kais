import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';
import {Scene01ToIntelligencePolish} from './Scene01ToIntelligencePolish';
import {UnifiedCRMScene} from './UnifiedCRMScene';

const clamp = {
  extrapolateLeft: 'clamp' as const,
  extrapolateRight: 'clamp' as const,
};

export const Scene01ToCRMPreview: React.FC = () => {
  const frame = useCurrentFrame();

  const recede = interpolate(frame, [482, 526], [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });

  const intelligenceOpacity = interpolate(frame, [494, 526], [1, 0.10], clamp);
  const intelligenceBlur = interpolate(recede, [0, 1], [0, 2.2], clamp);
  const intelligenceScale = interpolate(recede, [0, 1], [1, 0.91], clamp);
  const intelligenceY = interpolate(recede, [0, 1], [0, 12], clamp);

  return (
    <AbsoluteFill style={{background: '#F6F7F5', overflow: 'hidden'}}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: intelligenceOpacity,
          filter: `blur(${intelligenceBlur}px)`,
          transform: `translateY(${intelligenceY}px) scale(${intelligenceScale})`,
          transformOrigin: '50% 50%',
        }}
      >
        <Scene01ToIntelligencePolish />
      </div>

      <UnifiedCRMScene />
    </AbsoluteFill>
  );
};
