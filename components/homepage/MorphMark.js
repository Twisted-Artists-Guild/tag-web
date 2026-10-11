/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/
"use client"

import { useEffect, useId, useRef } from "react"
import { LOGO_D } from "@/components/Footer"

// Points sampled around every ring
const N = 180

// Milliseconds: hold the logo, morph to the icon, hold the icon, morph back
const TIMING = { holdLogo: 1400, morph: 900, holdIcon: 1300 }
const STEP = TIMING.holdLogo + TIMING.morph + TIMING.holdIcon + TIMING.morph

const circlePath = (cx, cy, r) => `M${cx - r} ${cy} A${r} ${r} 0 1 1 ${cx + r} ${cy} A${r} ${r} 0 1 1 ${cx - r} ${cy} Z`

// Icon outlines in a 0-100 box: ring 0 morphs from the logo, the other rings grow from their centres
const ICONS = [
  { name: "record", rings: [circlePath(50, 50, 46), circlePath(50, 50, 34), circlePath(50, 50, 30.5), circlePath(50, 50, 5)] },
  { name: "palette", rings: ["M50 6 C77 6 96 25 96 48 C96 65 85 73 73 71 C64 69 59 75 62 83 C65 92 57 96 48 96 C23 96 4 76 4 51 C4 26 24 6 50 6 Z", circlePath(47, 76, 7.5), circlePath(29, 31, 8), circlePath(54, 21, 7), circlePath(76, 34, 7), circlePath(21, 58, 7)] },
  { name: "paintbrush", rotate: 45, scale: 1.12, rings: ["M50 2 C58 12 63 22 63 33 L63 38 L65 38 L65 55 L58 58 L56.5 91 A6.5 6.5 0 0 1 43.5 91 L42 58 L35 55 L35 38 L37 38 L37 33 C37 22 42 12 50 2 Z", "M38 44 H62 V47 H38 Z"] },
  { name: "canvas", rings: ["M14 8 H45 V3 H55 V8 H86 V64 H71 L83 94 L76 97 L63.5 64 H53.5 V97 H46.5 V64 H36.5 L24 97 L17 94 L29 64 H14 Z", "M20 14 H80 V58 H20 Z", circlePath(36, 27, 5.5), "M24 54 L42 36 L52 46 L62 32 L76 54 Z"] },
  { name: "pencil", rotate: 225, scale: 1.12, rings: ["M50 3 L62 25 L62 87 Q62 96 53 96 L47 96 Q38 96 38 87 L38 25 Z", "M45.1 12 L54.9 12 L56.5 15 L43.5 15 Z", "M40.5 76 H59.5 V78.5 H40.5 Z", "M40.5 81 H59.5 V83.5 H40.5 Z"] },
]

// Gradient colour mixes: W ghost white, I electric indigo, S soft indigo, A palette accent
const LOGO_MIX = ["W", "S", "A"]
const ICON_MIX = [
  ["I", "A", "W"], // record
  ["A", "W", "I"], // palette
  ["A", "I", "W"], // paintbrush
  ["I", "W", "A"], // canvas
  ["W", "A", "I"], // pencil
]
const ROLE_TOKENS = { W: "--tag-ghost", I: "--tag-indigo", S: "--tag-indigo-soft", A: "--tag-acc" }

// Cubic ease-in-out
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

/**
 * The TAG mark at the bottom of the landing hero. It morphs into a record, palette, paintbrush,
 * canvas and pencil in an endless loop while on screen; reduced motion shows the still logo.
 * @param {{ href: string }} props where the mark scrolls to
 */
export default function MorphMark({ href }) {
  const gradientId = `tag-morph-${useId().replace(/:/g, "")}`
  const linkRef = useRef(null)
  const pathRef = useRef(null)
  const samplerRef = useRef(null)
  const stopRefs = [useRef(null), useRef(null), useRef(null)]

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined
    const path = pathRef.current
    const sampler = samplerRef.current
    const stops = stopRefs.map((ref) => ref.current)
    if (!path || !sampler || stops.some((stop) => !stop)) return undefined

    // Sample every ring once (N points, counter-clockwise) so all shapes share one point order.
    // Icons are mapped from their 0-100 box onto the logo's stage.
    const [[logo], ...iconRings] = [{ rings: [LOGO_D] }, ...ICONS].map((shape, shapeIndex) => {
      const angle = ((shape.rotate || 0) * Math.PI) / 180
      const cos = Math.cos(angle)
      const sin = Math.sin(angle)
      const k = 18 * (shape.scale || 1)
      return shape.rings.map((d) => {
        sampler.setAttribute("d", d)
        const length = sampler.getTotalLength()
        let points = []
        for (let i = 0; i < N; i++) {
          const { x, y } = sampler.getPointAtLength((length * i) / N)
          points.push(shapeIndex === 0 ? [x, y] : [
            1072 + ((x - 50) * cos - (y - 50) * sin) * k,
            932 + ((x - 50) * sin + (y - 50) * cos) * k,
          ])
        }
        let area = 0
        for (let j = 0; j < N; j++) {
          const a = points[j]
          const b = points[(j + 1) % N]
          area += a[0] * b[1] - b[0] * a[1]
        }
        if (area < 0) points = points.reverse()
        return points
      })
    })

    const morphs = iconRings.map((to) => {
      // Start the outline where it best lines up with the logo, so the morph doesn't twist
      let best = 0
      let bestDistance = Infinity
      for (let offset = 0; offset < N; offset += 2) {
        let distance = 0
        for (let i = 0; i < N; i += 4) {
          const q = to[0][(i + offset) % N]
          distance += (q[0] - logo[i][0]) ** 2 + (q[1] - logo[i][1]) ** 2
        }
        if (distance < bestDistance) {
          bestDistance = distance
          best = offset
        }
      }
      const outline = to[0].map((_, i) => to[0][(i + best) % N])
      const aligned = [outline, ...to.slice(1)]
      // Extra rings (holes and details) grow from their centres
      const from = aligned.map((ring, r) => (r === 0 ? logo : Array(N).fill(
        ring.reduce((c, p) => [c[0] + p[0] / N, c[1] + p[1] / N], [0, 0]),
      )))
      return { from, to: aligned }
    })

    // Brand colours for the colour morph, re-read when the palette or mode changes
    let rgb = {}
    const readColours = () => {
      const styles = getComputedStyle(document.documentElement)
      rgb = Object.fromEntries(Object.entries(ROLE_TOKENS).map(([role, token]) => {
        const hex = styles.getPropertyValue(token).trim().replace("#", "")
        return [role, [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)]]
      }))
    }
    readColours()
    const paletteObserver = new MutationObserver(readColours)
    paletteObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-palette", "data-mode"] })

    let elapsed = 0
    let last = null
    let raf = 0
    let visible = false
    let logoShown = true
    let heldIcon = -1

    const drawFrame = (iconIndex, t) => {
      logoShown = false
      const { from, to } = morphs[iconIndex]
      // The outline morphs first; holes open once it has mostly formed
      const eOutline = ease(t)
      const eHoles = ease(Math.min(1, Math.max(0, (t - 0.45) / 0.55)))
      let d = ""
      for (let r = 0; r < from.length; r++) {
        const e = r ? eHoles : eOutline
        for (let i = 0; i < from[r].length; i++) {
          const a = from[r][i]
          const b = to[r][i]
          d += `${i ? "L" : "M"}${(a[0] + (b[0] - a[0]) * e).toFixed(1)} ${(a[1] + (b[1] - a[1]) * e).toFixed(1)}`
        }
        d += "Z"
      }
      path.setAttribute("d", d)
      path.setAttribute("transform", `rotate(${(Math.sin(Math.PI * t) * -6).toFixed(2)} 1072 932)`)
      const e = ease(t)
      LOGO_MIX.forEach((role, s) => {
        const a = rgb[role]
        const b = rgb[ICON_MIX[iconIndex][s]]
        stops[s].style.stopColor = `rgb(${Math.round(a[0] + (b[0] - a[0]) * e)},${Math.round(a[1] + (b[1] - a[1]) * e)},${Math.round(a[2] + (b[2] - a[2]) * e)})`
      })
    }

    const tick = (now) => {
      if (last !== null) elapsed += Math.min(now - last, 64) // never jump after a stall
      last = now
      const icon = Math.floor(elapsed / STEP) % ICONS.length
      const t = elapsed % STEP
      const toIconAt = TIMING.holdLogo
      const holdIconAt = toIconAt + TIMING.morph
      const toLogoAt = holdIconAt + TIMING.holdIcon

      if (t < toIconAt) {
        if (!logoShown) {
          path.setAttribute("d", LOGO_D)
          path.removeAttribute("transform")
          stops.forEach((stop) => { stop.style.stopColor = "" }) // back to the palette's CSS gradient
          logoShown = true
        }
        heldIcon = -1
      } else if (t < holdIconAt) {
        drawFrame(icon, (t - toIconAt) / TIMING.morph)
        heldIcon = -1
      } else if (t < toLogoAt) {
        if (heldIcon !== icon) drawFrame(icon, 1) // write the held icon once
        heldIcon = icon
      } else {
        drawFrame(icon, 1 - (t - toLogoAt) / TIMING.morph)
        heldIcon = -1
      }
      raf = window.requestAnimationFrame(tick)
    }

    // Run only while the mark is on screen and the tab is visible
    const update = () => {
      const shouldRun = visible && !document.hidden
      if (shouldRun && !raf) {
        last = null
        raf = window.requestAnimationFrame(tick)
      } else if (!shouldRun && raf) {
        window.cancelAnimationFrame(raf)
        raf = 0
      }
    }

    const visibilityObserver = new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting
      update()
    })
    visibilityObserver.observe(linkRef.current)
    document.addEventListener("visibilitychange", update)

    return () => {
      window.cancelAnimationFrame(raf)
      visibilityObserver.disconnect()
      paletteObserver.disconnect()
      document.removeEventListener("visibilitychange", update)
    }
    // stopRefs are stable refs created once per render pass; the effect only needs to run once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <a ref={linkRef} href={href} className="tag-morph-mark" aria-label="Scroll to the next section">
      <svg viewBox="0 0 2144 1864" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop ref={stopRefs[0]} offset="0" className="tag-morph-mark__stop-1" />
            <stop ref={stopRefs[1]} offset=".45" className="tag-morph-mark__stop-2" />
            <stop ref={stopRefs[2]} offset="1" className="tag-morph-mark__stop-3" />
          </linearGradient>
        </defs>
        <path ref={pathRef} fill={`url(#${gradientId})`} fillRule="evenodd" d={LOGO_D} />
        <path ref={samplerRef} className="tag-morph-mark__sampler" />
      </svg>
    </a>
  )
}
