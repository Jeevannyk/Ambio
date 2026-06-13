import React, { useState } from 'react';
import { ArrowLeft, KeyRound } from 'lucide-react';

/*
 * Code gate: every room requires its code to be typed before entering.
 * The code IS the room's connection key (no backend), so typing the right
 * code is what lets you reach the host's peer.
 */
function CodeGate({ roomName, expected, onVerified, onBack }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (code.trim().toUpperCase() === String(expected).trim().toUpperCase()) {
      onVerified();
    } else {
      setError('Incorrect code. Ask the host for the room code.');
    }
  };

  return (
    <div className="prejoin">
      <form className="prejoin-card" onSubmit={submit}>
        <button type="button" className="prejoin-back" onClick={onBack}>
          <ArrowLeft size={16} /> Back to Rooms
        </button>

        <div className="codegate-icon"><KeyRound size={26} /></div>
        <h2 className="prejoin-title">Enter room code</h2>
        <p className="prejoin-sub">“{roomName}” is locked. Type its code to join.</p>

        {error && <p className="prejoin-blocked">{error}</p>}

        <input
          className="prejoin-input prejoin-code"
          placeholder="Room code"
          value={code}
          maxLength={12}
          onChange={(e) => { setCode(e.target.value); setError(''); }}
          autoFocus
        />

        <button className="prejoin-join" type="submit" disabled={!code.trim()}>
          Continue
        </button>
      </form>
    </div>
  );
}

export default CodeGate;
