import React from 'react';
import './audio.css';

/*
 * Soft glow layer that scales with overall volume via the shared --a-volume
 * CSS variable (set by audioReactor every frame). Pure CSS — no per-frame JS
 * here. Use as a wrapper (with children) or as an absolutely-positioned bloom
 * (no children) behind content.
 */
function AudioReactiveGlow({ children, className = '', ...rest }) {
  return (
    <div className={'arg' + (className ? ' ' + className : '')} {...rest}>
      {children}
    </div>
  );
}

export default AudioReactiveGlow;
