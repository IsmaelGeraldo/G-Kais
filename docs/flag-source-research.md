# Flag source decision

This file records the source decision for the Dashboard map.

- Country flag assets: `country-flag-icons` (SVG, ISO-3166-oriented, local package assets).
- Map geometry remains SVG country geometry already used by the Dashboard.
- Active countries should use the real SVG flag artwork as a clipped/patterned fill where supported; list rows use the same real SVG flag source.
- No emoji flags and no hand-authored country palettes are used for the production rendering.

Rationale: deterministic cross-platform rendering, no runtime CDN dependency, and one source of truth for flag artwork.
