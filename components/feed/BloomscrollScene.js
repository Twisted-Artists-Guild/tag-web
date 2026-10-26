/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/
"use client"
/* eslint-disable @next/next/no-img-element -- the scene script picks each layer's image once it knows the screen size */

import NextImage from "next/image"
import { useEffect, useRef } from "react"
import { BLOOMSCROLL_LOGO } from "@/components/Header/nav-links"

// The approved design (docs/bloomscroll-scene.md). Numbers here are the signed-off values: change them only with a new approval.
// Every scene image is named here (list: docs/bloomscroll-assets.md). Layers are sized by each painting's shape, never its pixel size,
// so a sharper file of the same shape replaces one with no other change.
const IMG = "/images/bloomscroll/"
// Bump when any scene image is replaced, so no browser mixes a cached old picture with new code
const ART_V = "v=16"
const MOON = "moon.webp"
const WIDE_ART = {
  sky: "sky.webp", far: "far-cut.webp", soft: "far-cut-blur.webp", clouds: "clouds.webp",
  fest: "festival-wide.webp", lights: "glow-wide.webp", figures: "cast-wide.webp",
  fest2x: "festival-wide@2x.webp", figures2x: "cast-wide@2x.webp",
  near: "near.webp", tallL: "trees-tall-left.webp", tallR: "trees-tall-right.webp", flowers: "near-flowers.webp",
  tall: "far-portrait.webp", tallSoft: "far-portrait-blur.webp",
}
const PHONE_ART = {
  sky: "p-sky.webp", far: "p-far-cut.webp", soft: "p-far-cut-blur.webp", clouds: "p-clouds.webp",
  fest: "festival-phone.webp", lights: "glow-phone.webp", figures: "cast-phone.webp", flowers: "near-flowers.webp",
}
const FAR_LAG = 0.55
const WALK_ZOOM = 0.18
const NEAR_SPEED = 0.45
const PHONE_MAX = 768
const NEAR_FULL_ASPECT = 2112 / 896
const TALL_ASPECT = 793 / 1981
// The portrait back painting (tablets): its shape, and where its hill line sits down the picture
const FAR_TALL_ASPECT = 1024 / 1536
const FAR_TALL_HILL = 0.743
const PAINT_ASPECT = 1584 / 672
const BEAT = 60000 / 124
const CONCERT_COLS = [[98, 168, 172], [206, 255, 29], [255, 79, 216], [138, 92, 255], [255, 238, 205]]

// Where the lights, fires, hoops, wheel and crowd sit in each festival picture, as fractions of its width (u) and height (v).
// Measured on the pictures built from the owner's solo pieces (docs/design/bloomscroll/solo-assets-2026-10-25/scripts/
// build_festival.py, which writes these numbers). cast: the DJ's and the booth front's boxes [u, v, w, h]; each person
// [sprite, row (0 back, 1 front), x, feet, height, seed]; sheet: each sprite's [x, w, h] in the cast sheet, as fractions.
// rig: the stage lighting, with size and beam scaled to each picture's stage.
const LIFE = {
  // Phone: the same pieces recomposed on the 4:5 picture; the Ferris wheel stands left of the tower, behind the tents
  phone: {
    bulbs: [[0.9501,0.5891],[0.9165,0.591],[0.935,0.5898],[1.2199,0.5926],[0.82,0.5932],[0.8981,0.5942],[0.7411,0.5965],[0.8366,0.5949],[0.8746,0.596],[0.8884,0.5944],[0.8089,0.5957],[0.8545,0.5963],[0.7795,0.5978],[0.7959,0.5969],[0.7664,0.5975],[0.7578,0.6022],[0.7765,0.6085],[1.0672,0.6112],[1.0853,0.6106],[0.7976,0.6147],[1.039,0.6189],[0.9239,0.6187],[1.1001,0.6187],[0.821,0.6201],[1.0191,0.6227],[1.1643,0.618],[0.9451,0.6206],[0.9819,0.6188],[0.8438,0.624],[0.9636,0.6212],[1.1182,0.6236],[1.1535,0.6232],[0.9961,0.6261],[0.8687,0.6275],[0.9836,0.6236],[1.1366,0.6255],[0.9688,0.6291],[0.8946,0.6291],[0.9196,0.6299],[0.9448,0.63],[0.5907,0.6367],[0.7753,0.6617],[0.7911,0.6668],[0.8057,0.6699],[0.8199,0.672],[0.8424,0.6762],[0.9139,0.6767],[0.8851,0.6779],[0.8642,0.6788],[0.9342,0.6783],[0.8748,0.6793]],
    fires: [[0.8078,0.8048,0.05,"bonfire"], [0.9353,0.3952,0.018,"torch"]],
    wheel: [0.8,0.5,0.094],
    hoops: [[0.8757,0.731,0.0383],[0.979,0.7338,0.0462]],
    cast: {
      dj: [0.1637,0.6317,0.0961,0.0537], booth: [0.1502,0.6818,0.123,0.0581],
      people: [[2,0,0.101,0.7836,0.0962,0.3],[3,0,0.143,0.7837,0.0963,2.0],[4,0,0.185,0.7836,0.0963,3.7],[5,0,0.227,0.7837,0.0963,5.4],[6,0,0.269,0.7837,0.0963,7.1],[7,0,0.311,0.7837,0.0963,8.8],[8,0,0.353,0.7837,0.0963,10.5],[9,1,0.08,0.8044,0.1087,1.1],[10,1,0.129,0.8065,0.1149,3.4],[11,1,0.178,0.8044,0.1118,5.7],[12,1,0.227,0.8066,0.1088,8.0],[13,1,0.276,0.8044,0.115,10.3],[14,1,0.325,0.8066,0.1119,12.6],[15,1,0.374,0.8045,0.1087,14.9]],
      sheet: [[0.0,0.09075,0.46452],[0.0925,0.11606,0.50323],[0.2103,0.05846,0.83871],[0.27051,0.04101,0.83871],[0.31326,0.04625,0.83871],[0.36126,0.05148,0.83871],[0.41449,0.05846,0.83871],[0.47469,0.04538,0.83871],[0.52182,0.0541,0.83871],[0.57766,0.06283,0.94194],[0.64223,0.05061,1.0],[0.69459,0.05672,0.97419],[0.75305,0.04188,0.94194],[0.79668,0.06457,1.0],[0.863,0.06457,0.97419],[0.92932,0.06894,0.94194]],
    },
    rig: {
      heads: [[0.0858,0.6124],[0.1388,0.6064],[0.1814,0.5953],[0.1885,0.6168],[0.2239,0.6185],[0.2577,0.6216],[0.2758,0.5991],[0.3112,0.6116]], wall: [0.0522,0.5919,0.3456,0.6847], floor: 0.7004, panel: [0.1545,0.2689,0.6818,0.7153],
      clip: [0.0,0.523,0.422,0.84], size: 1, beam: 0.2,
    },
  },
  // Desktop and tablet: the Ferris wheel stands right of the tower, behind the big tent (owner decision, 2026-10-25)
  wide: {
    bulbs: [[0.7696,0.5454],[0.752,0.5483],[0.7617,0.5464],[0.9106,0.5507],[0.7016,0.5517],[0.7424,0.5532],[0.6604,0.5567],[0.7103,0.5542],[0.7301,0.5559],[0.7373,0.5535],[0.6958,0.5555],[0.7196,0.5564],[0.6804,0.5587],[0.689,0.5572],[0.6736,0.5582],[0.6691,0.5654],[0.6788,0.575],[0.8307,0.5792],[0.8402,0.5782],[0.6899,0.5845],[0.816,0.5909],[0.7559,0.5906],[0.848,0.5905],[0.7021,0.5928],[0.8056,0.5967],[0.8815,0.5895],[0.7669,0.5935],[0.7862,0.5907],[0.714,0.5988],[0.7766,0.5945],[0.8574,0.5981],[0.8759,0.5975],[0.7936,0.602],[0.7271,0.604],[0.7871,0.5981],[0.867,0.6011],[0.7793,0.6065],[0.7406,0.6065],[0.7536,0.6077],[0.7668,0.6079],[0.5817,0.6181],[0.6782,0.6562],[0.6865,0.6641],[0.6941,0.6688],[0.7015,0.672],[0.7133,0.6785],[0.7507,0.6793],[0.7356,0.681],[0.7247,0.6824],[0.7612,0.6817],[0.7302,0.6832]],
    fires: [[0.8315,0.7951,0.024,"bonfire"], [0.7618,0.2492,0.014,"torch"]],
    wheel: [0.885,0.45,0.045],
    hoops: [[0.883,0.6314,0.029],[0.9613,0.6376,0.035]],
    cast: {
      dj: [0.1442,0.451,0.0773,0.1264], booth: [0.1333,0.5726,0.099,0.1367],
      people: [[2,0,0.1522,0.7974,0.1716,0.3],[3,0,0.1786,0.7974,0.1716,2.0],[4,0,0.2051,0.7975,0.1717,3.7],[5,0,0.2315,0.7974,0.1716,5.4],[6,0,0.2579,0.7974,0.1715,7.1],[7,0,0.2844,0.7975,0.1717,8.8],[8,0,0.3108,0.7974,0.1715,10.5],[9,1,0.139,0.8445,0.1951,1.1],[10,1,0.1698,0.8484,0.2069,3.4],[11,1,0.2007,0.8445,0.201,5.7],[12,1,0.2315,0.8484,0.1952,8.0],[13,1,0.2623,0.8444,0.2068,10.3],[14,1,0.2932,0.8484,0.201,12.6],[15,1,0.324,0.8444,0.195,14.9]],
      sheet: [[0.0,0.11943,0.61003],[0.12018,0.15268,0.66017],[0.27362,0.0548,0.83008],[0.32918,0.03704,0.83008],[0.36697,0.04195,0.83008],[0.40967,0.048,0.83008],[0.45843,0.0548,0.83008],[0.51398,0.04119,0.83008],[0.55593,0.04989,0.83008],[0.60658,0.06009,0.9415],[0.66742,0.04724,1.0],[0.71542,0.05367,0.97214],[0.76984,0.03741,0.9415],[0.80801,0.0616,1.0],[0.87037,0.0616,0.97214],[0.93273,0.06652,0.9415]],
    },
    rig: {
      heads: [[0.0815,0.4094],[0.1241,0.3952],[0.1584,0.3693],[0.1641,0.4197],[0.1926,0.4237],[0.2198,0.431],[0.2344,0.3782],[0.2628,0.4076]], wall: [0.0545,0.3611,0.2905,0.5793], floor: 0.6165, panel: [0.1368,0.2288,0.5726,0.6514],
      clip: [0.0,0.225,0.36,0.881], size: 0.81, beam: 0.45,
    },
  },
}

const smoothstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }

function concertColour(t, shift) {
  const span = BEAT * 8, k = t / span + shift, i = Math.floor(k), f = k - i, n = CONCERT_COLS.length
  const A = CONCERT_COLS[((i % n) + n) % n], B = CONCERT_COLS[(((i + 1) % n) + n) % n], m = Math.min(1, f * 4)
  return A.map((v, j) => Math.round(v + (B[j] - v) * m))
}

function radialSprite(size, stops) {
  const cv = document.createElement("canvas")
  cv.width = cv.height = size
  const c = cv.getContext("2d")
  const g = c.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  stops.forEach(([at, colour]) => g.addColorStop(at, colour))
  c.fillStyle = g
  c.fillRect(0, 0, size, size)
  return cv
}

// A painted-looking flame: three tongues of warm gradient that lick upward and sway
function drawFlame(c, x, y, R, t, seed, appear) {
  const tongues = [[0, 1.6, 0.55], [-0.35, 1.15, 0.38], [0.35, 1.2, 0.38]]
  tongues.forEach(([off, hgt, wid], k) => {
    const sway = Math.sin(t / (180 + k * 37) + seed * 2 + k) * R * 0.18 + Math.sin(t / 73 + k * 3 + seed) * R * 0.06
    const h = R * hgt * (0.85 + 0.15 * Math.sin(t / (90 + k * 21) + seed + k * 1.3))
    const w = R * wid
    const bx = x + off * R, by = y
    const g = c.createLinearGradient(bx, by, bx, by - h)
    g.addColorStop(0, "rgba(255,246,210,0.95)")
    g.addColorStop(0.35, "rgba(255,190,80,0.85)")
    g.addColorStop(0.75, "rgba(240,110,40,0.45)")
    g.addColorStop(1, "rgba(200,60,30,0)")
    c.globalAlpha = appear
    c.fillStyle = g
    c.beginPath()
    c.moveTo(bx - w, by)
    c.bezierCurveTo(bx - w * 1.1, by - h * 0.45, bx + sway - w * 0.4, by - h * 0.7, bx + sway, by - h)
    c.bezierCurveTo(bx + sway + w * 0.4, by - h * 0.7, bx + w * 1.1, by - h * 0.45, bx + w, by)
    c.closePath()
    c.fill()
  })
}

/**
 * The Bloomscroll festival scene: a pop-up book the visitor walks into as they scroll, with the feed below.
 * Phones (under 768px) get the portrait art, tablets and desktops the wide art: the same concert on both.
 * The flower layer exposes the walk-in as --approach (0 to 1) for the blooming roses.
 * The walk-in ends on the navbar's Bloomscroll mark, risen into the middle of the scene.
 * @param {{ children: React.ReactNode }} props the feed goes in children
 */
export default function BloomscrollScene({ children }) {
  const rootRef = useRef(null)

  useEffect(() => {
    const root = rootRef.current
    const part = (name) => root.querySelector(`[data-part="${name}"]`)
    const wrap = part("wrap"), scene = part("scene"), feed = part("feed"), book = part("book")
    const sky = part("sky"), moon = part("moon"), clouds = part("clouds"), ground = part("ground")
    const backdrop = part("backdrop"), farImg = part("far"), farSoft = part("farSoft")
    const farTall = part("farTall"), farTallSoft = farTall.lastElementChild
    const glowLights = part("glowLights"), haze = part("haze"), mark = part("mark")
    const nearLeft = part("nearLeft"), nearRight = part("nearRight"), flowersL = part("flowersL"), flowersR = part("flowersR")
    const festImgs = [...root.querySelectorAll("[data-fest]")]
    const reduced = matchMedia("(prefers-reduced-motion: reduce)")
    const finePointer = matchMedia("(hover: hover) and (pointer: fine)")

    let moonRest = 0, moonSunk = 0, nearHinge = 0, phoneMode = false, sceneTop = 0, stickTop = 0
    // per-side shift of the festival halves inside their box (tablet slides them in, phones set them down), as fractions of the box
    let lifeShift = { lx: 0, ly: 0, rx: 0, ry: 0 }
    const setSrc = (img, file) => { const src = `${IMG}${file}?${ART_V}`; if (img.getAttribute("src") !== src) img.setAttribute("src", src) }
    const figureSheet = new Image()
    const life = () => (phoneMode ? LIFE.phone : LIFE.wide)

    // Phones: the portrait far painting fills the 4:5 scene, the concert painting stands on its meadow, only the flowers come forward
    function layoutPhone(W, H, vis) {
      setSrc(sky, PHONE_ART.sky)
      setSrc(farImg, PHONE_ART.far)
      setSrc(farSoft, PHONE_ART.soft)
      farImg.style.visibility = farSoft.style.visibility = ""
      farTall.style.display = "none"
      setSrc(clouds.firstElementChild, PHONE_ART.clouds)
      setSrc(figureSheet, PHONE_ART.figures)
      const sk = sky.style
      sk.objectFit = sk.objectPosition = sk.backgroundColor = ""
      sk.left = sk.top = "0px"
      sk.width = W + "px"
      sk.height = H + "px"
      lifeShift = { lx: 0, ly: 0.08, rx: 0, ry: 0.04 }
      for (const el of [backdrop, glowLights, clouds]) {
        el.style.left = el.style.top = "0px"
        el.style.width = W + "px"
        el.style.height = H + "px"
      }
      ground.style.top = H + "px"
      const horizon = H * 0.69
      // The groups were painted a little high for this meadow, so each half is set down onto the grass (left 8%, right 4%).
      // The stage group reaches past the middle, so the halves split at 55.5%.
      const split = 55.5
      festImgs.forEach((img) => {
        setSrc(img, PHONE_ART[img.dataset.fest])
        const right = img.dataset.side === "right"
        const clip = img.dataset.half === "l" ? `clip-path: inset(0 ${100 - split}% 0 0);` : img.dataset.half === "r" ? `clip-path: inset(0 0 0 ${split}%);` : ""
        img.style.cssText = `translate: 0 ${H * (right ? 0.04 : 0.08)}px;` + clip
      })
      nearLeft.style.display = nearRight.style.display = "none"
      const nw = W * 1.16, nh = nw / NEAR_FULL_ASPECT, nl = -0.08 * W, nt = vis + 4 - nh
      nearHinge = W / 2 - nl
      for (const [el, clip] of [[flowersL, "inset(0 50% 0 0)"], [flowersR, "inset(0 0 0 50%)"]]) {
        setSrc(el.firstElementChild, PHONE_ART.flowers)
        const st = el.style
        st.display = ""
        st.clipPath = clip
        st.maskImage = st.webkitMaskImage = ""
        st.left = nl + "px"
        st.top = nt + "px"
        st.width = nw + "px"
        st.height = nh + "px"
        st.transformOrigin = `${W / 2 - nl}px ${nh}px`
      }
      const mw = moon.offsetWidth
      moonRest = Math.max(mw * 0.9, Math.min(horizon * 0.45, horizon - mw * 1.6))
      moonSunk = horizon + mw * 0.8
    }

    // The scene holds while the visitor walks in, then while the Bloomscroll mark arrives, with no scroll where nothing
    // happens: the approved walk-in (0.8 scene heights on desktop and tablet, 0.6 on phones), then the mark over the rest
    // (owner decision, 2026-10-25)
    const walkFor = (H) => Math.round(H * (phoneMode ? 0.6 : 0.8))
    const holdFor = (H) => Math.round(H * (phoneMode ? 0.9 : 1.15))
    function layout() {
      const W = scene.clientWidth, H = scene.clientHeight
      const wide = W / H > 1.6
      phoneMode = W < PHONE_MAX
      scene.classList.toggle("tag-bs--phone", phoneMode)
      scene.classList.toggle("tag-bs--wide", !phoneMode && wide)
      const overlap = Math.max(0, scene.getBoundingClientRect().bottom - feed.getBoundingClientRect().top)
      const vis = H - overlap
      wrap.style.height = H + holdFor(H) + "px"
      sceneTop = wrap.getBoundingClientRect().top + window.scrollY
      if (phoneMode) { layoutPhone(W, H, vis); return }
      // Tablet and desktop: the wide art
      setSrc(sky, WIDE_ART.sky)
      setSrc(farImg, WIDE_ART.far)
      setSrc(farSoft, WIDE_ART.soft)
      setSrc(clouds.firstElementChild, WIDE_ART.clouds)
      // Big or sharp screens get the festival and its dancers at twice the pixels (same shape, so nothing moves)
      const sharp = W * (devicePixelRatio || 1) > 2200
      setSrc(figureSheet, sharp ? WIDE_ART.figures2x : WIDE_ART.figures)
      nearLeft.style.display = nearRight.style.display = ""
      festImgs.forEach((img) => { setSrc(img, sharp && img.dataset.fest === "fest" ? WIDE_ART.fest2x : WIDE_ART[img.dataset.fest]); img.style.position = img.style.left = img.style.top = img.style.width = img.style.height = "" })
      if (wide) {
        // Desktop: the full near painting, a touch wider than the screen so no edge shows, seated on the bottom of the scene and
        // never shorter than it, so the trees always run off the top (owner decision, 2026-10-25)
        const nw = Math.max(W * 1.06, (vis + 4) * NEAR_FULL_ASPECT), nh = nw / NEAR_FULL_ASPECT, nl = (W - nw) / 2, nt = vis + 4 - nh
        nearHinge = W / 2 - nl
        for (const el of [nearLeft, nearRight]) {
          const s = el.style, img = el.firstElementChild
          setSrc(img, WIDE_ART.near)
          img.removeAttribute("style")
          s.clipPath = s.overflow = s.maskImage = s.webkitMaskImage = ""
          s.left = nl + "px"
          s.top = nt + "px"
          s.width = nw + "px"
          s.height = nh + "px"
          s.transformOrigin = `${W / 2 - nl}px ${0.35 * H - nt}px`
        }
        // The approved rose layer stays on top of the frame, each half opening with its side of the frame (owner, 2026-10-25)
        for (const [el, clip] of [[flowersL, "inset(0 50% 0 0)"], [flowersR, "inset(0 0 0 50%)"]]) {
          const s = el.style
          setSrc(el.firstElementChild, WIDE_ART.flowers)
          s.display = ""
          s.clipPath = clip
          s.maskImage = s.webkitMaskImage = ""
          s.left = nl + "px"
          s.top = nt + "px"
          s.width = nw + "px"
          s.height = nh + "px"
          s.transformOrigin = `${W / 2 - nl}px ${0.35 * H - nt}px`
        }
      } else {
        // Portrait tablets: tall trees on each edge and rose bushes in the corners; each strip has its picture's own shape,
        // so the bark is never squeezed (owner, 2026-10-25)
        const ph = vis + 4, pw = ph * TALL_ASPECT
        nearHinge = W / 2
        // The owner's tablet tree on the left and its mirror on the right, each at its own shape, inner edges barely faded
        for (const [el, file, side, fade, soft] of [[nearLeft, WIDE_ART.tallL, "left", "to left", 4], [nearRight, WIDE_ART.tallR, "right", "to right", 4]]) {
          const s = el.style, img = el.firstElementChild
          setSrc(img, file)
          img.style.cssText = `position:absolute;top:0;${side}:0;height:100%;width:100%;`
          s.clipPath = "none"
          s.overflow = "hidden"
          s.maskImage = s.webkitMaskImage = `linear-gradient(${fade}, transparent 0, #000 ${soft}%)`
          s.left = (side === "left" ? 0 : W - pw) + "px"
          s.top = "0px"
          s.width = pw + "px"
          s.height = ph + "px"
          s.transformOrigin = `${side === "left" ? W / 2 : W / 2 - (W - pw)}px ${0.35 * H}px`
        }
        const fw = W * 1.1, fh = fw / NEAR_FULL_ASPECT
        for (const [el, left, fade, ox] of [[flowersL, 0, "to right", 0], [flowersR, W - fw, "to left", fw]]) {
          setSrc(el.firstElementChild, WIDE_ART.flowers)
          const s = el.style
          s.display = ""
          s.clipPath = "none"
          s.maskImage = s.webkitMaskImage = `linear-gradient(${fade}, #000 0, #000 26%, transparent 36%)`
          s.left = left + "px"
          s.top = vis + 4 - fh + "px"
          s.width = fw + "px"
          s.height = fh + "px"
          s.transformOrigin = `${ox}px ${fh}px`
        }
      }
      let bh, bw
      if (wide) {
        bh = vis * 0.9; bw = bh * PAINT_ASPECT
        if (bw < W * 0.86) { bw = W * 0.86; bh = bw / PAINT_ASPECT }
      } else {
        bw = W * 1.55; bh = bw / PAINT_ASPECT
      }
      // Portrait: the painting lifts off the bottom edge so the festival isn't lost in the fade; dark meadow fills below
      const base = wide ? vis + 8 : vis * 0.9
      const top = base - bh
      ground.style.top = (wide ? vis - 2 : base - 6) + "px"
      for (const el of [backdrop, glowLights, clouds]) {
        el.style.left = (W - bw) / 2 + "px"
        el.style.top = top + "px"
        el.style.width = bw + "px"
        el.style.height = bh + "px"
      }
      // Portrait: each festival group slides toward the path, stopping short of the other (left group ends at 0.445, right starts at 0.577); desktop keeps them where they are
      const dx = wide ? 0 : bw * 0.06
      lifeShift = { lx: dx / bw, ly: 0, rx: -dx / bw, ry: 0 }
      festImgs.forEach((img) => {
        const right = img.dataset.side === "right"
        img.style.translate = dx ? `${right ? -dx : dx}px 0` : ""
      })
      // Tablets: the portrait back painting stands in for the wide one, its hill line on the wide one's, a touch wider than
      // the screen; it moves and zooms with the festival (the same transform, about the same point)
      farImg.style.visibility = farSoft.style.visibility = wide ? "" : "hidden"
      farTall.style.display = wide ? "none" : "block"
      if (!wide) {
        setSrc(farTall.firstElementChild, WIDE_ART.tall)
        setSrc(farTallSoft, WIDE_ART.tallSoft)
        const tw = W * 1.06, th = tw / FAR_TALL_ASPECT, tl = (W - tw) / 2, tt = top + bh * 0.58 - FAR_TALL_HILL * th
        const fs = farTall.style
        fs.left = tl + "px"; fs.top = tt + "px"; fs.width = tw + "px"; fs.height = th + "px"
        fs.transformOrigin = `${W / 2 - tl}px ${top + bh * 0.63 - tt}px`
      }
      // The moon rests in open sky and sinks to just under the hill line, so it always disappears behind the hills
      const hill = top + bh * 0.58, mw = moon.offsetWidth
      const sk = sky.style
      if (wide) {
        sk.left = sk.top = sk.width = sk.height = sk.objectFit = sk.objectPosition = sk.backgroundColor = ""
      } else {
        // Portrait: the sky is sized so its pale glow sits just behind the hills and the rest stays rich teal
        const plateH = hill / 0.62, plateW = Math.max(W * 1.1, plateH * PAINT_ASPECT)
        sk.left = (W - plateW) / 2 + "px"
        sk.top = "0px"
        sk.width = plateW + "px"
        sk.height = plateH + "px"
        sk.objectFit = sk.objectPosition = sk.backgroundColor = ""
      }
      moonRest = Math.max(mw * 0.9, Math.min(hill * 0.45, hill - mw * 1.6))
      moonSunk = hill + mw * 0.8
    }

    // Fireflies at three depths: far ones barely move, near ones sweep past
    const flyCanvases = [part("fliesBack"), part("fliesFront")]
    const flySprite = radialSprite(32, [[0, "rgba(236,255,140,1)"], [0.25, "rgba(206,255,29,0.55)"], [1, "rgba(206,255,29,0)"]])
    const warmSprite = radialSprite(64, [[0, "rgba(255,248,220,1)"], [0.2, "rgba(255,214,140,0.7)"], [0.55, "rgba(255,150,60,0.18)"], [1, "rgba(255,120,40,0)"]])
    const mkFly = (depth) => ({
      x: Math.random(), y: 0.35 + Math.random() * 0.6, depth,
      vx: (Math.random() - 0.5) * 0.015, vy: (Math.random() - 0.5) * 0.012,
      phase: Math.random() * Math.PI * 2,
    })
    const flies = [
      [...Array.from({ length: 18 }, () => mkFly(0)), ...Array.from({ length: 12 }, () => mkFly(1))],
      Array.from({ length: 10 }, () => mkFly(2)),
    ]
    function sizeCanvases() {
      const dpr = Math.min(devicePixelRatio || 1, 2)
      flyCanvases.forEach((cv) => {
        cv.width = Math.round(scene.clientWidth * dpr)
        cv.height = Math.round(scene.clientHeight * dpr)
      })
    }

    // Concert: one beat drives the DJ, the crowd and the stage lights
    const crowdCanvas = part("crowd"), crowdCtx = crowdCanvas.getContext("2d")
    function drawCrowd(t) {
      const bw = backdrop.clientWidth, bh = backdrop.clientHeight
      const dpr = Math.min(devicePixelRatio || 1, 2)
      const cw = Math.round(bw * dpr), ch = Math.round(bh * dpr)
      if (crowdCanvas.width !== cw || crowdCanvas.height !== ch) { crowdCanvas.width = cw; crowdCanvas.height = ch }
      const c = crowdCtx
      c.clearRect(0, 0, cw, ch)
      if (!figureSheet.complete || !figureSheet.naturalWidth) return
      const C = life().cast
      const iw = figureSheet.naturalWidth, ih = figureSheet.naturalHeight
      const beat = reduced.matches ? -1 : t / BEAT
      // The stage group is the festival's left half, so everything here takes the left half's shift
      const X = (u) => (u + lifeShift.lx) * cw, Y = (v) => (v + lifeShift.ly) * ch
      // A sprite from the sheet, standing on (x, foot) at height h, leaning by tilt (radians) about its feet
      const sprite = (k, x, foot, h, tilt) => {
        const [sx, sw, sh] = C.sheet[k], w = (h * sw * iw) / (sh * ih)
        c.save()
        c.translate(x, foot)
        if (tilt) c.rotate(tilt)
        c.drawImage(figureSheet, sx * iw, 0, sw * iw, sh * ih, -w / 2, -h, w, h)
        c.restore()
      }
      // The DJ nods on the beat and sways slowly, behind his decks; the booth's front is drawn over him
      const [du, dv, dw, dh] = C.dj
      const nod = beat < 0 ? 0 : Math.pow(Math.abs(Math.sin(beat * Math.PI)), 3) * dh * 0.035
      const sway = beat < 0 ? 0 : Math.sin((beat / 4) * Math.PI * 2) * 0.025
      sprite(0, X(du + dw / 2), Y(dv + dh) + nod, dh * ch, sway)
      const [bu, bv, bwid, bht] = C.booth
      sprite(1, X(bu + bwid / 2), Y(bv + bht), bht * ch, 0)
      // The back rows sway from their feet and bob, each on its own slow timing, a little darker so they sit behind
      c.filter = "brightness(0.82)"
      C.people.forEach(([k, row, x, foot, h, seed]) => {
        if (row) return
        const lean = beat < 0 ? 0 : Math.sin((beat / 2 + seed) * Math.PI) * 0.045
        const bob = beat < 0 ? 0 : Math.max(0, Math.sin((beat + seed * 0.5) * Math.PI * 2)) * h * 0.015
        sprite(k, X(x), Y(foot - bob), h * ch, lean)
      })
      c.filter = "none"
      // The front row hops on the beat: some every beat, some every other, each with its own phase and height
      C.people.forEach(([k, row, x, foot, h, seed]) => {
        if (!row) return
        const every = seed % 2 < 1 ? 1 : 2, at = beat < 0 ? 1 : ((beat + seed * 0.37) / every) % 1
        const lift = at < 0.38 ? Math.sin((at / 0.38) * Math.PI) * h * (0.05 + 0.03 * ((seed * 3) % 1)) : 0
        sprite(k, X(x), Y(foot - lift), h * ch, 0)
      })
    }

    // The stage lights are drawn on their own small canvas whose edges are then faded out, so no flash or beam ever shows
    // a straight edge; the wash and the strobe are soft ovals that fade to nothing inside their area
    const stageCv = document.createElement("canvas"), stageCtx = stageCv.getContext("2d")
    const panelCv = document.createElement("canvas"), panelCtx = panelCv.getContext("2d")
    const festLeft = festImgs.find((img) => img.dataset.fest === "fest" && img.dataset.half === "l")
    const softOval = (g, x0, y0, x1, y1, rgba, a) => {
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rx = (x1 - x0) / 2, ry = (y1 - y0) / 2
      g.save()
      g.translate(cx, cy); g.scale(1, ry / rx)
      const grad = g.createRadialGradient(0, 0, 0, 0, 0, rx)
      grad.addColorStop(0, `rgba(${rgba},${a})`); grad.addColorStop(1, `rgba(${rgba},0)`)
      g.fillStyle = grad
      g.fillRect(-rx, -rx, rx * 2, rx * 2)
      g.restore()
    }
    function drawConcertLights(c, at, cw, ch, t, appear) {
      const beatPhase = (t / BEAT) % 1, beatN = Math.floor(t / BEAT)
      const pulse = Math.pow(1 - beatPhase, 3)
      const [r, g, b] = concertColour(t, 0), [r2, g2, b2] = concertColour(t, 0.5)
      const L = life(), R = L.rig, z = R.size
      // Everything stays inside the stage and the space over the front rows
      const [lx, ty] = at(R.clip[0], R.clip[1]), [rx, by] = at(R.clip[2], R.clip[3])
      const bw = Math.ceil(rx - lx), bhh = Math.ceil(by - ty)
      if (stageCv.width !== bw || stageCv.height !== bhh) { stageCv.width = bw; stageCv.height = bhh }
      const s = stageCtx
      s.setTransform(1, 0, 0, 1, 0, 0)
      s.globalCompositeOperation = "source-over"
      s.clearRect(0, 0, bw, bhh)
      s.setTransform(1, 0, 0, 1, -lx, -ty)
      s.globalCompositeOperation = "lighter"
      const sprite = (x, y, size, alpha) => { s.globalAlpha = Math.max(0, Math.min(1, alpha)) * appear; s.drawImage(warmSprite, x - size / 2, y - size / 2, size, size) }
      // Colour wash on the back wall of the stage
      const [sx0, sy0] = at(R.wall[0], R.wall[1]), [sx1, sy1] = at(R.wall[2], R.wall[3])
      s.globalAlpha = 1
      softOval(s, sx0, sy0, sx1, sy1 + (sy1 - sy0) * 0.4, `${r},${g},${b}`, 0.55 + 0.35 * pulse)
      // Moving-head beams from the truss, sweeping across the stage and the front rows
      R.heads.map(([u, v], i) => [u, v, i * 1.3]).forEach(([u, v, ph], i) => {
        const [x, y] = at(u, v)
        const ang = Math.PI / 2 + Math.sin(t / 1400 + ph) * 0.55
        const len = ch * R.beam, spread = 0.12
        const col = i % 2 ? [r2, g2, b2] : [r, g, b]
        const gr = s.createLinearGradient(x, y, x + Math.cos(ang) * len, y + Math.sin(ang) * len)
        gr.addColorStop(0, `rgba(${col},0.55)`); gr.addColorStop(1, `rgba(${col},0)`)
        s.globalAlpha = 1
        s.fillStyle = gr
        s.beginPath(); s.moveTo(x, y)
        s.lineTo(x + Math.cos(ang - spread) * len, y + Math.sin(ang - spread) * len)
        s.lineTo(x + Math.cos(ang + spread) * len, y + Math.sin(ang + spread) * len)
        s.closePath(); s.fill()
        sprite(x, y, cw * 0.035 * z, 0.9)
      })
      s.globalAlpha = 1
      // The painted LED triangle panel lights up in the concert colour on the beat: the painting's own panel, tinted and
      // added as light, so only its LED lines glow and never a box
      const [bx0, by0] = at(R.panel[0], R.panel[2]), [bx1, by1] = at(R.panel[1], R.panel[3])
      const pw = Math.ceil(bx1 - bx0), ph = Math.ceil(by1 - by0)
      if (festLeft.complete && festLeft.naturalWidth && pw > 0 && ph > 0) {
        if (panelCv.width !== pw || panelCv.height !== ph) { panelCv.width = pw; panelCv.height = ph }
        const q = panelCtx, nw = festLeft.naturalWidth, nh = festLeft.naturalHeight
        const paint = () => q.drawImage(festLeft, R.panel[0] * nw, R.panel[2] * nh, (R.panel[1] - R.panel[0]) * nw, (R.panel[3] - R.panel[2]) * nh, 0, 0, pw, ph)
        q.globalCompositeOperation = "copy"
        paint()
        q.globalCompositeOperation = "multiply"
        const tint = q.createLinearGradient(0, 0, pw, 0)
        tint.addColorStop(0, `rgb(${r},${g},${b})`); tint.addColorStop(1, `rgb(${r2},${g2},${b2})`)
        q.fillStyle = tint
        q.fillRect(0, 0, pw, ph)
        q.globalCompositeOperation = "destination-in"
        paint()
        s.globalAlpha = (0.35 + 0.55 * pulse) * appear
        s.drawImage(panelCv, bx0, by0)
        s.globalAlpha = 1
      }
      // Strobe pop on every 16th beat: a soft burst of white over the stage
      if (beatN % 16 === 0 && beatPhase < 0.25) softOval(s, sx0, sy0, sx1, sy1 + (sy1 - sy0) * 0.4, "255,255,255", 0.5 * (1 - beatPhase / 0.25))
      // Fade the canvas out towards its edges, then lay it over the scene
      s.setTransform(1, 0, 0, 1, 0, 0)
      s.globalCompositeOperation = "destination-in"
      s.globalAlpha = 1
      for (const [x0, y0, x1, y1] of [[0, 0, bw, 0], [0, 0, 0, bhh]]) {
        const fade = s.createLinearGradient(x0, y0, x1, y1)
        fade.addColorStop(0, "rgba(0,0,0,0)"); fade.addColorStop(0.15, "rgba(0,0,0,1)")
        fade.addColorStop(0.85, "rgba(0,0,0,1)"); fade.addColorStop(1, "rgba(0,0,0,0)")
        s.fillStyle = fade
        s.fillRect(0, 0, bw, bhh)
      }
      c.globalAlpha = 1
      c.drawImage(stageCv, lx, ty)
    }

    // Ferris wheel: painted-style rim, spokes and swinging gondolas, turning slowly behind the tents
    const wheelCanvas = part("wheel"), wheelCtx = wheelCanvas.getContext("2d")
    function drawWheel(t, appear) {
      const bw = backdrop.clientWidth, bh = backdrop.clientHeight
      const dpr = Math.min(devicePixelRatio || 1, 2)
      const cw = Math.round(bw * dpr), ch = Math.round(bh * dpr)
      if (wheelCanvas.width !== cw || wheelCanvas.height !== ch) { wheelCanvas.width = cw; wheelCanvas.height = ch }
      const c = wheelCtx
      c.clearRect(0, 0, cw, ch)
      const [u, v, r] = life().wheel
      const x = (u + lifeShift.rx) * cw, y = (v + lifeShift.ry) * ch, R = r * cw
      const spin = reduced.matches ? 0 : t / 9000
      const teal = "#2c5552", tealHi = "#4f8b86", dark = "#173332"
      c.lineCap = "round"
      // Legs (the A-frame), mostly hidden by the tents
      for (const s of [-1, 1]) {
        for (const [col, lw, dx] of [[dark, 0.06, 0], [tealHi, 0.025, -0.01 * s]]) {
          c.strokeStyle = col; c.lineWidth = R * lw
          c.beginPath(); c.moveTo(x + dx * R, y); c.lineTo(x + s * R * 0.62 + dx * R, y + R * 1.55); c.stroke()
        }
      }
      for (let k = 0; k < 12; k++) {
        const a = spin + (k * Math.PI) / 6
        c.strokeStyle = teal; c.lineWidth = R * 0.022
        c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * R, y + Math.sin(a) * R); c.stroke()
      }
      // Double rim with a brushed highlight
      for (const [rad, col, lw] of [[1, dark, 0.07], [1, teal, 0.045], [0.995, tealHi, 0.015], [0.62, dark, 0.04], [0.62, teal, 0.022]]) {
        c.strokeStyle = col; c.lineWidth = R * lw
        c.beginPath(); c.arc(x, y, R * rad, 0, Math.PI * 2); c.stroke()
      }
      c.fillStyle = dark; c.beginPath(); c.arc(x, y, R * 0.09, 0, Math.PI * 2); c.fill()
      c.fillStyle = tealHi; c.beginPath(); c.arc(x - R * 0.02, y - R * 0.02, R * 0.04, 0, Math.PI * 2); c.fill()
      // Gondolas hang straight down from the rim, each with a warm lit window
      for (let k = 0; k < 12; k++) {
        const a = spin + (k * Math.PI) / 6
        const gx = x + Math.cos(a) * R, gy = y + Math.sin(a) * R
        c.save()
        c.translate(gx, gy)
        c.rotate(Math.sin(t / 700 + k) * 0.06)
        c.strokeStyle = dark; c.lineWidth = R * 0.015
        c.beginPath(); c.moveTo(0, 0); c.lineTo(0, R * 0.08); c.stroke()
        c.fillStyle = dark
        c.beginPath(); c.roundRect(-R * 0.085, R * 0.07, R * 0.17, R * 0.13, R * 0.03); c.fill()
        c.fillStyle = teal
        c.beginPath(); c.roundRect(-R * 0.07, R * 0.08, R * 0.14, R * 0.035, R * 0.015); c.fill()
        const lit = 0.55 + 0.45 * Math.sin(t / 420 + k * 1.7)
        c.fillStyle = `rgba(255, 214, 120, ${0.55 + 0.45 * lit})`
        c.fillRect(-R * 0.05, R * 0.12, R * 0.1, R * 0.045)
        c.restore()
      }
      // Bulbs along the rim
      c.globalCompositeOperation = "lighter"
      for (let k = 0; k < 24; k++) {
        const a = spin + (k * Math.PI) / 12
        c.globalAlpha = (0.4 + 0.6 * Math.pow(0.5 + 0.5 * Math.sin(t / 260 - k * 0.9), 2)) * appear
        const s = R * 0.13
        c.drawImage(warmSprite, x + Math.cos(a) * R - s / 2, y + Math.sin(a) * R - s / 2, s, s)
      }
      c.globalCompositeOperation = "source-over"
      c.globalAlpha = 1
    }

    // Festival life: drawn in the festival painting's own coordinates, so it stays pinned to it
    const lifeCanvas = part("life"), lifeCtx = lifeCanvas.getContext("2d")
    const embers = []
    function drawLife(t, dt, appear) {
      const bw = backdrop.clientWidth, bh = backdrop.clientHeight
      const dpr = Math.min(devicePixelRatio || 1, 2)
      const cw = Math.round(bw * dpr), ch = Math.round(bh * dpr)
      if (lifeCanvas.width !== cw || lifeCanvas.height !== ch) { lifeCanvas.width = cw; lifeCanvas.height = ch }
      const c = lifeCtx
      c.clearRect(0, 0, cw, ch)
      if (reduced.matches || appear <= 0) return
      const L = life()
      const at = (u, v) => {
        const right = u > 0.5
        return [(u + (right ? lifeShift.rx : lifeShift.lx)) * cw, (v + (right ? lifeShift.ry : lifeShift.ly)) * ch]
      }
      const unit = cw
      c.globalCompositeOperation = "lighter"
      const sprite = (x, y, size, alpha) => { c.globalAlpha = Math.max(0, Math.min(1, alpha)) * appear; c.drawImage(warmSprite, x - size / 2, y - size / 2, size, size) }
      // String lights: a staggered twinkle along each string
      L.bulbs.forEach(([u, v], i) => {
        const [x, y] = at(u, v)
        sprite(x, y, unit * 0.036, 0.2 + 0.8 * Math.pow(0.5 + 0.5 * Math.sin(t / 380 - u * 40 + (i % 3) * 2.1), 2))
      })
      // Fires: painted-style flames in the empty basket and on the logs, flickering light and rising embers
      L.fires.forEach(([u, v, r, kind], fi) => {
        const [x, y] = at(u, v)
        const R = r * unit
        drawFlame(c, x, y, R * (kind === "torch" ? 1.15 : 1), t, fi, appear)
        for (let k = 0; k < 5; k++) {
          const fl = 0.6 + 0.25 * Math.sin(t / (70 + k * 23) + k * 1.7) + 0.15 * Math.sin(t / (31 + k * 11) + fi)
          sprite(x + Math.sin(t / (150 + k * 40) + k) * R * 0.3, y - R * (0.2 + k * 0.22) * fl, R * (3 - k * 0.4) * fl, 0.55 * fl)
        }
        if (Math.random() < (kind === "bonfire" ? 0.35 : 0.15)) {
          embers.push({ x: u + (Math.random() - 0.5) * r * 0.8, y: v - r * 0.3, vy: -(0.03 + Math.random() * 0.04), vx: (Math.random() - 0.5) * 0.01, life: 1, big: kind === "bonfire" })
        }
      })
      for (let i = embers.length - 1; i >= 0; i--) {
        const e = embers[i]
        e.x += (e.vx + Math.sin(t / 300 + i) * 0.004) * dt
        e.y += e.vy * dt
        e.life -= dt * 0.55
        if (e.life <= 0) { embers.splice(i, 1); continue }
        const [x, y] = at(e.x, e.y)
        sprite(x, y, unit * (e.big ? 0.014 : 0.01), e.life)
      }
      // Fire hoops: sparks whirling around each hoop
      L.hoops.forEach(([u, v, r], hi) => {
        const [x, y] = at(u, v)
        for (let k = 0; k < 4; k++) {
          const ang = t / 160 * (hi ? -1 : 1) + (k * Math.PI) / 2
          sprite(x + Math.cos(ang) * r * unit, y + Math.sin(ang) * r * unit * 1.1, unit * 0.018 * (r / 0.019), 0.9)
        }
      })
      drawConcertLights(c, at, cw, ch, t, appear)
      c.globalCompositeOperation = "source-over"
      c.globalAlpha = 1
    }

    function drawFlies(t, dt, y, mx, appear) {
      const W = scene.clientWidth, H = scene.clientHeight
      const lagByDepth = [FAR_LAG, 0.3, -NEAR_SPEED]
      const sizeByDepth = [6, 11, 26]
      flyCanvases.forEach((cv, i) => {
        const c = cv.getContext("2d")
        c.clearRect(0, 0, cv.width, cv.height)
        // Phones: every firefly lives in the scene, behind the roses, so the front canvas stays empty
        if (appear <= 0 || (phoneMode && i === 1)) return
        const s = cv.width / W
        flies[i].forEach((f, k) => {
          // Phones: two faint ones in the air, the rest hover over the meadow and the festival grounds
          const air = phoneMode && k < 2
          const lo = phoneMode ? (air ? 0.3 : 0.58) : 0.3, hi = phoneMode ? (air ? 0.5 : 0.92) : 0.98
          if (phoneMode) f.y = Math.min(hi, Math.max(lo, f.y))
          if (!reduced.matches) {
            f.x += (f.vx + Math.sin(t / 1300 + f.phase) * 0.007) * dt
            f.y += (f.vy + Math.cos(t / 1700 + f.phase) * 0.006) * dt
            if (f.x < -0.05) f.x = 1.05
            if (f.x > 1.05) f.x = -0.05
            if (f.y < lo) f.vy = Math.abs(f.vy)
            if (f.y > hi) f.vy = -Math.abs(f.vy)
          }
          const glow = reduced.matches ? 0.7 : 0.35 + 0.65 * Math.max(0, Math.sin(t / 600 + f.phase))
          c.globalAlpha = glow * appear * (air ? 0.4 : 1)
          // Phones: they move with the ground they hover over, not with the scroll
          const lag = phoneMode ? FAR_LAG : lagByDepth[f.depth]
          const px = (f.x * W + mx * [-10, -22, -60][f.depth]) * s
          const py = (f.y * H + y * lag) * s
          const sz = sizeByDepth[f.depth] * s
          c.drawImage(flySprite, px - sz / 2, py - sz / 2, sz, sz)
        })
      })
    }

    // Unfold: the backdrop tips up, the near frame swings in like pop-up flaps, the moon rises, the lights come on
    const pieces = { back: [0, 34], flaps: [380, 80], flowers: [540, 86] }
    const unfoldStart = performance.now()
    const spring = (ms, from) => {
      if (reduced.matches) return 0
      if (ms <= 0) return from
      const t = ms / 1000
      return from * Math.exp(-t * 6.5) * Math.cos(t * 8.5)
    }
    const angle = (key) => spring(performance.now() - unfoldStart - pieces[key][0], pieces[key][1])

    // Motion chases scroll and pointer with frame-rate-independent easing.
    // Desktop and tablet: scroll counts from the moment the scene sticks under the site header (its height can change as the
    // notice bar scrolls away). Phones count from the first pixel of scroll, so the walk-in starts at once.
    const readStick = () => { stickTop = parseFloat(getComputedStyle(scene).top) || 0 }
    const scrollPos = () => Math.max(0, window.scrollY - (phoneMode ? 0 : sceneTop - stickTop))
    let sy = 0, px = 0, py = 0, tx = 0, ty = 0, last = performance.now()
    const onPointerMove = (e) => {
      if (!finePointer.matches) return
      tx = e.clientX / innerWidth - 0.5
      ty = e.clientY / innerHeight - 0.5
    }
    const onPointerLeave = () => { tx = 0; ty = 0 }

    let visible = true, running = false, rafId = 0
    function frame(now) {
      const dt = Math.min(64, now - last) / 1000
      last = now
      const W = scene.clientWidth, H = scene.clientHeight
      const hold = holdFor(H), walk = walkFor(H)
      const target = Math.min(scrollPos(), hold + H)
      const still = reduced.matches
      sy = still ? target : target + (sy - target) * Math.exp(-dt / 0.085)
      px += (tx - px) * (1 - Math.exp(-dt / 0.35))
      py += (ty - py) * (1 - Math.exp(-dt / 0.35))
      // p: how far the visitor has walked in; m: how far the Bloomscroll mark has come in, over the rest of the hold;
      // y: how far the scene has scrolled after the hold
      const p = Math.min(1, sy / walk)
      const m = Math.min(1, Math.max(0, (sy - walk) / (hold - walk)))
      const y = still ? 0 : Math.max(0, sy - hold)
      const mx = still ? 0 : px, my = still ? 0 : py
      const since = still ? 99999 : now - unfoldStart
      const fy = still ? 0 : y, fp = still ? 0 : p, fmx = still ? 0 : mx, fmy = still ? 0 : my

      book.style.transform = still ? "" : `scale(1.03) rotateY(${mx * 2.2}deg) rotateX(${-my * 1.4}deg)`
      // The sky is effectively at infinity, so it barely zooms
      sky.style.transform = `translate3d(${fmx * -6}px, ${fy * 0.7}px, 0) scale(${1 + fp * 0.03}) rotateX(${angle("back")}deg)`
      // The far painting, festival and glows are one rigid piece that walks in toward the path's end
      backdrop.style.transform = `translate3d(${fmx * -12}px, ${fy * FAR_LAG + fmy * -6}px, 0) scale(${1 + fp * WALK_ZOOM}) rotateX(${angle("back")}deg)`
      glowLights.style.transform = farTall.style.transform = backdrop.style.transform
      clouds.style.transform = !still ? `translate3d(${Math.sin(now / 9000) * 10}px, 0, 0) ${backdrop.style.transform}` : backdrop.style.transform
      // Phones: the dark meadow under the painting drifts with it, so its top edge never shows above the festival
      ground.style.transform = phoneMode ? `translate3d(0, ${fy * FAR_LAG}px, 0)` : ""
      farSoft.style.opacity = farTallSoft.style.opacity = String(smoothstep(0.05, 0.6, fp) * 0.8)

      // The moon rises from behind the hills after the unfold and sinks back behind them as the visitor scrolls
      const rise = 1 - smoothstep(700, 2300, since)
      const sink = Math.max(rise, Math.min(1, p * 1.5))
      const mw = moon.offsetWidth
      const mxPos = W * ((phoneMode ? 0.56 : 0.63) + sink * 0.05) - mw / 2 + mx * -4
      const myPos = moonRest + sink * (moonSunk - moonRest) + y * 0.72 - mw / 2
      moon.style.transform = `translate3d(${mxPos}px, ${myPos}px, 0)`
      moon.style.setProperty("--glow", String(1 - smoothstep(0.35, 0.95, sink)))

      // The near frame comes toward the visitor as they walk in; --approach is the walk-in value for the blooming roses
      scene.style.setProperty("--approach", p.toFixed(3))
      const separate = W / H <= 1.6
      const grow = 1 + fp * NEAR_SPEED * (separate ? 0.3 : 1.2)
      const near = `translate3d(${fmx * -45}px, ${-fy * NEAR_SPEED * 0.25 + fmy * -14}px, 0) scale(${grow})`
      const half = nearHinge, a = angle("flaps")
      nearLeft.style.transform = `${near} translateX(${-half}px) rotateY(${a}deg) translateX(${half}px)`
      nearRight.style.transform = `${near} translateX(${half}px) rotateY(${-a}deg) translateX(${-half}px)`
      if (separate) {
        const fg = 1 + (still ? 0 : p * NEAR_SPEED * (W / H > 1.6 ? 0.8 : 0.6))
        flowersL.style.transform = flowersR.style.transform = `translate3d(${mx * -55}px, ${my * -18}px, 0) scale(${fg}) rotateX(${angle("flowers")}deg)`
      } else {
        flowersL.style.transform = nearLeft.style.transform
        flowersR.style.transform = nearRight.style.transform
      }
      // The ending: once the walk-in is done the Bloomscroll mark rises into the middle of the scene and holds there,
      // gently glowing; reduced motion shows it already there
      const land = still ? 1 : smoothstep(0, 1, m)
      const float = still ? 0 : Math.sin(now / 900) * H * 0.006 * land
      mark.style.opacity = land.toFixed(3)
      mark.style.transform = `translate3d(-50%, calc(-50% + ${(fy * 0.45 + (1 - land) * H * 0.12 + float).toFixed(1)}px), 0) scale(${(0.6 + 0.4 * land).toFixed(3)})`
      mark.style.setProperty("--glow", (still ? 0.8 : (0.6 + 0.25 * Math.sin(now / 700)) * land).toFixed(3))
      haze.style.opacity = String(0.7 + fp * 0.6)

      const on = still ? 1 : smoothstep(1500, 1950, since)
      const shimmer = still ? 1 : 0.94 + 0.06 * Math.sin(now / 700)
      glowLights.style.opacity = String(on * shimmer * 0.95)

      drawFlies(now, dt, y, mx, smoothstep(1700, 2500, since))
      drawLife(now, dt, smoothstep(1500, 2100, since))
      drawWheel(still ? 0 : now, 1)
      drawCrowd(now)

      if (visible) rafId = requestAnimationFrame(frame)
      else running = false
    }
    function kick() {
      if (!running && visible) { running = true; last = performance.now(); rafId = requestAnimationFrame(frame) }
    }
    const observer = new IntersectionObserver(([e]) => { visible = e.isIntersecting; kick() })
    // The scene's own size, not the window's: opening a sidebar narrows it too
    const resizer = new ResizeObserver(() => { sizeCanvases(); layout(); readStick() })

    sizeCanvases()
    layout()
    readStick()
    sy = scrollPos()
    window.addEventListener("pointermove", onPointerMove, { passive: true })
    document.addEventListener("pointerleave", onPointerLeave)
    window.addEventListener("scroll", readStick, { passive: true })
    observer.observe(scene)
    resizer.observe(scene)
    kick()
    return () => {
      cancelAnimationFrame(rafId)
      observer.disconnect()
      resizer.disconnect()
      window.removeEventListener("pointermove", onPointerMove)
      document.removeEventListener("pointerleave", onPointerLeave)
      window.removeEventListener("scroll", readStick)
    }
  }, [])

  return (
    <div className="tag-bloomscroll" ref={rootRef}>
      <div className="tag-bs-wrap" data-part="wrap">
        <section className="tag-bs" data-part="scene">
          <div className="tag-bs__book" data-part="book" aria-hidden="true">
            <img className="tag-bs__layer tag-bs__sky" data-part="sky" alt="" width={1584} height={672} />
            <div className="tag-bs__moon" data-part="moon"><img src={`${IMG}${MOON}?${ART_V}`} alt="" width={320} height={320} /></div>
            <div className="tag-bs__layer tag-bs__fit tag-bs__clouds" data-part="clouds"><img alt="" /></div>
            <div className="tag-bs__ground" data-part="ground" />
            <div className="tag-bs__layer tag-bs__far-tall" data-part="farTall">
              <img alt="" width={1024} height={1536} />
              <img className="tag-bs__far-soft" alt="" width={1024} height={1536} />
            </div>
            <div className="tag-bs__layer tag-bs__fit tag-bs__backdrop" data-part="backdrop">
              <img data-part="far" alt="" width={1584} height={672} />
              <img className="tag-bs__far-soft" data-part="farSoft" alt="" width={1584} height={672} />
              <canvas data-part="wheel" />
              <img className="tag-bs__half-l" data-fest="fest" data-half="l" alt="" width={1584} height={672} />
              <img className="tag-bs__half-r" data-fest="fest" data-half="r" data-side="right" alt="" width={1584} height={672} />
              <canvas data-part="crowd" />
              <canvas className="tag-bs__life" data-part="life" />
            </div>
            <div className="tag-bs__layer tag-bs__glow tag-bs__fit" data-part="glowLights">
              <img className="tag-bs__half-l" data-fest="lights" data-half="l" alt="" />
              <img className="tag-bs__half-r" data-fest="lights" data-half="r" data-side="right" alt="" />
            </div>
            <div className="tag-bs__haze" data-part="haze" />
            <canvas className="tag-bs__flies tag-bs__flies--back" data-part="fliesBack" />
            <div className="tag-bs__near tag-bs__near--left" data-part="nearLeft"><img alt="" width={2112} height={896} /></div>
            <div className="tag-bs__near tag-bs__near--right" data-part="nearRight"><img alt="" width={2112} height={896} /></div>
            <div className="tag-bs__near tag-bs__near--flowers" data-part="flowersL"><img alt="" width={2112} height={896} /></div>
            <div className="tag-bs__near tag-bs__near--flowers" data-part="flowersR"><img alt="" width={2112} height={896} /></div>
            <canvas className="tag-bs__flies tag-bs__flies--front" data-part="fliesFront" />
            <div className="tag-bs__grain" />
            <div className="tag-bs__vignette" />
          </div>
          <h1 className="sr-only">Bloomscroll</h1>
          <div className="tag-bs__mark" data-part="mark" aria-hidden="true">
            <NextImage src={BLOOMSCROLL_LOGO} alt="" width={3472} height={642} sizes="(max-width: 767px) 60vw, 560px" />
          </div>
        </section>
      </div>
      <div className="tag-bs-feed" data-part="feed">{children}</div>
    </div>
  )
}
