/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/

import { useEffect, useRef } from "react"
import { ART_V, BLOOM_MS, IMG, ROSE_SHEET, deck, paintRose, seeded } from "@/components/feed/bloomscrollRoses"

const CHUNK = 600
const clamp = (x) => Math.max(0, Math.min(1, x))

export default function FeedRoses({ children }) {
  const rootRef = useRef(null)

  useEffect(() => {
    const root = rootRef.current
    const layer = root.querySelector(".tag-bs-roses__layer")
    const list = root.querySelector(":scope > :not(.tag-bs-roses__layer)")
    if (!list) return undefined
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches
    const phoneWidth = matchMedia("(max-width: 600px)")
    const sepalFill = `rgb(${getComputedStyle(root).getPropertyValue("--tag-bs-sepal-rgb").trim()})`
    const dpr = Math.min(2, devicePixelRatio || 1)
    const sheet = new Image()
    sheet.src = `${IMG}${ROSE_SHEET}?${ART_V}`
    const blooms = new Map(), faces = new Map(), waiting = new Set()
    let roses = [], seen = new Set(), pending = 0, raf = 0, built = null

    const paint = (rose) => {
      paintRose(rose.el, rose, sheet, dpr, sepalFill)
      if (rose.p >= 1) rose.el.dataset.open = "1"
    }

    function face(id, z, x, y, size, art, seedN) {
      const span = size * 1.3, bloom = blooms.get(id), look = `${art} ${seedN} ${size}`
      let rose = faces.get(id)
      if (!rose) {
        const el = document.createElement("canvas")
        el.className = "tag-bs-roses__rose"
        el.dataset.post = id
        rose = { el, id }
        faces.set(id, rose)
        layer.appendChild(el)
      }
      seen.add(id)
      const place = `${(x - span / 2).toFixed(1)} ${(y - span / 2).toFixed(1)} ${z}`
      if (rose.place !== place) {
        rose.place = place
        Object.assign(rose.el.style, { zIndex: String(z), width: `${span}px`, height: `${span}px`, left: `${x - span / 2}px`, top: `${y - span / 2}px` })
      }
      if (rose.look !== look) {
        Object.assign(rose, { look, art, size, seed: seedN, spin: seedN % 2 ? 1 : -1, tilt: ((((seedN * 37) % 40) - 20) * Math.PI) / 180, p: bloom.p })
        rose.el.dataset.art = String(art)
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
        const seed = (Number(cards[0].dataset.postId) || 1) * 7
        const roseRnd = seeded(seed + 6), variety = deck(seeded(seed + 7))
        const size = phone ? 32 : 40, out = phone ? 7 : 10
        cards.forEach((el, i) => {
          const id = el.dataset.postId
          if (!blooms.has(id)) blooms.set(id, { p: reduced ? 1 : 0 })
          const bloom = blooms.get(id), seedN = Math.floor(roseRnd() * 1000), art = variety()
          if (watch && bloom.p < 1 && bloom.t0 === undefined) watch.observe(el)
          const r = el.getBoundingClientRect(), top = r.top - box.top
          if (top + r.height < from || top > to) return
          const right = i % 2
          face(id, i + 1, right ? r.right - box.left + out : r.left - box.left - out, top - out, size, art, seedN)
        })
      }
      for (const [id, rose] of faces) if (!seen.has(id)) { rose.el.remove(); faces.delete(id) }
      resume()
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
    }
  }, [])

  return (
    <div className="tag-bs-roses" ref={rootRef}>
      {children}
      <div className="tag-bs-roses__layer" aria-hidden="true" />
    </div>
  )
}
