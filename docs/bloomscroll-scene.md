# Bloomscroll scene: build plan

The Bloomscroll page (`/feed`) opens with an animated festival scene: the visitor walks down a path towards a night-time music festival, then the posts follow below. This plan describes how the approved design becomes production code. **The approved design is the specification. Nothing in the scene may drift from it.**

## Reference

- Approved design (2026-10-25): `../docs/design/bloomscroll/approved-v2-2026-10-25/` in the parent folder (outside this repo), read-only.
  - `bloomscroll-parallax-approved-v2.html`: the page that was signed off, as one self-contained file.
  - `source/index.html` and `source/assets/`: the same page with separate images.
- In this document, "the reference" means `source/index.html`.

**One festival on every screen (owner decision, 2026-10-25).** The reference only shows the concert (DJ, neon crowd and its bounce, turning wheel, code fire, concert lights) on phones; desktop and tablet still show the earlier wide festival. That gap is not accepted for the real build. Desktop and tablet get the same concert festival as phones. They keep their own wide far painting and near frame, which differ only in shape.
- **Done:** the owner's wide concert painting (wheel and flames removed, stage recast as the concert) is in `festival-concert.webp`. The inputs, the cut script and the checks are in `../docs/design/bloomscroll/wide-concert-input-2026-10-25/`.
- Every concert effect runs on every screen. The positions of the lights, hoops, flames and crowd are measured from each painting. The wheel stands where the original wide festival painted it.
- **Tablet (portrait, 768 px and wider):** each festival group slides **6 %** of the painting's width toward the path. The approved value was 12 %, but the new left group is wider, so 6 % stops the groups overlapping (owner decision, 2026-10-25).
- **No flat edges at the top (owner decision, 2026-10-25).** At some window shapes the far painting and the desktop near frame start below the top of the scene, and their tree tops ended in a straight line. They now fade into the sky: the far painting over its top 18 % (desktop and tablet), the desktop near frame over its top 16 %. Nothing moves or changes size.

## How fidelity is guaranteed

1. **Port, don't reinterpret.** The scene component renders the reference's layer markup and runs the reference's layout and frame code (`layout`, `layoutPhone`, `frame`, the drawing functions) with the same constants. Only these changes are allowed:
   - Tuning panel values become constants: backdrop lag 0.55, walk-in zoom 0.18, near-frame speed 0.45.
   - Tuning switches become their approved defaults:
     - Festival life: **on**
     - Phone: new festival art: **on**
     - Phone: concert mode: **on**
     - Desktop: separate trees and flowers: **off**
     - Hold the scene while walking in: **on**
   - Test-only features are removed: the Tuning panel, the phone-frame preview, "Hide posts", the placeholder posts.
   - Code paths these defaults can never reach are removed, together with their images (listed under "Removed paths").
2. **Prove it.** An automated comparison renders the reference and the new page side by side, with the clock and random numbers fixed so both draw the same frames.
   - Screen sizes: 1440×900, 820×1180, 360×645 and 390×844.
   - Moments: load, mid-walk, scroll-away, and several animation frames.
   - It reports differences in layer positions and transforms, and in the scene's pixels.
   - Any difference is fixed before it counts as done. The tool and its results live next to the reference, outside this repo.

## Approved numbers (from the reference)

| Area | Value |
|---|---|
| Phone layout | width < **768 px** |
| Scene height | desktop and tablet `clamp(520px, 86svh, 900px)`; portrait 768 px and wider `100svh`; phone **4:5** box `min(125vw, 65svh)`, first post right below it |
| Hold (sticky walk-in) | 0.8 × scene height on desktop and tablet; none on phones |
| Scroll easing | `sy += (target − sy) · (1 − e^(−dt/0.085))`; pointer `e^(−dt/0.35)` |
| Book tilt (pointer) | `scale(1.03) rotateY(mx·2.2°) rotateX(−my·1.4°)` |
| Sky plate | lag 0.7, zoom +3 % |
| Backdrop (far painting, festival, glows, life layers) | lag **0.55**, walk-in zoom **0.18**, origin 50 % 63 % |
| Soft-focus far painting | opacity `smoothstep(0.05, 0.6, p) × 0.8` |
| Moon | rise `1 − smoothstep(700, 2300 ms)`, sink `max(rise, min(1, p × 1.5))`, glow `1 − smoothstep(0.35, 0.95, sink)`; rest `max(mw·0.9, min(h·0.45, h − mw·1.6))`, sunk `h + mw·0.8` (h = horizon or hill line); size `clamp(64px, 8vw, 150px)`, 46 px on portrait, 38 px on phone; x at 0.63 W (phone 0.56 W) + 0.05 W × sink |
| Near frame (desktop) | full painting 1.06 W wide, growth `1 + p·0.45·1.2` |
| Near frame (tablet, portrait) | tall trees 0.18 W, growth `1 + p·0.45·0.3`; flowers 1.1 W, growth `1 + p·0.45·0.6` |
| Flowers (phone) | wide painting 1.16 W, −8 % per side, growth `1 + p·0.45·0.6`; driven by `--approach` (0–1) |
| Ending (owner decision, 2026-10-25: the title and subtitle are gone) | the navbar's Bloomscroll mark (`BLOOMSCROLL_LOGO`, flower and wordmark) rises into the middle of the scene as the walk-in ends: `smoothstep(0.82, 1, walk)` (phones: walk = 3·p), up from +12 % of the scene height, scale 0.6 → 1, then floats ±0.6 % and glows; centred at 50 %, 38 %, width `clamp(220px, 44%, 560px)`, lag 0.45 on scroll-away. Reduced motion: already there. A hidden h1 keeps the page heading. The painted light-spinner will throw it there (plan Task 4). |
| Haze | opacity `0.7 + p·0.6` |
| Unfold (spring `from·e^(−6.5t)·cos(8.5t)`) | back 0 ms / 34°, flaps 380 ms / 80°, flowers 540 ms / 86° |
| Lights | on `smoothstep(1500, 1950 ms)`, fire `smoothstep(1700, 2150 ms)`, flicker `0.86 + 0.08 sin(t/90) + 0.06 sin(t/37 + 1.3)`, shimmer `0.94 + 0.06 sin(t/700)` |
| Fireflies | 18 far + 12 mid + 10 near (sizes 6, 11, 26 px); lags 0.55, 0.3, −0.45; phone: all in the scene, 2 faint in the air (30–50 % height, 40 % alpha), the rest at 58–92 % height, moving with the ground, front layer off; appear `smoothstep(1700, 2500 ms)` |
| Festival life | appears `smoothstep(1500, 2100 ms)`; string-light twinkle; fire tongues and embers; fire-hoop sparks (the right-hand fire dancers); cloud drift `sin(t/9000)·10 px` |
| Turning wheel (every screen) | centre (0.816, 0.493), radius 0.094 W, one turn per `9000·2π` ms, 12 gondolas, 24 rim bulbs, behind the tents |
| Phone festival | portrait concert painting, split at **55.5 %**; left group set down **8 %**, right group **4 %** of the scene height |
| Concert (every screen) | **124 bpm**; colours teal (98, 168, 172), chartreuse (206, 255, 29), magenta (255, 79, 216), violet (138, 92, 255), warm white (255, 238, 205), changing every 8 beats; beams, LED strip, LED panel pulse (the painted panel itself, tinted, so only its LED lines glow), strobe every 16 beats (a soft burst). The stage lights are drawn on their own canvas with faded edges, so no flash ever shows a box. |
| Crowd hop (QA round 2, owner request) | the dancers in front of the stage are cut out whole (`scripts/crowd_figures.py`) and hop as solid figures: a quick hop on each beat, rolling across the crowd from left to right; height 0.81 % (wide) / 0.7 % (phone) of the painting. At rest the painting is exactly the original. The painted light-spinner (wide) and the right-hand hoop girl (phone) are out of the paintings, and the light-hoop sparks are gone. The stage's back-right wall, painted the key magenta, is filled in from the wall around it (it used to cut out see-through). |
| Bottom fade | desktop and tablet 14 % of the scene height; phone 30 % |
| Reduced motion | everything still: moon up, lights on, no unfold, no hop, wheel still |
| Walk-in on phones | counts from the first pixel of scroll (phones have no hold), so the scene moves straight away |

## Where it lives in tag-web

| Part | Location |
|---|---|
| Scene (layers and engine) | `components/feed/BloomscrollScene.js` (client component; decorative, `aria-hidden`) |
| Scene styles | `styles/pages/bloomscroll.css`, imported in `styles/globals.css` like `home.css` |
| Images | `public/images/bloomscroll/` (WebP, plus AVIF where smaller). Phones only load phone images and desktops only wide ones: sources are set once the layout is known. Every image URL carries `ART_V` (`?v=…`); bump it whenever an image is replaced, so no browser mixes a cached old picture with new code. |
| Page | `pages/feed/index.js`: the scene at the top, the existing feed below. Latest and Trending, the composer, infinite scroll, the single-post view and post actions stay as they are. The old vine rails come off this page. |

No API changes are needed. The scene only decorates the page.

## Removed paths (unreachable with the approved defaults)

- The earlier phone attempts: the tall portrait frame, the slim trees, the clean festival without concert lighting (`p-festival3`), the earlier portrait festival (`p-festival`) and their glows.
- The desktop "separate trees and flowers" variant.
- The Tuning panel and the phone-frame preview.

These may only be removed if the comparison stays identical. Otherwise they stay.

## Performance

- GPU transforms only.
- The animation loop stops while the scene is off screen.
- The crowd layer is drawn at most at 1.5× resolution.
- Phones download only phone images.
- Images have fixed sizes, so there is no layout shift.
- Smoothness is measured on a 6×-throttled phone profile.

## Next phase (not in this build)

The endless rose vine and the blooming roses. The flower layer already exposes the walk-in value (`--approach`, 0 to 1) for them to use.

## Git

- Branch `feat/bloomscroll-refactor`, made from `origin/dev`.
- Small local commits.
- **No push and no PR until the owner has reviewed the code and done QA on their own PC.**
