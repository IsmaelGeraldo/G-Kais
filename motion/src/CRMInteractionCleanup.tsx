import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';

const clamp = {
  extrapolateLeft: 'clamp' as const,
  extrapolateRight: 'clamp' as const,
};

const accent = '#0A3F4D';
const softBorder = '#E7E7E7';
const muted = '#777777';

const Pill: React.FC<React.PropsWithChildren<{selected?: boolean}>> = ({children, selected = false}) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      border: `1px solid ${selected ? 'rgba(10,63,77,0.26)' : softBorder}`,
      background: selected ? '#F4F8F8' : '#FFFFFF',
      color: selected ? accent : '#676767',
      borderRadius: 999,
      padding: '5px 9px',
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: 9,
      fontWeight: 700,
      letterSpacing: 0.45,
    }}
  >
    {children}
  </span>
);

const LeadCard: React.FC<{
  name: string;
  company: string;
  status: string;
  selected?: boolean;
}> = ({name, company, status, selected = false}) => (
  <div
    style={{
      position: 'relative',
      height: 78,
      border: selected ? '1px solid rgba(10,63,77,0.34)' : `1px solid ${softBorder}`,
      background: selected ? '#F4F8F8' : '#FFFFFF',
      borderRadius: 14,
      padding: '11px 12px',
      boxSizing: 'border-box',
      boxShadow: selected ? '0 0 18px rgba(10,63,77,0.10)' : 'none',
    }}
  >
    {selected ? (
      <div
        style={{
          position: 'absolute',
          left: -1,
          top: 13,
          bottom: 13,
          width: 3,
          borderRadius: 3,
          background: accent,
        }}
      />
    ) : null}
    <div style={{fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 12, fontWeight: 800, color: '#111'}}>{name}</div>
    <div style={{fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 10, color: muted, marginTop: 2}}>{company}</div>
    <div style={{marginTop: 8}}>
      <Pill selected={selected}>{status}</Pill>
    </div>
  </div>
);

const CorrectLeadList: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [526, 532, 724, 732], [0, 1, 1, 0], clamp);
  if (opacity <= 0) return null;

  const diegoSelected = frame >= 580 && frame < 624;
  const sofiaSelected = !diegoSelected;

  return (
    <div
      style={{
        position: 'absolute',
        left: 74,
        top: 158,
        width: 246,
        zIndex: 340,
        opacity,
        background: '#FAFAFA',
        paddingBottom: 4,
        boxSizing: 'border-box',
      }}
    >
      <div style={{display: 'grid', gap: 8}}>
        <LeadCard name="Sofía Martínez" company="Clínica Aurora" status="Seguimiento hoy" selected={sofiaSelected} />
        <LeadCard name="Valentina Ríos" company="Logística Andina" status="Nuevo lead" />
        <LeadCard name="Diego Fuentes" company="Diseño Norte" status="Cotización" selected={diegoSelected} />
        <LeadCard name="Martín Silva" company="Studio Forma" status="Esperando respuesta" />
      </div>
    </div>
  );
};

const SingleCursor: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [518, 526, 716, 730], [0, 1, 1, 0], clamp);
  if (opacity <= 0) return null;

  const x = interpolate(
    frame,
    [520, 534, 550, 562, 574, 590, 604, 616, 630, 636, 648, 660, 670, 676, 684, 690, 704, 718],
    [-28, 28, 82, 138, 182, 182, 174, 168, 182, 182, 330, 650, 950, 1100, 1100, 1100, 1010, 950],
    {...clamp, easing: Easing.inOut(Easing.cubic)},
  );

  const y = interpolate(
    frame,
    [520, 534, 550, 562, 574, 590, 604, 616, 630, 636, 648, 660, 670, 676, 684, 690, 704, 718],
    [138, 156, 205, 282, 352, 352, 330, 274, 214, 214, 222, 270, 350, 390, 424, 446, 502, 558],
    {...clamp, easing: Easing.inOut(Easing.cubic)},
  );

  const clicking = Math.max(
    interpolate(frame, [574, 580, 586], [0, 1, 0], clamp),
    interpolate(frame, [630, 636, 642], [0, 1, 0], clamp),
    interpolate(frame, [672, 676, 680], [0, 1, 0], clamp),
    interpolate(frame, [686, 690, 694], [0, 1, 0], clamp),
  );

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: 20,
        height: 24,
        zIndex: 360,
        opacity,
        transform: `translate(-1.5px, -1.5px) scale(${1 - clicking * 0.05})`,
        filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.2))',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          width: 15,
          height: 20,
          background: '#111111',
          clipPath: 'polygon(0 0, 0 92%, 29% 69%, 48% 100%, 61% 92%, 42% 63%, 100% 63%)',
          borderRadius: 2,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: -6,
          top: -6,
          width: 25,
          height: 25,
          borderRadius: '50%',
          border: `1.5px solid rgba(10,63,77,${clicking * 0.58})`,
          transform: `scale(${0.72 + clicking * 0.42})`,
        }}
      />
    </div>
  );
};

export const CRMInteractionCleanup: React.FC = () => (
  <AbsoluteFill style={{pointerEvents: 'none'}}>
    <style>{`
      /* Physically suppress every legacy CRM cursor so only SingleCursor remains. */
      div[style*="z-index: 30"][style*="width: 28px"][style*="height: 34px"],
      div[style*="z-index: 90"][style*="width: 20px"][style*="height: 24px"],
      div[style*="z-index: 230"][style*="width: 20px"][style*="height: 24px"],
      div[style*="z-index: 240"][style*="width: 20px"][style*="height: 24px"],
      div[style*="z-index: 290"][style*="width: 20px"][style*="height: 24px"] {
        display: none !important;
      }

      /* Keep the underlying CRM list semantically ordered even before the overlay settles. */
      .crm-polish-base aside > div[style*="display: grid"][style*="gap: 8px"] > div:nth-child(2) {
        order: 3 !important;
      }
      .crm-polish-base aside > div[style*="display: grid"][style*="gap: 8px"] > div:nth-child(3) {
        order: 2 !important;
      }
    `}</style>
    <CorrectLeadList />
    <SingleCursor />
  </AbsoluteFill>
);
