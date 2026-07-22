import React from 'react';
import { cn } from '../../lib/cn';
import { ChevronDownIcon } from '../icons';

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  /** Compact height variant (not the native row-count `size`). */
  size?: 'sm' | 'md';
}

/**
 * Token-driven wrapper around a native <select> (keeps native a11y + keyboard
 * behaviour) with a custom chevron. Pass options as children.
 */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ size = 'md', className, children, ...rest }, ref) => (
    <div className="relative inline-flex items-center w-full">
      <select
        ref={ref}
        className={cn(
          'appearance-none w-full cursor-pointer transition-colors',
          'bg-surface text-fg-strong border border-line rounded-[var(--rad-md)]',
          'pl-3 pr-9 hover:bg-surface-hover',
          size === 'sm'
            ? 'min-h-[var(--target-compact)] text-[length:var(--fs-xs)]'
            : 'min-h-[var(--target-min)] text-[length:var(--fs-sm)]',
          className,
        )}
        {...rest}
      >
        {children}
      </select>
      <ChevronDownIcon
        size={16}
        className="pointer-events-none absolute right-2.5 text-fg-muted"
      />
    </div>
  ),
);
Select.displayName = 'Select';
