import { useEffect, RefObject } from 'react';

interface UseSwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
}

export function useSwipe(
  ref: RefObject<HTMLElement | null>,
  { onSwipeLeft, onSwipeRight, threshold = 50 }: UseSwipeOptions
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let startX = 0;
    let startY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const deltaX = endX - startX;
      const deltaY = endY - startY;

      // Ignore vertical swipes
      if (Math.abs(deltaY) > Math.abs(deltaX)) return;

      if (deltaX < -threshold && onSwipeLeft) {
        onSwipeLeft();
      } else if (deltaX > threshold && onSwipeRight) {
        onSwipeRight();
      }
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [ref, onSwipeLeft, onSwipeRight, threshold]);
}
