import { useState, useEffect, useRef, useCallback } from 'react';

/*
 * Auto-hide controls after a period of inactivity (Zoom / YouTube fullscreen
 * style). Any mouse move, click, key press, or touch reveals them again and
 * resets the timer. Hovering a bound element (a control bar) pins them open.
 *
 * Performance: a ref mirrors the visible flag so pointer movement only calls
 * setState when visibility actually flips — moving the mouse never triggers a
 * re-render on its own, just a cheap timer reset.
 *
 * Returns:
 *   visible   — boolean, whether controls should be shown
 *   bindHover — spread onto each bar to pin it open while hovered
 */
export function useAutoHideControls(timeout = 3000) {
  const [visible, setVisible] = useState(true);
  const visibleRef = useRef(true);
  const hoveringRef = useRef(false);
  const timerRef = useRef(null);

  const setVis = useCallback((v) => {
    if (visibleRef.current !== v) {
      visibleRef.current = v;
      setVisible(v);
    }
  }, []);

  const scheduleHide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (hoveringRef.current) return; // never hide while a bar is hovered
    timerRef.current = setTimeout(() => setVis(false), timeout);
  }, [timeout, setVis]);

  // Reveal + restart the countdown. Cheap on every mousemove (no setState
  // unless we were hidden).
  const reveal = useCallback(() => {
    setVis(true);
    scheduleHide();
  }, [setVis, scheduleHide]);

  useEffect(() => {
    const events = ['mousemove', 'click', 'keydown', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, reveal, { passive: true }));
    scheduleHide(); // start hidden-countdown on mount
    return () => {
      events.forEach((e) => window.removeEventListener(e, reveal));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [reveal, scheduleHide]);

  const bindHover = {
    onMouseEnter: () => {
      hoveringRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      setVis(true);
    },
    onMouseLeave: () => {
      hoveringRef.current = false;
      scheduleHide();
    },
  };

  return { visible, bindHover };
}
