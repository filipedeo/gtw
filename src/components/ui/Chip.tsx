import React from 'react';
import { cn } from '../../lib/cn';

export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Selected (active) state — also reflected via aria-pressed. */
  selected?: boolean;
}

/** Pill-shaped selectable chip (category filters, tags). */
export const Chip = React.forwardRef<HTMLButtonElement, ChipProps>(
  ({ selected = false, className, type, children, ...rest }, ref) => (
    <button
      ref={ref}
      type={type ?? 'button'}
      aria-pressed={selected}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-[var(--rad-full)] border',
        'px-3.5 min-h-[var(--target-compact)] text-[length:var(--fs-xs)] font-medium',
        'cursor-pointer whitespace-nowrap active:translate-y-px',
        'transition-[background-color,border-color,color,box-shadow] duration-[var(--dur-fast)] ease-[var(--ease-standard)]',
        selected
          ? 'bg-accent text-on-accent border-transparent shadow-[0_2px_10px_-3px_rgba(110,168,254,0.55)]'
          : 'bg-surface text-fg-muted border-line hover:bg-surface-hover hover:text-fg hover:border-line-strong',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  ),
);
Chip.displayName = 'Chip';
