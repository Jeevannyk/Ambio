import { useState, useEffect } from 'react';

/*
 * Who Speaker view should follow, held steady.
 *
 * LiveKit's ActiveSpeakersChanged reports who is audible RIGHT NOW, loudest
 * first, so the list empties out on every pause between words — which is most
 * of a real conversation. Reading the main tile straight off it meant the view
 * snapped back to the first tile (always yourself) the instant anyone drew
 * breath, then away again on the next syllable. That was the "speaker view
 * isn't working" flicker.
 *
 * Two rules fix it:
 *   1. Silence is not information. An empty list leaves the floor with whoever
 *      last held it, so pauses change nothing at all.
 *   2. A new voice only takes the main tile after holding the floor for `dwell`
 *      ms. Two people talking over each other keep restarting that countdown,
 *      so the view stays put until one of them actually has the floor, and a
 *      cough or an "mhm" is long over before it elapses.
 *
 * A short sound still wins if the room then stays quiet for the whole dwell —
 * but by then it genuinely was the last thing said, and there is nothing else
 * to show.
 *
 * Returns the held speaker's tile id ('me', or a participant identity), or null
 * until somebody speaks. It never invents a speaker: what to show before anyone
 * has, or when the held speaker has since left, is the caller's decision.
 */
export function useActiveSpeaker(speakingIds, dwell = 1500) {
  const [floorId, setFloorId] = useState(null); // last voice heard
  const [activeId, setActiveId] = useState(null); // voice promoted to the main tile

  // speakingIds is a fresh array on every event, so this runs constantly.
  // Re-setting the same id is a no-op, which is the point: floorId only changes
  // identity when the voice does, so the dwell below isn't restarted by someone
  // simply continuing to talk.
  useEffect(() => {
    const loudest = speakingIds[0];
    if (loudest) setFloorId(loudest);
  }, [speakingIds]);

  useEffect(() => {
    if (!floorId || floorId === activeId) return;
    const timer = setTimeout(() => setActiveId(floorId), dwell);
    return () => clearTimeout(timer);
  }, [floorId, activeId, dwell]);

  return activeId;
}
