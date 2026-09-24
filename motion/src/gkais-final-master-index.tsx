import React from 'react';
import {Composition, registerRoot} from 'remotion';
import {GKaisFinalMaster} from './GKaisFinalMaster';

const Root: React.FC = () => (
  <Composition
    id="GKAISFinalMaster"
    component={GKaisFinalMaster}
    durationInFrames={735}
    fps={30}
    width={1280}
    height={720}
  />
);

registerRoot(Root);
