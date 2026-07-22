import React from 'react';
import { cn } from '../../lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Square icon-only button (width tracks the touch target height). */
  iconOnly?: boolean;
}

const BASE =
  'inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap ' +
  'select-none cursor-pointer transition-colors rounded-[var(--rad-md)] ' +
  'disabled:opacity-50 disabled:pointer-events-none';

const SIZES: Record<ButtonSize, string> = {
  sm: 'px-3 min-h-[var(--target-compact)] text-[length:var(--fs-xs)]',
  md: 'px-4 min-h-[var(--target-min)] text-[length:var(--fs-sm)]',
};

const ICON_SIZES: Record<ButtonSize, string> = {
  sm: 'p-0 w-[var(--target-compact)] min-h-[var(--target-compact)]',
  md: 'p-0 w-[var(--target-min)] min-h-[var(--target-min)]',
};

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-on-accent hover:bg-accent-hover active:bg-accent-active',
  secondary: 'bg-surface text-fg-strong border border-line hover:bg-surface-hover',
  ghost: 'bg-transparent text-fg hover:bg-surface-hover',
  danger: 'bg-danger-bg text-danger border border-transparent hover:brightness-95',
};

/** Token-driven button primitive. Focus ring comes from the global :focus-visible. */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', iconOnly = false, className, type, ...rest }, ref) => (
    <button
      ref={ref}
      type={type ?? 'button'}
      className={cn(BASE, iconOnly ? ICON_SIZES[size] : SIZES[size], VARIANTS[variant], className)}
      {...rest}
    />
  ),
);
Button.displayName = 'Button';
