# Bloomscroll scene: images and upscaling

Every image in the Bloomscroll scene, which ones are worth upscaling, and how to swap in sharper versions without anything moving.

## Why a sharper file can't move anything

- The component names every image in one place: `WIDE_ART`, `PHONE_ART` and `MOON` at the top of `components/feed/BloomscrollScene.js`.
- Each layer is sized by its painting's **shape** (aspect ratio), never by its pixel count.
- Every light, flame, hoop, wheel and crowd figure is placed as a fraction of its painting's width and height.

So a file with the **same shape** and more pixels lands in exactly the same place. The one rule: **never crop, pad or change the shape.**

## Every image in the scene

All files are in `public/images/bloomscroll/`.

| File | What it is | Used on | Pixels | Shape | Background | Upscale? |
|---|---|---|---|---|---|---|
| `sky.webp` | Sky plate (soft gradient, stars) | desktop, tablet | 1584×672 | 33:14 | opaque | No: soft gradient |
| `p-sky.webp` | Sky plate | phone | 900×1117 | 0.806 | opaque | No |
| `clouds.webp` / `p-clouds.webp` | Wispy clouds (screen blend) | wide / phone | 1584×672 / 900×1117 | | opaque on black | No: soft |
| `far-cut.webp` | Far painting: trees, hills, path (sky cut out) | desktop, tablet | 1584×672 | 33:14 | transparent sky | **Yes (01)** |
| `p-far-cut.webp` | Far painting | phone | 900×1117 | 0.806 | transparent sky | **Yes (02)** |
| `far-cut-blur.webp` / `p-far-cut-blur.webp` | Soft-focus copy of the far painting | wide / phone | as above | | transparent | No: rebuilt from 01/02 |
| `festival-concert.webp` | Wide concert festival, hopping figures lifted out (filled in behind them) | desktop, tablet | 2000×848 | 33:14 | transparent | **Yes (03)**, then re-cut |
| `crowd-concert-figures.webp` | The 13 wide dancers who hop, packed side by side | desktop, tablet | 683×179 | sheet | transparent | No: rebuilt from 03 |
| `glow-lights-concert.webp` | Soft light glow (screen blend) | desktop, tablet | 1000×424 | 33:14 | opaque on black | No: rebuilt from 03 |
| `p-festival4c.webp` | Phone concert festival, hopping figures lifted out (filled in behind them) | phone | 900×1117 | 0.806 | transparent | **Yes (04)**, then re-cut |
| `p-crowd4-figures.webp` | The 8 phone dancers who hop, packed side by side | phone | 405×124 | sheet | transparent | No: rebuilt from 04 |
| `p-glow-lights4.webp` | Phone light glow | phone | 450×558 | 0.806 | opaque on black | No: rebuilt from 04 |
| `near.webp` | Near frame: trees, ferns, roses | desktop | 2112×896 | 33:14 | transparent centre | **Yes (05)** |
| `near-flowers.webp` | Rose bushes | phone, tablet | 2112×896 | 33:14 | transparent | **Yes (06)** |
| `trees-tall-left.webp` / `trees-tall-right.webp` | Tall edge trees | tablet | 464×3333 | | transparent | No: already sharp at tablet size |
| `moon.webp` | Moon | all | 320×320 | 1:1 | transparent | No: shown at 150 px at most |

The grain is generated in code, and the wheel, fires, beams, LED strip, fire-hoop sparks, fireflies and embers are all drawn by code. None of them need images.

## Upscaling: what Terry does

1. Take the six files from `docs/design/bloomscroll/upscale-inputs/` (in the parent folder, next to the approved designs):
   - `01-far-wide.png`
   - `02-far-phone.png`
   - `03-festival-wide.jpg`
   - `04-festival-phone.png`
   - `05-near-frame-desktop.png`
   - `06-near-flowers.png`

   Each cut-out sits on flat magenta (#FF00FF), so the upscaler never has to handle transparency. Transparency is where halos come from.
2. Upscale each one **4×**. If the upscaler only does 2×, 2× is fine.
3. Rules:
   - Same shape: exactly 4× (or 2×) both ways, with no crop, no border and no reframing.
   - Keep the magenta background flat. If the upscaler has a "sharpen edges" or "add detail to background" option, turn it off.
   - Don't add or remove anything in the picture.
   - Export as **PNG**, not JPEG, so the magenta stays clean.
4. Return them with the same names plus `-up`, for example `01-far-wide-up.png`.

The 4× sizes to expect:

| File | 4× size |
|---|---|
| 01 | 6336×2688 |
| 02 | 3600×4468 |
| 03 | 8000×3280 |
| 04 | 4504×5588 |
| 05 | 8448×3584 |
| 06 | 8448×3584 |

## Swap procedure: what the agent does

1. Check each returned file is exactly 2× or 4× its input, with no crop and the same shape.
2. Re-cut the magenta with the same scripts and settings that made the approved files.
   - `03`: `docs/design/bloomscroll/wide-concert-input-2026-10-25/scripts/wide_concert_cut.py`.
   - `04`: the phone concert cut in `approved-v2-2026-10-25/scripts/`. The blur radii and dilation sizes in that cut must be scaled to the new resolution.
   - Check every cut on bright red and on the real sky for halos.
3. Rebuild the derived files (soft-focus far, crowd figure sheets, light glows) from the sharper masters, with blur radii scaled by the same factor.
   - Wide: `wide_concert_cut.py`, then `crowd_figures.py wide` (it splits the figures out of the cut and rewrites the festival and glow).
   - Phone: restore the committed `p-festival4c`, `p-crowd4` and `p-glow-lights4` first (`git checkout`), then `crowd_figures.py phone`.
   - Copy the new figure positions from `work/*-figures.json` into `LIFE.*.figures`, as `[x, y, w, h, sx, w·W/sheetW, h·H/sheetH]`.
4. Export served sizes as WebP: 1× and 2× for wide art (for example `far-cut.webp` at 1584 wide and `far-cut@2x.webp` at 3168), and 1× and 2× for phone art.
   - The component picks 2× on high-density screens.
   - Filenames stay stable, so no positions change.
   - Bump `ART_V` in the component, so browsers fetch the new files.
5. Re-run the fidelity comparison (`docs/design/bloomscroll/fidelity/`) against approved v2 and against the build before the swap. Expected result: no geometry drift, and pixel changes only where the art got sharper.
6. Check page weight (phones must still load only phone art) and phone smoothness on a 6× CPU-throttled profile.
7. Local commit. No push until the owner says go.
