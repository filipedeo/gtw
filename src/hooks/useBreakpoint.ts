import { useState, useEffect } from 'react';

/**
 * Named responsive tier (see visual-overhaul plan §2.1):
 * - `xs` 0–639     phone — single column, bottom sheets
 * - `sm` 640–767   large phone / small portrait — single column, roomier
 * - `md` 768–1023  tablet portrait — two-column
 * - `lg` 1024–1279 tablet landscape / small desktop — condensed 3-column
 * - `xl` 1280+     desktop — comfortable 3-column, capped width
 */
export type BreakpointTier = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface Breakpoint {
  /** Named tier for designed per-format layout (xs/sm/md/lg/xl). */
  tier: BreakpointTier;
  /** Legacy: viewport < 768px. Kept for backward compatibility. */
  isMobile: boolean;
  /** Legacy: 768–1023px. Kept for backward compatibility. */
  isTablet: boolean;
  /** Legacy: >= 1024px. Kept for backward compatibility. */
  isDesktop: boolean;
}

const SM_QUERY = '(min-width: 640px)';
const MD_QUERY = '(min-width: 768px)';
const LG_QUERY = '(min-width: 1024px)';
const XL_QUERY = '(min-width: 1280px)';

const QUERIES = [SM_QUERY, MD_QUERY, LG_QUERY, XL_QUERY] as const;

/** Map raw min-width matches to the named tier + legacy booleans. */
function computeBreakpoint(sm: boolean, md: boolean, lg: boolean, xl: boolean): Breakpoint {
  const tier: BreakpointTier = xl ? 'xl' : lg ? 'lg' : md ? 'md' : sm ? 'sm' : 'xs';
  return {
    tier,
    isMobile: !md, // < 768px
    isTablet: md && !lg, // 768–1023px
    isDesktop: lg, // >= 1024px
  };
}

export function useBreakpoint(): Breakpoint {
  const [state, setState] = useState<Breakpoint>(() =>
    computeBreakpoint(
      window.matchMedia(SM_QUERY).matches,
      window.matchMedia(MD_QUERY).matches,
      window.matchMedia(LG_QUERY).matches,
      window.matchMedia(XL_QUERY).matches,
    ),
  );

  useEffect(() => {
    const [smMql, mdMql, lgMql, xlMql] = QUERIES.map((query) => window.matchMedia(query));

    const update = () => {
      setState(computeBreakpoint(smMql.matches, mdMql.matches, lgMql.matches, xlMql.matches));
    };

    smMql.addEventListener('change', update);
    mdMql.addEventListener('change', update);
    lgMql.addEventListener('change', update);
    xlMql.addEventListener('change', update);

    return () => {
      smMql.removeEventListener('change', update);
      mdMql.removeEventListener('change', update);
      lgMql.removeEventListener('change', update);
      xlMql.removeEventListener('change', update);
    };
  }, []);

  return state;
}
