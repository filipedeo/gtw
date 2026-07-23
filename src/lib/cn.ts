import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge className values and resolve conflicting Tailwind utilities.
 *
 * clsx normalizes conditional/falsy/array/object inputs; tailwind-merge then
 * dedupes conflicting utilities so the last one wins (e.g. combining a base
 * `hidden sm:flex` with an override `flex` resolves to a single coherent set
 * instead of leaving both `hidden` and `flex` fighting on the same element).
 */
export function cn(...values: ClassValue[]): string {
  return twMerge(clsx(values));
}
