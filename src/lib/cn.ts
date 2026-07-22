/**
 * Tiny className joiner (no dependency). Filters out falsy values and joins the
 * rest with a single space. Keeps the shared UI primitives free of a clsx dep.
 */
export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}
