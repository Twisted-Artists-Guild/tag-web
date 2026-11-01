/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/

import { useEffect, useRef } from "react"
import { ART_V, BLOOM_MS, IMG, ROSE_SHEET, deck, paintRose, seeded } from "@/components/feed/bloomscrollRoses"

const NS = "http://www.w3.org/2000/svg"
const SPRIGS = {
  buds: { w: 130, h: 147, up: true }, "fern-a": { w: 138, h: 200, up: true }, "fern-b": { w: 153, h: 127, up: true },
  "fern-c": { w: 174, h: 198, up: true }, spray: { w: 106, h: 112, up: true }, "bush-top": { w: 108, h: 113, up: true },
  "bud-stem": { w: 113, h: 103, up: true }, "hang-a": { w: 222, h: 156, up: false }, "hang-b": { w: 186, h: 149, up: false },
  "hang-c": { w: 90, h: 233, up: false },
}
const RISING = ["spray", "bush-top", "fern-b", "fern-a", "buds"]
const HANGING = ["hang-a", "hang-b", "hang-c"]
const TAPER = 2400
const CHUNK = 600

const clamp = (x) => Math.max(0, Math.min(1, x))
const pick = (rnd, list) => list[Math.floor(rnd() * list.length)]
const fixed = (q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`
const reach = (name, dirDeg, scale) => {
  const s = SPRIGS[name], w = (s.w * scale) / 2, h = s.h * scale, a = ((dirDeg - (s.up ? -90 : 90)) * Math.PI) / 180
  const ys = [[-w, 0], [w, 0], [-w, s.up ? -h : h], [w, s.up ? -h : h]].map(([x, y]) => x * Math.sin(a) + y * Math.cos(a))
  return [Math.min(...ys), Math.max(...ys)]
}

function routes(geo, W, edge, crossRnd) {
  const first = geo[0], n = geo.length
  const tuck = (c, right, y) => [right ? c.x + c.w - 24 : c.x + 24, y]
  const gap = (i) => (geo[i].y + geo[i].h + geo[i + 1].y) / 2
  const pts = [tuck(first, 0, first.y + 18)]
  geo.forEach((c, i) => {
    const side = i % 2 ? W - edge : edge
    pts.push([side, c.y + c.h * 0.22], [side + (i % 2 ? 2 : -2), c.y + c.h * 0.7])
    if (i < n - 1) pts.push([W * (0.42 + crossRnd() * 0.16), gap(i)])
    else pts.push(tuck(c, i % 2, c.y + c.h - 18))
  })
  return { paths: [pts], sides: geo.map((_, i) => i % 2), roses: geo.map(() => true) }
}

function trace(pts) {
  const segs = []
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2
    segs.push([p1, [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6], p2])
  }
  const d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}` + segs.map(([, a, b, c]) => ` C${a[0].toFixed(1)} ${a[1].toFixed(1)} ${b[0].toFixed(1)} ${b[1].toFixed(1)} ${c[0].toFixed(1)} ${c[1].toFixed(1)}`).join("")
  const xs = [pts[0][0]], ys = [pts[0][1]], ls = [0]
  for (const [a, b, c, e] of segs) {
    const n = Math.ceil(Math.hypot(e[0] - a[0], e[1] - a[1]) / 1.5) + 4
    for (let k = 1; k <= n; k++) {
      const t = k / n, u = 1 - t
      const x = u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * e[0]
      const y = u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * e[1]
      ls.push(ls[ls.length - 1] + Math.hypot(x - xs[xs.length - 1], y - ys[ys.length - 1]))
      xs.push(x)
      ys.push(y)
    }
  }
  const len = ls[ls.length - 1]
  const at = (s) => {
    s = Math.max(0, Math.min(len, s))
    let lo = 0, hi = ls.length - 1
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (ls[mid] < s) lo = mid; else hi = mid }
    const f = ls[hi] > ls[lo] ? (s - ls[lo]) / (ls[hi] - ls[lo]) : 0
    return [xs[lo] + (xs[hi] - xs[lo]) * f, ys[lo] + (ys[hi] - ys[lo]) * f]
  }
  const heading = (s) => { const a = at(s - 1), b = at(s + 1); return Math.atan2(b[1] - a[1], b[0] - a[0]) }
  const span = (y0, y1) => {
    let a = -1, b = 0
    for (let i = 0; i < ys.length; i++) if (ys[i] >= y0 && ys[i] <= y1) { if (a < 0) a = i; b = i }
    return a < 0 ? null : [Math.floor(ls[a] / CHUNK) * CHUNK, Math.min(len, Math.ceil(ls[b] / CHUNK) * CHUNK)]
  }
  return { d, len, at, heading, span }
}

function stem(svg, line, weight, rnd, from, to) {
  const base = 7.5 * weight, L = [], R = [], M = [], rim = []
  let dashes = ""
  for (let k = 0; k < 12; k++) dashes += `${(10 + rnd() * 34).toFixed(0)} ${(5 + rnd() * 22).toFixed(0)} `
  const g = document.createElementNS(NS, "g")
  g.innerHTML = `<path class="tag-bs-vine__guide" d="${line.d}"/>`
  svg.appendChild(g)
  const span = line.span(from, to)
  if (!span) return
  for (let s = span[0]; s <= span[1]; s += 3) {
    const [x, y] = line.at(s), ang = line.heading(s), nx = -Math.sin(ang), ny = Math.cos(ang)
    const w = base * (0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, (s / TAPER) * 1.6 + 0.15))) * (1 + 0.14 * Math.sin(s / 19 + weight * 3) + 0.08 * Math.sin(s / 7.3))
    L.push([x + (nx * w) / 2, y + (ny * w) / 2])
    R.push([x - (nx * w) / 2, y - (ny * w) / 2])
    M.push([x - nx * w * 0.12, y - ny * w * 0.12])
    rim.push([x + nx * (w / 2 - 0.9), y + ny * (w / 2 - 0.9)])
  }
  g.insertAdjacentHTML("afterbegin", `<polygon class="tag-bs-vine__bark" points="${L.map(fixed).join(" ")} ${R.reverse().map(fixed).join(" ")}"/><polyline class="tag-bs-vine__grain" points="${M.map(fixed).join(" ")}" style="stroke-width:${(base * 0.36).toFixed(1)}px"/><polyline class="tag-bs-vine__rim" points="${rim.map(fixed).join(" ")}" style="stroke-dasharray:${dashes};stroke-dashoffset:${span[0]};stroke-width:${(1.3 * Math.max(0.7, weight)).toFixed(2)}px"/>`)
}

function thorns(svg, line, every, weight, rnd, from, to) {
  let out = ""
  for (let s = every * 0.5, k = 0; s < line.len; s += every * (0.8 + rnd() * 0.4), k++) {
    const [x, y] = line.at(s), ang = line.heading(s), side = k % 2 ? 1 : -1
    if (y < from || y > to) continue
    const nx = Math.cos(ang + (side * Math.PI) / 2), ny = Math.sin(ang + (side * Math.PI) / 2)
    const tx = Math.cos(ang), ty = Math.sin(ang), r = 2.6 * weight, reach = 6.5 * weight
    const p1 = [x + nx * r - tx * 3, y + ny * r - ty * 3], p2 = [x + nx * r + tx * 3, y + ny * r + ty * 3]
    const tip = [x + nx * (r + reach) - tx * 3.5, y + ny * (r + reach) - ty * 3.5]
    out += `<path class="tag-bs-vine__thorn" d="M${fixed(p1)} L${fixed(tip)} L${fixed(p2)}Z"/>`
  }
  svg.insertAdjacentHTML("beforeend", out)
}

export default function BloomscrollVine({ children }) {
  const rootRef = useRef(null)

  useEffect(() => {
    const root = rootRef.current
    const back = root.querySelector(".tag-bs-vine__layer--back"), front = root.querySelector(".tag-bs-vine__layer--front")
    const list = root.querySelector(":scope > :not(.tag-bs-vine__layer)")
    if (!list) return undefined
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches
    const sepalFill = `rgb(${getComputedStyle(root).getPropertyValue("--tag-bs-sepal-rgb").trim()})`
    const dpr = Math.min(2, devicePixelRatio || 1)
    const sheet = new Image()
    sheet.src = `${IMG}${ROSE_SHEET}?${ART_V}`
    const svg = document.createElementNS(NS, "svg")
    svg.setAttribute("class", "tag-bs-vine__svg")
    const blooms = new Map(), sprigs = new Map(), faces = new Map(), waiting = new Set()
    const phoneWidth = matchMedia("(max-width: 600px)")
    let roses = [], seen = new Set(), pending = 0, raf = 0, built = null

    const paint = (rose) => {
      paintRose(rose.el, rose, sheet, dpr, sepalFill)
      if (rose.p >= 1) rose.el.dataset.open = "1"
    }

    function sprig(layer, key, z, name, x, y, dirDeg, scale, flip) {
      seen.add(key)
      const s = SPRIGS[name], w = s.w * scale, h = s.h * scale
      const sig = `${name} ${x.toFixed(1)} ${y.toFixed(1)} ${dirDeg.toFixed(1)} ${scale.toFixed(3)} ${flip} ${z}`
      let img = sprigs.get(key)
      if (!img) {
        img = document.createElement("img")
        img.alt = ""
        img.decoding = "async"
        img.className = "tag-bs-vine__sprig"
        sprigs.set(key, img)
        layer.appendChild(img)
      }
      if (img.dataset.sig === sig) return
      img.dataset.sig = sig
      img.src = `${IMG}sprig-${name}.webp?${ART_V}`
      Object.assign(img.style, {
        zIndex: String(z), width: `${w}px`, height: `${h}px`, left: `${x - w / 2}px`, top: `${s.up ? y - h : y}px`,
        transformOrigin: s.up ? "50% 100%" : "50% 0%",
        transform: `rotate(${(dirDeg - (s.up ? -90 : 90)).toFixed(1)}deg)${flip ? " scaleX(-1)" : ""}`,
      })
    }

    function face(c, z, x, y, size, art, seedN) {
      const span = size * 1.3, bloom = blooms.get(c.id), look = `${art} ${seedN} ${size}`
      let rose = faces.get(c.id)
      if (!rose) {
        const el = document.createElement("canvas")
        el.className = "tag-bs-vine__rose"
        el.dataset.post = c.id
        rose = { el, id: c.id }
        faces.set(c.id, rose)
        front.appendChild(el)
      }
      seen.add(`r${c.id}`)
      const place = `${(x - span / 2).toFixed(1)} ${(y - span / 2).toFixed(1)} ${z}`
      if (rose.place !== place) {
        rose.place = place
        Object.assign(rose.el.style, { zIndex: String(z), width: `${span}px`, height: `${span}px`, left: `${x - span / 2}px`, top: `${y - span / 2}px` })
      }
      if (rose.look !== look) {
        Object.assign(rose, { look, art, size, seed: seedN, spin: seedN % 2 ? 1 : -1, tilt: ((((seedN * 37) % 40) - 20) * Math.PI) / 180, p: bloom.p })
        rose.el.width = rose.el.height = Math.ceil(span * dpr)
        paint(rose)
      } else if (rose.p !== bloom.p) {
        rose.p = bloom.p
        paint(rose)
      }
      roses.push(rose)
    }

    function tick(now) {
      raf = 0
      let busy = false
      for (const rose of roses) {
        const bloom = blooms.get(rose.id)
        if (bloom.t0 === undefined || bloom.p >= 1) continue
        bloom.p = rose.p = clamp((now - bloom.t0) / BLOOM_MS)
        paint(rose)
        if (bloom.p < 1) busy = true
      }
      if (busy) raf = requestAnimationFrame(tick)
    }

    const watch = reduced ? null : new IntersectionObserver((entries) => {
      const now = performance.now()
      for (const e of entries) {
        if (!e.isIntersecting) continue
        const bloom = blooms.get(e.target.dataset.vinePost)
        if (bloom && bloom.p < 1 && bloom.t0 === undefined) {
          if (sheet.complete && sheet.naturalWidth) bloom.t0 = now
          else waiting.add(bloom)
        }
        watch.unobserve(e.target)
      }
      if (!raf) raf = requestAnimationFrame(tick)
    }, { rootMargin: "0px 0px -20% 0px" })

    function grow() {
      pending = 0
      roses = []
      seen = new Set()
      built = null
      svg.replaceChildren()
      const cards = [...list.querySelectorAll(":scope > [data-vine-post]")]
      if (cards.length) {
        if (svg.parentNode !== back) back.prepend(svg)
        const box = back.getBoundingClientRect(), W = box.width, phone = phoneWidth.matches
        const from = Math.floor((-box.top - innerHeight * 2) / CHUNK) * CHUNK, to = Math.ceil((-box.top + innerHeight * 3) / CHUNK) * CHUNK
        built = { top: box.top + window.scrollY, from, to, height: box.height }
        const geo = cards.map((el) => {
          const r = el.getBoundingClientRect()
          return { el, id: el.dataset.vinePost, x: r.left - box.left, y: r.top - box.top, w: r.width, h: r.height }
        })
        const seed = (Number(geo[0].id) || 1) * 7
        const crossRnd = seeded(seed + 1), barkRnd = seeded(seed + 2), thornRnd = seeded(seed + 3), leafRnd = seeded(seed + 4), cornerRnd = seeded(seed + 5), roseRnd = seeded(seed + 6)
        const variety = deck(seeded(seed + 7))
        const edge = phone ? 9 : 14, sc = phone ? 0.34 : 0.52, size = phone ? 40 : 52, out = phone ? 9 : 13
        const plan = routes(geo, W, edge, crossRnd), top = geo[0].y, bottom = geo[geo.length - 1].y + geo[geo.length - 1].h
        svg.setAttribute("width", String(W))
        svg.setAttribute("height", String(box.height))
        plan.paths.forEach((pts, p) => {
          const line = trace(pts)
          const bark = p ? seeded(seed + 21) : barkRnd, thorn = p ? seeded(seed + 22) : thornRnd, leaf = p ? seeded(seed + 23) : leafRnd
          stem(svg, line, phone ? 0.8 : 1.1, bark, from, to)
          thorns(svg, line, 70, phone ? 0.8 : 1, thorn, from, to)
          for (let s = 24, k = 0; s < line.len; s += (phone ? 40 : 32) + leaf() * 26, k++) {
            const [x, y] = line.at(s), ang = (line.heading(s) * 180) / Math.PI, dir = k % 2 ? ang - 75 : ang + 75
            const name = pick(leaf, dir > 0 && dir < 180 ? HANGING : RISING)
            const turn = dir + (leaf() - 0.5) * 34, scale = sc * (0.75 + leaf() * 0.5), flip = leaf() < 0.5
            const [up, down] = reach(name, turn, scale)
            if (y > from && y < to && y + up >= top && y + down <= bottom) sprig(back, `${p ? "c" : "b"}${k}`, k + 1, name, x, y, turn, scale, flip)
          }
        })
        geo.forEach((c, i) => {
          const right = plan.sides[i], x = right ? c.x + c.w + out : c.x - out, y = c.y - out
          const hang = pick(cornerRnd, ["hang-a", "hang-b"]), rise = pick(cornerRnd, ["bud-stem", "spray", "fern-b"])
          if (!blooms.has(c.id)) blooms.set(c.id, { p: reduced ? 1 : 0 })
          const bloom = blooms.get(c.id), seedN = Math.floor(roseRnd() * 1000), art = variety()
          if (!plan.roses[i]) return
          if (watch && bloom.p < 1 && bloom.t0 === undefined) watch.observe(c.el)
          if (c.y + c.h < from || c.y > to) return
          sprig(front, `h${i}`, i * 3 + 1, hang, x + (right ? 8 : -8), y + 2, right ? 70 : 110, sc * 0.8, !right)
          sprig(front, `g${i}`, i * 3 + 2, rise, x + (right ? 10 : -10), y - 2, right ? -40 : -140, sc * 0.75, right)
          face(c, i * 3 + 3, x, y, size, art, seedN)
        })
      }
      for (const [key, img] of sprigs) if (!seen.has(key)) { img.remove(); sprigs.delete(key) }
      for (const [key, rose] of faces) if (!seen.has(`r${key}`)) { rose.el.remove(); faces.delete(key) }
      if (!raf && roses.some((r) => { const b = blooms.get(r.id); return b.t0 !== undefined && b.p < 1 })) raf = requestAnimationFrame(tick)
    }

    const schedule = () => { if (!pending) pending = requestAnimationFrame(grow) }
    const follow = () => {
      if (!built) return
      const view = window.scrollY - built.top
      if ((built.from > 0 && view - innerHeight < built.from) || (built.to < built.height && view + innerHeight * 2 > built.to)) schedule()
    }
    const repaint = () => {
      const now = performance.now()
      waiting.forEach((bloom) => { bloom.t0 = now })
      waiting.clear()
      roses.forEach(paint)
      if (!raf && roses.some((r) => { const b = blooms.get(r.id); return b.t0 !== undefined && b.p < 1 })) raf = requestAnimationFrame(tick)
    }
    const sizer = new ResizeObserver(schedule)
    const lister = new MutationObserver(schedule)
    sizer.observe(root)
    lister.observe(list, { childList: true })
    sheet.addEventListener("load", repaint)
    window.addEventListener("scroll", follow, { passive: true })
    schedule()

    return () => {
      cancelAnimationFrame(pending)
      cancelAnimationFrame(raf)
      sizer.disconnect()
      lister.disconnect()
      watch?.disconnect()
      sheet.removeEventListener("load", repaint)
      window.removeEventListener("scroll", follow)
      back.replaceChildren()
      front.replaceChildren()
    }
  }, [])

  return (
    <div className="tag-bs-vine" ref={rootRef}>
      <div className="tag-bs-vine__layer tag-bs-vine__layer--back" aria-hidden="true" />
      {children}
      <div className="tag-bs-vine__layer tag-bs-vine__layer--front" aria-hidden="true" />
    </div>
  )
}
