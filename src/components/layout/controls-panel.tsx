import { PART_TYPES } from '../../domain/constants'
import { useBuildStore } from '../../store/use-build-store'
import { SizeControl } from '../controls/size-control'
import { ColorsSection } from '../controls/colors-section'
import { PartControl } from '../controls/part-control'
import { CableHolderHeight } from '../controls/cable-holder-height'
import { ShelfEditor } from '../controls/shelf-editor'
import { VisibilityToggle } from '../../ui/visibility-toggle'
import { CollapsibleSection } from '../../ui/collapsible-section'

// Deployments set VITE_SOURCE_URL to the exact commit they were built from.
const SOURCE_URL =
  (import.meta.env.VITE_SOURCE_URL as string | undefined) ??
  'https://github.com/xTumulus/lab-rax-visualizer'

/**
 * Single source of truth for the rack's control sections. Just the
 * `space-y-3` stack (+ optional footer) — no scroll container or padding, so
 * each host (desktop aside vs. mobile sheet) can own its own scroll/overflow
 * behavior.
 */
export function ControlsPanel({ footer }: { footer?: React.ReactNode }) {
  const partTypes = PART_TYPES.filter((p) => p !== 'shelves')
  const shelvesVisible = useBuildStore((s) => s.visibility.shelves)
  const toggleVisibility = useBuildStore((s) => s.toggleVisibility)

  return (
    <div className="space-y-3">
      <CollapsibleSection title="Size">
        <SizeControl />
      </CollapsibleSection>

      <CollapsibleSection title="Colors">
        <ColorsSection />
      </CollapsibleSection>

      <CollapsibleSection title="Parts" collapsible>
        <div className="space-y-2">
          {partTypes.map((part) => (
            <PartControl
              key={part}
              part={part}
              // Cable holders are the one fixed part that isn't pinned by the
              // frame geometry, so they get a row picker of their own.
              extra={part === 'cableHolders' ? <CableHolderHeight /> : undefined}
            />
          ))}
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Shelves"
        action={<VisibilityToggle visible={shelvesVisible} onToggle={() => toggleVisibility('shelves')} />}
      >
        <ShelfEditor />
      </CollapsibleSection>

      <footer className="space-y-1 text-center text-[11px] leading-snug text-white/40">
        <p>
          Lab Rax planner is a fan-made visualizer. Parts &amp; design credit:{' '}
          the-diy-life.com.
        </p>
        <a
          href={SOURCE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="block transition hover:text-white/70"
        >
          Source code (AGPL-3.0)
        </a>
      </footer>

      {footer}
    </div>
  )
}
