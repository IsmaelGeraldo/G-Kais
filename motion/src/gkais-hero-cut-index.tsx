import React from 'react';
import {Composition, registerRoot} from 'remotion';
import {GKaisHeroCut} from './GKaisHeroCut';

const Root: React.FC = () => (
  <Composition
    id="GKAISHeroCut"
    component={GKaisHeroCut}
    durationInFrames={805}
    fps={30}
    width={1280}
    height={720}
  />
);

registerRoot(Root);
