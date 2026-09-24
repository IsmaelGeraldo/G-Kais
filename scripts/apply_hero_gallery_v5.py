from pathlib import Path

flow = Path('motion/src/Scene01ToIntelligenceFlow.tsx')
s = flow.read_text()

replacements = [
    (
        "const secondCamera = interpolate(frame, [232, 350], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});",
        "const secondCamera = interpolate(frame, [220, 342], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});",
    ),
    (
        "const galleryCamera = interpolate(frame, [344, 466], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});",
        "const galleryCamera = interpolate(frame, [336, 458], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});",
    ),
    (
        "const cameraScale = interpolate(frame, [118, 222, 344, 466], [1, 1.032, 1.032, 0.82], {...clamp, easing: Easing.inOut(Easing.cubic)});",
        "const cameraScale = interpolate(frame, [118, 222, 248, 280], [1, 1.032, 1.032, 0.82], {...clamp, easing: Easing.inOut(Easing.cubic)});",
    ),
    (
        "const cameraY = snapToRenderPixel(interpolate(frame, [118, 222, 344, 466], [0, -5, -5, 2], {...clamp, easing: Easing.inOut(Easing.cubic)}));",
        "const cameraY = snapToRenderPixel(interpolate(frame, [118, 222, 248, 280], [0, -5, -5, 2], {...clamp, easing: Easing.inOut(Easing.cubic)}));",
    ),
    (
        "transform: `translate3d(${offsetX}px, 0, 0)`",
        "transform: `translateX(${offsetX}px)`",
    ),
    (
        "{column.context.map(([label, value]) => (\n            <div key={label} style={{minHeight: 58, borderRadius: 12, background: '#F6F7F5', padding: '9px 9px 8px', border: '1px solid rgba(15,22,18,0.025)'}}>",
        "{column.context.map(([label, value], contextIndex) => (\n            <div key={label} style={{minHeight: 58, padding: '8px 10px 7px', borderLeft: contextIndex === 0 ? '0' : '1px solid rgba(10,63,77,0.10)'}}>",
    ),
]

for old, new in replacements:
    if old not in s:
        raise SystemExit(f'Missing expected intelligence-flow pattern: {old[:100]}')
    s = s.replace(old, new, 1)

old_action = """      <div style={{position: 'absolute', left: 0, top: 462, width: COL_W, height: 92, padding: '13px 15px', borderRadius: 19, background: '#0B201E', color: '#fff', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 18px 40px rgba(5,18,16,0.23)'}}>
        <ModuleHeader title=\"PRÓXIMA ACCIÓN\" symbol=\"✓\" dark />
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 8}}>
          <div style={{fontFamily: roundedFamily, fontSize: 14.8, fontWeight: 900, lineHeight: 1.15, maxWidth: 262}}>{column.action}</div>
          <div style={{padding: '8px 10px', borderRadius: 999, background: '#F7F8F6', color: ink, fontSize: 10.3, fontWeight: 800, whiteSpace: 'nowrap', border: '1px solid rgba(255,255,255,0.78)'}}>{column.owner}</div>
        </div>
      </div>"""
new_action = """      <div style={{position: 'absolute', left: 0, top: 458, width: COL_W, height: 108, padding: '14px 16px 13px', borderRadius: 19, background: '#0B201E', color: '#fff', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 18px 40px rgba(5,18,16,0.23)'}}>
        <ModuleHeader title=\"PRÓXIMA ACCIÓN\" symbol=\"✓\" dark />
        <div style={{display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', alignItems: 'center', gap: 10, marginTop: 10}}>
          <div style={{fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 14.5, fontWeight: 800, lineHeight: 1.2, color: '#F7FAF9', paddingRight: 2}}>{column.action}</div>
          <div style={{padding: '7px 9px', borderRadius: 999, background: '#F7F8F6', color: ink, fontSize: 10, fontWeight: 800, whiteSpace: 'nowrap', border: '1px solid rgba(255,255,255,0.78)'}}>{column.owner}</div>
        </div>
      </div>"""
if old_action not in s:
    raise SystemExit('Missing expected next-action card block')
s = s.replace(old_action, new_action, 1)
flow.write_text(s)

preview = Path('motion/src/Scene01ToCRMPreview.tsx')
s = preview.read_text()
old_logic = """  const recede = interpolate(frame, [482, 526], [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });

  const intelligenceOpacity = interpolate(frame, [494, 526], [1, 0.10], clamp);
  const intelligenceBlur = interpolate(recede, [0, 1], [0, 2.2], clamp);
  const intelligenceScale = interpolate(recede, [0, 1], [1, 0.91], clamp);
  const intelligenceY = interpolate(recede, [0, 1], [0, 12], clamp);"""
new_logic = """  // Keep opportunity text on a fixed raster until the handoff.
  // Fade only: no blur, scale or fractional translation over readable UI text.
  const intelligenceOpacity = interpolate(frame, [500, 526], [1, 0], clamp);"""
if old_logic not in s:
    raise SystemExit('Missing expected CRM-preview recede logic')
s = s.replace(old_logic, new_logic, 1)
old_style = """          opacity: intelligenceOpacity,
          filter: `blur(${intelligenceBlur}px)`,
          transform: `translateY(${intelligenceY}px) scale(${intelligenceScale})`,
          transformOrigin: '50% 50%',"""
if old_style not in s:
    raise SystemExit('Missing expected CRM-preview wrapper style')
s = s.replace(old_style, "          opacity: intelligenceOpacity,", 1)
s = s.replace("import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';", "import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';", 1)
preview.write_text(s)

hero = Path('src/components/HeroVideo.tsx')
s = hero.read_text()
old_constants = """const HERO_VIDEO_DESKTOP_WEBM =
  \"https://github.com/IsmaelGeraldo/G-Kais/releases/download/gkais-hero-stable-v4/gkais-hero-stable-v4.webm\";
const HERO_VIDEO_DESKTOP_MP4 =
  \"https://github.com/IsmaelGeraldo/G-Kais/releases/download/gkais-hero-stable-v4/gkais-hero-stable-v4.mp4\";"""
new_constants = """const HERO_VIDEO_DESKTOP =
  \"https://github.com/IsmaelGeraldo/G-Kais/releases/download/gkais-hero-stable-v5/gkais-hero-stable-v5.mp4\";"""
if old_constants not in s:
    raise SystemExit('Expected v4 desktop constants not found')
s = s.replace(old_constants, new_constants, 1)
old_sources = """          <source src={HERO_VIDEO_DESKTOP_WEBM} type=\"video/webm\" />
          <source src={HERO_VIDEO_DESKTOP_MP4} type=\"video/mp4\" />"""
new_sources = """          <source src={HERO_VIDEO_DESKTOP} type=\"video/mp4\" />"""
if old_sources not in s:
    raise SystemExit('Expected v4 desktop source elements not found')
hero.write_text(s.replace(old_sources, new_sources, 1))
