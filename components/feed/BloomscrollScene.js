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
const ART_V = "v=4"
const MOON = "moon.webp"
const WIDE_ART = {
  sky: "sky.webp", far: "far-cut.webp", soft: "far-cut-blur.webp", clouds: "clouds.webp",
  fest: "festival-concert.webp", lights: "glow-lights-concert.webp", figures: "crowd-concert-figures.webp",
  fest2x: "festival-concert@2x.webp", figures2x: "crowd-concert-figures@2x.webp",
  near: "near.webp", tallL: "trees-tall-left.webp", tallR: "trees-tall-right.webp", flowers: "near-flowers.webp",
}
const PHONE_ART = {
  sky: "p-sky.webp", far: "p-far-cut.webp", soft: "p-far-cut-blur.webp", clouds: "p-clouds.webp",
  fest: "p-festival4c.webp", lights: "p-glow-lights4.webp", figures: "p-crowd4-figures.webp", flowers: "near-flowers.webp",
}
const FAR_LAG = 0.55
const WALK_ZOOM = 0.18
const NEAR_SPEED = 0.45
const PHONE_MAX = 768
const NEAR_FULL_ASPECT = 2112 / 896
const PAINT_ASPECT = 1584 / 672
const BEAT = 60000 / 124
const CONCERT_COLS = [[98, 168, 172], [206, 255, 29], [255, 79, 216], [138, 92, 255], [255, 238, 205]]

// Where the lights, fires, hoops, wheel and crowd sit in each concert painting, as fractions of its width (u) and height (v).
// figures: the dancers who hop, each cut out whole (scripts/crowd_figures.py): [u, v, w, h] in the painting, then [x, w, h] in
// their sheet, all as fractions; hop: how high, as a fraction of the painting's height. rig: the stage lighting, with size and
// beam scaled to each painting's stage.
const LIFE = {
  phone: {
    bulbs: [[0.91,0.5197],[0.9214,0.5862],[0.8292,0.5878],[0.9383,0.5855],[0.8187,0.5894],[0.8436,0.5895],[0.8467,0.5886],[0.9022,0.5897],[0.7444,0.5912],[0.8833,0.5903],[0.7796,0.592],[0.8615,0.5918],[0.8822,0.5929],[0.7601,0.5962],[0.7956,0.5929],[0.7768,0.603],[0.7963,0.6087],[0.9107,0.6116],[0.817,0.6137],[0.9975,0.6111],[0.9277,0.6151],[0.9641,0.6138],[0.9831,0.6141],[0.8381,0.6171],[0.9456,0.6155],[0.9972,0.6153],[0.9642,0.6172],[0.9778,0.6192],[0.8558,0.6184],[0.8778,0.6201],[0.9462,0.6188],[0.8573,0.6217],[0.8799,0.6233],[0.9516,0.6225],[0.9066,0.6237],[0.9299,0.6239],[0.8661,0.6495],[0.7759,0.6583],[0.7901,0.6625],[0.803,0.6643],[0.816,0.6654],[0.7046,0.6677],[0.9172,0.6679],[0.6911,0.6701],[0.6937,0.6741],[0.7078,0.6735],[0.7056,0.6822],[0.6846,0.6862],[0.7022,0.693],[0.6956,0.7041],[0.6816,0.7049],[0.865,0.7117],[0.9375,0.7163],[0.8549,0.7206],[0.9031,0.7231],[0.9862,0.7213],[0.8551,0.728],[0.9925,0.7309],[0.9267,0.7292],[0.907,0.7346],[0.9272,0.7328],[0.8593,0.7366],[0.9317,0.7399],[0.9857,0.7461],[0.935,0.7466]],
    fires: [[0.808, 0.805, 0.05, "bonfire"], [0.928, 0.355, 0.018, "torch"]],
    wheel: [0.816, 0.493, 0.094],
    hoops: [[0.879, 0.727, 0.019], [0.959, 0.727, 0.019]],
    figures: [[0.06778,0.64996,0.06222,0.08147,0.0,0.13827,0.73389],[0.11444,0.65891,0.05,0.10385,0.14321,0.11111,0.93549],[0.16111,0.65891,0.05111,0.10922,0.25926,0.11358,0.98386],[0.22,0.66249,0.04444,0.10833,0.37778,0.09876,0.97584],[0.24444,0.66697,0.05444,0.11101,0.48148,0.12098,0.99999],[0.28333,0.66697,0.04889,0.09042,0.60741,0.10864,0.81451],[0.33444,0.67413,0.05111,0.09758,0.72099,0.11358,0.87901],[0.38333,0.65443,0.07,0.09848,0.83951,0.15556,0.88711]],
    hop: 0.007,
    rig: {
      heads: [[0.138, 0.49], [0.182, 0.488], [0.226, 0.488], [0.284, 0.49]], wall: [0.045, 0.47, 0.335, 0.6], floor: 0.606, panel: [0.155, 0.271, 0.573, 0.605],
      clip: [0.0, 0.44, 0.52, 0.72], strip: [0.045, 0.0152], size: 1, beam: 0.2,
    },
  },
  // Measured from the wide concert painting (docs/design/bloomscroll/wide-concert-input-2026-10-25); the wheel stands where the original wide festival painted it
  wide: {
    bulbs: [[0.9943,0.425],[0.9758,0.4365],[0.6994,0.4445],[0.9718,0.4375],[0.9719,0.4476],[0.9765,0.4503],[0.7114,0.4557],[0.9593,0.4519],[0.9548,0.454],[0.9545,0.4593],[0.9418,0.4611],[0.9602,0.4605],[0.7235,0.4676],[0.94,0.4627],[0.9442,0.464],[0.9555,0.4634],[0.9587,0.4637],[0.8274,0.467],[0.8671,0.4666],[0.8745,0.4652],[0.939,0.467],[0.9572,0.4658],[0.7894,0.4707],[0.8338,0.4688],[0.8589,0.4692],[0.8122,0.4717],[0.8171,0.471],[0.8222,0.4699],[0.842,0.471],[0.8501,0.4713],[0.7389,0.4742],[0.8051,0.4722],[0.9248,0.4787],[0.7372,0.4746],[0.7963,0.4767],[0.9398,0.4746],[0.9448,0.4746],[0.7415,0.477],[0.9432,0.4764],[0.739,0.4834],[0.804,0.484],[0.9053,0.4838],[0.7544,0.4907],[0.8124,0.4896],[0.9033,0.4898],[0.7682,0.4906],[0.7698,0.4906],[0.7718,0.4923],[0.8858,0.4979],[0.7683,0.4999],[0.8942,0.4947],[0.904,0.4929],[0.7827,0.4974],[0.8692,0.4965],[0.9042,0.4959],[0.9082,0.4968],[0.783,0.4982],[0.7856,0.5057],[0.8668,0.5],[0.906,0.4976],[0.7715,0.5012],[0.7998,0.5],[0.82,0.5012],[0.853,0.5076],[0.8933,0.5012],[0.781,0.5047],[0.7966,0.5065],[0.8228,0.5041],[0.8382,0.5078],[0.861,0.5077],[0.8691,0.5088],[0.8235,0.5094],[0.7995,0.5142],[0.8182,0.5147],[0.9768,0.5263],[0.9868,0.5328],[0.9968,0.5334],[0.999,0.5336],[0.7668,0.5601],[0.7224,0.584],[0.8765,0.5913],[0.695,0.5884],[0.733,0.5907],[0.7428,0.5938],[0.7515,0.5966],[0.8152,0.5996],[0.9915,0.6176],[0.9129,0.6234],[0.9955,0.6297],[0.9977,0.6443],[0.707,0.6598],[0.9919,0.6763],[0.6952,0.6633],[0.6824,0.6811],[0.6851,0.6865],[0.6874,0.6927]],
    fires: [[0.8315, 0.795, 0.024, "bonfire"], [0.937, 0.258, 0.014, "torch"]],
    wheel: [0.8264, 0.475, 0.0455],
    hoops: [[0.8795, 0.621, 0.011], [0.9175, 0.643, 0.011], [0.948, 0.655, 0.011], [0.9945, 0.646, 0.011]],
    figures: [[0.12744,0.63751,0.02881,0.20311,0.0,0.0862,0.96714],[0.14844,0.65075,0.01685,0.18642,0.08912,0.05041,0.88767],[0.16089,0.63521,0.03394,0.21001,0.14244,0.10155,0.99999],[0.19678,0.70598,0.02661,0.14845,0.2469,0.07962,0.70687],[0.20093,0.6542,0.04688,0.18757,0.32944,0.14026,0.89314],[0.2439,0.65075,0.01343,0.17204,0.47261,0.04018,0.81919],[0.25195,0.67779,0.01953,0.18527,0.5157,0.05843,0.88219],[0.26343,0.63982,0.02344,0.19333,0.57706,0.07013,0.92057],[0.28296,0.6611,0.02295,0.20196,0.65011,0.06867,0.96166],[0.29834,0.64845,0.02148,0.17089,0.72169,0.06427,0.81372],[0.31299,0.6565,0.02344,0.17549,0.7889,0.07013,0.83562],[0.33276,0.64097,0.02417,0.20081,0.86194,0.07232,0.95619],[0.35229,0.65765,0.02002,0.16743,0.93718,0.0599,0.79724]],
    hop: 0.0081,
    rig: {
      heads: [[0.1275, 0.381], [0.1645, 0.355], [0.2475, 0.363], [0.2785, 0.394]], wall: [0.0525, 0.341, 0.289, 0.651], floor: 0.651, panel: [0.1425, 0.237, 0.578, 0.642],
      clip: [0.0, 0.3, 0.46, 0.92], strip: [0.055, 0.0123], size: 0.81, beam: 0.45,
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

    const holdFor = (H) => (!phoneMode ? Math.round(H * 0.8) : 0)
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
        // Desktop: the full near painting, a touch wider than the screen so no edge shows, seated on the bottom of the scene
        const nw = W * 1.06, nh = nw / NEAR_FULL_ASPECT, nl = -0.03 * W, nt = vis + 4 - nh
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
        for (const [el, clip] of [[flowersL, "inset(0 50% 0 0)"], [flowersR, "inset(0 0 0 50%)"]]) {
          const s = el.style
          s.display = "none"
          s.clipPath = clip
          s.maskImage = s.webkitMaskImage = ""
          s.left = nl + "px"
          s.top = nt + "px"
          s.width = nw + "px"
          s.height = nh + "px"
          s.transformOrigin = `${W / 2 - nl}px ${nh}px`
        }
      } else {
        // Portrait tablets: tall trees on each edge and rose bushes in the corners
        const ph = vis + 4, pw = W * 0.18
        nearHinge = W / 2
        for (const [el, file, side, fade] of [[nearLeft, WIDE_ART.tallL, "left", "to left"], [nearRight, WIDE_ART.tallR, "right", "to right"]]) {
          const s = el.style, img = el.firstElementChild
          setSrc(img, file)
          img.style.cssText = `position:absolute;top:0;${side}:0;height:100%;width:100%;`
          s.clipPath = "none"
          s.overflow = "hidden"
          s.maskImage = s.webkitMaskImage = `linear-gradient(${fade}, transparent 0, #000 30%)`
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

    // Concert: one beat drives the crowd and the stage lights
    const crowdCanvas = part("crowd"), crowdCtx = crowdCanvas.getContext("2d")
    function drawCrowd(t) {
      const bw = backdrop.clientWidth, bh = backdrop.clientHeight
      // Up to 1.5x resolution: the painted crowd is soft, so sharper buys nothing
      const dpr = Math.min(devicePixelRatio || 1, 1.5)
      const cw = Math.round(bw * dpr), ch = Math.round(bh * dpr)
      if (crowdCanvas.width !== cw || crowdCanvas.height !== ch) { crowdCanvas.width = cw; crowdCanvas.height = ch }
      const c = crowdCtx
      c.clearRect(0, 0, cw, ch)
      if (!figureSheet.complete || !figureSheet.naturalWidth) return
      const L = life()
      const iw = figureSheet.naturalWidth, ih = figureSheet.naturalHeight
      const beat = reduced.matches ? -1 : t / BEAT
      // Each dancer hops whole, never stretched: a quick hop on the beat, rolling across the crowd from left to right
      L.figures.forEach(([u, v, w, h, sx, sw, sh], i) => {
        const right = u > 0.5
        const x = (u + (right ? lifeShift.rx : lifeShift.lx)) * cw, y = (v + (right ? lifeShift.ry : lifeShift.ly)) * ch
        const at = beat < 0 ? 1 : (beat - u * 2.2 + (i % 3) * 0.13) % 1
        const lift = at < 0.42 ? Math.sin((at / 0.42) * Math.PI) * (0.75 + 0.25 * ((i * 7) % 4) / 3) : 0
        c.drawImage(figureSheet, sx * iw, 0, sw * iw, sh * ih, x, y - lift * L.hop * ch, w * cw, h * ch)
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
      // LED strip along the front of the stage, chasing in colour
      s.globalAlpha = 1
      for (let k = 0; k < 20; k++) {
        const [x, y] = at(R.strip[0] + k * R.strip[1], R.floor)
        const on = Math.pow(0.5 + 0.5 * Math.sin(t / 140 - k * 0.8), 3)
        const [cr, cg, cb] = k % 2 ? [r, g, b] : [r2, g2, b2]
        s.fillStyle = `rgba(${cr},${cg},${cb},${0.35 + 0.65 * on})`
        s.fillRect(x - cw * 0.004 * z, y - ch * 0.0015 * z, cw * 0.008 * z, ch * 0.003 * z)
      }
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
    // notice bar scrolls away). Phones have no hold: the scene moves from the first pixel of scroll, so that is where it counts from.
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
      const hold = holdFor(H)
      const target = Math.min(scrollPos(), hold + H)
      const still = reduced.matches
      sy = still ? target : target + (sy - target) * Math.exp(-dt / 0.085)
      px += (tx - px) * (1 - Math.exp(-dt / 0.35))
      py += (ty - py) * (1 - Math.exp(-dt / 0.35))
      // p: how far the visitor has walked in; y: how far the scene itself has scrolled (only after the hold)
      const p = hold ? Math.min(1, sy / hold) : sy / H
      const y = still ? 0 : Math.max(0, sy - hold)
      const mx = still ? 0 : px, my = still ? 0 : py
      const since = still ? 99999 : now - unfoldStart
      const fy = still ? 0 : y, fp = still ? 0 : p, fmx = still ? 0 : mx, fmy = still ? 0 : my

      book.style.transform = still ? "" : `scale(1.03) rotateY(${mx * 2.2}deg) rotateX(${-my * 1.4}deg)`
      // The sky is effectively at infinity, so it barely zooms
      sky.style.transform = `translate3d(${fmx * -6}px, ${fy * 0.7}px, 0) scale(${1 + fp * 0.03}) rotateX(${angle("back")}deg)`
      // The far painting, festival and glows are one rigid piece that walks in toward the path's end
      backdrop.style.transform = `translate3d(${fmx * -12}px, ${fy * FAR_LAG + fmy * -6}px, 0) scale(${1 + fp * WALK_ZOOM}) rotateX(${angle("back")}deg)`
      glowLights.style.transform = backdrop.style.transform
      clouds.style.transform = !still ? `translate3d(${Math.sin(now / 9000) * 10}px, 0, 0) ${backdrop.style.transform}` : backdrop.style.transform
      // Phones: the dark meadow under the painting drifts with it, so its top edge never shows above the festival
      ground.style.transform = phoneMode ? `translate3d(0, ${fy * FAR_LAG}px, 0)` : ""
      farSoft.style.opacity = String(smoothstep(0.05, 0.6, fp) * 0.8)

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
      }
      // The ending: as the walk-in finishes (phones: in the first third of the scroll) the Bloomscroll mark rises into the
      // middle of the scene and holds there, gently glowing; reduced motion shows it already there
      const land = still ? 1 : smoothstep(0.82, 1, Math.min(1, p * (phoneMode ? 3 : 1)))
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
