/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/

import { useEffect, useMemo, useRef, useState } from "react"
import { usePageOptions } from "@/components/Header/pageOptions"
import { ART_V, BLOOM_MS, IMG, ROSES, ROSE_SHEET, deck, paintRose, seeded } from "@/components/feed/bloomscrollRoses"

const CHUNK = 600
const STANDOUT_GAP = 4
const FLOWERS = [{ value: "off", label: "Off" }, { value: "few", label: "Few" }, { value: "normal", label: "Normal" }, { value: "lots", label: "Lots" }]
const COLOURS = [{ value: "calm", label: "Calm" }, { value: "soft", label: "Soft" }, { value: "full", label: "Full" }]
const DEFAULTS = { flowers: "normal", colour: "soft" }
const KEYS = { flowers: "tag-bs-flowers", colour: "tag-bs-colour" }
const WHITE = ROSES.map((r, i) => (r.teal ? -1 : i)).filter((i) => i >= 0)
const TINTS = [null, "window", "violet", "moon"]
const clamp = (x) => Math.max(0, Math.min(1, x))

const stored = () => {
  const out = { ...DEFAULTS }
  try {
    const flowers = window.localStorage.getItem(KEYS.flowers), colour = window.localStorage.getItem(KEYS.colour)
    if (FLOWERS.some((o) => o.value === flowers)) out.flowers = flowers
    if (COLOURS.some((o) => o.value === colour)) out.colour = colour
  } catch {
    return out
  }
  return out
}

export function useRoseOptions() {
  const [prefs, setPrefs] = useState(() => (typeof window === "undefined" ? DEFAULTS : stored()))
  const groups = useMemo(() => {
    const update = (kind) => (value) => {
      setPrefs((p) => ({ ...p, [kind]: value }))
      try {
        window.localStorage.setItem(KEYS[kind], value)
      } catch {
        return
      }
    }
    return [
      { kind: "flowers", title: "Flowers", value: prefs.flowers, options: FLOWERS, select: update("flowers") },
      { kind: "colour", title: "Flower colour", value: prefs.colour, options: COLOURS, select: update("colour") },
    ]
  }, [prefs])
  usePageOptions(groups)
  return prefs
}

export default function FeedRoses({ children, flowers = DEFAULTS.flowers, colour = DEFAULTS.colour }) {
  const rootRef = useRef(null)
  const prefs = useRef({ flowers, colour })
  const regrow = useRef(null)

  useEffect(() => {
    prefs.current = { flowers, colour }
    regrow.current?.()
  }, [flowers, colour])

  useEffect(() => {
    const root = rootRef.current
    const layer = root.querySelector(".tag-bs-roses__layer")
    const list = root.querySelector(":scope > :not(.tag-bs-roses__layer)")
    if (!list) return undefined
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches
    const phoneWidth = matchMedia("(max-width: 600px)")
    const tokens = getComputedStyle(root), rgb = (name) => tokens.getPropertyValue(`--tag-bs-${name}-rgb`).trim()
    const sepalFill = `rgb(${rgb("sepal")})`, standoutTint = `rgb(${rgb("glow-mid")})`
    const dpr = Math.min(2, devicePixelRatio || 1)
    const sheet = new Image()
    sheet.src = `${IMG}${ROSE_SHEET}?${ART_V}`
    const blooms = new Map(), faces = new Map(), waiting = new Set()
    let roses = [], seen = new Set(), pending = 0, raf = 0, built = null

    const paint = (rose) => {
      paintRose(rose.el, rose, sheet, dpr, sepalFill)
      if (rose.tint && sheet.complete && sheet.naturalWidth) {
        const c = rose.el.getContext("2d")
        c.setTransform(1, 0, 0, 1, 0, 0)
        c.globalCompositeOperation = "source-atop"
        c.globalAlpha = 0.42
        c.fillStyle = rose.tint
        c.fillRect(0, 0, rose.el.width, rose.el.height)
        c.globalCompositeOperation = "source-over"
        c.globalAlpha = 1
      }
      if (rose.p >= 1) rose.el.dataset.open = "1"
    }

    function face(key, id, z, x, y, size, art, seedN, tint) {
      const span = size * 1.3, bloom = blooms.get(id), look = `${art} ${seedN} ${size} ${tint}`
      let rose = faces.get(key)
      if (!rose) {
        const el = document.createElement("canvas")
        el.className = "tag-bs-roses__rose"
        el.dataset.post = id
        rose = { el, id }
        faces.set(key, rose)
        layer.appendChild(el)
      }
      seen.add(key)
      const place = `${(x - span / 2).toFixed(1)} ${(y - span / 2).toFixed(1)} ${z}`
      if (rose.place !== place) {
        rose.place = place
        Object.assign(rose.el.style, { zIndex: String(z), width: `${span}px`, height: `${span}px`, left: `${x - span / 2}px`, top: `${y - span / 2}px` })
      }
      if (rose.look !== look) {
        Object.assign(rose, { look, art, size, tint, seed: seedN, spin: seedN % 2 ? 1 : -1, tilt: ((((seedN * 37) % 40) - 20) * Math.PI) / 180, p: bloom.p })
        rose.el.dataset.art = String(art)
        if (tint) rose.el.dataset.tint = "1"
        else delete rose.el.dataset.tint
        if (bloom.slow) rose.el.dataset.standout = "1"
        else delete rose.el.dataset.standout
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
        bloom.p = rose.p = clamp((now - bloom.t0) / (bloom.slow ? BLOOM_MS * 1.6 : BLOOM_MS))
        paint(rose)
        if (bloom.p < 1) busy = true
      }
      if (busy) raf = requestAnimationFrame(tick)
    }

    const resume = () => {
      if (!raf && roses.some((r) => { const b = blooms.get(r.id); return b.t0 !== undefined && b.p < 1 })) raf = requestAnimationFrame(tick)
    }

    const watch = reduced ? null : new IntersectionObserver((entries) => {
      const now = performance.now()
      for (const e of entries) {
        if (!e.isIntersecting) continue
        const bloom = blooms.get(e.target.dataset.postId)
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
      const cards = [...list.querySelectorAll(":scope > [data-post-id]")]
      if (cards.length) {
        const box = layer.getBoundingClientRect(), phone = phoneWidth.matches
        const from = Math.floor((-box.top - innerHeight * 2) / CHUNK) * CHUNK, to = Math.ceil((-box.top + innerHeight * 3) / CHUNK) * CHUNK
        built = { top: box.top + window.scrollY, from, to, height: box.height }
        const { flowers, colour } = prefs.current
        const seed = (Number(cards[0].dataset.postId) || 1) * 7
        const pool = colour === "calm" ? WHITE : undefined, roseRnd = seeded(seed + 6), variety = deck(seeded(seed + 7), pool), second = deck(seeded(seed + 8), pool)
        const size = phone ? 32 : 40, out = phone ? 7 : 10, big = phone ? 46 : 58, bigOut = phone ? 11 : 15
        let lastStandout = -STANDOUT_GAP
        cards.forEach((el, i) => {
          const id = el.dataset.postId
          const seedN = Math.floor(roseRnd() * 1000), art = variety(), extra = second()
          const shown = flowers === "lots" || flowers === "normal" || (flowers === "few" && i % 3 === 0)
          const standout = flowers !== "off" && el.dataset.postArt === "1" && i - lastStandout >= STANDOUT_GAP
          if (standout) lastStandout = i
          if (flowers === "off" || (!shown && !standout)) return
          if (!blooms.has(id)) blooms.set(id, { p: reduced ? 1 : 0 })
          const bloom = blooms.get(id)
          bloom.slow = standout
          if (watch && bloom.p < 1 && bloom.t0 === undefined) watch.observe(el)
          const r = el.getBoundingClientRect(), top = r.top - box.top
          if (top + r.height < from || top > to) return
          const right = i % 2, gap = standout ? bigOut : out
          const tint = standout ? standoutTint : colour === "full" && TINTS[i % TINTS.length] ? `rgb(${rgb(TINTS[i % TINTS.length])})` : null
          face(id, id, i * 2 + 1, right ? r.right - box.left + gap : r.left - box.left - gap, top - gap, standout ? big : size, art, seedN, tint)
          if (flowers === "lots") face(`${id}+`, id, i * 2 + 2, right ? r.left - box.left - out : r.right - box.left + out, top - out, size, extra, seedN + 1, colour === "full" && TINTS[(i + 2) % TINTS.length] ? `rgb(${rgb(TINTS[(i + 2) % TINTS.length])})` : null)
        })
      }
      for (const [id, rose] of faces) if (!seen.has(id)) { rose.el.remove(); faces.delete(id) }
      resume()
    }

    const schedule = () => { if (!pending) pending = requestAnimationFrame(grow) }
    regrow.current = schedule
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
      resume()
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
      layer.replaceChildren()
      regrow.current = null
    }
  }, [])

  return (
    <div className="tag-bs-roses" ref={rootRef}>
      {children}
      <div className="tag-bs-roses__layer" aria-hidden="true" />
    </div>
  )
}
