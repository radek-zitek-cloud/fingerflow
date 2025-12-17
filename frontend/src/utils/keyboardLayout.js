/**
 * Shared Keyboard Layout Data
 *
 * ANSI keyboard layout used across all analysis components.
 * This ensures consistency and prevents duplication.
 */

// Complete ANSI keyboard layout (5 rows)
export const keyboardLayout = [
  // Number row with Backspace
  [
    { code: 'Backquote', width: 1 },
    { code: 'Digit1', width: 1 },
    { code: 'Digit2', width: 1 },
    { code: 'Digit3', width: 1 },
    { code: 'Digit4', width: 1 },
    { code: 'Digit5', width: 1 },
    { code: 'Digit6', width: 1 },
    { code: 'Digit7', width: 1 },
    { code: 'Digit8', width: 1 },
    { code: 'Digit9', width: 1 },
    { code: 'Digit0', width: 1 },
    { code: 'Minus', width: 1 },
    { code: 'Equal', width: 1 },
    { code: 'Backspace', width: 2 },
  ],
  // Tab + QWERTY row
  [
    { code: 'Tab', width: 1.5 },
    { code: 'KeyQ', width: 1 },
    { code: 'KeyW', width: 1 },
    { code: 'KeyE', width: 1 },
    { code: 'KeyR', width: 1 },
    { code: 'KeyT', width: 1 },
    { code: 'KeyY', width: 1 },
    { code: 'KeyU', width: 1 },
    { code: 'KeyI', width: 1 },
    { code: 'KeyO', width: 1 },
    { code: 'KeyP', width: 1 },
    { code: 'BracketLeft', width: 1 },
    { code: 'BracketRight', width: 1 },
    { code: 'Backslash', width: 1.5 },
  ],
  // Caps Lock + ASDF row
  [
    { code: 'CapsLock', width: 1.75 },
    { code: 'KeyA', width: 1 },
    { code: 'KeyS', width: 1 },
    { code: 'KeyD', width: 1 },
    { code: 'KeyF', width: 1 },
    { code: 'KeyG', width: 1 },
    { code: 'KeyH', width: 1 },
    { code: 'KeyJ', width: 1 },
    { code: 'KeyK', width: 1 },
    { code: 'KeyL', width: 1 },
    { code: 'Semicolon', width: 1 },
    { code: 'Quote', width: 1 },
    { code: 'Enter', width: 2.25 },
  ],
  // Shift + ZXCV row
  [
    { code: 'ShiftLeft', width: 2.25 },
    { code: 'KeyZ', width: 1 },
    { code: 'KeyX', width: 1 },
    { code: 'KeyC', width: 1 },
    { code: 'KeyV', width: 1 },
    { code: 'KeyB', width: 1 },
    { code: 'KeyN', width: 1 },
    { code: 'KeyM', width: 1 },
    { code: 'Comma', width: 1 },
    { code: 'Period', width: 1 },
    { code: 'Slash', width: 1 },
    { code: 'ShiftRight', width: 2.75 },
  ],
  // Bottom row (modifiers and space)
  [
    { code: 'ControlLeft', width: 1.25 },
    { code: 'MetaLeft', width: 1.25 },
    { code: 'AltLeft', width: 1.25 },
    { code: 'Space', width: 6.25 },
    { code: 'AltRight', width: 1.25 },
    { code: 'MetaRight', width: 1.25 },
    { code: 'ContextMenu', width: 1.25 },
    { code: 'ControlRight', width: 1.25 },
  ],
];

// Human-readable labels for key codes
export const keyLabels = {
  // Numbers and symbols
  'Backquote': '`',
  'Digit1': '1',
  'Digit2': '2',
  'Digit3': '3',
  'Digit4': '4',
  'Digit5': '5',
  'Digit6': '6',
  'Digit7': '7',
  'Digit8': '8',
  'Digit9': '9',
  'Digit0': '0',
  'Minus': '-',
  'Equal': '=',
  'BracketLeft': '[',
  'BracketRight': ']',
  'Backslash': '\\',
  'Semicolon': ';',
  'Quote': "'",
  'Comma': ',',
  'Period': '.',
  'Slash': '/',
  // Modifiers and special keys
  'Space': 'Space',
  'Backspace': 'Backspace',
  'Tab': 'Tab',
  'CapsLock': 'Caps',
  'Enter': 'Enter',
  'ShiftLeft': 'Shift',
  'ShiftRight': 'Shift',
  'ControlLeft': 'Ctrl',
  'ControlRight': 'Ctrl',
  'AltLeft': 'Alt',
  'AltRight': 'Alt',
  'MetaLeft': 'Win',
  'MetaRight': 'Win',
  'ContextMenu': 'Menu',
};

// Finger layout for hand visualization
export const leftHand = [
  { finger: 'L_PINKY', label: 'Pinky', row: 1 },
  { finger: 'L_RING', label: 'Ring', row: 0 },
  { finger: 'L_MIDDLE', label: 'Middle', row: 0 },
  { finger: 'L_INDEX', label: 'Index', row: 1 },
  { finger: 'L_THUMB', label: 'Thumb', row: 2 },
];

export const rightHand = [
  { finger: 'R_THUMB', label: 'Thumb', row: 2 },
  { finger: 'R_INDEX', label: 'Index', row: 1 },
  { finger: 'R_MIDDLE', label: 'Middle', row: 0 },
  { finger: 'R_RING', label: 'Ring', row: 0 },
  { finger: 'R_PINKY', label: 'Pinky', row: 1 },
];
