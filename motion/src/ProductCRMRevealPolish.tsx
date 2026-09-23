import React from 'react';
import {Easing, interpolate, useCurrentFrame} from 'remotion';
import {ProductCRMReveal} from './ProductCRMReveal';

const clamp = {
  extrapolateLeft: 'clamp' as const,
  extrapolateRight: 'clamp' as const,
};

const accent = '#0A3F4D';

const MouseCursor: React.FC<{x: number; y: number; opacity: number; clicking: number}> = ({
  x,
  y,
  opacity,
  clicking,
}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width: 28,
      height: 34,
      zIndex: 90,
      opacity,
      transform: `translate(-2px, -2px) scale(${1 - clicking * 0.08})`,
      filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.2))',
      pointerEvents: 'none',
    }}
  >
    <div
      style={{
        width: 21,
        height: 28,
        background: '#111111',
        clipPath: 'polygon(0 0, 0 92%, 29% 69%, 48% 100%, 61% 92%, 42% 63%, 100% 63%)',
        borderRadius: 2,
      }}
    />
    <div
      style={{
        position: 'absolute',
        left: -8,
        top: -8,
        width: 34,
        height: 34,
        borderRadius: '50%',
        border: `1.5px solid rgba(10,63,77,${clicking * 0.58})`,
        transform: `scale(${0.7 + clicking * 0.5})`,
      }}
    />
  </div>
);

export const ProductCRMRevealPolish: React.FC = () => {
  const frame = useCurrentFrame();

  const gentleScroll = interpolate(frame, [640, 680], [0, -150], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });
  const exitScroll = interpolate(frame, [680, 734], [0, -620], {
    ...clamp,
    easing: Easing.in(Easing.cubic),
  });
  const scroll = gentleScroll + exitScroll;

  const dropdownOpen = interpolate(frame, [592, 600, 620, 630], [0, 1, 1, 0], clamp);
  const stateChanged = frame >= 626;
  const stateFlash = interpolate(frame, [624, 632, 646], [0, 1, 0], clamp);
  const interactionOpacity = interpolate(frame, [580, 588, 660, 672], [0, 1, 1, 0], clamp);

  const exitProgress = interpolate(frame, [700, 734], [0, 1], {
    ...clamp,
    easing: Easing.in(Easing.cubic),
  });

  const cursorOpacity = interpolate(frame, [544, 552, 670, 684], [0, 1, 1, 0], clamp);
  const cursorX = interpolate(
    frame,
    [550, 570, 590, 600, 616, 626, 646, 670],
    [182, 182, 930, 1100, 1100, 1100, 930, 902],
    {...clamp, easing: Easing.inOut(Easing.cubic)},
  );
  const cursorY = interpolate(
    frame,
    [550, 570, 590, 600, 616, 626, 646, 670],
    [214, 214, 308, 390, 446, 446, 500, 548],
    {...clamp, easing: Easing.inOut(Easing.cubic)},
  );
  const clicking = Math.max(
    interpolate(frame, [566, 570, 574], [0, 1, 0], clamp),
    interpolate(frame, [596, 600, 604], [0, 1, 0], clamp),
    interpolate(frame, [622, 626, 630], [0, 1, 0], clamp),
  );

  return (
    <div style={{position: 'absolute', inset: 0, zIndex: 40, overflow: 'hidden'}}>
      <style>{`
        .crm-polish-base > div > div:first-child {
          top: 58px !important;
        }
        .crm-polish-base > div > div:last-child {
          opacity: 0 !important;
        }
        .crm-polish-base main {
          background: #F1F3F2 !important;
        }
        .crm-polish-base main > div {
          transform: translateY(${scroll}px) !important;
        }
        .crm-polish-base main > div > div > div:nth-child(2) > section {
          box-shadow: 0 14px 34px rgba(20,34,31,0.075), inset 0 1px 0 rgba(255,255,255,0.96) !important;
        }
        .crm-polish-base main > div > div > div:nth-child(2) > section:first-child {
          background: linear-gradient(180deg, #FFFFFF 0%, #FBFCFB 100%) !important;
        }
        .crm-polish-base main > div > div > div:nth-child(2) > section:last-child {
          background: linear-gradient(180deg, #F8FAF9 0%, #F1F5F4 100%) !important;
          box-shadow: 0 16px 38px rgba(10,63,77,0.105), inset 0 1px 0 rgba(255,255,255,0.92) !important;
        }
        .crm-polish-base main > div > div > section:first-of-type {
          background: linear-gradient(180deg, #F5F9F8 0%, #EDF5F3 100%) !important;
          box-shadow: 0 14px 34px rgba(10,63,77,0.09), inset 0 1px 0 rgba(255,255,255,0.9) !important;
        }
        .crm-polish-base main > div > div > section:last-of-type {
          background: linear-gradient(180deg, #FFFFFF 0%, #FAFBFA 100%) !important;
          box-shadow: 0 12px 30px rgba(20,34,31,0.07) !important;
        }
        .crm-polish-base main > div > div > div:nth-child(2) > section:first-child > div:first-child > div:first-child > div:first-child {
          color: ${accent} !important;
        }
      `}</style>

      <div
        className="crm-polish-base"
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 1 - exitProgress,
          filter: `blur(${exitProgress * 9}px)`,
          transform: `scale(${1 + exitProgress * 0.055})`,
          transformOrigin: '50% 50%',
        }}
      >
        <ProductCRMReveal />
      </div>

      <div
        style={{
          position: 'absolute',
          left: 1028,
          top: 368 + scroll,
          width: 160,
          zIndex: 82,
          opacity: interactionOpacity * (1 - exitProgress),
          filter: `blur(${exitProgress * 4}px)`,
        }}
      >
        <div
          style={{
            border: `1px solid ${stateChanged ? 'rgba(10,63,77,0.34)' : '#E7E7E7'}`,
            borderRadius: 12,
            background: stateChanged
              ? 'linear-gradient(180deg, #F8FBFA 0%, #F1F7F6 100%)'
              : 'linear-gradient(180deg, #FFFFFF 0%, #FBFCFB 100%)',
            padding: '10px 11px',
            minHeight: 54,
            boxSizing: 'border-box',
            boxShadow: `0 5px 14px rgba(20,34,31,0.06), 0 0 ${stateFlash * 18}px rgba(10,63,77,${stateFlash * 0.14})`,
          }}
        >
          <div style={{fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 9, color: '#8A8A8A'}}>Estado</div>
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 5}}>
            <div
              style={{
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: 12,
                fontWeight: 700,
                color: stateChanged ? accent : '#151515',
              }}
            >
              {stateChanged ? 'Reunión agendada' : 'Seguimiento'}
            </div>
            <div style={{fontSize: 10, color: accent}}>⌄</div>
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 61,
            borderRadius: 12,
            border: '1px solid rgba(10,63,77,0.18)',
            background: '#FFFFFF',
            boxShadow: '0 14px 28px rgba(17,30,27,0.16)',
            padding: 6,
            opacity: dropdownOpen,
            transform: `translateY(${(1 - dropdownOpen) * -6}px) scale(${0.98 + dropdownOpen * 0.02})`,
            transformOrigin: '50% 0%',
          }}
        >
          {['Seguimiento', 'Reunión agendada', 'Cliente'].map((option) => {
            const active = option === 'Reunión agendada' && frame >= 616;
            return (
              <div
                key={option}
                style={{
                  borderRadius: 8,
                  padding: '7px 8px',
                  fontFamily: 'Arial, Helvetica, sans-serif',
                  fontSize: 10,
                  fontWeight: active ? 800 : 600,
                  color: active ? accent : '#4E5552',
                  background: active ? '#F1F7F6' : '#FFFFFF',
                }}
              >
                {option}
              </div>
            );
          })}
        </div>
      </div>

      <MouseCursor x={cursorX} y={cursorY} opacity={cursorOpacity * (1 - exitProgress)} clicking={clicking} />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: 'radial-gradient(circle at 58% 42%, rgba(255,255,255,0.2) 0%, rgba(246,247,245,0.96) 78%)',
          opacity: exitProgress,
          zIndex: 100,
        }}
      />
    </div>
  );
};
