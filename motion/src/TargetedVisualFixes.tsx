import React from 'react';
import {AbsoluteFill} from 'remotion';

const WHATSAPP_ICON = 'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0xNy40NzIgMTQuMzgyYy0uMjk3LS4xNDktMS43NTgtLjg2Ny0yLjAzLS45NjctLjI3My0uMDk5LS40NzEtLjE0OC0uNjcuMTUtLjE5Ny4yOTctLjc2Ny45NjYtLjk0IDEuMTY0LS4xNzMuMTk5LS4zNDcuMjIzLS42NDQuMDc1LS4yOTctLjE1LTEuMjU1LS40NjMtMi4zOS0xLjQ3NS0uODgzLS43ODgtMS40OC0xLjc2MS0xLjY1My0yLjA1OS0uMTczLS4yOTctLjAxOC0uNDU4LjEzLS42MDYuMTM0LS4xMzMuMjk4LS4zNDcuNDQ2LS41Mi4xNDktLjE3NC4xOTgtLjI5OC4yOTgtLjQ5Ny4wOTktLjE5OC4wNS0uMzcxLS4wMjUtLjUyLS4wNzUtLjE0OS0uNjY5LTEuNjEyLS45MTYtMi4yMDctLjI0Mi0uNTc5LS40ODctLjUtLjY2OS0uNTEtLjE3My0uMDA4LS4zNzEtLjAxLS41Ny0uMDEtLjE5OCAwLS41Mi4wNzQtLjc5Mi4zNzItLjI3Mi4yOTctMS4wNCAxLjAxNi0xLjA0IDIuNDc5IDAgMS40NjIgMS4wNjUgMi44NzUgMS4yMTMgMy4wNzQuMTQ5LjE5OCAyLjA5NiAzLjIgNS4wNzcgNC40ODcuNzA5LjMwNiAxLjI2Mi40ODkgMS42OTQuNjI1LjcxMi4yMjcgMS4zNi4xOTUgMS44NzEuMTE4LjU3MS0uMDg1IDEuNzU4LS43MTkgMi4wMDYtMS40MTMuMjQ4LS42OTQuMjQ4LTEuMjg5LjE3My0xLjQxMy0uMDc0LS4xMjQtLjI3Mi0uMTk4LS41Ny0uMzQ3bS01LjQyMSA3LjQwM2gtLjAwNGE5Ljg3IDkuODcgMCAwMS01LjAzMS0xLjM3OGwtLjM2MS0uMjE0LTMuNzQxLjk4Mi45OTgtMy42NDgtLjIzNS0uMzc0YTkuODYgOS44NiAwIDAxLTEuNTEtNS4yNmMuMDAxLTUuNDUgNC40MzYtOS44ODQgOS44ODgtOS44ODQgMi42NCAwIDUuMTIyIDEuMDMgNi45ODggMi44OThhOS44MjUgOS44MjUgMCAwMTIuODkzIDYuOTk0Yy0uMDAzIDUuNDUtNC40MzcgOS44ODQtOS44ODUgOS44ODRtOC40MTMtMTguMjk3QTExLjgxNSAxMS44MTUgMCAwMDEyLjA1IDBDNS40OTUgMCAuMTYgNS4zMzUuMTU3IDExLjg5MmMwIDIuMDk2LjU0NyA0LjE0MiAxLjU4OCA1Ljk0NUwuMDU3IDI0bDYuMzA1LTEuNjU0YTExLjg4MiAxMS44ODIgMCAwMDUuNjgzIDEuNDQ4aC4wMDVjNi41NTQgMCAxMS44OS01LjMzNSAxMS44OTMtMTEuODkzYTExLjgyMSAxMS44MjEgMCAwMC0zLjQ4LTguNDEzWiIvPjwvc3ZnPg==';

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

      /* Remove the old extra brand-logo layer from Scene01MasterPolish. */
      div[style*="z-index: 72"] {
        display: none !important;
      }

      /* Keep the approved camera/Dynamic Island fix. */
      div[style*="z-index: 68"] {
        display: none !important;
      }

      /* The sixth floating brand mark is the rear-left WhatsApp notification.
         Do not draw that global mark above the glass stack. */
      div[style*="width: 3600px"][style*="z-index: 116"] > div:nth-child(6)[style*="min-height: 66px"] {
        display: none !important;
      }

      /* Put the real WhatsApp glyph inside the actual rear-left glass card.
         Because this is the card's own ChannelIcon, foreground glass naturally occludes it. */
      div[style*="width: 258px"][style*="min-height: 66px"][style*="display: flex"] > div:nth-child(2)[style*="width: 34px"][style*="height: 34px"] {
        color: transparent !important;
        font-size: 0 !important;
        letter-spacing: 0 !important;
        background: url("data:image/svg+xml;base64,${WHATSAPP_ICON}") center / 23px 23px no-repeat, linear-gradient(145deg, #2DCB70 0%, #159447 100%) !important;
      }
    `}</style>
  </AbsoluteFill>
);
