/**
 * Audio Feedback Utility
 *
 * Provides audible feedback for typing events using Web Audio API
 */

// Create a single AudioContext to be reused
let audioContext = null;

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

/**
 * Play a click sound for correct keystrokes
 */
export function playClickSound() {
  try {
    const ctx = getAudioContext();
    const currentTime = ctx.currentTime;

    // Create oscillator for the click
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Short, high-pitched click
    oscillator.frequency.setValueAtTime(1200, currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(800, currentTime + 0.01);

    // Quick volume envelope for click effect
    gainNode.gain.setValueAtTime(0.15, currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.03);

    oscillator.start(currentTime);
    oscillator.stop(currentTime + 0.03);
  } catch (error) {
    console.warn('Audio feedback failed:', error);
  }
}

/**
 * Play a beep sound for incorrect keystrokes
 */
export function playErrorBeep() {
  try {
    const ctx = getAudioContext();
    const currentTime = ctx.currentTime;

    // Create oscillator for the beep
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Lower, dissonant beep for errors
    oscillator.frequency.setValueAtTime(300, currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(200, currentTime + 0.08);

    // Volume envelope for beep
    gainNode.gain.setValueAtTime(0.2, currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.08);

    oscillator.start(currentTime);
    oscillator.stop(currentTime + 0.08);
  } catch (error) {
    console.warn('Audio feedback failed:', error);
  }
}

/**
 * Resume audio context if suspended (required for some browsers)
 */
export function resumeAudioContext() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
  } catch (error) {
    console.warn('Failed to resume audio context:', error);
  }
}
