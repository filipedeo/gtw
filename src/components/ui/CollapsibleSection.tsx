import React, { useId, useState } from 'react';
import { cn } from '../../lib/cn';
import { ChevronDownIcon } from '../icons';

export interface CollapsibleSectionProps {
  title: React.ReactNode;
  children: React.ReactNode;
  /** Uncontrolled initial open state. Default open. */
  defaultOpen?: boolean;
  className?: string;
}

/**
 * Token-driven disclosure primitive (header button toggles a labelled region).
 * The chevron rotation respects the global prefers-reduced-motion opt-out.
 */
export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  children,
  defaultOpen = true,
  className,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();
  return (
    <section
      className={cn(
        'bg-surface-raised border border-line rounded-[var(--rad-lg)] overflow-hidden',
        className,
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-3 px-[var(--space-4)] min-h-[var(--target-min)] text-left font-semibold text-fg-strong cursor-pointer hover:bg-surface-hover transition-colors"
      >
        <span>{title}</span>
        <ChevronDownIcon
          size={20}
          className={cn('shrink-0 text-fg-muted transition-transform', open ? 'rotate-180' : 'rotate-0')}
          style={{ transitionDuration: 'var(--dur-base)' }}
        />
      </button>
      <div id={contentId} hidden={!open} className="px-[var(--space-4)] pb-[var(--space-4)]">
        {children}
      </div>
    </section>
  );
};
