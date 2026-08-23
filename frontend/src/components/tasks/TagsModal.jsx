import React, { useEffect, useRef, useState } from 'react';
import { Check, Plus } from '@phosphor-icons/react';
import { hueFor, normalizeTag, tagKey } from '../../lib/tags';

/*
 * Multi-select tag picker. Save commits the chosen tag names; backdrop or
 * Cancel discards. The row at the bottom of the list coins a new tag — a name
 * that already exists in any casing selects that tag instead of duplicating it.
 * Stays mounted while closed so it can transition out (see .rm-overlay[hidden]).
 */
function TagsModal({ tags, selected = [], open, origin, onCreate, onSave, onCancel }) {
  const [picked, setPicked] = useState(() => new Set(selected));
  const [draft, setDraft] = useState('');
  const [flash, setFlash] = useState(null); // row a duplicate name merged into

  const modalRef = useRef(null);
  const inputRef = useRef(null);

  // Selection is keyed case-insensitively too, so a task tagged 'family' reads
  // as picked on the 'Family' row instead of ending up with both spellings.
  const pickedKeys = new Set([...picked].map(tagKey));
  const without = (set, name) => new Set([...set].filter((p) => tagKey(p) !== tagKey(name)));
  const toggle = (name) =>
    setPicked((prev) => {
      const next = without(prev, name);
      return next.size === prev.size ? next.add(name) : next; // nothing dropped ⇒ wasn't picked
    });
  const pick = (name) => setPicked((prev) => without(prev, name).add(name));

  const commit = (e) => {
    e.preventDefault();
    const name = normalizeTag(draft);
    if (!name) return;
    const existing = tags.find((t) => tagKey(t) === tagKey(name));
    if (existing) {
      // A taken name is a merge, not an error — the user's intent is satisfied
      // either way, so just select the row and point at it.
      pick(existing);
      setFlash(existing);
      modalRef.current?.querySelector(`[data-tag="${CSS.escape(existing)}"]`)?.scrollIntoView({ block: 'nearest' });
    } else {
      onCreate(name);
      pick(name); // coining a tag from a task is stated intent to apply it
    }
    setDraft('');
    inputRef.current?.focus(); // stay put so a second tag can follow
  };

  useEffect(() => {
    if (!flash) return;
    const id = setTimeout(() => setFlash(null), 600);
    return () => clearTimeout(id);
  }, [flash]);

  // ---- focus: first control on open, Tab trapped inside.
  const focusables = () =>
    [...(modalRef.current?.querySelectorAll(
      'button:not([disabled]):not([tabindex="-1"]), input:not([disabled]), [tabindex="0"]'
    ) || [])].filter((el) => el.offsetParent !== null);

  useEffect(() => {
    if (open) focusables()[0]?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      // A half-typed tag is worth an Escape of its own. Letting this one bubble
      // would also hit TasksPage's document handler, closing the modal and
      // discarding every toggle made so far.
      if (draft) {
        e.stopPropagation();
        setDraft('');
        return;
      }
      return onCancel();
    }
    if (e.key !== 'Tab') return;
    const els = focusables();
    if (!els.length) return;
    const [first, last] = [els[0], els[els.length - 1]];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="rm-overlay" hidden={!open} onClick={onCancel}>
      <div
        className="rm-modal"
        style={origin ? { '--rm-ox': `${origin.x}px`, '--rm-oy': `${origin.y}px` } : undefined}
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
        role="dialog"
        aria-modal="true"
        aria-label="Tags"
      >
        <div className="rm-head">Tags</div>
        <div className="tg-body">
          {tags.map((t) => {
            const on = pickedKeys.has(tagKey(t));
            return (
              <button
                key={t}
                type="button"
                data-tag={t}
                className={'tg-row' + (on ? ' tg-row--on' : '') + (flash === t ? ' tg-row--flash' : '')}
                style={{ '--tg-h': hueFor(t) }}
                aria-pressed={on}
                onClick={() => toggle(t)}
              >
                <span className="tg-box">{on && <Check size={12} />}</span>
                <span className="tg-dot" />
                <span className="tg-name">{t}</span>
              </button>
            );
          })}
          <form className="tg-new" onSubmit={commit}>
            <Plus size={14} />
            <input
              ref={inputRef}
              value={draft}
              maxLength={24}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="New tag…"
              aria-label="New tag"
            />
          </form>
        </div>
        <div className="rm-foot">
          <button type="button" className="rm-cancel" onClick={onCancel}>Cancel</button>
          <span className="rm-foot-div" />
          <button type="button" className="rm-set" onClick={() => onSave([...picked])}>Save</button>
        </div>
      </div>
    </div>
  );
}

export default TagsModal;
