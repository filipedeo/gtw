import React from 'react';
import { cn } from '../../lib/cn';

export type CardElevation = 0 | 1 | 2 | 3;

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Elevation mapped to the --elev-* ramp. Default 1. */
  elevation?: CardElevation;
  /** Drop the default interior padding (for custom layouts). */
  flush?: boolean;
}

const ELEVATION: Record<CardElevation, string> = {
  0: 'var(--elev-0)',
  1: 'var(--elev-1)',
  2: 'var(--elev-2)',
  3: 'var(--elev-3)',
};

/** Token-driven surface container with a semantic elevation ramp. */
export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ elevation = 1, flush = false, className, style, ...rest }, ref) => (
    <div
      ref={ref}
      className={cn(
        'bg-surface-raised border border-line rounded-[var(--rad-lg)]',
        'transition-[box-shadow,border-color,background-color] duration-[var(--dur-base)]',
        !flush && 'p-[var(--space-5)]',
        className,
      )}
      style={{ boxShadow: ELEVATION[elevation], ...style }}
      {...rest}
    />
  ),
);
Card.displayName = 'Card';
