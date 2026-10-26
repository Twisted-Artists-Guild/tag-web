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
| `far-cut.webp` | Far painting: trees, hills, path (sky cut out; top 18 % and sides 4 % faded in the file) | desktop | 1925×817 | 33:14 | transparent sky | Done: the owner's regenerated wide painting (regen-3) |
| `far-portrait.webp` / `far-portrait-blur.webp` | Portrait back painting (owner's regen-4) and its soft-focus copy, in place of the wide one | tablet | 1024×1536 | 2:3 | transparent sky | Done |
| `p-far-cut.webp` | Far painting, the owner's portrait painting (regen-4) cropped to 4:5, hill line on the phone's | phone | 900×1117 | 0.806 | transparent sky | Done |
| `far-cut-blur.webp` / `p-far-cut-blur.webp` | Soft-focus copy of the far painting | wide / phone | as above | | transparent | No: rebuilt from 01/02 |
| `festival-wide.webp` / `festival-wide@2x.webp` | Wide festival built from the owner's solo pieces: stage (no DJ), tents and tower, bonfire group | desktop, tablet | 2000×849 / 4096×1738 | 33:14 | transparent | No: rebuilt by `build_festival.py` |
| `glow-wide.webp` | Soft light glow (screen blend) | desktop, tablet | 1000×424 | 33:14 | opaque on black | No: rebuilt by `build_festival.py` |
| `cast-wide.webp` / `cast-wide@2x.webp` | The DJ, the booth front with its deck gear (drawn over him) and the 14 crowd people (silhouette pass, neon glow), side by side | desktop, tablet | people 170 / 340 px tall | sheet | transparent | No: rebuilt by `build_festival.py` |
| `festival-phone.webp` | Phone festival, the same pieces recomposed on the 4:5 picture | phone | 900×1117 | 0.806 | transparent | No: rebuilt by `build_festival.py` |
| `glow-phone.webp` | Phone light glow | phone | 450×558 | 0.806 | opaque on black | No: rebuilt by `build_festival.py` |
| `cast-phone.webp` | The DJ, the booth front and the crowd at phone size | phone | people 140 px tall | sheet | transparent | No: rebuilt by `build_festival.py` |
| `near.webp` | Near frame: trees and ferns, lime rim light (owner's regen-2) | desktop | 1925×817 | 33:14 | transparent centre | Done |
| `near-flowers.webp` | Rose bushes | phone, tablet | 2112×896 | 33:14 | transparent | **Yes (06)** |
| `trees-tall-left.webp` / `trees-tall-right.webp` | Tablet edge trees: the owner's tree (10) and its mirror | tablet | 793×1981 | 0.40 | transparent | Done |
| `moon.webp` | Moon (owner's regen-1) | all | 640×640 | 1:1 | transparent | Done |

The grain is generated in code, and the wheel, fires, beams, fire-hoop sparks, fireflies and embers are all drawn by code. None of them need images.

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
   - The festival and the crowd: `docs/design/bloomscroll/solo-assets-2026-10-25/scripts/build_festival.py <solo dir> <crowd cast dir> public/images/bloomscroll <work dir>`. It keys the owner's solo pieces and crowd people, pulls their colours towards the old painting (kept in `work/ref-*`), composes the festival pictures, the glows and the cast sheets, and writes the scene data (cast, bulbs, torch, hoops, stage rig) to `work/life.json` for `LIFE` in the component. Check `work/check-*.png` (every measured point drawn on the picture) before copying the numbers.
   - The old `wide_concert_cut.py` and `crowd_figures.py` made the hand-painted festival, which the solo pieces replaced; they stay as records.
4. Export served sizes as WebP: 1× and 2× for wide art (for example `far-cut.webp` at 1584 wide and `far-cut@2x.webp` at 3168), and 1× and 2× for phone art.
   - The component picks 2× when the scene's width × the screen's pixel density is over 2200 (for example 1440 at 2×, or 1706 at 1.5×). Tablets and 1× desktops load the 1x. Glows stay 1x: they are blurs.
   - Filenames stay stable, so no positions change.
   - Bump `ART_V` in the component, so browsers fetch the new files.
5. Re-run the fidelity comparison (`docs/design/bloomscroll/fidelity/`) against approved v2 and against the build before the swap. Expected result: no geometry drift, and pixel changes only where the art got sharper.
6. Check page weight (phones must still load only phone art) and phone smoothness on a 6× CPU-throttled profile.
7. Local commit. No push until the owner says go.
