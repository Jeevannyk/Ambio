import React, { useRef } from 'react';
import { useAudioReactive } from '../../hooks/useAudioAnalyzer';
import './audio.css';

/*
 * Frequency bars driven by the shared reactor. Each bar maps to a bucket of
 * the (real or simulated) frequencyData and is updated via a ref every frame —
 * no React state, no re-renders. Bars settle to a small baseline when audio is
 * paused/stopped (the reactor decays to zero).
 */
function AudioVisualizer({ bars = 3, className = '', color }) {
  const refs = useRef([]);

  useAudioReactive((r) => {
    const fd = r.frequencyData;
    for (let i = 0; i < bars; i++) {
      const el = refs.current[i];
      if (!el) continue;
      const idx = Math.floor(((i + 0.5) / bars) * fd.length);
      const v = fd[idx] / 255;
      el.style.transform = `scaleY(${(0.12 + v * 0.88).toFixed(3)})`;
    }
  });

  return (
    <span
      className={'av' + (className ? ' ' + className : '')}
      style={color ? { color } : undefined}
      aria-hidden="true"
    >
      {Array.from({ length: bars }).map((_, i) => (
        <i key={i} ref={(el) => (refs.current[i] = el)} />
      ))}
    </span>
  );
}

export default AudioVisualizer;
