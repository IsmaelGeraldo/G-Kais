import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';
import {Scene01ToIntelligenceFlow} from './Scene01ToIntelligenceFlow';

const clamp = {
  extrapolateLeft: 'clamp' as const,
  extrapolateRight: 'clamp' as const,
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
      `}</style>
      <Scene01ToIntelligenceFlow />
    </AbsoluteFill>
  );
};
