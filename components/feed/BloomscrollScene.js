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

const IMG = "/images/bloomscroll/"
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
const FAR_TALL_ASPECT = 1024 / 1536
const FAR_TALL_HILL = 0.743
const PAINT_ASPECT = 1584 / 672
const BEAT = 60000 / 124
const BUSHES = ["bush-1.webp", "bush-2.webp", "bush-3.webp", "bush-4.webp", "bush-5.webp"]
const BUSH_ASPECT = 466 / 560
const BUSH_MAX = 340
const VINE_GUTTER = 120
const VINE_W = 22
const BLOOM_MS = 1500
const BLOOM_LINE = 0.84
const SEPAL = "M0,0 C-7,-10 -6,-28 0,-38 C6,-28 7,-10 0,0Z"
const ROSE_SHEET = "roses.webp"
const ROSES = [
  { teal: false, w: 224, h: 213, c: [111.8, 106.4], R: 99.6, full: [0, 0, 206, 194, 9, 9],
    petals: [[683, 358, 86, 62, 24, 134, 0.83, 131.2], [771, 358, 90, 58, 91, 143, 0.778, 70.4], [373, 358, 67, 83, 106, 37, 0.524, 313.1], [351, 196, 132, 139, 10, 18, 0.509, 204.4], [412, 0, 160, 181, 53, 11, 0.505, 345.9], [490, 358, 63, 73, 105, 93, 0.438, 45.6], [442, 358, 46, 73, 104, 57, 0.239, 321.2], [124, 358, 105, 94, 39, 63, 0.216, 169.1], [178, 458, 52, 37, 76, 76, 0.151, 229.5]] },
  { teal: true, w: 224, h: 185, c: [106.9, 99], R: 90.3, full: [574, 0, 206, 167, 9, 9],
    petals: [[322, 358, 49, 88, 10, 75, 0.872, 163.8], [591, 358, 32, 63, 45, 14, 0.808, 227.8], [555, 358, 34, 69, 130, 59, 0.474, 350.2], [956, 358, 47, 47, 56, 96, 0.421, 137.9], [887, 358, 19, 49, 70, 56, 0.382, 211.6], [232, 458, 29, 33, 93, 70, 0.125, 252.5], [782, 0, 175, 165, 28, 9, 0.097, 357.8]] },
  { teal: false, w: 224, h: 204, c: [116.1, 102.7], R: 94.1, full: [208, 0, 202, 182, 11, 11],
    petals: [[0, 458, 111, 46, 76, 13, 0.731, 271.9], [908, 358, 46, 49, 40, 106, 0.698, 150.1], [231, 358, 89, 89, 43, 40, 0.531, 215.2], [315, 458, 35, 18, 95, 48, 0.508, 268.2], [771, 196, 159, 119, 12, 38, 0.437, 176.3], [206, 196, 143, 150, 69, 41, 0.376, 18.7]] },
  { teal: false, w: 224, h: 180, c: [97.8, 90.9], R: 93.8, full: [0, 196, 204, 160, 10, 10],
    petals: [[863, 358, 22, 50, 15, 69, 0.759, 177.5], [625, 358, 56, 63, 114, 28, 0.622, 325.1], [485, 196, 118, 133, 11, 24, 0.408, 170.1], [605, 196, 164, 127, 40, 41, 0.386, 50.9], [113, 458, 63, 39, 70, 38, 0.357, 285.7], [263, 458, 50, 21, 100, 72, 0.342, 347.7], [0, 358, 122, 98, 49, 11, 0.329, 277.8]] },
]

const LIFE = {
  phone: {
    bulbs: [[0.95,0.5892],[0.9162,0.5911],[0.9347,0.5899],[1.2201,0.5922],[0.8195,0.5933],[0.8978,0.5943],[0.8362,0.595],[0.7405,0.5966],[0.8881,0.5945],[0.8541,0.5964],[0.8742,0.5961],[0.8084,0.5958],[0.7953,0.597],[0.7658,0.5976],[0.7789,0.5979],[0.7572,0.6023],[0.7759,0.6086],[1.0672,0.6113],[1.0854,0.6107],[0.7971,0.6148],[1.039,0.619],[0.9236,0.6188],[0.8205,0.6203],[1.1002,0.6188],[1.0191,0.6228],[1.1645,0.6181],[0.9449,0.6207],[0.9818,0.6189],[0.8433,0.6242],[1.1184,0.6238],[0.9634,0.6214],[1.1538,0.6234],[0.8684,0.6277],[0.996,0.6263],[0.9835,0.6238],[1.1368,0.6257],[0.8943,0.6293],[0.9686,0.6293],[0.9446,0.6302],[0.9193,0.6301],[0.7747,0.6619],[0.7906,0.6671],[0.8052,0.6702],[0.8194,0.6722],[0.8419,0.6765],[0.9137,0.677],[0.8848,0.6781],[0.9339,0.6786],[0.8638,0.6791],[0.8744,0.6796]],
    fires: [[0.8078,0.8048,0.05,"bonfire"], [0.9174,0.4015,0.018,"torch"]],
    wheel: [0.8,0.5,0.094],
    hoops: [[0.8757,0.7305,0.0385],[0.9792,0.7336,0.0464]],
    cast: {
      dj: [0.1847,0.6483,0.0548,0.0305], booth: [0.1504,0.6764,0.1232,0.0633],
      people: [[2,0,0.101,0.7836,0.0963,0.3],[3,0,0.143,0.7836,0.0962,2.0],[4,0,0.185,0.7837,0.0963,3.7],[5,0,0.227,0.7837,0.0963,5.4],[6,0,0.269,0.7837,0.0963,7.1],[7,0,0.311,0.7837,0.0963,8.8],[8,0,0.353,0.7837,0.0963,10.5],[9,1,0.08,0.8044,0.1087,1.1],[10,1,0.129,0.8065,0.115,3.4],[11,1,0.178,0.8044,0.1119,5.7],[12,1,0.227,0.8066,0.1088,8.0],[13,1,0.276,0.8045,0.115,10.3],[14,1,0.325,0.8065,0.1118,12.6],[15,1,0.374,0.8045,0.1088,14.9]],
      sheet: [[0.0,0.05369,0.26452],[0.05551,0.12193,0.54839],[0.17925,0.06096,0.83871],[0.24204,0.04277,0.83871],[0.28662,0.04823,0.83871],[0.33667,0.05369,0.83871],[0.39217,0.06096,0.83871],[0.45496,0.04641,0.83871],[0.50318,0.05551,0.83871],[0.56051,0.06551,0.94194],[0.62784,0.05278,1.0],[0.68244,0.05914,0.97419],[0.7434,0.04277,0.94194],[0.78799,0.06733,1.0],[0.85714,0.06733,0.97419],[0.9263,0.07188,0.94194]],
    },
    rig: {
      heads: [[0.0855,0.6124],[0.1387,0.6062],[0.1814,0.5952],[0.1883,0.6167],[0.224,0.6184],[0.2578,0.6215],[0.276,0.599],[0.3114,0.6115]], wall: [0.0522,0.5918,0.3456,0.6845], floor: 0.7003, panel: [0.1548,0.2693,0.6821,0.7156],
      clip: [0.0,0.523,0.422,0.84], size: 1, beam: 0.2,
    },
  },
  wide: {
    bulbs: [[0.7695,0.5455],[0.7519,0.5485],[0.7615,0.5465],[0.9107,0.5502],[0.7013,0.5519],[0.7423,0.5533],[0.71,0.5544],[0.66,0.5569],[0.7372,0.5537],[0.7194,0.5566],[0.7299,0.5561],[0.6955,0.5556],[0.6887,0.5574],[0.6732,0.5583],[0.6801,0.5589],[0.6688,0.5656],[0.6785,0.5752],[0.8308,0.5794],[0.8403,0.5784],[0.6896,0.5847],[0.816,0.5911],[0.7557,0.5908],[0.7018,0.593],[0.848,0.5908],[0.8056,0.5969],[0.8816,0.5897],[0.7668,0.5937],[0.7861,0.5909],[0.7138,0.599],[0.8575,0.5984],[0.7765,0.5947],[0.876,0.5977],[0.7269,0.6043],[0.7936,0.6022],[0.787,0.5984],[0.8671,0.6013],[0.7404,0.6068],[0.7793,0.6068],[0.7667,0.6082],[0.7535,0.608],[0.6779,0.6566],[0.6862,0.6645],[0.6938,0.6692],[0.7013,0.6724],[0.713,0.6789],[0.7505,0.6797],[0.7354,0.6814],[0.7611,0.6821],[0.7245,0.6829],[0.73,0.6836]],
    fires: [[0.8315,0.7951,0.024,"bonfire"], [0.7525,0.2587,0.014,"torch"]],
    wheel: [0.885,0.45,0.045],
    hoops: [[0.883,0.6303,0.0292],[0.9614,0.6371,0.0352]],
    cast: {
      dj: [0.1611,0.4939,0.0441,0.0717], booth: [0.1335,0.56,0.0991,0.149],
      people: [[2,0,0.1522,0.7974,0.1716,0.3],[3,0,0.1786,0.7975,0.1716,2.0],[4,0,0.2051,0.7974,0.1714,3.7],[5,0,0.2315,0.7974,0.1716,5.4],[6,0,0.2579,0.7974,0.1716,7.1],[7,0,0.2844,0.7975,0.1717,8.8],[8,0,0.3108,0.7974,0.1715,10.5],[9,1,0.139,0.8445,0.1951,1.1],[10,1,0.1698,0.8484,0.2069,3.4],[11,1,0.2007,0.8445,0.201,5.7],[12,1,0.2315,0.8484,0.1952,8.0],[13,1,0.2623,0.8444,0.2068,10.3],[14,1,0.2932,0.8484,0.201,12.6],[15,1,0.324,0.8445,0.1951,14.9]],
      sheet: [[0.0,0.07191,0.3454],[0.07271,0.16181,0.71866],[0.23532,0.05793,0.83008],[0.29405,0.03875,0.83008],[0.3336,0.04395,0.83008],[0.37835,0.05074,0.83008],[0.42988,0.05793,0.83008],[0.48861,0.04275,0.83008],[0.53216,0.05234,0.83008],[0.5853,0.06352,0.9415],[0.64962,0.04994,1.0],[0.70036,0.05633,0.97214],[0.75749,0.03915,0.9415],[0.79744,0.06512,1.0],[0.86336,0.06512,0.97214],[0.92928,0.06992,0.9415]],
    },
    rig: {
      heads: [[0.0813,0.4093],[0.124,0.3948],[0.1584,0.3688],[0.164,0.4195],[0.1927,0.4234],[0.2199,0.4307],[0.2345,0.3778],[0.263,0.4072]], wall: [0.0545,0.361,0.2905,0.579], floor: 0.6161, panel: [0.137,0.2292,0.5732,0.6521],
      clip: [0.0,0.225,0.36,0.881], size: 0.81, beam: 0.45,
    },
  },
}

const smoothstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }

function concertColour(t, shift, cols) {
  const span = BEAT * 8, k = t / span + shift, i = Math.floor(k), f = k - i, n = cols.length
  const A = cols[((i % n) + n) % n], B = cols[(((i + 1) % n) + n) % n], m = Math.min(1, f * 4)
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

/**
 * The Bloomscroll festival scene at the top of the feed.
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
    const tokens = getComputedStyle(document.documentElement)
    const rgb = (name) => tokens.getPropertyValue(`--tag-bs-${name}-rgb`).trim()
    const concertCols = ["teal", "lime", "pink", "violet", "warm-white"].map((name) => rgb(name).split(",").map(Number))
    const flameStops = [[0, `rgba(${rgb("flame-core")}, 0.95)`], [0.35, `rgba(${rgb("flame-mid")}, 0.85)`], [0.75, `rgba(${rgb("flame-edge")}, 0.45)`], [1, `rgba(${rgb("flame-tip")}, 0)`]]

    let moonRest = 0, moonSunk = 0, nearHinge = 0, phoneMode = false, sceneTop = 0, stickTop = 0
    let lifeShift = { lx: 0, ly: 0, rx: 0, ry: 0 }
    const setSrc = (img, file) => { const src = `${IMG}${file}?${ART_V}`; if (img.getAttribute("src") !== src) img.setAttribute("src", src) }
    const figureSheet = new Image()
    const life = () => (phoneMode ? LIFE.phone : LIFE.wide)

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
      setSrc(sky, WIDE_ART.sky)
      setSrc(farImg, WIDE_ART.far)
      setSrc(farSoft, WIDE_ART.soft)
      setSrc(clouds.firstElementChild, WIDE_ART.clouds)
      const sharp = W * (devicePixelRatio || 1) > 2200
      setSrc(figureSheet, sharp ? WIDE_ART.figures2x : WIDE_ART.figures)
      nearLeft.style.display = nearRight.style.display = ""
      festImgs.forEach((img) => { setSrc(img, sharp && img.dataset.fest === "fest" ? WIDE_ART.fest2x : WIDE_ART[img.dataset.fest]); img.style.position = img.style.left = img.style.top = img.style.width = img.style.height = "" })
      if (wide) {
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
        const ph = vis + 4, pw = ph * TALL_ASPECT
        nearHinge = W / 2
        for (const [el, file, side, fade, soft] of [[nearLeft, WIDE_ART.tallL, "left", "to left", 4], [nearRight, WIDE_ART.tallR, "right", "to right", 4]]) {
          const s = el.style, img = el.firstElementChild
          setSrc(img, file)
          img.style.cssText = `position:absolute;top:0;${side}:0;height:100%;width:100%;`
          s.clipPath = "none"
          s.overflow = "hidden"
          s.maskImage = s.webkitMaskImage = `linear-gradient(${fade}, transparent 0, black ${soft}%)`
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
          s.maskImage = s.webkitMaskImage = `linear-gradient(${fade}, black 0, black 26%, transparent 36%)`
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
      const base = wide ? vis + 8 : vis * 0.9
      const top = base - bh
      ground.style.top = (wide ? vis - 2 : base - 6) + "px"
      for (const el of [backdrop, glowLights, clouds]) {
        el.style.left = (W - bw) / 2 + "px"
        el.style.top = top + "px"
        el.style.width = bw + "px"
        el.style.height = bh + "px"
      }
      const dx = wide ? 0 : bw * 0.06
      lifeShift = { lx: dx / bw, ly: 0, rx: -dx / bw, ry: 0 }
      festImgs.forEach((img) => {
        const right = img.dataset.side === "right"
        img.style.translate = dx ? `${right ? -dx : dx}px 0` : ""
      })
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
      const hill = top + bh * 0.58, mw = moon.offsetWidth
      const sk = sky.style
      if (wide) {
        sk.left = sk.top = sk.width = sk.height = sk.objectFit = sk.objectPosition = sk.backgroundColor = ""
      } else {
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

    const flyCanvases = [part("fliesBack"), part("fliesFront")]
    const flySprite = radialSprite(32, [[0, `rgba(${rgb("firefly")}, 1)`], [0.25, `rgba(${rgb("lime")}, 0.55)`], [1, `rgba(${rgb("lime")}, 0)`]])
    const warmSprite = radialSprite(64, [[0, `rgba(${rgb("glow-core")}, 1)`], [0.2, `rgba(${rgb("glow-mid")}, 0.7)`], [0.55, `rgba(${rgb("glow-edge")}, 0.18)`], [1, `rgba(${rgb("glow-tip")}, 0)`]])
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
      const X = (u) => (u + lifeShift.lx) * cw, Y = (v) => (v + lifeShift.ly) * ch
      const sprite = (k, x, foot, h, tilt) => {
        const [sx, sw, sh] = C.sheet[k], w = (h * sw * iw) / (sh * ih)
        c.save()
        c.translate(x, foot)
        if (tilt) c.rotate(tilt)
        c.drawImage(figureSheet, sx * iw, 0, sw * iw, sh * ih, -w / 2, -h, w, h)
        c.restore()
      }
      const [du, dv, dw, dh] = C.dj
      const nod = beat < 0 ? 0 : Math.pow(Math.abs(Math.sin(beat * Math.PI)), 3) * dh * 0.035
      const sway = beat < 0 ? 0 : Math.sin((beat / 4) * Math.PI * 2) * 0.025
      sprite(0, X(du + dw / 2), Y(dv + dh) + nod, dh * ch, sway)
      const [bu, bv, bwid, bht] = C.booth
      sprite(1, X(bu + bwid / 2), Y(bv + bht), bht * ch, 0)
      c.filter = "brightness(0.82)"
      C.people.forEach(([k, row, x, foot, h, seed]) => {
        if (row) return
        const lean = beat < 0 ? 0 : Math.sin((beat / 2 + seed) * Math.PI) * 0.045
        const bob = beat < 0 ? 0 : Math.max(0, Math.sin((beat + seed * 0.5) * Math.PI * 2)) * h * 0.015
        sprite(k, X(x), Y(foot - bob), h * ch, lean)
      })
      c.filter = "none"
      C.people.forEach(([k, row, x, foot, h, seed]) => {
        if (!row) return
        const every = seed % 2 < 1 ? 1 : 2, at = beat < 0 ? 1 : ((beat + seed * 0.37) / every) % 1
        const lift = at < 0.38 ? Math.sin((at / 0.38) * Math.PI) * h * (0.05 + 0.03 * ((seed * 3) % 1)) : 0
        sprite(k, X(x), Y(foot - lift), h * ch, 0)
      })
    }

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
      const [r, g, b] = concertColour(t, 0, concertCols), [r2, g2, b2] = concertColour(t, 0.5, concertCols)
      const L = life(), R = L.rig, z = R.size
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
      const [sx0, sy0] = at(R.wall[0], R.wall[1]), [sx1, sy1] = at(R.wall[2], R.wall[3])
      s.globalAlpha = 1
      softOval(s, sx0, sy0, sx1, sy1 + (sy1 - sy0) * 0.4, `${r},${g},${b}`, 0.55 + 0.35 * pulse)
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
      if (beatN % 16 === 0 && beatPhase < 0.25) softOval(s, sx0, sy0, sx1, sy1 + (sy1 - sy0) * 0.4, rgb("strobe"), 0.5 * (1 - beatPhase / 0.25))
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
      const teal = `rgb(${rgb("wheel")})`, tealHi = `rgb(${rgb("wheel-hi")})`, dark = `rgb(${rgb("wheel-dark")})`
      c.lineCap = "round"
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
      for (const [rad, col, lw] of [[1, dark, 0.07], [1, teal, 0.045], [0.995, tealHi, 0.015], [0.62, dark, 0.04], [0.62, teal, 0.022]]) {
        c.strokeStyle = col; c.lineWidth = R * lw
        c.beginPath(); c.arc(x, y, R * rad, 0, Math.PI * 2); c.stroke()
      }
      c.fillStyle = dark; c.beginPath(); c.arc(x, y, R * 0.09, 0, Math.PI * 2); c.fill()
      c.fillStyle = tealHi; c.beginPath(); c.arc(x - R * 0.02, y - R * 0.02, R * 0.04, 0, Math.PI * 2); c.fill()
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
        c.fillStyle = `rgba(${rgb("window")}, ${0.55 + 0.45 * lit})`
        c.fillRect(-R * 0.05, R * 0.12, R * 0.1, R * 0.045)
        c.restore()
      }
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
      L.bulbs.forEach(([u, v], i) => {
        const [x, y] = at(u, v)
        sprite(x, y, unit * 0.036, 0.2 + 0.8 * Math.pow(0.5 + 0.5 * Math.sin(t / 380 - u * 40 + (i % 3) * 2.1), 2))
      })
      L.fires.forEach(([u, v, r, kind], fi) => {
        const [x, y] = at(u, v)
        const R = r * unit
        const fR = R * (kind === "torch" ? 1.15 : 1)
        for (const [k, [off, hgt, wid]] of [[0, 1.6, 0.55], [-0.35, 1.15, 0.38], [0.35, 1.2, 0.38]].entries()) {
          const sway = Math.sin(t / (180 + k * 37) + fi * 2 + k) * fR * 0.18 + Math.sin(t / 73 + k * 3 + fi) * fR * 0.06
          const h = fR * hgt * (0.85 + 0.15 * Math.sin(t / (90 + k * 21) + fi + k * 1.3))
          const w = fR * wid, bx = x + off * fR
          const g = c.createLinearGradient(bx, y, bx, y - h)
          flameStops.forEach(([at, colour]) => g.addColorStop(at, colour))
          c.globalAlpha = appear
          c.fillStyle = g
          c.beginPath()
          c.moveTo(bx - w, y)
          c.bezierCurveTo(bx - w * 1.1, y - h * 0.45, bx + sway - w * 0.4, y - h * 0.7, bx + sway, y - h)
          c.bezierCurveTo(bx + sway + w * 0.4, y - h * 0.7, bx + w * 1.1, y - h * 0.45, bx + w, y)
          c.closePath()
          c.fill()
        }
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
        if (appear <= 0 || (phoneMode && i === 1)) return
        const s = cv.width / W
        flies[i].forEach((f, k) => {
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
          const lag = phoneMode ? FAR_LAG : lagByDepth[f.depth]
          const px = (f.x * W + mx * [-10, -22, -60][f.depth]) * s
          const py = (f.y * H + y * lag) * s
          const sz = sizeByDepth[f.depth] * s
          c.drawImage(flySprite, px - sz / 2, py - sz / 2, sz, sz)
        })
      })
    }

    const pieces = { back: [0, 34], flaps: [380, 80], flowers: [540, 86] }
    const unfoldStart = performance.now()
    const angle = (key) => {
      const [delay, from] = pieces[key], ms = performance.now() - unfoldStart - delay
      if (reduced.matches) return 0
      if (ms <= 0) return from
      return from * Math.exp((-ms / 1000) * 6.5) * Math.cos((ms / 1000) * 8.5)
    }

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
      const p = Math.min(1, sy / walk)
      const m = Math.min(1, Math.max(0, (sy - walk) / (hold - walk)))
      const y = still ? 0 : Math.max(0, sy - hold)
      const mx = still ? 0 : px, my = still ? 0 : py
      const since = still ? 99999 : now - unfoldStart
      const fy = still ? 0 : y, fp = still ? 0 : p, fmx = still ? 0 : mx, fmy = still ? 0 : my

      book.style.transform = still ? "" : `scale(1.03) rotateY(${mx * 2.2}deg) rotateX(${-my * 1.4}deg)`
      sky.style.transform = `translate3d(${fmx * -6}px, ${fy * 0.7}px, 0) scale(${1 + fp * 0.03}) rotateX(${angle("back")}deg)`
      backdrop.style.transform = `translate3d(${fmx * -12}px, ${fy * FAR_LAG + fmy * -6}px, 0) scale(${1 + fp * WALK_ZOOM}) rotateX(${angle("back")}deg)`
      glowLights.style.transform = farTall.style.transform = backdrop.style.transform
      clouds.style.transform = !still ? `translate3d(${Math.sin(now / 9000) * 10}px, 0, 0) ${backdrop.style.transform}` : backdrop.style.transform
      ground.style.transform = phoneMode ? `translate3d(0, ${fy * FAR_LAG}px, 0)` : ""
      farSoft.style.opacity = farTallSoft.style.opacity = String(smoothstep(0.05, 0.6, fp) * 0.8)

      const rise = 1 - smoothstep(700, 2300, since)
      const sink = Math.max(rise, Math.min(1, p * 1.5))
      const mw = moon.offsetWidth
      const mxPos = W * ((phoneMode ? 0.56 : 0.63) + sink * 0.05) - mw / 2 + mx * -4
      const myPos = moonRest + sink * (moonSunk - moonRest) + y * 0.72 - mw / 2
      moon.style.transform = `translate3d(${mxPos}px, ${myPos}px, 0)`
      moon.style.setProperty("--glow", String(1 - smoothstep(0.35, 0.95, sink)))

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

    const garden = part("garden"), column = feed.querySelector(":scope > .container")
    const sheet = new Image()
    sheet.src = `${IMG}${ROSE_SHEET}?${ART_V}`
    const sepal = new Path2D(SEPAL), sepalFill = `rgb(${rgb("sepal")})`
    const clamp = (x) => Math.max(0, Math.min(1, x))
    const ease = (x) => x * x * x * (x * (x * 6 - 15) + 10)
    const seeded = (seed) => () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
    const whites = ROSES.flatMap((art, i) => (art.teal ? [] : [i])), teals = ROSES.flatMap((art, i) => (art.teal ? [i] : []))
    const bed = { L: 0, w: 0, top: 0, vine: false, dpr: 1 }
    const beds = [...garden.children].map((el, n) => ({ el, bush: el.firstElementChild, right: n === 1, roses: [], kept: [] }))

    function drawRose(rose) {
      const art = ROSES[rose.art], cv = rose.el, c = cv.getContext("2d"), [cx, cy] = art.c, p = rose.p
      c.setTransform(1, 0, 0, 1, 0, 0)
      c.clearRect(0, 0, cv.width, cv.height)
      if (!sheet.complete) return
      const k = (rose.size * bed.dpr) / Math.max(art.w, art.h)
      c.translate(cv.width / 2, cv.height / 2)
      c.scale(k, k)
      c.translate(cx - art.w / 2, cy - art.h / 2)
      const piece = (box) => c.drawImage(sheet, box[0], box[1], box[2], box[3], box[4] - cx, box[5] - cy, box[2], box[3])
      const es = ease(clamp(p / 0.6))
      if (es < 1) {
        const sk = (art.R / 36) * (0.42 + 0.3 * es)
        c.globalAlpha = 1 - es
        c.fillStyle = sepalFill
        for (let n = 0; n < 5; n++) {
          c.save()
          c.rotate(((n * 72 + 36 + rose.seed * 11) * Math.PI) / 180)
          c.scale(sk * 0.9, sk)
          c.fill(sepal)
          c.restore()
        }
        c.globalAlpha = 1
      }
      c.rotate(rose.tilt)
      const eb = ease(clamp(p))
      if (eb >= 1) { piece(art.full); return }
      c.rotate(((1 - eb) * -14 * rose.spin * Math.PI) / 180)
      c.scale(0.66 + 0.34 * eb, 0.66 + 0.34 * eb)
      const us = 0.3 + 0.7 * ease(clamp((p - 0.04) / 0.8))
      c.save()
      c.scale(us, us)
      piece(art.full)
      c.restore()
      for (const pt of art.petals) {
        const r = pt[6], inner = r < 0.3, a = (pt[7] * Math.PI) / 180
        const turn = ((((pt[7] * rose.spin) % 360) + 360) % 360) / 360
        const e = ease(clamp((p - (inner ? 0.26 + turn * 0.05 : 0.22 * (1 - r) + turn * 0.07)) / 0.7))
        c.save()
        if (e < 1) {
          c.rotate((1 - e) * ((rose.spin * (inner ? 10 : 6 + 12 * r) * Math.PI) / 180) + a)
          c.scale(e + (1 - e) * (inner ? 0.62 : 0.3), e + (1 - e) * (inner ? 0.78 : 0.6))
          c.rotate(-a)
        }
        piece(pt)
        c.restore()
      }
    }

    function sprout(b, rose) {
      const cv = document.createElement("canvas"), box = rose.size * 1.3, x = rose.fx * bed.w
      cv.className = "tag-bs-garden__rose"
      cv.width = cv.height = Math.ceil(box * bed.dpr)
      Object.assign(cv.style, { width: `${box}px`, height: `${box}px`, left: `${(b.right ? bed.w - x : x) - box / 2}px`, top: `${rose.y - box / 2}px` })
      rose.el = cv
      b.el.appendChild(cv)
      drawRose(rose)
    }

    function plant(b, height) {
      const segH = bed.w * BUSH_ASPECT
      for (; b.bushTo < height; b.bushTo += segH * 0.6 * (0.9 + b.bushRnd() * 0.2)) {
        let pick = Math.floor(b.bushRnd() * BUSHES.length)
        if (pick === b.bushPick) pick = (pick + 1) % BUSHES.length
        b.bushPick = pick
        const scale = 0.94 + b.bushRnd() * 0.16, img = document.createElement("img")
        img.alt = ""
        img.decoding = "async"
        img.src = `${IMG}${BUSHES[pick]}?${ART_V}`
        Object.assign(img.style, { top: `${b.bushTo}px`, left: `${(b.bushRnd() - 0.6) * 0.1 * bed.w}px`, width: `${bed.w * scale}px`, height: `${segH * scale}px` })
        b.bush.appendChild(img)
      }
      const rnd = b.roseRnd
      for (; b.roseTo < height - 50; b.roseTo += 58 + rnd() * 52) {
        const teal = rnd() < 0.45, seed = Math.floor(rnd() * 1000), set = teal ? teals : whites
        const size = bed.vine ? 17 + rnd() * 7 : 50 + rnd() * 38
        const bud = !bed.vine && rnd() < 0.08, jitter = rnd() * 400, fx = 0.16 + rnd() * 0.7
        b.roses.push({
          y: b.roseTo, fx, size, seed, bud, jitter, el: null, t0: undefined,
          art: set[seed % set.length], tilt: ((((seed * 37) % 40) - 20) * Math.PI) / 180, spin: seed % 2 ? 1 : -1,
          p: b.kept[b.roses.length] ?? (reduced.matches ? 1 : 0),
        })
      }
    }

    function layoutGarden() {
      if (!column) return
      const H = scene.clientHeight
      const rootR = root.getBoundingClientRect(), colR = column.getBoundingClientRect(), rootTop = rootR.top + window.scrollY
      const gutter = colR.left - rootR.left, vine = gutter < VINE_GUTTER
      const w = vine ? VINE_W : Math.min(BUSH_MAX, gutter - 12)
      bed.dpr = Math.min(2, devicePixelRatio || 1)
      bed.L = phoneMode ? holdFor(H) : sceneTop - stickTop + holdFor(H)
      bed.top = bed.L + stickTop + H * (vine ? 1 : 0.74) - rootTop
      const height = Math.max(0, colR.bottom + window.scrollY - rootTop - bed.top + 40)
      garden.style.top = `${bed.top}px`
      garden.style.height = `${height}px`
      if (w !== bed.w || vine !== bed.vine) {
        bed.w = w
        bed.vine = vine
        beds.forEach((b, n) => {
          b.kept = b.roses.map((rose) => rose.p)
          b.roses.forEach((rose) => rose.el?.remove())
          b.bush.replaceChildren()
          b.el.style.width = `${w}px`
          Object.assign(b, { roses: [], bushTo: -w * BUSH_ASPECT * 0.3, roseTo: 80, bushPick: -1, bushRnd: seeded(7 + n * 6), roseRnd: seeded(29 + n * 24) })
        })
      }
      beds.forEach((b) => plant(b, height))
    }

    let gardenOn = false, gardenRaf = 0
    function tend(now) {
      const g = reduced.matches ? 1 : smoothstep(0, holdFor(scene.clientHeight), sy)
      const travel = bed.w + 60
      garden.style.transform = `translate3d(0, ${-Math.max(0, bed.L - window.scrollY)}px, 0)`
      beds[0].el.style.transform = `translate3d(${-(1 - g) * travel}px, 0, 0)`
      beds[1].el.style.transform = `translate3d(${(1 - g) * travel}px, 0, 0)`
      const locked = window.scrollY >= bed.L - 1, vh = innerHeight, top = garden.getBoundingClientRect().top
      for (const b of beds) {
        for (const rose of b.roses) {
          const y = top + rose.y
          if (y < -vh || y > vh * 2) {
            if (rose.el) { rose.el.remove(); rose.el = null }
            continue
          }
          if (!rose.el) sprout(b, rose)
          if (rose.p >= 1) continue
          if (rose.t0 === undefined && locked && !rose.bud && y < vh * BLOOM_LINE) rose.t0 = now + rose.jitter
          if (rose.t0 === undefined) continue
          rose.p = clamp((now - rose.t0) / BLOOM_MS)
          drawRose(rose)
        }
      }
      gardenRaf = gardenOn ? requestAnimationFrame(tend) : 0
    }
    const gardenWatch = new IntersectionObserver(([e]) => {
      gardenOn = e.isIntersecting
      if (gardenOn && !gardenRaf) gardenRaf = requestAnimationFrame(tend)
    })
    const gardenResizer = new ResizeObserver(() => layoutGarden())
    sheet.addEventListener("load", () => beds.forEach((b) => b.roses.forEach((rose) => rose.el && drawRose(rose))))
    layoutGarden()
    gardenWatch.observe(garden)
    gardenResizer.observe(scene)
    gardenResizer.observe(feed)
    return () => {
      cancelAnimationFrame(gardenRaf)
      gardenWatch.disconnect()
      gardenResizer.disconnect()
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
      <div className="tag-bs-garden" data-part="garden" aria-hidden="true">
        <div className="tag-bs-garden__bed tag-bs-garden__bed--l"><div className="tag-bs-garden__bush" /></div>
        <div className="tag-bs-garden__bed tag-bs-garden__bed--r"><div className="tag-bs-garden__bush" /></div>
      </div>
    </div>
  )
}
