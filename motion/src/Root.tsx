import React from 'react';
import {Composition} from 'remotion';
import {GKaisMasterFilm} from './GKaisMasterFilm';
import {GKaisFinalMaster} from './GKaisFinalMaster';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="GKAISFinalMaster"
        component={GKaisFinalMaster}
        durationInFrames={735}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="GKAISMasterFilm"
        component={GKaisMasterFilm}
        durationInFrames={675}
        fps={30}
        width={1280}
        height={720}
        defaultProps={{
          accent: '#0A3F4D',
          headline: 'Cada oportunidad, un siguiente paso.',
        }}
      />
    </>
  );
};
