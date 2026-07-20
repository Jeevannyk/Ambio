import React from 'react';
import './audio.css';

/*
 * Neon border overlay whose glow reacts to audio energy (driven by the shared
 * --a-volume CSS variable). Absolutely fills its positioned parent, sits behind
 * the floating bars, and ignores pointer events. When music is paused the
 * variable decays to ~0 and the border returns to a calm idle glow.
 */
function AudioReactiveBorder({ className = '' }) {
  return <div className={'arb' + (className ? ' ' + className : '')} aria-hidden="true" />;
}

export default AudioReactiveBorder;
