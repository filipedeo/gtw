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
  'select-none cursor-pointer rounded-[var(--rad-md)] ' +
  'transition-[background-color,border-color,color,box-shadow,transform] ' +
  'duration-[var(--dur-fast)] ease-[var(--ease-standard)] active:translate-y-px ' +
  'disabled:opacity-50 disabled:pointer-events-none disabled:active:translate-y-0';

const SIZES: Record<ButtonSize, string> = {
  sm: 'px-3 min-h-[var(--target-compact)] text-[length:var(--fs-xs)]',
  md: 'px-4 min-h-[var(--target-min)] text-[length:var(--fs-sm)]',
};

const ICON_SIZES: Record<ButtonSize, string> = {
  sm: 'p-0 w-[var(--target-compact)] min-h-[var(--target-compact)]',
  md: 'p-0 w-[var(--target-min)] min-h-[var(--target-min)]',
};

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-on-accent shadow-[0_2px_10px_-3px_rgba(110,168,254,0.55)] ' +
    'hover:bg-accent-hover active:bg-accent-active active:shadow-none',
  secondary:
    'bg-surface text-fg-strong border border-line hover:bg-surface-hover hover:border-line-strong',
  ghost: 'bg-transparent text-fg hover:bg-surface-hover hover:text-fg-strong',
  danger: 'bg-danger-bg text-danger border border-transparent hover:brightness-110',
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
