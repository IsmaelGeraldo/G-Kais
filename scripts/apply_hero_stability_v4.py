from pathlib import Path


def require_replace(path: str, old: str, new: str, label: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"{label} not found in {path}")
    p.write_text(text.replace(old, new, 1))


# At 2x render, 0.5 composition px equals exactly 1 physical pixel.
scene = "motion/src/Scene01Cinematic.tsx"
clamp = "const clamp = {\n  extrapolateLeft: 'clamp' as const,\n  extrapolateRight: 'clamp' as const,\n};"
require_replace(
    scene,
    clamp,
    clamp + "\n\n// Keep animated UI aligned to the 2x render pixel grid.\nconst snapToRenderPixel = (value: number) => Math.round(value * 2) / 2;",
    "Scene01 snap helper anchor",
)
for old, new, label in [
    ("left: Math.round(x + driftX),", "left: snapToRenderPixel(x + driftX),", "notification x snap"),
    ("top: Math.round(y + driftY + interpolate(reveal, [0, 1], [16, 0])),", "top: snapToRenderPixel(y + driftY + interpolate(reveal, [0, 1], [16, 0])),", "notification y snap"),
    ("const cameraX = interpolate(frame, [0, 125], [0, -13], clamp);", "const cameraX = snapToRenderPixel(interpolate(frame, [0, 125], [0, -13], clamp));", "Scene01 cameraX snap"),
    ("const cameraY = interpolate(frame, [0, 125], [8, -4], clamp);", "const cameraY = snapToRenderPixel(interpolate(frame, [0, 125], [8, -4], clamp));", "Scene01 cameraY snap"),
    ("const phoneFloat = Math.sin(frame / 24) * 4;", "const phoneFloat = snapToRenderPixel(Math.sin(frame / 24) * 4);", "phone float snap"),
]:
    require_replace(scene, old, new, label)


intel = "motion/src/Scene01ToIntelligenceFlow.tsx"
require_replace(
    intel,
    clamp,
    clamp + "\n\nconst snapToRenderPixel = (value: number) => Math.round(value * 2) / 2;",
    "Intelligence snap helper anchor",
)
for old, new, label in [
    ("const floatY = Math.round(Math.sin((frame + index * 13) / 36));", "const floatY = 0;", "perpetual card bob"),
    (
        "const cameraX = interpolate(firstCamera, [0, 1], [0, -930]) + interpolate(secondCamera, [0, 1], [0, -110]) + interpolate(galleryCamera, [0, 1], [0, -510]);",
        "const cameraX = snapToRenderPixel(interpolate(firstCamera, [0, 1], [0, -930]) + interpolate(secondCamera, [0, 1], [0, -110]) + interpolate(galleryCamera, [0, 1], [0, -510]));",
        "Intelligence cameraX snap",
    ),
    (
        "const cameraY = interpolate(frame, [118, 222, 344, 466], [0, -5, -5, 2], {...clamp, easing: Easing.inOut(Easing.cubic)});",
        "const cameraY = snapToRenderPixel(interpolate(frame, [118, 222, 344, 466], [0, -5, -5, 2], {...clamp, easing: Easing.inOut(Easing.cubic)}));",
        "Intelligence cameraY snap",
    ),
]:
    require_replace(intel, old, new, label)


crm = "motion/src/UnifiedCRMScene.tsx"
crm_clamp = "const clamp = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};"
require_replace(
    crm,
    crm_clamp,
    crm_clamp + "\nconst snapToRenderPixel = (value: number) => Math.round(value * 2) / 2;",
    "CRM snap helper anchor",
)
for old, new, label in [
    ("const scroll = gentleScroll + exitScroll;", "const scroll = snapToRenderPixel(gentleScroll + exitScroll);", "CRM scroll snap"),
    (
        "transform:`perspective(1400px) translateY(${interpolate(reveal,[0,1],[30,0])}px) scale(${interpolate(reveal,[0,1],[.82,1])}) rotateX(${interpolate(reveal,[0,1],[3.5,0])}deg)`",
        "transform:`translateY(${snapToRenderPixel(interpolate(reveal,[0,1],[30,0]))}px)`",
        "CRM entrance transform",
    ),
    (
        "transform:`translateY(${(1-dropdownOpen)*-6}px) scale(${.98+dropdownOpen*.02})`",
        "transform:`translateY(${snapToRenderPixel((1-dropdownOpen)*-6)}px)`",
        "CRM dropdown transform",
    ),
]:
    require_replace(crm, old, new, label)

print("Anti-shimmer source pass applied successfully")
