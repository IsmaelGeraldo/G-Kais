import React from 'react';
import {Composition, registerRoot} from 'remotion';
import {Scene01Cinematic} from './Scene01Cinematic';

const Scene01PreviewRoot: React.FC = () => {
  return (
    <Composition
      id="GKAISScene01Preview"
      component={Scene01Cinematic}
      durationInFrames={126}
      fps={30}
      width={1280}
      height={720}
      defaultProps={{accent: '#0A3F4D'}}
    />
  );
};

registerRoot(Scene01PreviewRoot);
