import React, { useMemo } from 'react';
import './FlowDial.css';

// Geometry of the semicircular dial (matches the viewBox below).
const CX = 200;
const CY = 200;
const R = 170;
const ARC = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`;

// Tick marks fanned around the top half of the dial.
const TICKS = Array.from({ length: 61 }, (_, i) => {
  const theta = Math.PI - (i / 60) * Math.PI; // left → right over the top
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const outer = R + 16;
  const inner = R + (i % 5 === 0 ? 4 : 9);
  return {
    x1: CX + cos * outer,
    y1: CY - sin * outer,
    x2: CX + cos * inner,
    y2: CY - sin * inner,
    major: i % 5 === 0,
  };
});

// Glowing semicircular gauge. `progress` is 0..1 (elapsed / total).
function FlowDial({ progress = 0, running = false, label, time }) {
  const ticks = useMemo(() => TICKS, []);
  const dash = Math.max(0, Math.min(1, progress));

  return (
    <div className="flow-gauge">
      <svg className="flow-dial" viewBox="0 0 400 215" preserveAspectRatio="xMidYMax meet">
        <defs>
          <linearGradient id="flowFill" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" style={{ stopColor: 'var(--accent)' }} />
            <stop offset="100%" style={{ stopColor: 'var(--accent-hover)' }} />
          </linearGradient>
        </defs>

        {ticks.map((t, i) => (
          <line
            key={i}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            className={'flow-tick' + (t.major ? ' flow-tick--major' : '')}
          />
        ))}

        <path className="flow-arc-track" d={ARC} pathLength="1" />
        {dash > 0.002 && (
          <path
            className={'flow-arc-fill' + (running ? ' flow-arc-fill--live' : '')}
            d={ARC}
            pathLength="1"
            style={{ strokeDasharray: `${dash} 1` }}
          />
        )}
      </svg>

      <div className="flow-readout">
        <span className="flow-readout-label">{label}</span>
        <span className="flow-readout-time">{time}</span>
      </div>
    </div>
  );
}

export default FlowDial;
