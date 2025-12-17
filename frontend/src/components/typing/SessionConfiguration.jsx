/**
 * Session Configuration Component
 *
 * Handles all session setup options:
 * - Mode toggle (timed vs word count)
 * - Duration/count presets and custom input
 * - View mode toggle (ticker vs rolling)
 * - Word set selector
 */

export function SessionConfiguration({
  sessionMode,
  setSessionMode,
  timedDuration,
  setTimedDuration,
  wordCount,
  setWordCount,
  customInput,
  setCustomInput,
  viewMode,
  setViewMode,
  selectedWordSetId,
  setSelectedWordSetId,
  wordSets,
  isAuthenticated,
  onManageWordSets,
}) {
  return (
    <div className="mb-12 max-w-4xl mx-auto">
      {/* Mode Toggle and Preset Options */}
      <div className="flex flex-wrap items-center justify-center gap-4 mb-6">
        {/* Mode Toggle */}
        <div className="p-1 rounded-xl glass-panel flex gap-1">
          <button
            onClick={() => setSessionMode('wordcount')}
            className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
              sessionMode === 'wordcount' ? 'bg-[var(--accent-primary)] text-white shadow-sm' : 'hover:bg-[var(--bg-input)]'
            }`}
            style={sessionMode !== 'wordcount' ? { color: 'var(--text-dim)' } : {}}
          >
            Word Count
          </button>
          <button
            onClick={() => setSessionMode('timed')}
            className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
              sessionMode === 'timed' ? 'bg-[var(--accent-primary)] text-white shadow-sm' : 'hover:bg-[var(--bg-input)]'
            }`}
            style={sessionMode !== 'timed' ? { color: 'var(--text-dim)' } : {}}
          >
            Timed
          </button>
        </div>

        {/* Word Count Mode Options */}
        {sessionMode === 'wordcount' && (
          <>
            {[20, 40, 120].map(count => (
              <button
                key={count}
                onClick={() => setWordCount(count)}
                className={`px-5 py-2.5 rounded-lg font-medium transition-all ${
                  wordCount === count ? 'bg-[var(--accent-glow)] border-2 border-[var(--accent-primary)]' : 'glass-panel hover:bg-[var(--bg-input)]'
                }`}
                style={{ color: 'var(--text-main)' }}
              >
                {count}
              </button>
            ))}
            <div className="flex gap-2 items-center">
              <input
                type="number"
                min="1"
                max="500"
                placeholder="..."
                value={sessionMode === 'wordcount' && ![20, 40, 120].includes(wordCount) ? wordCount : customInput}
                onChange={(e) => {
                  const value = e.target.value;
                  setCustomInput(value);
                  // Update wordCount immediately if valid (for spinner arrows)
                  const numValue = parseInt(value);
                  if (!isNaN(numValue) && numValue >= 1 && numValue <= 500) {
                    setWordCount(numValue);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const value = parseInt(customInput);
                    if (value >= 1 && value <= 500) {
                      setWordCount(value);
                      setCustomInput('');
                      e.target.blur();
                    }
                  }
                }}
                onBlur={() => {
                  const value = parseInt(customInput);
                  if (value >= 1 && value <= 500) {
                    setWordCount(value);
                  }
                  setCustomInput('');
                }}
                className="px-3 py-2.5 rounded-lg font-medium w-20 text-center glass-panel"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--key-border)',
                  MozAppearance: 'textfield',
                  WebkitAppearance: 'none',
                  appearance: 'none'
                }}
              />
              <span className="text-sm" style={{ color: 'var(--text-dim)' }}>words</span>
            </div>
          </>
        )}

        {/* Timed Mode Options */}
        {sessionMode === 'timed' && (
          <>
            {[15, 30, 60].map(duration => (
              <button
                key={duration}
                onClick={() => setTimedDuration(duration)}
                className={`px-5 py-2.5 rounded-lg font-medium transition-all ${
                  timedDuration === duration ? 'bg-[var(--accent-glow)] border-2 border-[var(--accent-primary)]' : 'glass-panel hover:bg-[var(--bg-input)]'
                }`}
                style={{ color: 'var(--text-main)' }}
              >
                {duration}s
              </button>
            ))}
            <div className="flex gap-2 items-center">
              <input
                type="number"
                min="1"
                max="300"
                placeholder="..."
                value={sessionMode === 'timed' && ![15, 30, 60].includes(timedDuration) ? timedDuration : customInput}
                onChange={(e) => {
                  const value = e.target.value;
                  setCustomInput(value);
                  // Update timedDuration immediately if valid (for spinner arrows)
                  const numValue = parseInt(value);
                  if (!isNaN(numValue) && numValue >= 1 && numValue <= 300) {
                    setTimedDuration(numValue);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const value = parseInt(customInput);
                    if (value >= 1 && value <= 300) {
                      setTimedDuration(value);
                      setCustomInput('');
                      e.target.blur();
                    }
                  }
                }}
                onBlur={() => {
                  const value = parseInt(customInput);
                  if (value >= 1 && value <= 300) {
                    setTimedDuration(value);
                  }
                  setCustomInput('');
                }}
                className="px-3 py-2.5 rounded-lg font-medium w-20 text-center glass-panel"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--key-border)',
                  MozAppearance: 'textfield',
                  WebkitAppearance: 'none',
                  appearance: 'none'
                }}
              />
              <span className="text-sm" style={{ color: 'var(--text-dim)' }}>seconds</span>
            </div>
          </>
        )}
      </div>

      {/* View Mode and Word Set Selector Row */}
      <div className="flex flex-wrap items-center justify-center gap-6 mb-6">
        {/* View Mode Selector */}
        <div className="p-1 rounded-xl glass-panel flex gap-1">
          <button
            onClick={() => setViewMode('ticker')}
            className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
              viewMode === 'ticker' ? 'bg-[var(--accent-primary)] text-white shadow-sm' : 'hover:bg-[var(--bg-input)]'
            }`}
            style={viewMode !== 'ticker' ? { color: 'var(--text-dim)' } : {}}
          >
            Ticker Tape
          </button>
          <button
            onClick={() => setViewMode('rolling')}
            className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
              viewMode === 'rolling' ? 'bg-[var(--accent-primary)] text-white shadow-sm' : 'hover:bg-[var(--bg-input)]'
            }`}
            style={viewMode !== 'rolling' ? { color: 'var(--text-dim)' } : {}}
          >
            Rolling Window
          </button>
        </div>

        {/* Word Set Selector */}
        {wordSets.length > 0 && (
          <div className="flex items-center gap-2">
            <select
              value={selectedWordSetId || ''}
              onChange={(e) => setSelectedWordSetId(parseInt(e.target.value))}
              className="px-4 py-2.5 rounded-lg font-medium glass-panel"
              style={{
                backgroundColor: 'var(--bg-input)',
                color: 'var(--text-main)',
                border: '2px solid var(--key-border)',
                maxWidth: '250px'
              }}
            >
              {wordSets.map(set => (
                <option key={set.id} value={set.id}>
                  {set.name} ({set.words?.length || 0} words)
                </option>
              ))}
            </select>
            {isAuthenticated && (
              <button
                onClick={onManageWordSets}
                className="px-4 py-2.5 rounded-lg font-medium glass-panel hover:bg-[var(--bg-input)] transition-colors"
                style={{
                  color: 'var(--text-main)',
                  border: '1px solid var(--key-border)'
                }}
              >
                Manage
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
