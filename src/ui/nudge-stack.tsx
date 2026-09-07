interface Props {
  onUp: () => void
  onDown: () => void
  canUp: boolean
  canDown: boolean
  /** What is being moved, e.g. "Rows 2-3" — used as tooltip and a11y context. */
  label: string
}

/**
 * Two stacked arrows for nudging something one step up or down. Sized so the
 * pair matches the height of a single control sitting beside it, on fine and
 * coarse pointers alike, which keeps rows from growing taller on touch.
 */
export function NudgeStack({ onUp, onDown, canUp, canDown, label }: Props) {
  const cls =
    'grid place-items-center rounded bg-black/40 text-[8px] leading-none text-white/50 ' +
    'ring-1 ring-white/10 hover:text-white disabled:opacity-25 disabled:hover:text-white/50 ' +
    'h-3.5 pointer-coarse:h-[21px] pointer-coarse:text-[10px]'
  return (
    <div className="flex w-5 shrink-0 flex-col gap-px" title={label}>
      <button
        type="button"
        onClick={onUp}
        disabled={!canUp}
        className={cls}
        aria-label={`Move up (currently ${label})`}
      >
        ▲
      </button>
      <button
        type="button"
        onClick={onDown}
        disabled={!canDown}
        className={cls}
        aria-label={`Move down (currently ${label})`}
      >
        ▼
      </button>
    </div>
  )
}
