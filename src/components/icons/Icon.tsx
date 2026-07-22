import React from 'react';

export interface IconProps extends Omit<React.SVGProps<SVGSVGElement>, 'children'> {
  /** Pixel size for both width & height. Defaults to 24 (--icon-lg). */
  size?: number | string;
  /**
   * Accessible label. When provided, the icon is exposed to assistive tech as
   * an image; otherwise it is treated as decorative (aria-hidden).
   */
  title?: string;
}

/**
 * Base stroke-icon — Lucide-style: 24×24 viewBox, 2px round strokes,
 * stroke=currentColor so the icon inherits text colour. Individual icons in
 * ./index.tsx supply the paths as children.
 */
export const Icon: React.FC<IconProps & { children: React.ReactNode }> = ({
  size = 24,
  title,
  children,
  ...rest
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    role={title ? 'img' : undefined}
    aria-label={title}
    aria-hidden={title ? undefined : true}
    focusable="false"
    {...rest}
  >
    {children}
  </svg>
);
