import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Scene01ToIntelligencePolish} from './Scene01ToIntelligencePolish';
import {UnifiedCRMScene} from './UnifiedCRMScene';

const clamp = {
  extrapolateLeft: 'clamp' as const,
  extrapolateRight: 'clamp' as const,
};

export const Scene01ToCRMPreview: React.FC = () => {
  const frame = useCurrentFrame();

  // Keep opportunity text on a fixed raster until the handoff.
  // Fade only: no blur, scale or fractional translation over readable UI text.
  const intelligenceOpacity = interpolate(frame, [500, 526], [1, 0], clamp);

  return (
    <AbsoluteFill style={{background: '#F6F7F5', overflow: 'hidden'}}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: intelligenceOpacity,
        }}
      >
        <Scene01ToIntelligencePolish />
      </div>

      <UnifiedCRMScene />
    </AbsoluteFill>
  );
};
