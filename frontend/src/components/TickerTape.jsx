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
  const wrapperRef = useRef(null);
  const [charWidth, setCharWidth] = useState(20); // Character width including letter spacing
  const [containerWidth, setContainerWidth] = useState(1024);

  // Measure both character width and container width
  useEffect(() => {
    const measureDimensions = () => {
      // Measure character width with letter spacing
      const span = document.createElement('span');
      span.style.visibility = 'hidden';
      span.style.position = 'absolute';
      span.style.fontSize = '2rem';
      span.style.fontFamily = 'monospace';
      span.style.letterSpacing = '0.1em';
      span.textContent = 'M';
      document.body.appendChild(span);
      const width = span.offsetWidth;
      document.body.removeChild(span);
      setCharWidth(width);

      // Measure actual container width
      if (wrapperRef.current) {
        setContainerWidth(wrapperRef.current.offsetWidth);
      }
    };

    measureDimensions();
  }, []);

  // Handle window resize to recalculate dimensions
  useEffect(() => {
    const handleResize = () => {
      if (wrapperRef.current) {
        setContainerWidth(wrapperRef.current.offsetWidth);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate translateX offset to keep current character centered
  // Formula: move left by (currentIndex * charWidth), then shift right to center of container
  const translateX = -currentIndex * charWidth + (containerWidth / 2) - (charWidth / 2);

  return (
    <div ref={wrapperRef} className="ticker-tape-wrapper h-32 overflow-hidden relative flex items-center">
      <div
        ref={containerRef}
        className="ticker-tape-container absolute whitespace-nowrap"
        style={{
          left: 0,
          top: '50%',
          transform: `translate(${translateX}px, -50%)`,
          fontSize: '2rem',
          fontFamily: 'monospace',
          letterSpacing: '0.1em',
          transition: 'transform 150ms linear',
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
