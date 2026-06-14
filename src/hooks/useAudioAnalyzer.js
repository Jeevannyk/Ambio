import { useEffect, useRef, useState } from 'react';
import { audioReactor } from '../audio/audioReactor';

/*
 * Subscribe a per-frame callback to the shared reactor. The callback receives
 * the reactor ({ volume, bass, mids, highs, frequencyData, status }). Do your
 * DOM updates via refs inside it — this path NEVER triggers a React re-render,
 * keeping visualizers at 60fps. The subscription is stable; a ref forwards the
 * latest callback so changing closures don't re-subscribe.
 */
export function useAudioReactive(onFrame) {
  const ref = useRef(onFrame);
  ref.current = onFrame;
  useEffect(() => audioReactor.subscribe((r) => ref.current(r)), []);
}

/*
 * React-facing analyzer for the rare case you need values during render.
 * isPlaying is low-frequency state (safe to render on); the continuous values
 * stay in `data` (a live ref to the reactor) so reading them never forces a
 * re-render. Shape matches the documented analyzer contract.
 */
export function useAudioAnalyzer() {
  const [isPlaying, setIsPlaying] = useState(audioReactor.isPlaying);
  const data = useRef(audioReactor);
  useEffect(() => {
    let last = audioReactor.isPlaying;
    return audioReactor.subscribe((r) => {
      if (r.isPlaying !== last) {
        last = r.isPlaying;
        setIsPlaying(r.isPlaying);
      }
    });
  }, []);
  return {
    isPlaying,
    data, // data.current.{ volume, bass, mids, highs, frequencyData }
    subscribe: audioReactor.subscribe.bind(audioReactor),
  };
}
