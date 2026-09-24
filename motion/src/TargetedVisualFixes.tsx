import React from 'react';
import {AbsoluteFill} from 'remotion';

export const TargetedVisualFixes: React.FC = () => (
  <AbsoluteFill style={{pointerEvents: 'none'}}>
    <style>{`
      /* Keep Scene 01 and the Motor world on the exact same base tone. */
      div[style*="radial-gradient(circle at 72% 44%"],
      div[style*="radial-gradient(circle at 28% 38%"] {
        background: radial-gradient(circle at 78% 22%, rgba(255,255,255,0.82), transparent 28%), linear-gradient(135deg, #CFCFCB 0%, #E9E9E5 48%, #C9CBC8 100%) !important;
      }

      /* Extend the original world background itself so zoom-out never reveals its top edge. */
      div[style*="radial-gradient(circle at 28% 38%"] {
        top: -180px !important;
        bottom: auto !important;
        height: 1080px !important;
      }

      /* Only the rear-left WhatsApp mark sits behind another translucent notification. */
      div[style*="width: 3600px"][style*="z-index: 116"] > div:nth-child(6) > div[style*="left: 11px"][style*="top: 16px"] > div {
        filter: blur(2.2px) saturate(0.82) !important;
        opacity: 0.42 !important;
      }
    `}</style>
  </AbsoluteFill>
);
