import { useState, useEffect } from 'react';

interface Breakpoint {
  isMobile: boolean;   // < 768px
  isTablet: boolean;   // 768–1023px
  isDesktop: boolean;  // >= 1024px
}

const TABLET_QUERY = '(min-width: 768px)';
const DESKTOP_QUERY = '(min-width: 1024px)';

export function useBreakpoint(): Breakpoint {
  const [state, setState] = useState<Breakpoint>(() => {
    const tablet = window.matchMedia(TABLET_QUERY).matches;
    const desktop = window.matchMedia(DESKTOP_QUERY).matches;
    return { isMobile: !tablet, isTablet: tablet && !desktop, isDesktop: desktop };
  });

  useEffect(() => {
    const tabletMql = window.matchMedia(TABLET_QUERY);
    const desktopMql = window.matchMedia(DESKTOP_QUERY);

    const update = () => {
      const tablet = tabletMql.matches;
      const desktop = desktopMql.matches;
      setState({ isMobile: !tablet, isTablet: tablet && !desktop, isDesktop: desktop });
    };

    tabletMql.addEventListener('change', update);
    desktopMql.addEventListener('change', update);
    return () => {
      tabletMql.removeEventListener('change', update);
      desktopMql.removeEventListener('change', update);
    };
  }, []);

  return state;
}
