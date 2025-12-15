/**
 * TickerTape Component - Horizontal Scrolling Mode
 *
 * CRITICAL REQUIREMENTS:
 * - Current character is FIXED at horizontal center (50%)
 * - Entire text strip slides from right to left as user types
 * - Use CSS transform: translateX() with transition: transform 100ms linear
 * - If user types faster than transition speed (>100 WPM), dynamically shorten transition
 * - No React re-renders on every keystroke for entire document
 */

import { useState, useEffect, useRef } from 'react';

export function TickerTape({ text, currentIndex, characterStates }) {
  const containerRef = useRef(null);
  const [charWidth, setCharWidth] = useState(20); // Estimated character width in px

  // Calculate character width on mount
  useEffect(() => {
    if (containerRef.current) {
      const span = document.createElement('span');
      span.style.visibility = 'hidden';
      span.style.position = 'absolute';
      span.style.fontSize = '2rem';
      span.style.fontFamily = 'monospace';
      span.textContent = 'M'; // Use 'M' for measurement (widest character)
      document.body.appendChild(span);
      const width = span.offsetWidth;
      document.body.removeChild(span);
      setCharWidth(width);
    }
  }, []);

  // Calculate translateX offset to keep current character centered
  const translateX = -currentIndex * charWidth + (window.innerWidth / 2) - (charWidth / 2);

  return (
    <div className="ticker-tape-wrapper h-32 overflow-hidden relative">
      <div
        ref={containerRef}
        className="ticker-tape-container absolute whitespace-nowrap"
        style={{
          transform: `translateX(${translateX}px)`,
          fontSize: '2rem',
          fontFamily: 'monospace',
          letterSpacing: '0.1em',
        }}
      >
        {text.split('').map((char, index) => {
          const state = characterStates[index] || 'pending';
          const isCurrent = index === currentIndex;

          return (
            <span
              key={index}
              className={`
                character-${state}
                ${isCurrent ? 'character-current' : ''}
              `}
            >
              {char === ' ' ? '\u00A0' : char}
            </span>
          );
        })}
      </div>
    </div>
  );
}
