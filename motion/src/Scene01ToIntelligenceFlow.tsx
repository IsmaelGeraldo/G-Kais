import React from 'react';
import {loadFont} from '@remotion/google-fonts/MPLUSRounded1c';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';
import {Scene01Cinematic} from './Scene01Cinematic';

const {fontFamily: roundedFamily} = loadFont('normal', {
  weights: ['700', '800', '900'],
  subsets: ['latin'],
});

const clamp = {
  extrapolateLeft: 'clamp' as const,
  extrapolateRight: 'clamp' as const,
};

const accent = '#0A3F4D';
const ink = '#111412';
const muted = '#66706B';
const WORLD_WIDTH = 3600;
const ENGINE_X = 1490;
const ENGINE_Y = 178;
const ENGINE_CENTER_X = ENGINE_X + 165;
const ENGINE_CENTER_Y = ENGINE_Y + 173;

const COL_W = 430;
const COL_GAP = 30;
const COL_X = [1760, 1760 + COL_W + COL_GAP, 1760 + (COL_W + COL_GAP) * 2];

type Seed = {
  label: string;
  x: number;
  y: number;
  width: number;
  hue: string;
  delay: number;
};

type OpportunityColumn = {
  id: 'dormant' | 'quote' | 'new';
  label: string;
  x: number;
  revealStart: number;
  context: Array<[string, string]>;
  priority: 'MEDIA' | 'ALTA';
  priorityText: string;
  brief: string;
  missing: string;
  help: string;
  action: string;
  owner: string;
};

const seeds: Seed[] = [
  {label: 'IG', x: 350, y: 116, width: 176, hue: '#C9487F', delay: 0},
  {label: 'WA', x: 300, y: 468, width: 188, hue: '#26A866', delay: 4},
  {label: '@', x: 405, y: 220, width: 165, hue: '#66747D', delay: 8},
  {label: 'F', x: 362, y: 366, width: 174, hue: accent, delay: 12},
  {label: 'IG', x: 48, y: 270, width: 170, hue: '#C9487F', delay: 16},
  {label: 'WA', x: 84, y: 106, width: 162, hue: '#26A866', delay: 20},
  {label: '@', x: 92, y: 584, width: 174, hue: '#66747D', delay: 24},
];

const columns: OpportunityColumn[] = [
  {
    id: 'dormant',
    label: 'LEAD DORMIDO',
    x: COL_X[0],
    revealStart: 286,
    context: [
      ['Negocio', 'Clínica estética'],
      ['Canal', 'Instagram'],
      ['Problema', 'Conversaciones sin continuidad'],
    ],
    priority: 'MEDIA',
    priorityText: 'Interés detectado sin seguimiento posterior',
    brief: 'Hay demanda, pero falta convertir las conversaciones en oportunidades con contexto y seguimiento.',
    missing: 'Qué tratamientos consultan y cuándo se considera un lead calificado.',
    help: 'Convertir cada consulta en una oportunidad con contexto, prioridad y siguiente paso.',
    action: 'Definir criterios de calificación y tipo de consulta',
    owner: 'Equipo comercial',
  },
  {
    id: 'quote',
    label: 'COTIZACIÓN',
    x: COL_X[1],
    revealStart: 365,
    context: [
      ['Negocio', 'Diseño interior'],
      ['Canal', 'Web + email'],
      ['Problema', 'Seguimiento irregular'],
    ],
    priority: 'ALTA',
    priorityText: 'Propuestas enviadas sin próxima acción definida',
    brief: 'Existe interés comercial, pero el proceso posterior a la cotización no está estandarizado.',
    missing: 'Cuántas cotizaciones quedan sin seguimiento cada semana',
    help: 'Definir responsable, fecha de seguimiento y próxima acción para cada oportunidad.',
    action: 'Medir cotizaciones abiertas y cadencia de seguimiento',
    owner: 'Equipo comercial',
  },
  {
    id: 'new',
    label: 'NUEVO LEAD',
    x: COL_X[2],
    revealStart: 414,
    context: [
      ['Negocio', 'Logística'],
      ['Volumen', '120 consultas/día'],
      ['Sistema actual', 'Excel + seguimiento manual'],
    ],
    priority: 'ALTA',
    priorityText: 'Demoras + volumen operativo + pérdida de oportunidades',
    brief: 'El problema principal no es generar más consultas, sino responder y dar seguimiento con consistencia.',
    missing: 'Tiempo promedio de respuesta y tamaño del equipo comercial',
    help: 'Centralizar contexto, priorizar qué necesita atención y mantener una próxima acción clara.',
    action: 'Revisar flujo actual y validar leads',
    owner: 'Equipo comercial',
  },
];

const leadSignalTargets = [
  {y: 122, start: 278, end: 310},
  {y: 229, start: 294, end: 328},
  {y: 374, start: 312, end: 350},
  {y: 548, start: 332, end: 372},
];

const cubic = (a: number, b: number, c: number, d: number, t: number) => {
  const u = 1 - t;
  return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d;
};

const engineShiftAt = (frame: number) =>
  interpolate(frame, [258, 342], [0, -185], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });

const SignalFlight: React.FC<{seed: Seed; index: number}> = ({seed, index}) => {
  const frame = useCurrentFrame();
  const launchStart = 132 + seed.delay;
  const launchEnd = 194 + Math.round(seed.delay * 0.55);
  const progress = interpolate(frame, [launchStart, launchEnd], [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });

  const startX = seed.x + seed.width / 2;
  const startY = seed.y + 26;
  const targetX = ENGINE_CENTER_X + (index - 3) * 5;
  const targetY = ENGINE_Y + 16;
  const c1x = startX + 220 + index * 16;
  const c1y = Math.max(58, startY - 80 - index * 5);
  const c2x = 1260 + index * 24;
  const c2y = 58 + index * 11;
  const x = cubic(startX, c1x, c2x, targetX, progress);
  const y = cubic(startY, c1y, c2y, targetY, progress);
  const opacity = interpolate(frame, [launchStart - 5, launchStart + 3, launchEnd - 3, launchEnd + 5], [0, 1, 1, 0], clamp);
  const pathOpacity = interpolate(frame, [launchStart - 5, launchStart + 8, launchEnd - 6, launchEnd + 6], [0, 0.26, 0.20, 0], clamp);
  const path = `M ${startX} ${startY} C ${c1x} ${c1y} ${c2x} ${c2y} ${targetX} ${targetY}`;
  const dash = interpolate(progress, [0, 1], [520, 0]);
  const scale = interpolate(progress, [0, 0.7, 1], [0.82, 1.08, 0.92], clamp);

  return (
    <>
      <svg width={WORLD_WIDTH} height="720" viewBox={`0 0 ${WORLD_WIDTH} 720`} style={{position: 'absolute', inset: 0, opacity: pathOpacity, pointerEvents: 'none'}}>
        <path d={path} fill="none" stroke={seed.hue} strokeWidth={1.1} strokeLinecap="round" strokeDasharray="36 22" strokeDashoffset={dash} opacity={0.58} />
        <path d={path} fill="none" stroke="rgba(255,255,255,0.78)" strokeWidth={0.55} strokeLinecap="round" strokeDasharray="10 62" strokeDashoffset={dash * 1.22} opacity={0.66} />
      </svg>
      <div style={{position: 'absolute', left: x, top: y, width: 14, height: 14, marginLeft: -7, marginTop: -7, borderRadius: '50%', background: `radial-gradient(circle at 35% 30%, #fff 0%, ${seed.hue} 46%, ${accent} 100%)`, boxShadow: `0 0 16px ${seed.hue}88, 0 0 30px rgba(10,63,77,0.20)`, opacity, transform: `scale(${scale}) translateZ(0)`, zIndex: 14}} />
    </>
  );
};

const OrbitingSignal: React.FC<{seed: Seed; index: number}> = ({seed, index}) => {
  const frame = useCurrentFrame();
  const arrival = 194 + Math.round(seed.delay * 0.55);
  const age = Math.max(0, frame - arrival);
  if (frame < arrival) return null;

  const acceleration = interpolate(age, [0, 58], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)});
  const angleDeg = -90 + age * (1.25 + acceleration * 4.7) + age * age * 0.032;
  const angle = (angleDeg * Math.PI) / 180;
  const radius = interpolate(acceleration, [0, 1], [142 - index * 2, 108 + (index % 3) * 4], clamp);
  const shift = engineShiftAt(frame);
  const x = ENGINE_CENTER_X + shift + Math.cos(angle) * radius;
  const y = ENGINE_CENTER_Y + Math.sin(angle) * radius;
  const fade = interpolate(age, [0, 78, 98], [1, 1, 0], clamp);
  const size = interpolate(acceleration, [0, 1], [11, 8], clamp);

  return <div style={{position: 'absolute', left: x, top: y, width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2, borderRadius: '50%', background: seed.hue, boxShadow: `0 0 ${12 + acceleration * 18}px ${seed.hue}AA, 0 0 ${24 + acceleration * 28}px rgba(10,63,77,0.24)`, opacity: fade, zIndex: 18}} />;
};

const EngineRing: React.FC<{size: number; speed: number; opacity: number; activation: number; dashed?: boolean}> = ({size, speed, opacity, activation, dashed = false}) => {
  const frame = useCurrentFrame();
  const angle = frame * speed * (1 + activation * 2.9);
  return (
    <div style={{position: 'absolute', width: size, height: size, left: '50%', top: '50%', marginLeft: -size / 2, marginTop: -size / 2, borderRadius: '50%', border: dashed ? '1px dashed rgba(10,63,77,0.42)' : '1px solid rgba(45,55,51,0.20)', boxShadow: activation > 0.35 ? `0 0 ${16 + activation * 18}px rgba(10,63,77,${0.08 + activation * 0.10})` : 'none', opacity, transform: `rotate(${angle}deg)`}}>
      <div style={{position: 'absolute', width: 8, height: 8, borderRadius: '50%', background: activation > 0.15 ? accent : '#707875', top: -4, left: '50%', marginLeft: -4, boxShadow: activation > 0.15 ? `0 0 ${12 + activation * 12}px rgba(10,63,77,0.55)` : 'none'}} />
    </div>
  );
};

const GKAISSystemCore: React.FC = () => {
  const frame = useCurrentFrame();
  const activation = interpolate(frame, [216, 286], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const reveal = interpolate(frame, [156, 214], [0.86, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const impact = interpolate(frame, [214, 228, 248, 274], [0, 1, 0.58, 0.18], clamp);
  const pulse = Math.sin((frame - 224) / 4.6) * 0.5 + 0.5;
  const corePulse = 1 + activation * 0.026 + activation * pulse * 0.021;
  const shift = engineShiftAt(frame);

  return (
    <div style={{position: 'absolute', left: ENGINE_X + shift, top: ENGINE_Y, width: 330, height: 360, transform: `scale(${reveal})`, transformOrigin: 'center center', zIndex: 10}}>
      <div style={{position: 'absolute', width: 330, height: 330, left: 0, top: 8, borderRadius: '50%', background: `radial-gradient(circle, rgba(10,63,77,${0.08 + activation * 0.11}) 0%, rgba(10,63,77,0.035) 37%, transparent 72%)`, filter: `blur(${14 - activation * 5}px)`}} />
      <EngineRing size={286} speed={0.16} opacity={0.56 + activation * 0.26} activation={activation} />
      <EngineRing size={238} speed={0.23} opacity={0.46 + activation * 0.30} activation={activation} dashed />
      <EngineRing size={196} speed={0.34} opacity={0.36 + activation * 0.40} activation={activation} />
      <div style={{position: 'absolute', left: '50%', top: '50%', width: 164, height: 164, marginLeft: -82, marginTop: -82, borderRadius: '50%', transform: `scale(${corePulse})`, background: 'radial-gradient(circle at 34% 27%, rgba(255,255,255,0.94), rgba(224,228,225,0.83) 17%, rgba(102,111,107,0.88) 38%, rgba(25,31,28,0.98) 63%, #0B0E0C 100%)', border: '1px solid rgba(255,255,255,0.72)', boxShadow: `inset 0 2px 2px rgba(255,255,255,0.52), inset 0 -18px 36px rgba(0,0,0,0.26), 0 28px 64px rgba(13,18,16,0.30), 0 0 ${20 + activation * 50}px rgba(10,63,77,${0.05 + activation * 0.22})`, overflow: 'hidden'}}>
        <div style={{position: 'absolute', inset: 11, borderRadius: '50%', background: 'repeating-conic-gradient(from 12deg, rgba(255,255,255,0.34) 0deg 2deg, transparent 2deg 17deg)', opacity: 0.45 + activation * 0.30, transform: `rotate(${frame * (0.18 + activation * 0.42)}deg)`}} />
        <div style={{position: 'absolute', inset: 34, borderRadius: '50%', background: `radial-gradient(circle at 42% 34%, rgba(255,255,255,0.95), rgba(10,63,77,${0.16 + activation * 0.46}) 38%, #101613 76%)`, boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.17), 0 0 ${14 + activation * 28}px rgba(10,63,77,${0.16 + activation * 0.34})`}} />
        <div style={{position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#fff', fontFamily: roundedFamily, fontWeight: 900, letterSpacing: 1.2, fontSize: 15, textShadow: '0 1px 12px rgba(0,0,0,0.34)'}}>G-KAIS</div>
      </div>
      <div style={{position: 'absolute', left: 17, right: 17, top: 14, bottom: 14, borderRadius: '50%', border: `1px solid rgba(10,63,77,${0.06 + impact * 0.26})`, transform: `scale(${1 + impact * 0.11})`, opacity: impact}} />
      <div style={{position: 'absolute', left: 70, right: 70, bottom: -6, textAlign: 'center', fontFamily: roundedFamily, fontSize: 10, letterSpacing: 2.2, fontWeight: 900, color: '#5F6964', opacity: interpolate(frame, [205, 226], [0, 1], clamp)}}>SYSTEM CORE</div>
    </div>
  );
};

const OutgoingSignal: React.FC<{index: number}> = ({index}) => {
  const frame = useCurrentFrame();
  const target = leadSignalTargets[index];
  const progress = interpolate(frame, [target.start, target.end], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const engineShift = engineShiftAt(frame);
  const startX = ENGINE_CENTER_X + engineShift + 92;
  const startY = ENGINE_CENTER_Y + (index - 1.5) * 8;
  const targetX = COL_X[0] - 12;
  const targetY = target.y;
  const c1x = startX + 145;
  const c1y = startY - 35 + index * 18;
  const c2x = targetX - 125;
  const c2y = targetY - 25 + index * 12;
  const x = cubic(startX, c1x, c2x, targetX, progress);
  const y = cubic(startY, c1y, c2y, targetY, progress);
  const opacity = interpolate(frame, [target.start - 3, target.start + 3, target.end - 2, target.end + 8], [0, 1, 1, 0], clamp);
  const pathOpacity = interpolate(frame, [target.start - 5, target.start + 7, target.end, target.end + 10], [0, 0.28, 0.20, 0], clamp);
  const path = `M ${startX} ${startY} C ${c1x} ${c1y} ${c2x} ${c2y} ${targetX} ${targetY}`;

  return (
    <>
      <svg width={WORLD_WIDTH} height="720" viewBox={`0 0 ${WORLD_WIDTH} 720`} style={{position: 'absolute', inset: 0, pointerEvents: 'none', opacity: pathOpacity, zIndex: 15}}>
        <path d={path} fill="none" stroke={accent} strokeWidth={1.25} strokeLinecap="round" strokeDasharray="18 14" opacity={0.72} />
        <path d={path} fill="none" stroke="rgba(255,255,255,0.82)" strokeWidth={0.55} strokeLinecap="round" strokeDasharray="7 34" opacity={0.82} />
      </svg>
      <div style={{position: 'absolute', left: x, top: y, width: 10, height: 10, marginLeft: -5, marginTop: -5, borderRadius: '50%', background: accent, boxShadow: '0 0 14px rgba(10,63,77,0.62), 0 0 30px rgba(10,63,77,0.20)', opacity, zIndex: 20}} />
    </>
  );
};

const HeaderIcon: React.FC<{symbol: string; dark?: boolean}> = ({symbol, dark = false}) => (
  <div style={{width: 22, height: 22, borderRadius: 8, border: dark ? '1px solid rgba(255,255,255,0.18)' : '1px solid rgba(10,63,77,0.18)', display: 'grid', placeItems: 'center', color: dark ? '#BBD0CC' : accent, fontSize: 11, fontWeight: 900, background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(10,63,77,0.035)'}}>{symbol}</div>
);

const ModuleHeader: React.FC<{title: string; symbol: string; dark?: boolean; right?: React.ReactNode}> = ({title, symbol, dark = false, right}) => (
  <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10}}>
    <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
      <HeaderIcon symbol={symbol} dark={dark} />
      <div style={{fontSize: 12, letterSpacing: 1.15, fontWeight: 900, color: dark ? '#9EC0BA' : accent}}>{title}</div>
    </div>
    {right}
  </div>
);

const OpportunityStack: React.FC<{column: OpportunityColumn; index: number}> = ({column, index}) => {
  const frame = useCurrentFrame();
  const reveal = interpolate(frame, [column.revealStart, column.revealStart + 24], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const offsetX = Math.round(interpolate(reveal, [0, 1], [34, 0]));
  const floatY = Math.round(Math.sin((frame + index * 13) / 36));
  const cardBg = 'rgba(255,255,255,0.965)';
  const border = '1px solid rgba(10,63,77,0.13)';
  const shadow = '0 14px 34px rgba(22,30,26,0.11)';

  return (
    <div style={{position: 'absolute', left: column.x, top: 34 + floatY, width: COL_W, height: 630, opacity: reveal, transform: `translate3d(${offsetX}px, 0, 0)`, zIndex: 24 + index * 2}}>
      <div style={{height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 9}}>
        <div style={{padding: '8px 17px', borderRadius: 999, background: 'rgba(255,255,255,0.90)', border: '1px solid rgba(10,63,77,0.16)', boxShadow: '0 8px 22px rgba(18,26,22,0.08)', fontFamily: roundedFamily, color: accent, fontSize: 12.5, fontWeight: 900, letterSpacing: 0.95}}>{column.label}</div>
      </div>

      <div style={{position: 'absolute', left: 0, top: 48, width: COL_W, height: 116, padding: '14px 16px', borderRadius: 19, background: cardBg, border, boxShadow: shadow}}>
        <ModuleHeader title="CONTEXTO CAPTURADO" symbol="▤" right={<div style={{fontSize: 11, fontWeight: 900, color: accent}}>3/9</div>} />
        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1.08fr', gap: 8, marginTop: 10}}>
          {column.context.map(([label, value]) => (
            <div key={label} style={{minHeight: 58, borderRadius: 12, background: '#F6F7F5', padding: '9px 9px 8px', border: '1px solid rgba(15,22,18,0.025)'}}>
              <div style={{fontSize: 10, fontWeight: 700, color: '#737C77', lineHeight: 1.15}}>{label}</div>
              <div style={{fontSize: 13, color: ink, fontWeight: 800, lineHeight: 1.18, marginTop: 6}}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{position: 'absolute', left: 0, top: 176, width: COL_W, height: 82, padding: '13px 16px', borderRadius: 19, background: cardBg, border, boxShadow: shadow}}>
        <ModuleHeader title="PRIORIDAD" symbol="◎" right={<div style={{padding: '5px 11px', borderRadius: 999, border: '1px solid rgba(10,63,77,0.22)', background: 'rgba(10,63,77,0.065)', color: accent, fontSize: 11.5, fontWeight: 900, letterSpacing: 0.55}}>{column.priority}</div>} />
        <div style={{fontSize: 13.5, fontWeight: 600, color: '#59635E', lineHeight: 1.25, marginTop: 11, paddingRight: 4}}>{column.priorityText}</div>
      </div>

      <div style={{position: 'absolute', left: 0, top: 270, width: COL_W, height: 180, padding: '14px 16px', borderRadius: 19, background: cardBg, border, boxShadow: shadow}}>
        <ModuleHeader title="AI BRIEF" symbol="✦" right={<div style={{fontSize: 11.2, fontWeight: 900, letterSpacing: 0.9, color: accent}}>LISTO</div>} />
        <div style={{fontSize: 14.5, fontWeight: 800, color: ink, lineHeight: 1.27, marginTop: 9}}>{column.brief}</div>
        <div style={{marginTop: 9, paddingTop: 8, borderTop: '1px solid rgba(16,18,17,0.08)'}}>
          <div style={{fontSize: 10.2, fontWeight: 900, letterSpacing: 0.8, color: accent}}>FALTA SABER</div>
          <div style={{fontSize: 12.4, color: '#59635E', lineHeight: 1.23, marginTop: 3}}>{column.missing}</div>
        </div>
        <div style={{marginTop: 7}}>
          <div style={{fontSize: 10.2, fontWeight: 900, letterSpacing: 0.8, color: accent}}>CÓMO PUEDE AYUDAR</div>
          <div style={{fontSize: 12.4, color: '#59635E', lineHeight: 1.23, marginTop: 3}}>{column.help}</div>
        </div>
      </div>

      <div style={{position: 'absolute', left: 0, top: 462, width: COL_W, height: 92, padding: '13px 15px', borderRadius: 19, background: '#0B201E', color: '#fff', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 18px 40px rgba(5,18,16,0.23)'}}>
        <ModuleHeader title="PRÓXIMA ACCIÓN" symbol="✓" dark />
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 8}}>
          <div style={{fontFamily: roundedFamily, fontSize: 14.8, fontWeight: 900, lineHeight: 1.15, maxWidth: 262}}>{column.action}</div>
          <div style={{padding: '8px 10px', borderRadius: 999, background: '#F7F8F6', color: ink, fontSize: 10.3, fontWeight: 800, whiteSpace: 'nowrap', border: '1px solid rgba(255,255,255,0.78)'}}>{column.owner}</div>
        </div>
      </div>

      {[106, 217, 360, 508].map((y, i) => (
        <div key={i} style={{position: 'absolute', left: -5, top: y, width: 9, height: 9, borderRadius: '50%', background: accent, boxShadow: '0 0 0 4px rgba(10,63,77,0.07), 0 0 12px rgba(10,63,77,0.20)'}} />
      ))}
    </div>
  );
};

const FrameDissolveMasks: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [112, 142, 206], [0, 1, 1], clamp);
  const bg = 'rgba(224,226,222,0.96)';
  return (
    <>
      <div style={{position: 'absolute', left: 0, top: 0, width: 1325, height: 54, background: `linear-gradient(180deg, ${bg}, rgba(224,226,222,0.45), transparent)`, filter: 'blur(3px)', opacity, zIndex: 8}} />
      <div style={{position: 'absolute', left: 0, bottom: 0, width: 1325, height: 56, background: `linear-gradient(0deg, ${bg}, rgba(224,226,222,0.45), transparent)`, filter: 'blur(3px)', opacity, zIndex: 8}} />
      <div style={{position: 'absolute', left: 0, top: 0, width: 55, height: 720, background: `linear-gradient(90deg, ${bg}, rgba(224,226,222,0.34), transparent)`, filter: 'blur(3px)', opacity, zIndex: 8}} />
      <div style={{position: 'absolute', left: 1200, top: 0, width: 150, height: 720, background: `linear-gradient(90deg, transparent, rgba(224,226,222,0.72) 48%, ${bg})`, filter: 'blur(6px)', opacity, zIndex: 8}} />
    </>
  );
};

const FlowScene: React.FC = () => {
  const frame = useCurrentFrame();
  const firstCamera = interpolate(frame, [118, 222], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const secondCamera = interpolate(frame, [232, 350], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const galleryCamera = interpolate(frame, [344, 466], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const cameraX = interpolate(firstCamera, [0, 1], [0, -930]) + interpolate(secondCamera, [0, 1], [0, -110]) + interpolate(galleryCamera, [0, 1], [0, -510]);
  const cameraScale = interpolate(frame, [118, 222, 344, 466], [1, 1.032, 1.032, 0.82], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const cameraY = interpolate(frame, [118, 222, 344, 466], [0, -5, -5, 2], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const scene01Opacity = interpolate(frame, [150, 222], [1, 0], clamp);
  const scene01Blur = interpolate(frame, [158, 220], [0, 2.2], clamp);

  return (
    <AbsoluteFill style={{overflow: 'hidden', background: 'radial-gradient(circle at 72% 44%, rgba(255,255,255,0.90), transparent 30%), linear-gradient(135deg, #CFD0CD 0%, #E8E9E5 50%, #C8CBC8 100%)'}}>
      <div style={{position: 'absolute', left: 0, top: 0, width: WORLD_WIDTH, height: 720, transform: `translate3d(${cameraX}px, ${cameraY}px, 0) scale(${cameraScale})`, transformOrigin: '640px 360px', willChange: 'transform'}}>
        <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(circle at 28% 38%, rgba(255,255,255,0.58), transparent 24%), radial-gradient(circle at 74% 46%, rgba(10,63,77,0.045), transparent 31%), linear-gradient(135deg, #CFD0CD 0%, #E9EAE6 54%, #C8CBC8 100%)'}} />
        <div style={{position: 'absolute', left: 0, top: 0, width: 1280, height: 720, opacity: scene01Opacity, filter: `blur(${scene01Blur}px)`}}><Scene01Cinematic /></div>
        <FrameDissolveMasks />
        <div style={{position: 'absolute', left: 1135, top: 0, width: 500, height: 720, background: 'linear-gradient(90deg, rgba(226,228,224,0) 0%, rgba(226,228,224,0.34) 35%, rgba(226,228,224,0.60) 70%, rgba(226,228,224,0) 100%)', filter: 'blur(20px)', opacity: interpolate(frame, [126, 174, 230], [0, 0.48, 0.10], clamp), pointerEvents: 'none', zIndex: 9}} />
        <div style={{position: 'absolute', left: 1350, top: 60, width: 720, height: 590, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.60), rgba(10,63,77,0.032) 42%, transparent 70%)', filter: 'blur(18px)', zIndex: 2}} />
        <div style={{position: 'absolute', left: 1700, top: 20, width: 1700, height: 670, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.64), rgba(10,63,77,0.018) 46%, transparent 74%)', filter: 'blur(24px)', zIndex: 1}} />

        {seeds.map((seed, index) => <SignalFlight key={`flight-${index}`} seed={seed} index={index} />)}
        <GKAISSystemCore />
        {seeds.map((seed, index) => <OrbitingSignal key={`orbit-${index}`} seed={seed} index={index} />)}
        {leadSignalTargets.map((_, index) => <OutgoingSignal key={`out-${index}`} index={index} />)}
        {columns.map((column, index) => <OpportunityStack key={column.id} column={column} index={index} />)}
      </div>
    </AbsoluteFill>
  );
};

export const Scene01ToIntelligenceFlow: React.FC = () => <FlowScene />;
