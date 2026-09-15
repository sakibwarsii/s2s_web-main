/**
 * High-quality audio effects synthesized via Web Audio API.
 * 100% offline, zero external audio asset dependency, instant response.
 */

export function playCompletionChime() {
  if (typeof window === "undefined") return;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Harmonious 4-note celebration chord (C5 -> E5 -> G5 -> C6)
    const notes = [
      { freq: 523.25, time: 0.00, dur: 0.50, gain: 0.22 },
      { freq: 659.25, time: 0.12, dur: 0.50, gain: 0.25 },
      { freq: 783.99, time: 0.24, dur: 0.55, gain: 0.28 },
      { freq: 1046.50, time: 0.38, dur: 0.85, gain: 0.32 },
    ];

    notes.forEach(({ freq, time, dur, gain: maxGain }) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      // Warm bell-like chime timbre using triangle
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + time);

      // Envelope: fast gentle attack, smooth exponential decay
      gainNode.gain.setValueAtTime(0.0001, now + time);
      gainNode.gain.exponentialRampToValueAtTime(maxGain, now + time + 0.03);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now + time);
      osc.stop(now + time + dur + 0.05);
    });

    // Auto-close audio context after sound finishes playing
    setTimeout(() => {
      try { ctx.close(); } catch(e) {}
    }, 2000);
  } catch (err) {
    console.warn("[SoundEffects] Could not play completion chime:", err);
  }
}
