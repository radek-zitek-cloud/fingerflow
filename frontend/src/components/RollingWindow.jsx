/**
 * RollingWindow Component - Vertical Scrolling Mode
 *
 * CRITICAL REQUIREMENTS:
 * - Active line is FIXED at vertical center
 * - Entire text block slides upward when line completes
 * - Use CSS transform: translateY() with cubic-bezier easing
 * - Previous/future lines at 50% opacity, active line at 100%
 * - Smooth "typewriter return" feel
 */

import { useState, useEffect, useMemo, useRef } from 'react';

export function RollingWindow({ text, currentIndex, characterStates }) {
  const wrapperRef = useRef(null);
  const [charsPerLine, setCharsPerLine] = useState(40); // Dynamic based on container

  // Measure container and calculate characters per line
  useEffect(() => {
    const measureContainer = () => {
      if (!wrapperRef.current) return;

      // Measure character width with the actual font settings
      const span = document.createElement('span');
      span.style.visibility = 'hidden';
      span.style.position = 'absolute';
      span.style.fontSize = '2.25rem'; // text-4xl
      span.style.fontFamily = 'monospace';
      span.style.letterSpacing = '0.05em';
      span.textContent = 'M';
      document.body.appendChild(span);
      const charWidth = span.offsetWidth;
      document.body.removeChild(span);

      // Get container width and calculate how many characters fit
      const containerWidth = wrapperRef.current.offsetWidth;
      const padding = 32; // Account for some padding
      const availableWidth = containerWidth - padding;
      const calculatedChars = Math.floor(availableWidth / charWidth);

      setCharsPerLine(Math.max(20, calculatedChars)); // Minimum 20 chars
    };

    measureContainer();

    // Recalculate on window resize
    window.addEventListener('resize', measureContainer);
    return () => window.removeEventListener('resize', measureContainer);
  }, []);

  // Split text into lines based on measured container width
  const lines = useMemo(() => {
    const words = text.split(' ');
    const result = [];
    let currentLine = '';

    words.forEach(word => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;

      if (testLine.length > charsPerLine && currentLine) {
        result.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });

    if (currentLine) {
      result.push(currentLine);
    }

    return result;
  }, [text, charsPerLine]);

  // Calculate which line the current index is on
  const getCurrentLineIndex = () => {
    let charCount = 0;
    for (let i = 0; i < lines.length; i++) {
      charCount += lines[i].length + 1; // +1 for space between lines
      if (currentIndex < charCount) {
        return i;
      }
    }
    return lines.length - 1;
  };

  const currentLineIndex = getCurrentLineIndex();

  // Calculate translateY to keep current line centered
  const lineHeight = 60; // px
  const visibleLines = 5;
  const centerOffset = Math.floor(visibleLines / 2);
  const translateY = -currentLineIndex * lineHeight + centerOffset * lineHeight;

  // Get character index within current line
  const getCharIndexInLine = (lineIndex) => {
    let charCount = 0;
    for (let i = 0; i < lineIndex; i++) {
      charCount += lines[i].length + 1;
    }
    return charCount;
  };

  return (
    <div
      ref={wrapperRef}
      className="rolling-window-wrapper overflow-hidden relative"
      style={{ height: `${visibleLines * lineHeight}px` }}
    >
      <div
        className="rolling-window-container"
        style={{
          transform: `translateY(${translateY}px)`,
          transition: 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {lines.map((line, lineIndex) => {
          const isActive = lineIndex === currentLineIndex;
          const lineStartIndex = getCharIndexInLine(lineIndex);

          return (
            <div
              key={lineIndex}
              className={`text-4xl font-mono ${isActive ? 'line-active' : 'line-inactive'}`}
              style={{
                height: `${lineHeight}px`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                letterSpacing: '0.05em',
                maxWidth: '100%',
                overflow: 'hidden',
              }}
            >
              {line.split('').map((char, charIndexInLine) => {
                const absoluteIndex = lineStartIndex + charIndexInLine;
                const state = characterStates[absoluteIndex] || 'pending';
                const isCurrent = absoluteIndex === currentIndex;

                return (
                  <span
                    key={charIndexInLine}
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
          );
        })}
      </div>
    </div>
  );
}
