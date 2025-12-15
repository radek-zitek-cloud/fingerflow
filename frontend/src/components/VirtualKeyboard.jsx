/**
 * VirtualKeyboard Component
 *
 * Displays a visual representation of the keyboard with:
 * - Highlighted key for the current character
 * - Color-coded fingers (optional)
 * - Key press animation
 */

import { useMemo } from 'react';

// Keyboard layout (simplified QWERTY)
const KEYBOARD_ROWS = [
  ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0'],
  ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP'],
  ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon'],
  ['KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period', 'Slash'],
  ['Space'],
];

// Map key codes to display labels
const KEY_LABELS = {
  Digit1: '1', Digit2: '2', Digit3: '3', Digit4: '4', Digit5: '5',
  Digit6: '6', Digit7: '7', Digit8: '8', Digit9: '9', Digit0: '0',
  KeyQ: 'Q', KeyW: 'W', KeyE: 'E', KeyR: 'R', KeyT: 'T',
  KeyY: 'Y', KeyU: 'U', KeyI: 'I', KeyO: 'O', KeyP: 'P',
  KeyA: 'A', KeyS: 'S', KeyD: 'D', KeyF: 'F', KeyG: 'G',
  KeyH: 'H', KeyJ: 'J', KeyK: 'K', KeyL: 'L', Semicolon: ';',
  KeyZ: 'Z', KeyX: 'X', KeyC: 'C', KeyV: 'V', KeyB: 'B',
  KeyN: 'N', KeyM: 'M', Comma: ',', Period: '.', Slash: '/',
  Space: 'SPACE',
};

// Map key codes to finger positions (for color coding)
const FINGER_COLORS = {
  L_PINKY: '#ff6b9d',
  L_RING: '#c084fc',
  L_MIDDLE: '#60a5fa',
  L_INDEX: '#34d399',
  L_THUMB: '#fbbf24',
  R_THUMB: '#fbbf24',
  R_INDEX: '#34d399',
  R_MIDDLE: '#60a5fa',
  R_RING: '#c084fc',
  R_PINKY: '#ff6b9d',
};

export function VirtualKeyboard({ activeKey, showFingerColors = true }) {
  return (
    <div className="virtual-keyboard p-4 bg-[var(--bg-panel)] rounded-lg">
      {KEYBOARD_ROWS.map((row, rowIndex) => (
        <div
          key={rowIndex}
          className="keyboard-row flex justify-center gap-1 mb-1"
        >
          {row.map((keyCode) => {
            const isActive = activeKey === keyCode;
            const label = KEY_LABELS[keyCode] || keyCode;

            return (
              <div
                key={keyCode}
                className={`
                  keyboard-key
                  ${isActive ? 'key-active' : ''}
                  ${keyCode === 'Space' ? 'flex-grow' : 'w-12'}
                  h-12 flex items-center justify-center
                  rounded border-2
                  transition-all duration-100
                `}
                style={{
                  backgroundColor: isActive ? 'var(--key-active)' : 'var(--key-bg)',
                  borderColor: 'var(--key-border)',
                  color: isActive ? 'white' : 'var(--text-main)',
                  fontWeight: isActive ? '600' : '400',
                }}
              >
                <span className="text-sm">{label}</span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
