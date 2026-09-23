import React from 'react';
import {Composition} from 'remotion';
import {GKaisMasterFilm} from './GKaisMasterFilm';

export const RemotionRoot: React.FC = () => {
  return (
    <>
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
