import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBreakpoint } from '../hooks/useBreakpoint';

type ChangeHandler = (e: { matches: boolean }) => void;

function createMockMatchMedia(tabletMatch: boolean, desktopMatch: boolean) {
  const listeners: Record<string, ChangeHandler[]> = {};

  return {
    mock: vi.fn().mockImplementation((query: string) => {
      const key = query;
      if (!listeners[key]) listeners[key] = [];
      return {
        matches: query === '(min-width: 768px)' ? tabletMatch : desktopMatch,
        media: query,
        onchange: null,
        addEventListener: vi.fn((_event: string, handler: ChangeHandler) => {
          listeners[key].push(handler);
        }),
        removeEventListener: vi.fn((_event: string, handler: ChangeHandler) => {
          const idx = listeners[key].indexOf(handler);
          if (idx >= 0) listeners[key].splice(idx, 1);
        }),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };
    }),
    listeners,
  };
}

describe('useBreakpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns isMobile: true when viewport < 768px', () => {
    const { mock } = createMockMatchMedia(false, false);
    Object.defineProperty(window, 'matchMedia', { writable: true, value: mock });

    const { result } = renderHook(() => useBreakpoint());
    expect(result.current.isMobile).toBe(true);
    expect(result.current.isTablet).toBe(false);
    expect(result.current.isDesktop).toBe(false);
  });

  it('returns isTablet: true when 768–1023px', () => {
    const { mock } = createMockMatchMedia(true, false);
    Object.defineProperty(window, 'matchMedia', { writable: true, value: mock });

    const { result } = renderHook(() => useBreakpoint());
    expect(result.current.isMobile).toBe(false);
    expect(result.current.isTablet).toBe(true);
    expect(result.current.isDesktop).toBe(false);
  });

  it('returns isDesktop: true when >= 1024px', () => {
    const { mock } = createMockMatchMedia(true, true);
    Object.defineProperty(window, 'matchMedia', { writable: true, value: mock });

    const { result } = renderHook(() => useBreakpoint());
    expect(result.current.isMobile).toBe(false);
    expect(result.current.isTablet).toBe(false);
    expect(result.current.isDesktop).toBe(true);
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

    // Should have removed listeners for both tablet and desktop queries
    expect(removeListenerCalls).toHaveLength(2);
  });
});
