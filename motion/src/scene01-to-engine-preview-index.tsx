import React from 'react';
import {Composition, registerRoot} from 'remotion';
import {Scene01ToEngineFlow} from './Scene01ToEngineFlow';

const Scene01ToEnginePreviewRoot: React.FC = () => {
  return (
    <Composition
      id="GKAISScene01ToEnginePreview"
      component={Scene01ToEngineFlow}
      durationInFrames={288}
      fps={30}
      width={1280}
      height={720}
    />
  );
};

registerRoot(Scene01ToEnginePreviewRoot);
