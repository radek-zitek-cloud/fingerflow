/**
 * VirtualKeyboard Component
 *
 * Displays a visual representation of the keyboard with:
 * - Full ANSI Layout (Staggered)
 * - Highlighted key for the current character
 * - Key press animation
 */

import { useMemo } from 'react';

// Full ANSI Keyboard Layout
const KEYBOARD_ROWS = [
  // Row 1
  ['Backquote', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus', 'Equal', 'Backspace'],
  // Row 2
  ['Tab', 'KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'BracketLeft', 'BracketRight', 'Backslash'],
  // Row 3
  ['CapsLock', 'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote', 'Enter'],
  // Row 4
  ['ShiftLeft', 'KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period', 'Slash', 'ShiftRight'],
  // Row 5
  ['ControlLeft', 'AltLeft', 'Space', 'AltRight', 'ContextMenu', 'ControlRight']
];

// Map key codes to display labels
const KEY_LABELS = {
  Backquote: '`', Minus: '-', Equal: '=', Backspace: '⌫',
  Digit1: '1', Digit2: '2', Digit3: '3', Digit4: '4', Digit5: '5',
  Digit6: '6', Digit7: '7', Digit8: '8', Digit9: '9', Digit0: '0',
  Tab: 'Tab', BracketLeft: '[', BracketRight: ']', Backslash: '\\',
  CapsLock: 'Caps', Semicolon: ';', Quote: "'", Enter: 'Enter',
  ShiftLeft: 'Shift', ShiftRight: 'Shift',
  ControlLeft: 'Ctrl', AltLeft: 'Alt',
  Space: '',
  AltRight: 'Alt', ContextMenu: 'Menu', ControlRight: 'Ctrl',
  KeyQ: 'Q', KeyW: 'W', KeyE: 'E', KeyR: 'R', KeyT: 'T',
  KeyY: 'Y', KeyU: 'U', KeyI: 'I', KeyO: 'O', KeyP: 'P',
  KeyA: 'A', KeyS: 'S', KeyD: 'D', KeyF: 'F', KeyG: 'G',
  KeyH: 'H', KeyJ: 'J', KeyK: 'K', KeyL: 'L',
  KeyZ: 'Z', KeyX: 'X', KeyC: 'C', KeyV: 'V', KeyB: 'B',
  KeyN: 'N', KeyM: 'M', Comma: ',', Period: '.', Slash: '/'
};

// Helper to determine key width class
// Standard key is w-12 (3rem)
function getKeyWidth(keyCode) {
  switch (keyCode) {
    case 'Backspace': return 'w-24'; // 2u
    case 'Tab': return 'w-20'; // 1.5u (approx)
    case 'Backslash': return 'w-20'; // 1.5u
    case 'CapsLock': return 'w-24'; // 1.75u (approx)
    case 'Enter': return 'w-28'; // 2.25u (approx)
    case 'ShiftLeft': return 'w-32'; // 2.25u
    case 'ShiftRight': return 'w-32'; // 2.75u (approx)
    case 'ControlLeft':
    case 'MetaLeft':
    case 'AltLeft':
    case 'AltRight':
    case 'MetaRight':
    case 'ContextMenu':
    case 'ControlRight':
      return 'w-16'; // 1.25u
    case 'Space': return 'w-80'; // Approx 6.6 keys wide (20rem / 3rem = 6.66)
    default: return 'w-12'; // 1u
  }
}

// Special styling for modifier keys
function isModifier(keyCode) {
  return [
    'Tab', 'CapsLock', 'ShiftLeft', 'ShiftRight', 'ControlLeft', 'AltLeft',
    'AltRight', 'ContextMenu', 'ControlRight', 'Backspace', 'Enter'
  ].includes(keyCode);
}

export function VirtualKeyboard({ activeKey }) {
  return (
    <div className="virtual-keyboard p-6 glass-panel rounded-2xl shadow-[var(--shadow-lg)] overflow-x-auto">
      <div className="min-w-fit mx-auto">
        {KEYBOARD_ROWS.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className="keyboard-row flex justify-center gap-1.5 mb-1.5"
          >
            {row.map((keyCode) => {
              const isActive = activeKey === keyCode;
              const label = KEY_LABELS[keyCode] || keyCode;
              const widthClass = getKeyWidth(keyCode);
              const isMod = isModifier(keyCode);

              return (
                <div
                  key={keyCode}
                  className={`
                    keyboard-key
                    ${widthClass}
                    ${isActive ? 'key-active scale-95' : 'hover:border-[var(--accent-primary)]'}
                    h-12 flex items-center justify-center
                    rounded-md border
                    transition-all duration-100 shadow-sm
                    select-none
                  `}
                  style={{
                    backgroundColor: isActive ? 'var(--key-active)' : 'var(--key-bg)',
                    borderColor: isActive ? 'transparent' : 'var(--key-border)',
                    color: isActive ? 'white' : (isMod ? 'var(--text-dim)' : 'var(--text-main)'),
                    fontWeight: isActive || isMod ? '600' : '500',
                    fontSize: isMod ? '0.75rem' : '0.9rem',
                    boxShadow: isActive ? 'none' : '0 2px 0 var(--key-border)',
                    transform: isActive ? 'translateY(2px)' : 'none',
                  }}
                >
                  <span className="font-mono">{label}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}