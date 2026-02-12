import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSwipe } from '../hooks/useSwipe';

function createTouchEvent(type: string, clientX: number, clientY: number) {
  return new TouchEvent(type, {
    bubbles: true,
    [type === 'touchstart' ? 'touches' : 'changedTouches']: [
      { clientX, clientY, identifier: 0, target: document.body } as unknown as Touch,
    ],
  });
}

function createMockRef(el: HTMLElement) {
  return { current: el };
}

describe('useSwipe', () => {
  it('fires onSwipeLeft for left swipe beyond threshold', () => {
    const onSwipeLeft = vi.fn();
    const el = document.createElement('div');

    renderHook(() => useSwipe(createMockRef(el), { onSwipeLeft, threshold: 50 }));

    el.dispatchEvent(createTouchEvent('touchstart', 200, 100));
    el.dispatchEvent(createTouchEvent('touchend', 100, 105));

    expect(onSwipeLeft).toHaveBeenCalledTimes(1);
  });

  it('fires onSwipeRight for right swipe beyond threshold', () => {
    const onSwipeRight = vi.fn();
    const el = document.createElement('div');

    renderHook(() => useSwipe(createMockRef(el), { onSwipeRight, threshold: 50 }));

    el.dispatchEvent(createTouchEvent('touchstart', 100, 100));
    el.dispatchEvent(createTouchEvent('touchend', 200, 105));

    expect(onSwipeRight).toHaveBeenCalledTimes(1);
  });

  it('ignores swipes below threshold', () => {
    const onSwipeLeft = vi.fn();
    const onSwipeRight = vi.fn();
    const el = document.createElement('div');

    renderHook(() => useSwipe(createMockRef(el), { onSwipeLeft, onSwipeRight, threshold: 50 }));

    el.dispatchEvent(createTouchEvent('touchstart', 100, 100));
    el.dispatchEvent(createTouchEvent('touchend', 130, 100));

    expect(onSwipeLeft).not.toHaveBeenCalled();
    expect(onSwipeRight).not.toHaveBeenCalled();
  });

  it('ignores vertical swipes', () => {
    const onSwipeLeft = vi.fn();
    const el = document.createElement('div');

    renderHook(() => useSwipe(createMockRef(el), { onSwipeLeft, threshold: 50 }));

    // Mostly vertical movement
    el.dispatchEvent(createTouchEvent('touchstart', 100, 100));
    el.dispatchEvent(createTouchEvent('touchend', 40, 300));

    expect(onSwipeLeft).not.toHaveBeenCalled();
  });

  it('cleans up listeners on unmount', () => {
    const el = document.createElement('div');
    const removeSpy = vi.spyOn(el, 'removeEventListener');

    const { unmount } = renderHook(() =>
      useSwipe(createMockRef(el), { onSwipeLeft: vi.fn() })
    );

    unmount();

    const removedTypes = removeSpy.mock.calls.map((c) => c[0]);
    expect(removedTypes).toContain('touchstart');
    expect(removedTypes).toContain('touchend');
  });
});
