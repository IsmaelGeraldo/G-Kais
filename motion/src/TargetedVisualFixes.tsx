import React from 'react';
import {AbsoluteFill} from 'remotion';

export const TargetedVisualFixes: React.FC = () => (
  <AbsoluteFill style={{pointerEvents: 'none'}}>
    <style>{`
      /* Keep Scene 01 on the persistent world background instead of fading its own background away. */
      div[style*="radial-gradient(circle at 78% 22%"][style*="overflow: hidden"] {
        background: transparent !important;
      }

      /* Match the world to Scene 01, but very slightly darker so the handoff does not jump light. */
      div[style*="radial-gradient(circle at 72% 44%"],
      div[style*="radial-gradient(circle at 28% 38%"] {
        background: radial-gradient(circle at 78% 22%, rgba(255,255,255,0.78), transparent 28%), linear-gradient(135deg, #CDCECA 0%, #E6E7E3 48%, #C7C9C6 100%) !important;
      }

      /* Keep the already-approved enlarged gallery/world background. */
      div[style*="radial-gradient(circle at 28% 38%"] {
        top: -180px !important;
        bottom: auto !important;
        height: 1080px !important;
      }

      /* Remove the extra brand-logo layer that was physically above the real glass cards. */
      div[style*="z-index: 72"] {
        display: none !important;
      }

      /* Remove the extra phone-material overlay. The base phone remains, and its camera/Dynamic Island
         now stays naturally behind the floating notifications rendered later in Scene01Cinematic. */
      div[style*="z-index: 68"] {
        display: none !important;
      }

      /* Remove only the rear-left WhatsApp logo from the global logo world.
         The underlying notification remains intact and therefore gets occluded correctly by foreground glass. */
      div[style*="width: 3600px"][style*="z-index: 116"] > div[style*="width: 258px"] {
        display: none !important;
      }

      /* The previous blur workaround is no longer needed: no notification card is altered. */
    `}</style>
  </AbsoluteFill>
);
