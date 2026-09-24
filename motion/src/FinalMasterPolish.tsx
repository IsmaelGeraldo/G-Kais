import React from 'react';
import {loadFont} from '@remotion/google-fonts/MPLUSRounded1c';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';

const {fontFamily: roundedFamily} = loadFont('normal', {
  weights: ['700', '800', '900'],
  subsets: ['latin'],
});

const clamp = {
  extrapolateLeft: 'clamp' as const,
  extrapolateRight: 'clamp' as const,
};

const accent = '#0A3F4D';
const WORLD_WIDTH = 3600;
const ENGINE_X = 1490;

const INSTAGRAM_PATH = 'M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077';
const WHATSAPP_PATH = 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z';

type ChannelKind = 'instagram' | 'whatsapp' | 'gmail' | 'form';

const GmailGlyph: React.FC = () => (
  <svg width="25" height="20" viewBox="0 0 28 22" aria-hidden="true">
    <path d="M3 5.2V19.2H7V8.35L14 13.55L21 8.35V19.2H25V5.2L14 13.15Z" fill="#FFFFFF" opacity={0.96} />
    <path d="M3 5.2L14 13.2L25 5.2" fill="none" stroke="#EA4335" strokeWidth="3.7" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 5.3V18.9" stroke="#4285F4" strokeWidth="3.7" strokeLinecap="round" />
    <path d="M25 5.3V18.9" stroke="#34A853" strokeWidth="3.7" strokeLinecap="round" />
    <path d="M3 18.9V15.6" stroke="#FBBC04" strokeWidth="3.7" strokeLinecap="round" />
  </svg>
);

const FormGlyph: React.FC = () => (
  <svg width="21" height="21" viewBox="0 0 24 24" aria-hidden="true">
    <rect x="4" y="3.5" width="16" height="17" rx="3.2" fill="none" stroke="#FFFFFF" strokeWidth="1.8" />
    <circle cx="8" cy="9" r="1.35" fill="#FFFFFF" />
    <path d="M11 9H17M7 14H17M7 17H14" stroke="#FFFFFF" strokeWidth="1.65" strokeLinecap="round" />
  </svg>
);

const BrandMark: React.FC<{kind: ChannelKind; size?: number}> = ({kind, size = 34}) => {
  const radius = Math.round(size * 0.32);
  const isInstagram = kind === 'instagram';
  const isWhatsapp = kind === 'whatsapp';
  const background = isInstagram
    ? 'radial-gradient(circle at 68% 78%, #FFD15C 0%, #FF7A35 26%, #E1306C 52%, #833AB4 77%, #405DE6 100%)'
    : isWhatsapp
      ? 'linear-gradient(145deg, #34D576 0%, #18A957 100%)'
      : kind === 'gmail'
        ? 'linear-gradient(145deg, #FFFFFF 0%, #F7F8F7 100%)'
        : 'linear-gradient(145deg, #155E70 0%, #0A3F4D 100%)';

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        overflow: 'hidden',
        display: 'grid',
        placeItems: 'center',
        background,
        border: kind === 'gmail' ? '1px solid rgba(20,28,24,0.08)' : 'none',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.42), 0 6px 16px rgba(11,19,17,0.16)',
      }}
    >
      {isInstagram || isWhatsapp ? (
        <svg width={size * 0.68} height={size * 0.68} viewBox="0 0 24 24" aria-hidden="true">
          <path d={isInstagram ? INSTAGRAM_PATH : WHATSAPP_PATH} fill="#FFFFFF" />
        </svg>
      ) : kind === 'gmail' ? (
        <GmailGlyph />
      ) : (
        <FormGlyph />
      )}
    </div>
  );
};

type ExternalOverlay = {
  kind: 'gmail' | 'form';
  x: number;
  y: number;
  width: number;
  start: number;
  depth: number;
  seed: number;
};

const externalOverlays: ExternalOverlay[] = [
  {kind: 'gmail', x: 398, y: 205, width: 272, start: 42, depth: 0.68, seed: 3},
  {kind: 'form', x: 356, y: 350, width: 286, start: 54, depth: 0.84, seed: 4},
  {kind: 'gmail', x: 82, y: 570, width: 280, start: 94, depth: 0.5, seed: 7},
];

const ExternalLogoOverlay: React.FC<{item: ExternalOverlay}> = ({item}) => {
  const frame = useCurrentFrame();
  const reveal = interpolate(frame, [item.start, item.start + 13], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  const driftY = Math.sin((frame + item.seed * 7) / (22 + item.seed)) * (2 + item.depth * 3);
  const driftX = Math.cos((frame + item.seed * 11) / (30 + item.seed)) * (1.2 + item.depth * 2.2);
  const scale = (0.91 + item.depth * 0.12) * interpolate(reveal, [0, 1], [0.965, 1]);
  const cameraX = interpolate(frame, [0, 125], [0, -13], clamp);
  const cameraY = interpolate(frame, [0, 125], [8, -4], clamp);
  const masterFade = interpolate(frame, [111, 136], [1, 0], clamp);

  return (
    <div
      style={{
        position: 'absolute',
        left: Math.round(item.x + driftX + cameraX),
        top: Math.round(item.y + driftY + interpolate(reveal, [0, 1], [16, 0]) + cameraY),
        width: item.width,
        minHeight: 66,
        opacity: reveal * (0.7 + item.depth * 0.3) * masterFade,
        transform: `scale(${scale})`,
        transformOrigin: 'left center',
        pointerEvents: 'none',
        zIndex: 74,
      }}
    >
      <div style={{position: 'absolute', left: 11, top: 16}}>
        <BrandMark kind={item.kind} />
      </div>
    </div>
  );
};

const PhoneInboxLogos: React.FC = () => {
  const frame = useCurrentFrame();
  const phoneReveal = interpolate(frame, [0, 28], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  const cameraX = interpolate(frame, [0, 125], [0, -13], clamp);
  const cameraY = interpolate(frame, [0, 125], [8, -4], clamp);
  const phoneFloat = Math.sin(frame / 24) * 4;
  const masterFade = interpolate(frame, [112, 140], [1, 0], clamp);
  const rows: Array<{kind: ChannelKind; top: number}> = [
    {kind: 'whatsapp', top: 151},
    {kind: 'instagram', top: 225},
    {kind: 'gmail', top: 299},
    {kind: 'form', top: 373},
    {kind: 'whatsapp', top: 447},
  ];

  return (
    <div
      style={{
        position: 'absolute',
        left: 150 + cameraX,
        top: 89 + phoneFloat + cameraY,
        width: 284,
        height: 548,
        opacity: phoneReveal * masterFade,
        transform: `perspective(1250px) translateX(${interpolate(phoneReveal, [0, 1], [-82, 0])}px) rotateY(-10deg) rotateX(1.5deg) rotateZ(-3.1deg) scale(${interpolate(phoneReveal, [0, 1], [0.94, 1])})`,
        transformStyle: 'preserve-3d',
        pointerEvents: 'none',
        zIndex: 71,
      }}
    >
      {rows.map((row, index) => (
        <div key={`${row.kind}-${index}`} style={{position: 'absolute', left: 38, top: row.top}}>
          <BrandMark kind={row.kind} size={30} />
        </div>
      ))}
    </div>
  );
};

const engineShiftAt = (frame: number) =>
  interpolate(frame, [258, 342], [0, -185], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });

const MotorNarrative: React.FC = () => {
  const frame = useCurrentFrame();
  const firstCamera = interpolate(frame, [118, 222], [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });
  const secondCamera = interpolate(frame, [232, 350], [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });
  const galleryCamera = interpolate(frame, [344, 466], [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });
  const cameraX =
    interpolate(firstCamera, [0, 1], [0, -930]) +
    interpolate(secondCamera, [0, 1], [0, -110]) +
    interpolate(galleryCamera, [0, 1], [0, -510]);
  const cameraScale = interpolate(frame, [118, 222, 344, 466], [1, 1.032, 1.032, 0.82], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });
  const cameraY = interpolate(frame, [118, 222, 344, 466], [0, -5, -5, 2], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });
  const opacity = interpolate(frame, [202, 222, 342, 382], [0, 1, 1, 0], clamp);
  const shift = engineShiftAt(frame);

  const labels = [
    {text: 'Captura señales', dx: -118, dy: 56, start: 220},
    {text: 'Interpreta contexto', dx: 246, dy: 48, start: 228},
    {text: 'Detecta prioridad', dx: 302, dy: 146, start: 236},
    {text: 'Genera AI Brief', dx: 274, dy: 264, start: 244},
    {text: 'Sugiere próxima acción', dx: -118, dy: 274, start: 252},
    {text: 'Activa seguimiento', dx: -148, dy: 166, start: 260},
  ];

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: WORLD_WIDTH,
        height: 720,
        transform: `translate3d(${cameraX}px, ${cameraY}px, 0) scale(${cameraScale})`,
        transformOrigin: '640px 360px',
        pointerEvents: 'none',
        opacity,
        zIndex: 83,
      }}
    >
      {labels.map((label, index) => {
        const reveal = interpolate(frame, [label.start, label.start + 14], [0, 1], {
          ...clamp,
          easing: Easing.out(Easing.cubic),
        });
        const isLeft = label.dx < 0;
        return (
          <div
            key={label.text}
            style={{
              position: 'absolute',
              left: ENGINE_X + shift + label.dx,
              top: 178 + label.dy,
              opacity: reveal,
              transform: `translateY(${interpolate(reveal, [0, 1], [6, 0])}px)`,
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              flexDirection: isLeft ? 'row-reverse' : 'row',
            }}
          >
            <div
              style={{
                padding: '7px 11px',
                borderRadius: 999,
                background: 'rgba(249,250,248,0.90)',
                border: '1px solid rgba(10,63,77,0.14)',
                boxShadow: '0 8px 22px rgba(18,27,23,0.075)',
                color: accent,
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: 10.2,
                fontWeight: 800,
                letterSpacing: 0.15,
                whiteSpace: 'nowrap',
              }}
            >
              {label.text}
            </div>
            <div style={{width: 22, height: 1, background: 'rgba(10,63,77,0.25)'}} />
            <div style={{width: 5, height: 5, borderRadius: '50%', background: accent, boxShadow: '0 0 0 4px rgba(10,63,77,0.06)'}} />
          </div>
        );
      })}

      <div
        style={{
          position: 'absolute',
          left: ENGINE_X + shift + 18,
          top: 520,
          width: 294,
          minHeight: 52,
          padding: '11px 15px',
          borderRadius: 17,
          background: 'rgba(244,246,242,0.94)',
          border: '1px solid rgba(10,63,77,0.13)',
          boxShadow: '0 12px 30px rgba(18,27,23,0.09)',
          display: 'grid',
          placeItems: 'center',
          textAlign: 'center',
          color: '#15211D',
          fontFamily: roundedFamily,
          fontSize: 12.6,
          fontWeight: 900,
          lineHeight: 1.18,
        }}
      >
        G-KAIS interpreta el contexto y mueve cada oportunidad
      </div>
    </div>
  );
};

export const FinalMasterPolish: React.FC = () => {
  const frame = useCurrentFrame();
  const columnTop = Math.round(
    interpolate(frame, [382, 420], [34, 50], {
      ...clamp,
      easing: Easing.inOut(Easing.cubic),
    }),
  );

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <style>{`
        div[style*="width: 430px"][style*="height: 630px"][style*="z-index: 24"],
        div[style*="width: 430px"][style*="height: 630px"][style*="z-index: 26"],
        div[style*="width: 430px"][style*="height: 630px"][style*="z-index: 28"] {
          top: ${columnTop}px !important;
        }
        div[style*="bottom: -6px"][style*="letter-spacing: 2.2px"] {
          opacity: 0 !important;
        }
      `}</style>

      {externalOverlays.map((item, index) => (
        <ExternalLogoOverlay key={`${item.kind}-${index}`} item={item} />
      ))}
      <PhoneInboxLogos />
      <MotorNarrative />
    </AbsoluteFill>
  );
};
