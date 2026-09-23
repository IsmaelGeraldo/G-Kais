import React from 'react';
import {Composition, registerRoot} from 'remotion';
import {Scene01ToCRMPreview} from './Scene01ToCRMPreview';

const Scene01ToCRMPreviewRoot: React.FC = () => {
  return (
    <Composition
      id="GKAISScene01ToCRMPreview"
      component={Scene01ToCRMPreview}
      durationInFrames={660}
      fps={30}
      width={1280}
      height={720}
    />
  );
};

registerRoot(Scene01ToCRMPreviewRoot);
