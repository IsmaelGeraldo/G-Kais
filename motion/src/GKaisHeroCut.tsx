import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';
import {GKaisFinalMaster} from './GKaisFinalMaster';

const clamp = {
  extrapolateLeft: 'clamp' as const,
  extrapolateRight: 'clamp' as const,
};

export const GKaisHeroCut: React.FC = () => {
  const frame = useCurrentFrame();

  let cameraScale = 1;

  if (frame >= 252 && frame < 278) {
    cameraScale = interpolate(frame, [252, 278], [1, 1.12], {
      ...clamp,
      easing: Easing.inOut(Easing.cubic),
    });
  } else if (frame >= 278 && frame < 480) {
    cameraScale = 1.12;
  } else if (frame >= 480 && frame < 528) {
    cameraScale = interpolate(frame, [480, 528], [1.12, 1.085], {
      ...clamp,
      easing: Easing.inOut(Easing.cubic),
    });
  } else if (frame >= 528) {
    cameraScale = 1.085;
  }

  return (
    <AbsoluteFill style={{background: '#F6F7F5', overflow: 'hidden'}}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `scale(${cameraScale})`,
          transformOrigin: '50% 50%',
        }}
      >
        <GKaisFinalMaster />
      </div>
    </AbsoluteFill>
  );
};
