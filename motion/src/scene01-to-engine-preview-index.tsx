import React from 'react';
import {Composition, registerRoot} from 'remotion';
import {Scene01ToIntelligenceFlow} from './Scene01ToIntelligenceFlow';

const Scene01ToEnginePreviewRoot: React.FC = () => {
  return (
    <Composition
      id="GKAISScene01ToEnginePreview"
      component={Scene01ToIntelligenceFlow}
      durationInFrames={510}
      fps={30}
      width={1280}
      height={720}
    />
  );
};

registerRoot(Scene01ToEnginePreviewRoot);
