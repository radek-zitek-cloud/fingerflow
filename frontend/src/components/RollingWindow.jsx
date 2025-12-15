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

import { useState, useEffect, useMemo } from 'react';

export function RollingWindow({ text, currentIndex, characterStates, lineLength = 60 }) {
  // Split text into lines
  const lines = useMemo(() => {
    const words = text.split(' ');
    const result = [];
    let currentLine = '';

    words.forEach(word => {
      if ((currentLine + word).length > lineLength) {
        result.push(currentLine.trim());
        currentLine = word + ' ';
      } else {
        currentLine += word + ' ';
      }
    });

    if (currentLine.trim()) {
      result.push(currentLine.trim());
    }

    return result;
  }, [text, lineLength]);

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
      className="rolling-window-wrapper overflow-hidden relative"
      style={{ height: `${visibleLines * lineHeight}px` }}
    >
      <div
        className="rolling-window-container"
        style={{
          transform: `translateY(${translateY}px)`,
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
