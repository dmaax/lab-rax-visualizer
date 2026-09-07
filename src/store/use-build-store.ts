import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  BuildState,
  OptionalPart,
  PartStyle,
  PartType,
  PartVisibility,
  Shelf,
  ShelfMount,
  ShelfType,
  ShelfU,
} from '../domain/types'
import { PALETTE_SIZE } from '../domain/types'
import { MAX_U, MIN_U, shelfTypeU } from '../domain/constants'
import { DEFAULT_PALETTE, makeAllVisible, makeDefaultBuild } from '../domain/defaults'
import {
  canMoveShelf,
  clampShelvesToRack,
  findFirstGap,
  fitsAt,
  makeShelf,
  maxDownGrowth,
  normalizeShelfMount,
} from '../domain/shelves'
import { decodeBuild, readShareParam } from '../share/url-state'

interface BuildActions {
  setRackU: (u: number) => void
  setPartStyle: (part: PartType, patch: Partial<PartStyle>) => void
  setPaletteColor: (index: number, color: string) => void
  toggle: (part: OptionalPart) => void
  moveShelf: (id: string, delta: number) => void
  moveCableHolder: (delta: number) => void
  setShelfMount: (id: string, mount: ShelfMount) => void
  setShelfType: (id: string, shelfType: ShelfType) => void
  setShelfStyle: (id: string, patch: Partial<Omit<Shelf, 'id' | 'u' | 'shelfType'>>) => void
  addShelf: (mount: ShelfMount) => void
  removeShelf: (id: string) => void
  loadBuild: (state: BuildState) => void
  reset: () => void
  /** stretch-feature scaffolding: currently selected part instance id */
  selectedPartId: string | null
  selectPart: (id: string | null) => void
  /** viewport-only visibility toggle, independent of Toggles (build inclusion) */
  visibility: PartVisibility
  toggleVisibility: (part: PartType) => void
}

export type BuildStore = BuildState & BuildActions

const clampU = (u: number) => Math.max(MIN_U, Math.min(MAX_U, Math.round(u)))

export const useBuildStore = create<BuildStore>()(
  persist(
    (set) => ({
      ...makeDefaultBuild(),
      selectedPartId: null,
      visibility: makeAllVisible(),

      setRackU: (u) =>
        set((s) => {
          const rackU = clampU(u)
          // Shelves are anchored to the top of the rack, not the bottom: on
          // resize, shift every shelf by the change in height so each keeps
          // its distance from the (new) top instead of drifting toward the
          // middle as the rack grows, or off the bottom as it shrinks.
          const delta = rackU - s.rackU
          const shifted = s.shelves.map((sh) => ({ ...sh, startU: sh.startU + delta }))
          // The cable holders are anchored to the top the same way, then
          // clamped so a shrinking rack can never leave them outside it.
          const cableHolderU = Math.max(0, Math.min(rackU - 1, s.cableHolderU + delta))
          return { rackU, shelves: clampShelvesToRack(shifted, rackU), cableHolderU }
        }),

      setPartStyle: (part, patch) =>
        set((s) => ({
          parts: { ...s.parts, [part]: { ...s.parts[part], ...patch } },
        })),

      setPaletteColor: (index, color) =>
        set((s) => {
          const oldColor = s.palette[index]
          const palette = [...s.palette]
          palette[index] = color
          // Parts/shelves currently showing this swatch track it live —
          // editing a swatch updates everything painted with it, not just
          // future picks.
          const sameColor = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()
          const parts = { ...s.parts }
          for (const part of Object.keys(parts) as PartType[]) {
            if (sameColor(parts[part].color, oldColor)) {
              parts[part] = { ...parts[part], color }
            }
          }
          const shelves = s.shelves.map((sh) => (sameColor(sh.color, oldColor) ? { ...sh, color } : sh))
          return { palette, parts, shelves }
        }),

      toggle: (part) =>
        set((s) => ({ toggles: { ...s.toggles, [part]: !s.toggles[part] } })),

      moveCableHolder: (delta) =>
        set((s) => {
          const cableHolderU = s.cableHolderU + delta
          if (cableHolderU < 0 || cableHolderU >= s.rackU) return {}
          return { cableHolderU }
        }),

      moveShelf: (id, delta) =>
        set((s) =>
          canMoveShelf(s.shelves, s.rackU, id, delta)
            ? {
                shelves: s.shelves.map((sh) =>
                  sh.id === id ? { ...sh, startU: sh.startU + delta } : sh,
                ),
              }
            : {},
        ),

      setShelfMount: (id, mount) =>
        set((s) => {
          const shelf = s.shelves.find((sh) => sh.id === id)
          if (!shelf || normalizeShelfMount(shelf) === mount) return {}
          // Keep the same rows when they are free on the target face, else
          // drop into the first gap there. Refused only when that face has no
          // room at all, so a switch can never stack two shelves on one face.
          let startU = shelf.startU
          if (!fitsAt(s.shelves, s.rackU, mount, startU, shelf.u, id)) {
            const gap = findFirstGap(s.shelves, s.rackU, shelf.u as ShelfU, mount)
            if (gap === null) return {}
            startU = gap
          }
          return {
            shelves: s.shelves.map((sh) => (sh.id === id ? { ...sh, mount, startU } : sh)),
          }
        }),

      setShelfType: (id, shelfType) =>
        set((s) => {
          const shelf = s.shelves.find((sh) => sh.id === id)
          if (!shelf) return {}
          const u = shelfTypeU(shelfType)
          // Growth extends downward with the shelf's top row held fixed (see
          // maxDownGrowth) — the editor only offers types that already fit,
          // this is a safety net for callers that don't pre-filter.
          const topRow = shelf.startU + shelf.u - 1
          const cap = Math.max(
            shelf.u,
            maxDownGrowth(s.shelves, id, topRow, normalizeShelfMount(shelf)),
          )
          if (u > cap) return {}
          const startU = topRow - u + 1
          // `solid` defaults from the chosen type (plates are solid, the
          // rest have a center hole) but stays independently overridable
          // afterward via setShelfStyle.
          const solid = shelfType === 'plate-1u' || shelfType === 'plate-2u'
          return {
            shelves: s.shelves.map((sh) => (sh.id === id ? { ...sh, shelfType, u, startU, solid } : sh)),
          }
        }),

      setShelfStyle: (id, patch) =>
        set((s) => ({
          shelves: s.shelves.map((sh) => (sh.id === id ? { ...sh, ...patch } : sh)),
        })),

      addShelf: (mount) =>
        set((s) => {
          const startU = findFirstGap(s.shelves, s.rackU, 1, mount)
          if (startU === null) return {} // no room on that face — no-op
          const first = s.shelves[0]
          const template = first
            ? { color: first.color, pattern: first.pattern, solid: first.solid }
            : undefined
          return {
            shelves: [...s.shelves, makeShelf('plate-1u', startU, s.shelves, template, mount)],
          }
        }),

      removeShelf: (id) =>
        set((s) => ({ shelves: s.shelves.filter((sh) => sh.id !== id) })),

      loadBuild: (state) =>
        set(() => ({
          rackU: clampU(state.rackU),
          parts: state.parts,
          toggles: state.toggles,
          shelves: clampShelvesToRack(state.shelves, clampU(state.rackU)),
          palette:
            Array.isArray(state.palette) && state.palette.length === PALETTE_SIZE
              ? state.palette
              : [...DEFAULT_PALETTE],
        })),

      reset: () => set(() => ({ ...makeDefaultBuild(), selectedPartId: null, visibility: makeAllVisible() })),

      selectPart: (id) => set(() => ({ selectedPartId: id })),

      toggleVisibility: (part) =>
        set((s) => ({ visibility: { ...s.visibility, [part]: !s.visibility[part] } })),
    }),
    {
      name: 'lab-rax-build',
      // Only persist the build itself, not transient UI selection state.
      partialize: (s): BuildState => ({
        rackU: s.rackU,
        parts: s.parts,
        toggles: s.toggles,
        shelves: s.shelves,
        cableHolderU: s.cableHolderU,
        palette: s.palette,
      }),
      // Zustand's default merge is a shallow `{...current, ...persisted}`,
      // which would replace `parts`/`toggles` wholesale with whatever was
      // saved before — so a persisted build from before a new part type
      // (e.g. widthRails) existed would come back missing that key entirely,
      // crashing anything that reads it. Merge those two per-key against
      // fresh defaults instead so old saves gain new keys automatically.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<BuildState>
        // Shelves saved before `startU` existed would come back with it
        // `undefined`, and undefined arithmetic (`undefined + i`) produces
        // NaN mesh positions — which can blank the entire Three.js scene,
        // not just the shelves. Discard the whole saved shelf list rather
        // than trust a partially-shaped one; same as the share-URL decoder.
        const shelvesValid =
          Array.isArray(p.shelves) &&
          p.shelves.every((s) => s && typeof s.startU === 'number' && s.startU >= 0)
        const rackU = clampU(p.rackU ?? current.rackU)
        return {
          ...current,
          ...p,
          parts: { ...current.parts, ...p.parts },
          toggles: { ...current.toggles, ...p.toggles },
          // Also backfills `shelfType` on shelves saved before that field
          // existed, and drops any that no longer fit a fixed-size part.
          shelves: shelvesValid ? clampShelvesToRack(p.shelves!, rackU) : current.shelves,
        }
      },
    },
  ),
)

/**
 * On first load, a `?b=` share param wins over persisted localStorage state.
 * Called once from main.tsx after the store is created/rehydrated.
 */
export function hydrateFromShareParam(): void {
  const param = readShareParam()
  if (!param) return
  const decoded = decodeBuild(param)
  if (decoded) {
    useBuildStore.getState().loadBuild(decoded)
    // strip the param so a later refresh uses persisted state / share is intentional
    const url = new URL(window.location.href)
    url.searchParams.delete('b')
    window.history.replaceState({}, '', url.toString())
  }
}
