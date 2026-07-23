import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBreakpoint } from '../hooks/useBreakpoint';

type ChangeHandler = (e: { matches: boolean }) => void;

describe('useBreakpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('responds to matchMedia change events', () => {
    // Create mutable mql objects so the hook sees updated matches values
    const mqlObjects: Record<string, { matches: boolean; listeners: ChangeHandler[] }> = {};

    const mockMatchMedia = vi.fn().mockImplementation((query: string) => {
      if (!mqlObjects[query]) {
        mqlObjects[query] = { matches: false, listeners: [] };
      }
      const mql = mqlObjects[query];
      return {
        get matches() { return mql.matches; },
        media: query,
        onchange: null,
        addEventListener: vi.fn((_event: string, handler: ChangeHandler) => {
          mql.listeners.push(handler);
        }),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };
    });

    Object.defineProperty(window, 'matchMedia', { writable: true, value: mockMatchMedia });

    const { result } = renderHook(() => useBreakpoint());
    expect(result.current.isMobile).toBe(true);

    // Simulate resize to desktop: update the mql objects and fire listeners
    act(() => {
      for (const key of Object.keys(mqlObjects)) {
        mqlObjects[key].matches = true;
      }
      for (const key of Object.keys(mqlObjects)) {
        for (const handler of mqlObjects[key].listeners) {
          handler({ matches: true });
        }
      }
    });

    expect(result.current.isDesktop).toBe(true);
    expect(result.current.isMobile).toBe(false);
  });

  it('cleans up listeners on unmount', () => {
    const removeListenerCalls: string[] = [];
    const mockMatchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(() => { removeListenerCalls.push(query); }),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    Object.defineProperty(window, 'matchMedia', { writable: true, value: mockMatchMedia });

    const { unmount } = renderHook(() => useBreakpoint());
    unmount();

    // Should have removed listeners for all four min-width queries (640/768/1024/1280)
    expect(removeListenerCalls).toHaveLength(4);
  });

  describe('named tiers', () => {
    // Width-based mock: each (min-width: Npx) query matches when width >= N.
    function createTierMatchMedia(width: number) {
      return vi.fn().mockImplementation((query: string) => {
        const match = query.match(/min-width:\s*(\d+)px/);
        const min = match ? parseInt(match[1], 10) : 0;
        return {
          matches: width >= min,
          media: query,
          onchange: null,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          addListener: vi.fn(),
          removeListener: vi.fn(),
          dispatchEvent: vi.fn(),
        };
      });
    }

    const cases: Array<{
      width: number;
      tier: string;
      isMobile: boolean;
      isTablet: boolean;
      isDesktop: boolean;
    }> = [
      { width: 320, tier: 'xs', isMobile: true, isTablet: false, isDesktop: false },
      { width: 640, tier: 'sm', isMobile: true, isTablet: false, isDesktop: false },
      { width: 768, tier: 'md', isMobile: false, isTablet: true, isDesktop: false },
      { width: 1024, tier: 'lg', isMobile: false, isTablet: false, isDesktop: true },
      { width: 1280, tier: 'xl', isMobile: false, isTablet: false, isDesktop: true },
    ];

    for (const c of cases) {
      it(`returns tier '${c.tier}' at ${c.width}px with matching legacy booleans`, () => {
        Object.defineProperty(window, 'matchMedia', {
          writable: true,
          value: createTierMatchMedia(c.width),
        });

        const { result } = renderHook(() => useBreakpoint());
        expect(result.current.tier).toBe(c.tier);
        expect(result.current.isMobile).toBe(c.isMobile);
        expect(result.current.isTablet).toBe(c.isTablet);
        expect(result.current.isDesktop).toBe(c.isDesktop);
      });
    }
  });
});
