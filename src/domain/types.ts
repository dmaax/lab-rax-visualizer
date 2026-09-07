export type PatternId = 'none' | 'honeycomb' | 'grid' | 'vents' | 'perf'

export type PartType =
  | 'horizontalEdges'
  | 'heroEdge'
  | 'widthRails'
  | 'verticalRails'
  | 'sidePanels'
  | 'topPanel'
  | 'bottomPanel'
  | 'handles'
  | 'feet'
  | 'cableHolders'
  | 'shelves'

/** Parts that can be toggled on/off (the rest are always present). */
export type OptionalPart =
  | 'handles'
  | 'cableHolders'
  | 'feet'
  | 'sidePanels'
  | 'topPanel'
  | 'bottomPanel'

export interface PartStyle {
  color: string
  pattern: PatternId
  /** When a pattern is set: true = solid backplate behind voids, false = open voids. */
  solid: boolean
}

export type ShelfU = 1 | 2 | 3 | 4

/** Real Lab Rax shelf parts, each modeled as its own fixed-size STL/3MF. */
export type ShelfType =
  | 'plate-1u'
  | 'plate-2u'
  | 'plate-vent-1u'
  | 'shelf-open-1u'
  | 'shelf-slotted-1u'
  | 'shelf-plate-40mm-fan-1u'
  | 'shelf-plate-80mm-fan-2u'
  | 'shelf-plate-keystone-1u'
  | 'shelf-sbc-7-2u'
  | 'shelf-mini-itx-2u'
  | 'shelf-switch-sg108-1u'
  | 'shelf-psu-atx-2u'

/** Which face of the rack a shelf is mounted to. */
export type ShelfMount = 'front' | 'rear'

export interface Shelf {
  id: string
  /** Derived from `shelfType` — kept as its own field since it drives layout
   * (row math, gap-finding) independently of which model renders. */
  u: ShelfU
  shelfType: ShelfType
  /** Row (0-indexed from the bottom of the rack) this shelf's bottom sits at.
   * Shelves are independently positioned — gaps and "no shelves" are both
   * valid; they are not forced to fill or stack contiguously. */
  startU: number
  /** Rack face this shelf mounts to. Rear-mounted shelves are turned around
   * so their bracket faces the back, which lets a row hold an open shelf at
   * the front and something like a PSU bracket behind it. */
  mount: ShelfMount
  /** true = solid shelf, false = shelf with a center hole (for visualization). */
  solid: boolean
  color: string
  pattern: PatternId
}

export type Toggles = Record<OptionalPart, boolean>

/**
 * Per-part-type viewport visibility. Distinct from Toggles: a part can be
 * included in the build (and export) but temporarily hidden in the 3D view,
 * or vice versa. Not part of BuildState — it's a viewing preference, not
 * something to persist or share.
 */
export type PartVisibility = Record<PartType, boolean>

export const PALETTE_SIZE = 6

/** A shared 6-color palette; part swatches pick from this instead of a full picker. */
export type Palette = string[]

export interface BuildState {
  rackU: number
  parts: Record<PartType, PartStyle>
  toggles: Toggles
  shelves: Shelf[]
  palette: Palette
}
