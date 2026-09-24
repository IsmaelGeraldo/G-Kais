#!/usr/bin/env bash
set -euo pipefail

MASTER_SHA="c1bdba148c8169dfba351bbe892c98b9fa08991d"
TAG="gkais-hero-master-clean-v7"

# Restore only the four Remotion files that diverged from the approved master.
git checkout "$MASTER_SHA" -- \
  motion/src/Scene01Cinematic.tsx \
  motion/src/Scene01ToIntelligenceFlow.tsx \
  motion/src/Scene01ToCRMPreview.tsx \
  motion/src/UnifiedCRMScene.tsx

python3 - <<'PY'
from pathlib import Path

# Scene 01: preserve the master's motion/timing and only align translation
# to the physical pixel grid of the 2x render.
p = Path('motion/src/Scene01Cinematic.tsx')
s = p.read_text()
anchor = "const clamp = {\n  extrapolateLeft: 'clamp' as const,\n  extrapolateRight: 'clamp' as const,\n};"
replacement = anchor + "\n\nconst snapToRenderPixel = (value: number) => Math.round(value * 2) / 2;"
if anchor not in s:
    raise SystemExit('Scene01Cinematic clamp anchor not found')
s = s.replace(anchor, replacement, 1)
for old, new in [
    ("left: Math.round(x + driftX),", "left: snapToRenderPixel(x + driftX),"),
    ("top: Math.round(y + driftY + interpolate(reveal, [0, 1], [16, 0])),", "top: snapToRenderPixel(y + driftY + interpolate(reveal, [0, 1], [16, 0])),"),
    ("const cameraX = interpolate(frame, [0, 125], [0, -13], clamp);", "const cameraX = snapToRenderPixel(interpolate(frame, [0, 125], [0, -13], clamp));"),
    ("const cameraY = interpolate(frame, [0, 125], [8, -4], clamp);", "const cameraY = snapToRenderPixel(interpolate(frame, [0, 125], [8, -4], clamp));"),
    ("const phoneFloat = Math.sin(frame / 24) * 4;", "const phoneFloat = snapToRenderPixel(Math.sin(frame / 24) * 4);"),
]:
    if old not in s:
        raise SystemExit(f'Scene01Cinematic replacement not found: {old}')
    s = s.replace(old, new, 1)
p.write_text(s)

# Intelligence scene: keep every master timing, camera scale, card geometry and
# typography. Remove only the perpetual +/-1 px bob and snap camera translation.
p = Path('motion/src/Scene01ToIntelligenceFlow.tsx')
s = p.read_text()
anchor = "const clamp = {\n  extrapolateLeft: 'clamp' as const,\n  extrapolateRight: 'clamp' as const,\n};"
replacement = anchor + "\n\nconst snapToRenderPixel = (value: number) => Math.round(value * 2) / 2;"
if anchor not in s:
    raise SystemExit('Intelligence clamp anchor not found')
s = s.replace(anchor, replacement, 1)
for old, new in [
    ("const floatY = Math.round(Math.sin((frame + index * 13) / 36));", "const floatY = 0;"),
    ("const cameraX = interpolate(firstCamera, [0, 1], [0, -930]) + interpolate(secondCamera, [0, 1], [0, -110]) + interpolate(galleryCamera, [0, 1], [0, -510]);", "const cameraX = snapToRenderPixel(interpolate(firstCamera, [0, 1], [0, -930]) + interpolate(secondCamera, [0, 1], [0, -110]) + interpolate(galleryCamera, [0, 1], [0, -510]));"),
    ("const cameraY = interpolate(frame, [118, 222, 344, 466], [0, -5, -5, 2], {...clamp, easing: Easing.inOut(Easing.cubic)});", "const cameraY = snapToRenderPixel(interpolate(frame, [118, 222, 344, 466], [0, -5, -5, 2], {...clamp, easing: Easing.inOut(Easing.cubic)}));"),
]:
    if old not in s:
        raise SystemExit(f'Intelligence replacement not found: {old}')
    s = s.replace(old, new, 1)
p.write_text(s)

# CRM: keep the approved 3D entrance, dropdown, interactions, cursor and exit.
# Only the intended scroll is aligned to physical pixels.
p = Path('motion/src/UnifiedCRMScene.tsx')
s = p.read_text()
anchor = "const clamp = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};"
replacement = anchor + "\nconst snapToRenderPixel = (value: number) => Math.round(value * 2) / 2;"
if anchor not in s:
    raise SystemExit('CRM clamp anchor not found')
s = s.replace(anchor, replacement, 1)
old = "const scroll = gentleScroll + exitScroll;"
new = "const scroll = snapToRenderPixel(gentleScroll + exitScroll);"
if old not in s:
    raise SystemExit('CRM scroll anchor not found')
s = s.replace(old, new, 1)
p.write_text(s)
PY

sudo apt-get update
sudo apt-get install -y ffmpeg

pushd motion >/dev/null
npm install --no-audit --no-fund
npx remotion compositions src/gkais-final-master-index.tsx
npx remotion browser ensure
mkdir -p out
npx remotion render src/gkais-final-master-index.tsx GKAISFinalMaster out/gkais-hero-master-clean-v7-master.mp4 \
  --codec=h264 \
  --scale=2 \
  --crf=0 \
  --pixel-format=yuv444p \
  --concurrency=4
popd >/dev/null

ffmpeg -y -i motion/out/gkais-hero-master-clean-v7-master.mp4 \
  -an -c:v libvpx-vp9 -b:v 0 -crf 10 -pix_fmt yuv444p \
  -row-mt 1 -tile-columns 2 -speed 2 \
  motion/out/gkais-hero-master-clean-v7.webm

ffmpeg -y -i motion/out/gkais-hero-master-clean-v7-master.mp4 \
  -an -c:v libx264 -preset slow -crf 6 -pix_fmt yuv420p -movflags +faststart \
  motion/out/gkais-hero-master-clean-v7.mp4

for f in motion/out/gkais-hero-master-clean-v7.webm motion/out/gkais-hero-master-clean-v7.mp4; do
  ffprobe -v error -select_streams v:0 \
    -show_entries stream=width,height,r_frame_rate,pix_fmt \
    -show_entries format=duration,size \
    -of default=noprint_wrappers=1 "$f"
  test "$(ffprobe -v error -select_streams v:0 -show_entries stream=width -of default=nw=1:nk=1 "$f")" = "2560"
  test "$(ffprobe -v error -select_streams v:0 -show_entries stream=height -of default=nw=1:nk=1 "$f")" = "1440"
done
test "$(ffprobe -v error -select_streams v:0 -show_entries stream=pix_fmt -of default=nw=1:nk=1 motion/out/gkais-hero-master-clean-v7.webm)" = "yuv444p"

gh release delete "$TAG" -y --cleanup-tag || true
gh release create "$TAG" \
  motion/out/gkais-hero-master-clean-v7.webm \
  motion/out/gkais-hero-master-clean-v7.mp4 \
  --title "G-KAIS Hero Master Clean v7" \
  --notes "Approved #117 master restored. Only physical-pixel alignment, removal of the +/-1px gallery bob, and CRM scroll pixel snapping are applied. Desktop render is native 1280x720 at 2x scale to 2560x1440, with VP9 4:4:4 primary and high-quality H.264 fallback." \
  --target "$GITHUB_SHA"

python3 - <<'PY'
from pathlib import Path
p = Path('src/components/HeroVideo.tsx')
s = p.read_text()
old_const = '''const HERO_VIDEO_DESKTOP =
  "https://github.com/IsmaelGeraldo/G-Kais/releases/download/gkais-hero-native-v6/gkais-hero-native-v6.mp4";'''
new_const = '''const HERO_VIDEO_DESKTOP_WEBM =
  "https://github.com/IsmaelGeraldo/G-Kais/releases/download/gkais-hero-master-clean-v7/gkais-hero-master-clean-v7.webm";
const HERO_VIDEO_DESKTOP_MP4 =
  "https://github.com/IsmaelGeraldo/G-Kais/releases/download/gkais-hero-master-clean-v7/gkais-hero-master-clean-v7.mp4";'''
if old_const not in s:
    raise SystemExit('Current v6 desktop source constant not found')
s = s.replace(old_const, new_const, 1)
old_source = '          <source src={HERO_VIDEO_DESKTOP} type="video/mp4" />'
new_source = '''          <source src={HERO_VIDEO_DESKTOP_WEBM} type="video/webm" />
          <source src={HERO_VIDEO_DESKTOP_MP4} type="video/mp4" />'''
if old_source not in s:
    raise SystemExit('Current desktop source element not found')
s = s.replace(old_source, new_source, 1)
p.write_text(s)
PY

# The branch must contain only the master restoration/stability changes and the
# desktop source switch. Temporary render files are never committed.
python3 - <<'PY'
import subprocess
allowed = {
    'motion/src/Scene01Cinematic.tsx',
    'motion/src/Scene01ToIntelligenceFlow.tsx',
    'motion/src/Scene01ToCRMPreview.tsx',
    'motion/src/UnifiedCRMScene.tsx',
    'src/components/HeroVideo.tsx',
    '.github/workflows/render-hero-master-clean-v7.yml',
    'scripts/render-hero-master-clean-v7.sh',
}
lines = subprocess.check_output(['git','status','--porcelain'], text=True).splitlines()
paths = {line[3:] for line in lines}
unexpected = paths - allowed
if unexpected:
    raise SystemExit(f'Unexpected changed files: {sorted(unexpected)}')
PY

rm -f .github/workflows/render-hero-master-clean-v7.yml scripts/render-hero-master-clean-v7.sh
git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git add motion/src/Scene01Cinematic.tsx \
        motion/src/Scene01ToIntelligenceFlow.tsx \
        motion/src/Scene01ToCRMPreview.tsx \
        motion/src/UnifiedCRMScene.tsx \
        src/components/HeroVideo.tsx
git add -u .github/workflows/render-hero-master-clean-v7.yml scripts/render-hero-master-clean-v7.sh
git commit -m "Restore approved master and render clean anti-shimmer hero"
git push origin HEAD:fix/hero-master-clean-v7
