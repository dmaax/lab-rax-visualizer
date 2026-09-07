import { useBuildStore } from '../../store/use-build-store'
import { NudgeStack } from '../../ui/nudge-stack'

/**
 * Row picker for the rear cable holders. They are a fixed pair — one per rear
 * rail — so there is a single height for both rather than a list like shelves.
 */
export function CableHolderHeight() {
  const rackU = useBuildStore((s) => s.rackU)
  const cableHolderU = useBuildStore((s) => s.cableHolderU)
  const moveCableHolder = useBuildStore((s) => s.moveCableHolder)
  // Counted down from the top of the rack, matching the shelf list.
  const rowLabel = `Row ${rackU - cableHolderU}`

  return (
    <div className="flex items-center gap-2 rounded bg-black/30 p-2">
      <NudgeStack
        label={rowLabel}
        canUp={cableHolderU + 1 < rackU}
        canDown={cableHolderU > 0}
        onUp={() => moveCableHolder(1)}
        onDown={() => moveCableHolder(-1)}
      />
      <span className="text-[11px] text-white/50">Height: {rowLabel}</span>
    </div>
  )
}
