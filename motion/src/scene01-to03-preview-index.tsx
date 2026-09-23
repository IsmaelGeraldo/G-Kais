import React from 'react';
import {Composition, registerRoot} from 'remotion';
import {Scene01To03Cinematic} from './Scene01To03Cinematic';

const Scene01To03PreviewRoot: React.FC = () => {
  return (
    <Composition
      id="GKAISScene01To03Preview"
      component={Scene01To03Cinematic}
      durationInFrames={255}
      fps={30}
      width={1280}
      height={720}
    />
  );
};

registerRoot(Scene01To03PreviewRoot);
