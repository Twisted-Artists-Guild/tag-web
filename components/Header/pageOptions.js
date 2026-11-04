/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/

import { useEffect, useSyncExternalStore } from "react"

let current = null
const listeners = new Set()
const emit = () => listeners.forEach((fn) => fn())
const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn) }

export function usePageOptions(groups) {
  useEffect(() => {
    current = groups
    emit()
    return () => {
      if (current === groups) {
        current = null
        emit()
      }
    }
  }, [groups])
}

export function usePageOptionsSlot() {
  return useSyncExternalStore(subscribe, () => current, () => null)
}
