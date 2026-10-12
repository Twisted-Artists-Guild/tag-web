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
  // Bloomscroll flowers, traced from public/BLOOMSCROLL OFFICIAL/LOGO/BLOOMSCROLL - PLANTS.png
  { name: "flower", scale: 1.05, rings: ["M 65.7 40.9 C 64.5 41.4, 62.7 42.5, 61.0 43.8 C 60.2 44.4, 58.7 45.5, 57.8 46.1 C 54.1 48.6, 52.5 50.7, 52.8 53.1 C 53.0 54.8, 52.5 56.0, 51.0 57.7 C 49.3 59.7, 49.2 60.3, 51.0 62.9 C 55.0 69.0, 60.8 69.6, 64.3 64.3 C 65.7 62.1, 63.7 58.3, 60.9 58.1 C 60.6 58.1, 60.6 58.1, 60.7 58.0 C 61.5 57.7, 64.1 59.1, 64.9 60.2 L 65.3 60.8 65.5 60.0 C 65.8 58.4, 64.8 56.4, 63.3 55.1 C 62.1 54.1, 62.5 54.1, 63.8 55.1 C 65.0 55.9, 66.0 57.5, 66.2 58.6 C 66.5 59.8, 66.7 59.7, 67.0 58.4 C 67.3 57.2, 67.3 55.1, 66.9 53.1 C 66.9 52.8, 67.0 53.2, 67.3 54.0 C 67.6 54.9, 67.8 56.1, 67.8 57.3 L 67.9 59.1 69.0 58.0 C 72.3 54.7, 73.1 49.0, 70.7 44.1 C 69.4 41.3, 67.7 40.2, 65.7 40.9","M 40.1 59.7 C 38.3 60.2, 35.6 62.7, 35.2 64.3 C 34.8 65.8, 36.7 68.6, 38.5 69.1 C 39.0 69.3, 39.1 69.4, 38.8 69.4 C 38.0 69.4, 36.4 68.5, 35.5 67.6 L 34.6 66.7 34.6 68.0 C 34.7 69.7, 35.3 71.0, 36.7 72.3 C 37.4 72.9, 37.6 73.2, 37.3 73.0 C 35.5 72.1, 34.3 70.7, 33.8 68.7 L 33.5 67.6 33.2 68.4 C 32.8 69.3, 32.9 72.9, 33.3 74.5 C 33.8 76.4, 33.6 76.3, 33.0 74.4 C 32.3 72.3, 32.0 70.3, 32.2 69.3 C 32.3 68.2, 32.0 68.3, 30.7 69.7 C 27.4 73.6, 27.0 78.9, 29.6 83.9 C 31.7 87.7, 33.8 87.7, 39.1 83.7 C 40.3 82.8, 41.8 81.7, 42.4 81.2 C 46.4 78.5, 47.2 77.3, 47.3 74.5 C 47.3 72.2, 47.5 71.5, 49.3 69.5 C 50.6 68.0, 50.7 67.5, 49.8 65.7 C 47.7 61.6, 43.3 58.8, 40.1 59.7","M 68.4 69.3 C 69.2 71.5, 69.3 74.9, 68.6 78.5 C 67.6 84.1, 70.9 87.9, 76.7 87.9 C 79.9 87.9, 81.5 87.2, 82.4 85.1 C 82.9 84.0, 84.3 83.4, 85.9 83.4 C 88.0 83.4, 89.6 75.6, 88.3 72.2 L 87.8 71.0 85.9 70.8 C 83.3 70.6, 82.0 70.3, 79.3 69.0 L 77.0 68.0 78.1 68.9 C 79.4 70.0, 81.5 72.1, 82.2 73.1 C 82.5 73.6, 82.0 73.2, 80.9 72.2 C 79.1 70.5, 76.1 68.7, 75.8 69.0 C 75.7 69.1, 76.0 69.8, 76.5 70.5 C 77.4 71.8, 79.5 76.5, 79.9 77.8 C 79.9 78.2, 79.4 77.2, 78.6 75.7 C 76.5 71.6, 74.9 69.6, 73.4 69.1 L 72.9 68.9 73.3 70.6 C 73.7 72.1, 74.5 77.4, 74.4 77.6 C 74.3 77.6, 74.2 77.0, 74.0 76.2 C 73.7 74.5, 72.9 71.9, 72.3 70.2 L 71.8 69.0 70.6 69.0 C 69.7 69.0, 69.3 68.8, 68.7 68.3 L 67.9 67.6 68.4 69.3","M 37.1 38.8 C 32.8 40.2, 30.1 55.1, 33.3 59.7 C 34.0 60.7, 34.0 60.5, 34.1 57.1 C 34.1 54.7, 34.2 53.5, 34.6 52.2 C 34.9 51.2, 35.1 50.7, 35.0 51.2 C 34.9 51.7, 34.8 53.7, 34.8 55.6 L 34.6 59.2 35.3 56.6 C 35.7 55.1, 36.5 53.0, 37.0 51.8 C 38.1 49.5, 38.6 49.0, 37.6 51.1 C 36.7 53.1, 35.9 56.5, 35.7 58.9 L 35.6 60.9 36.4 59.0 C 37.3 56.7, 38.6 54.5, 39.4 53.8 C 39.8 53.4, 39.8 53.5, 39.1 54.7 C 38.3 56.0, 37.2 58.5, 36.9 59.9 L 36.7 60.6 37.8 59.9 C 39.0 59.1, 40.3 58.6, 41.6 58.6 C 42.3 58.6, 42.6 58.4, 43.8 57.1 C 44.7 56.1, 46.0 55.1, 47.3 54.3 C 49.8 52.8, 50.3 52.3, 51.0 50.3 C 52.5 46.0, 51.0 42.8, 47.6 42.8 C 45.0 42.8, 42.9 41.8, 42.2 40.3 C 41.6 38.7, 39.3 38.1, 37.1 38.8","M 20.5 39.8 C 19.1 40.2, 18.3 41.0, 17.6 42.3 C 17.0 43.4, 16.3 43.8, 14.4 44.1 C 13.3 44.3, 13.2 44.3, 12.7 45.5 C 10.8 49.9, 11.0 57.0, 13.1 56.6 C 14.7 56.3, 18.6 57.2, 21.6 58.7 L 23.0 59.4 22.0 58.6 C 20.8 57.6, 17.9 54.6, 17.6 54.0 C 17.4 53.7, 17.9 54.1, 18.6 54.8 C 20.2 56.4, 23.2 58.4, 24.0 58.4 L 24.6 58.4 23.9 57.4 C 22.7 55.6, 20.2 50.3, 20.3 49.6 C 20.3 49.5, 20.8 50.4, 21.4 51.6 C 23.4 55.6, 25.2 57.9, 26.5 58.3 L 27.2 58.4 26.8 57.3 C 26.4 55.9, 25.8 51.8, 25.8 51.0 C 25.8 50.6, 26.1 51.6, 26.5 53.1 C 27.7 57.7, 28.1 58.5, 29.2 58.4 C 30.1 58.4, 30.8 58.6, 31.7 59.4 L 32.3 60.0 31.7 58.6 C 31.0 56.8, 30.8 52.5, 31.4 49.3 C 31.9 46.5, 31.9 46.1, 31.2 44.4 C 29.6 40.5, 24.8 38.4, 20.5 39.8","M 64.1 67.4 C 63.7 68.8, 61.8 72.5, 60.8 73.5 L 59.8 74.6 60.6 73.4 C 61.5 72.0, 62.9 68.9, 63.1 67.7 L 63.3 66.9 62.6 67.4 C 61.1 68.3, 60.1 68.7, 58.8 68.7 C 57.6 68.7, 57.5 68.8, 57.0 69.6 C 56.1 70.8, 54.5 72.2, 52.4 73.4 C 50.1 74.7, 49.9 75.0, 49.2 77.0 C 47.5 81.7, 48.9 84.5, 53.1 84.8 C 55.9 85.0, 57.7 85.9, 58.0 87.3 C 58.2 88.5, 60.7 89.2, 62.8 88.6 C 64.6 88.2, 65.3 87.4, 66.1 85.0 C 68.7 77.5, 68.9 70.4, 66.7 67.6 L 66.1 66.9 66.1 69.4 C 66.1 71.8, 65.7 74.9, 65.1 76.5 L 64.9 77.2 65.0 76.4 C 65.4 73.6, 65.6 71.1, 65.4 69.8 L 65.3 68.4 64.9 70.3 C 64.2 73.1, 62.3 78.0, 61.5 78.4 C 61.4 78.5, 61.6 78.1, 61.9 77.5 C 63.2 75.2, 64.6 69.6, 64.4 67.5 L 64.3 66.7 64.1 67.4","M 91.1 50.4 C 88.7 54.4, 83.4 57.2, 77.0 57.8 L 75.2 58.0 75.1 58.8 C 75.0 59.7, 75.2 59.9, 76.5 60.3 C 77.8 60.7, 80.0 60.5, 82.7 59.6 C 85.3 58.8, 85.6 58.8, 83.5 59.7 C 80.9 60.8, 79.9 61.1, 78.2 61.3 L 76.5 61.4 77.8 62.1 C 79.4 62.8, 82.3 63.0, 85.4 62.4 C 87.9 61.9, 87.9 62.0, 85.4 62.7 C 81.6 63.7, 79.2 63.8, 77.3 63.1 C 77.0 63.0, 76.9 63.0, 76.9 63.3 C 76.9 64.2, 81.0 65.5, 83.5 65.3 C 84.7 65.2, 84.8 65.2, 84.2 65.4 C 83.0 65.8, 79.3 65.7, 78.2 65.3 C 77.0 64.8, 76.8 64.8, 77.1 65.3 C 77.2 65.6, 77.4 66.1, 77.4 66.5 C 77.4 67.2, 77.5 67.3, 79.1 68.1 C 86.7 71.8, 92.6 69.9, 94.8 63.0 C 95.1 62.1, 95.3 61.7, 95.8 61.5 C 96.7 61.2, 97.3 59.6, 97.3 57.4 C 97.3 56.4, 97.5 55.2, 97.7 54.6 C 99.1 50.5, 93.1 46.7, 91.1 50.4","M 79.7 37.0 C 79.2 37.4, 78.4 38.6, 77.9 39.8 C 76.7 42.1, 75.4 44.2, 73.9 46.0 L 72.9 47.2 72.9 50.0 C 72.9 51.8, 72.7 53.2, 72.5 53.9 L 72.1 55.0 73.0 54.9 C 76.3 54.4, 79.4 52.3, 81.5 49.2 C 82.6 47.5, 82.7 47.6, 81.7 49.4 C 80.7 51.1, 78.6 53.4, 77.1 54.3 C 75.6 55.3, 75.6 55.3, 77.6 54.8 C 79.8 54.2, 82.1 53.1, 83.6 51.8 L 84.7 50.9 83.8 51.8 C 82.1 53.7, 79.1 55.3, 76.2 56.0 C 74.6 56.3, 74.5 56.4, 74.8 56.8 C 75.1 57.2, 75.2 57.2, 77.7 56.9 C 86.9 55.6, 91.5 51.5, 92.0 43.9 C 92.1 42.2, 92.3 41.0, 92.5 40.4 C 93.4 38.7, 92.3 38.7, 90.7 40.3 L 89.7 41.3 87.9 39.5 C 84.8 36.4, 81.6 35.4, 79.7 37.0","M 20.2 70.9 C 12.5 72.5, 8.5 76.7, 8.0 83.7 C 7.9 85.4, 7.7 86.6, 7.4 87.2 C 6.9 88.2, 6.9 88.2, 7.7 88.2 C 8.2 88.2, 8.7 87.9, 9.3 87.2 C 10.4 86.0, 10.3 86.0, 12.0 87.7 C 16.7 92.5, 19.8 92.5, 22.2 87.7 C 23.4 85.2, 25.4 82.1, 26.5 81.0 L 27.4 80.2 27.1 78.5 C 26.9 76.9, 27.2 74.4, 27.8 72.9 C 28.0 72.5, 27.9 72.5, 26.7 72.6 C 23.8 73.0, 20.1 75.6, 18.4 78.5 C 17.6 79.9, 17.4 79.8, 18.2 78.3 C 19.4 76.3, 21.1 74.4, 22.7 73.3 L 24.2 72.3 23.2 72.4 C 21.0 72.9, 18.3 74.1, 16.7 75.5 C 16.2 76.0, 15.9 76.1, 16.1 75.9 C 17.0 74.2, 21.0 72.1, 24.9 71.3 C 25.3 71.2, 25.5 71.0, 25.4 70.8 C 25.2 70.3, 23.1 70.3, 20.2 70.9","M 11.7 57.6 C 8.8 58.3, 6.1 61.3, 5.2 64.8 C 5.0 65.4, 4.7 65.8, 4.3 66.0 C 3.4 66.4, 2.7 68.1, 2.7 70.1 C 2.7 71.1, 2.5 72.4, 2.3 73.1 C 1.4 75.9, 3.5 78.3, 6.9 78.3 L 8.4 78.3 9.0 77.2 C 10.9 73.4, 15.7 70.7, 22.0 69.8 C 23.5 69.6, 24.7 69.4, 24.7 69.4 C 26.3 67.1, 21.9 66.3, 17.0 68.0 C 14.2 68.9, 14.1 68.8, 16.8 67.7 C 19.2 66.7, 20.4 66.3, 22.2 66.1 L 23.5 66.0 22.3 65.4 C 20.7 64.6, 18.4 64.5, 15.5 65.0 C 12.3 65.5, 12.5 65.3, 15.7 64.5 C 18.4 63.9, 21.0 63.8, 22.6 64.3 C 23.7 64.6, 23.0 63.8, 21.6 63.1 C 20.4 62.5, 19.8 62.4, 17.9 62.3 C 16.3 62.2, 15.8 62.1, 16.3 62.0 C 17.7 61.6, 20.6 61.8, 21.9 62.2 C 22.6 62.5, 23.1 62.6, 23.1 62.6 C 23.1 62.6, 23.0 62.1, 22.8 61.4 C 22.2 59.1, 15.2 56.7, 11.7 57.6","M 54.6 30.0 L 54.0 30.2 54.7 30.6 C 55.4 31.0, 57.7 33.3, 57.7 33.6 C 57.7 33.7, 57.1 33.2, 56.5 32.6 C 54.8 31.0, 52.3 30.0, 53.6 31.5 C 54.5 32.4, 54.8 33.3, 54.8 34.8 L 54.7 36.2 54.6 34.8 C 54.4 33.2, 53.8 32.1, 52.7 31.5 L 51.9 31.0 52.2 31.8 C 52.5 32.5, 52.3 34.3, 52.0 34.7 C 51.9 34.8, 51.8 34.4, 51.9 33.9 C 52.1 31.8, 51.1 30.3, 49.3 30.3 C 44.8 30.3, 42.9 33.9, 44.7 38.7 C 45.5 40.9, 45.8 41.1, 48.1 41.1 C 50.2 41.0, 50.8 41.2, 51.8 42.1 C 52.9 43.1, 54.7 42.9, 59.9 41.0 C 64.8 39.1, 65.7 38.2, 64.9 36.0 C 63.4 31.8, 58.3 28.9, 54.6 30.0","M 34.1 21.1 C 32.7 22.2, 32.0 24.1, 32.9 24.8 C 33.5 25.3, 33.2 27.4, 32.3 28.7 C 29.9 32.3, 34.6 35.8, 39.2 33.7 C 40.1 33.3, 41.5 32.8, 42.4 32.7 C 43.7 32.5, 44.0 32.3, 44.7 31.5 C 45.1 31.0, 45.8 30.5, 46.3 30.3 C 47.7 29.8, 46.6 29.2, 43.5 28.9 L 42.0 28.7 43.8 28.7 C 44.8 28.7, 46.0 28.8, 46.5 28.9 C 47.0 29.0, 47.5 29.0, 47.6 29.0 C 47.8 28.8, 43.6 26.9, 42.1 26.6 L 40.5 26.2 41.9 26.4 C 42.7 26.4, 44.2 26.8, 45.2 27.2 C 47.5 28.0, 47.4 27.7, 44.9 26.2 C 43.9 25.7, 43.1 25.1, 43.1 25.1 C 43.3 25.0, 45.8 26.2, 47.1 27.1 C 48.6 28.1, 48.8 27.7, 47.6 26.1 C 45.1 22.7, 36.4 19.4, 34.1 21.1","M 46.1 9.7 C 45.3 10.6, 45.2 10.6, 43.8 10.6 C 41.3 10.6, 38.9 13.5, 38.9 16.5 C 38.9 19.4, 39.8 20.5, 43.2 22.2 C 45.2 23.1, 46.1 23.7, 47.3 24.9 C 48.7 26.3, 48.8 26.4, 48.7 25.7 C 48.7 25.4, 48.9 24.8, 49.1 24.5 C 49.6 23.7, 49.4 23.1, 47.7 21.2 C 47.1 20.5, 46.3 19.6, 46.1 19.3 C 45.4 18.5, 47.7 20.6, 48.9 21.8 C 50.0 23.0, 50.2 23.1, 50.3 22.5 C 50.5 21.6, 49.3 18.4, 47.8 16.0 C 47.5 15.6, 47.4 15.2, 47.5 15.2 C 47.7 15.2, 49.8 18.5, 50.5 20.1 C 50.9 21.1, 51.2 21.4, 51.3 21.2 C 51.6 20.8, 51.6 17.6, 51.4 16.3 L 51.2 15.3 51.6 16.4 C 51.8 17.0, 52.0 18.1, 52.1 18.9 C 52.3 20.6, 52.4 20.5, 52.8 18.4 C 53.1 16.8, 54.0 14.5, 54.7 13.7 C 55.5 12.8, 52.6 10.3, 49.8 9.4 C 47.2 8.7, 47.1 8.7, 46.1 9.7","M 65.5 20.7 C 63.2 21.5, 60.1 23.9, 58.6 26.1 C 57.8 27.2, 58.4 27.3, 59.6 26.2 C 60.8 25.1, 62.8 24.0, 64.0 23.7 C 64.5 23.6, 64.0 23.9, 63.1 24.4 C 62.2 24.9, 61.0 25.6, 60.6 26.1 L 59.7 27.0 60.9 26.5 C 61.7 26.1, 62.7 25.9, 64.1 25.9 L 66.2 25.8 64.4 26.0 C 62.3 26.3, 60.5 27.1, 59.2 28.3 L 58.3 29.1 60.2 30.1 C 61.3 30.6, 62.3 31.2, 62.6 31.5 C 63.0 31.9, 63.2 32.0, 65.3 31.8 C 66.6 31.7, 68.4 31.8, 69.7 32.0 C 74.1 32.6, 75.3 30.4, 73.9 24.8 C 73.7 24.2, 73.8 24.1, 74.8 24.0 C 76.3 23.8, 76.7 23.1, 75.4 22.7 C 74.8 22.6, 73.7 22.1, 73.0 21.6 C 70.6 20.2, 68.0 19.9, 65.5 20.7","M 57.8 12.1 C 55.5 12.8, 53.1 17.0, 53.1 20.4 C 53.1 21.7, 54.2 22.6, 54.5 21.5 C 54.7 20.6, 55.2 19.5, 56.1 18.5 C 57.0 17.3, 57.2 17.5, 56.3 18.8 C 55.9 19.4, 55.5 20.3, 55.3 20.8 C 54.8 22.7, 55.1 23.7, 55.7 22.0 C 56.1 21.1, 57.5 19.4, 59.1 17.9 C 60.0 17.1, 60.0 17.3, 58.7 18.8 C 57.0 20.7, 56.3 22.1, 56.2 23.2 L 56.2 23.9 56.9 23.1 C 57.5 22.2, 59.1 21.0, 60.8 19.9 C 61.9 19.3, 61.5 19.6, 59.7 21.1 C 57.2 22.9, 55.9 25.5, 57.2 25.9 C 57.5 26.0, 58.1 25.5, 59.8 23.9 C 62.8 20.9, 66.6 19.2, 69.1 19.6 C 69.8 19.8, 69.9 19.7, 70.5 18.7 C 71.7 16.6, 71.1 14.6, 69.1 14.0 C 68.6 13.8, 67.6 13.3, 67.0 12.9 C 65.8 12.1, 64.1 11.8, 63.8 12.3 C 63.7 12.4, 63.2 12.4, 62.6 12.2 C 61.3 11.8, 59.2 11.8, 57.8 12.1","M 71.8 57.0 C 71.4 57.3, 71.4 57.4, 71.7 58.1 C 72.1 58.8, 72.1 59.0, 71.9 59.5 C 71.5 60.3, 71.1 60.1, 70.9 59.1 C 70.6 58.0, 70.4 58.0, 69.4 59.1 C 68.4 60.2, 68.3 60.5, 68.9 60.7 C 69.2 60.7, 69.6 61.0, 69.8 61.3 C 70.1 61.6, 70.4 61.7, 70.8 61.6 C 72.4 61.3, 73.9 63.0, 73.3 64.3 C 72.9 65.3, 72.2 65.0, 72.3 63.8 C 72.4 62.8, 71.4 62.4, 70.5 63.2 C 69.8 63.9, 69.3 63.7, 69.2 62.7 C 69.0 61.5, 68.4 61.5, 67.3 62.8 C 65.1 65.0, 65.3 66.4, 67.7 66.0 C 68.4 65.8, 68.5 65.9, 68.8 66.7 C 69.4 68.0, 70.6 68.4, 71.8 67.6 C 72.4 67.2, 72.5 67.3, 73.4 67.9 C 75.5 69.3, 77.5 67.0, 75.8 65.2 C 75.1 64.6, 75.1 64.5, 75.5 63.9 C 76.4 62.4, 75.6 60.8, 74.1 60.8 C 73.4 60.8, 73.3 60.4, 73.8 59.4 C 74.8 57.8, 73.2 55.9, 71.8 57.0","M 24.1 59.8 C 23.4 60.6, 23.5 61.4, 24.2 62.1 C 24.9 62.8, 24.9 63.1, 24.4 63.8 C 23.7 64.8, 24.5 66.6, 25.6 66.6 C 26.5 66.6, 26.9 67.2, 26.4 67.7 C 25.1 69.2, 26.3 71.4, 28.0 70.6 C 28.5 70.4, 28.6 70.2, 28.5 69.9 C 28.0 68.8, 28.1 67.5, 28.7 67.6 C 29.1 67.6, 29.2 67.8, 29.2 68.1 C 29.1 69.4, 29.6 69.5, 30.6 68.6 C 31.5 67.7, 31.8 66.8, 31.2 66.8 C 31.1 66.8, 30.7 66.6, 30.4 66.3 C 30.0 65.9, 29.6 65.8, 28.9 65.8 C 27.3 65.9, 25.8 63.3, 26.9 62.6 C 27.4 62.3, 28.0 62.8, 27.8 63.4 C 27.5 64.6, 29.0 65.1, 29.6 64.1 C 30.1 63.4, 30.8 63.7, 30.8 64.6 C 30.8 66.5, 33.2 65.2, 34.2 62.9 C 34.6 61.9, 33.8 61.2, 32.4 61.4 C 31.6 61.6, 31.5 61.5, 31.2 60.7 C 30.6 59.3, 29.4 59.0, 28.3 59.9 L 27.7 60.4 26.9 59.7 C 25.9 58.9, 24.8 58.9, 24.1 59.8","M 51.4 22.1 C 51.1 22.4, 51.0 22.9, 51.0 23.3 C 51.0 23.8, 50.8 24.1, 50.2 24.5 C 49.4 25.1, 49.3 25.7, 49.9 26.6 C 50.2 27.1, 50.2 27.2, 49.8 27.6 C 48.6 28.6, 49.1 29.2, 50.9 29.1 C 52.5 29.0, 53.4 28.2, 52.3 27.8 C 51.7 27.5, 51.8 27.0, 52.5 27.0 C 53.4 27.0, 53.6 25.8, 52.7 25.4 C 52.2 25.2, 52.3 24.8, 53.0 24.8 C 54.0 24.8, 54.6 26.7, 53.8 27.3 C 53.1 27.9, 53.4 29.2, 54.3 29.3 C 55.4 29.4, 55.7 29.0, 55.2 28.4 C 54.9 28.1, 54.8 27.8, 55.0 27.7 C 55.3 27.3, 56.0 27.6, 56.3 28.3 C 56.6 28.8, 56.6 28.9, 57.1 28.5 C 58.2 27.8, 57.5 26.5, 56.1 26.5 C 55.5 26.5, 55.5 26.4, 55.6 25.5 C 55.8 24.3, 55.3 23.6, 54.3 23.6 C 53.7 23.6, 53.6 23.5, 53.6 23.0 C 53.6 21.9, 52.1 21.3, 51.4 22.1"] },
]

// Gradient colour mixes: W ghost white, I electric indigo, S soft indigo, A palette accent
const LOGO_MIX = ["W", "S", "A"]
const ICON_MIX = [
  ["I", "A", "W"], // record
  ["A", "W", "I"], // palette
  ["A", "I", "W"], // paintbrush
  ["I", "W", "A"], // canvas
  ["W", "A", "I"], // pencil
  ["A", "S", "W"], // flower
]
const ROLE_TOKENS = { W: "--tag-ghost", I: "--tag-indigo", S: "--tag-indigo-soft", A: "--tag-acc" }

// Cubic ease-in-out
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

/**
 * The TAG mark at the bottom of the landing hero. It morphs into a record, palette, paintbrush,
 * canvas, pencil and the Bloomscroll flowers in an endless loop while on screen; reduced motion
 * shows the still logo.
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
