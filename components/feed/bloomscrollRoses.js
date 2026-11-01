/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/

export const IMG = "/images/bloomscroll/"
export const ART_V = "v=16"
export const BLOOM_MS = 1500
export const ROSE_SHEET = "roses.webp"
const SEPAL = "M0,0 C-7,-10 -6,-28 0,-38 C6,-28 7,-10 0,0Z"
export const ROSES = [
  { teal: false, w: 224, h: 213, c: [111.8, 106.4], R: 99.6, full: [0, 0, 206, 194, 9, 9],
    petals: [[683, 358, 86, 62, 24, 134, 0.83, 131.2], [771, 358, 90, 58, 91, 143, 0.778, 70.4], [373, 358, 67, 83, 106, 37, 0.524, 313.1], [351, 196, 132, 139, 10, 18, 0.509, 204.4], [412, 0, 160, 181, 53, 11, 0.505, 345.9], [490, 358, 63, 73, 105, 93, 0.438, 45.6], [442, 358, 46, 73, 104, 57, 0.239, 321.2], [124, 358, 105, 94, 39, 63, 0.216, 169.1], [178, 458, 52, 37, 76, 76, 0.151, 229.5]] },
  { teal: true, w: 224, h: 185, c: [106.9, 99], R: 90.3, full: [574, 0, 206, 167, 9, 9],
    petals: [[322, 358, 49, 88, 10, 75, 0.872, 163.8], [591, 358, 32, 63, 45, 14, 0.808, 227.8], [555, 358, 34, 69, 130, 59, 0.474, 350.2], [956, 358, 47, 47, 56, 96, 0.421, 137.9], [887, 358, 19, 49, 70, 56, 0.382, 211.6], [232, 458, 29, 33, 93, 70, 0.125, 252.5], [782, 0, 175, 165, 28, 9, 0.097, 357.8]] },
  { teal: false, w: 224, h: 204, c: [116.1, 102.7], R: 94.1, full: [208, 0, 202, 182, 11, 11],
    petals: [[0, 458, 111, 46, 76, 13, 0.731, 271.9], [908, 358, 46, 49, 40, 106, 0.698, 150.1], [231, 358, 89, 89, 43, 40, 0.531, 215.2], [315, 458, 35, 18, 95, 48, 0.508, 268.2], [771, 196, 159, 119, 12, 38, 0.437, 176.3], [206, 196, 143, 150, 69, 41, 0.376, 18.7]] },
  { teal: false, w: 224, h: 180, c: [97.8, 90.9], R: 93.8, full: [0, 196, 204, 160, 10, 10],
    petals: [[863, 358, 22, 50, 15, 69, 0.759, 177.5], [625, 358, 56, 63, 114, 28, 0.622, 325.1], [485, 196, 118, 133, 11, 24, 0.408, 170.1], [605, 196, 164, 127, 40, 41, 0.386, 50.9], [113, 458, 63, 39, 70, 38, 0.357, 285.7], [263, 458, 50, 21, 100, 72, 0.342, 347.7], [0, 358, 122, 98, 49, 11, 0.329, 277.8]] },
]

const clamp = (x) => Math.max(0, Math.min(1, x))
const ease = (x) => x * x * x * (x * (x * 6 - 15) + 10)
export const seeded = (seed) => () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
export const deck = (rnd, items = ROSES.map((_, i) => i)) => {
  let pile = [], last = -1
  return () => {
    if (!pile.length) {
      pile = [...items]
      for (let i = pile.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pile[i], pile[j]] = [pile[j], pile[i]] }
      if (pile[pile.length - 1] === last) [pile[0], pile[pile.length - 1]] = [pile[pile.length - 1], pile[0]]
    }
    last = pile.pop()
    return last
  }
}

let sepal = null

export function paintRose(cv, rose, sheet, dpr, sepalFill) {
  const art = ROSES[rose.art], c = cv.getContext("2d"), [cx, cy] = art.c, p = rose.p
  c.setTransform(1, 0, 0, 1, 0, 0)
  c.clearRect(0, 0, cv.width, cv.height)
  if (!sheet.complete || !sheet.naturalWidth) return
  if (!sepal) sepal = new Path2D(SEPAL)
  const k = (rose.size * dpr) / Math.max(art.w, art.h)
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
