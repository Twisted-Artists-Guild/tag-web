/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/

export const VINE_MODES = ["edge", "sides"]
export const SWAY = 11
const CROSS_EVERY = 6
const SIDE_ROSE_EVERY = 3

const wobble = (i, k) => { const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return v - Math.floor(v) }

export function variantRoutes(geo, W, edge, mode, sway) {
  if (!VINE_MODES.includes(mode)) return null
  const first = geo[0], last = geo[geo.length - 1], n = geo.length
  const tuck = (c, right, y) => [right ? c.x + c.w - 24 : c.x + 24, y]
  const gap = (i) => (geo[i].y + geo[i].h + geo[i + 1].y) / 2
  const lane = (right, i, k) => (right ? W - edge : edge) + (wobble(i, k) - 0.5) * sway * 2
  if (mode === "sides") {
    const paths = [0, 1].map((right) => {
      const pts = [tuck(first, right, first.y + 18)]
      geo.forEach((c, i) => {
        pts.push([lane(right, i, right * 3), c.y + c.h * 0.22], [lane(right, i, right * 3 + 1), c.y + c.h * 0.7])
        if (i < n - 1) pts.push([lane(right, i, right * 3 + 2), gap(i)])
      })
      pts.push(tuck(last, right, last.y + last.h - 18))
      return pts
    })
    return { paths, sides: geo.map((_, i) => Math.floor(i / SIDE_ROSE_EVERY) % 2), roses: geo.map((_, i) => i % SIDE_ROSE_EVERY === 0) }
  }
  const pts = [tuck(first, 0, first.y + 18)], sides = []
  let right = 0
  geo.forEach((c, i) => {
    sides.push(right)
    pts.push([lane(right, i, 0), c.y + c.h * 0.22], [lane(right, i, 1), c.y + c.h * 0.7])
    if (i === n - 1) pts.push(tuck(c, right, c.y + c.h - 18))
    else if ((i + 1) % CROSS_EVERY === 0) {
      pts.push([W * (0.42 + wobble(i, 2) * 0.16), gap(i)])
      right = 1 - right
    } else pts.push([lane(right, i, 2), gap(i)])
  })
  return { paths: [pts], sides, roses: geo.map(() => true) }
}
