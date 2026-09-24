import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Scene01ToCRMPreview} from './Scene01ToCRMPreview';
import {Scene01MasterPolish} from './Scene01MasterPolish';
import {FinalStructuralPolish} from './FinalStructuralPolish';
import {TargetedVisualFixes} from './TargetedVisualFixes';
import {CRMStoryPolish} from './CRMStoryPolish';
import {CRMNaturalCursorPolish} from './CRMNaturalCursorPolish';

export const GKaisFinalMaster: React.FC = () => {
  return (
    <AbsoluteFill style={{background: '#F6F7F5', overflow: 'hidden'}}>
      <Scene01ToCRMPreview />
      <Scene01MasterPolish />
      <FinalStructuralPolish />
      <TargetedVisualFixes />
      <CRMStoryPolish />
      <CRMNaturalCursorPolish />
    </AbsoluteFill>
  );
};