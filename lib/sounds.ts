import { useAppSettings, type SoundPack } from "@/lib/app-settings";

let audioCtx: AudioContext | null = null;
const bufferCache: Record<string, AudioBuffer> = {};

function getAudioCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

// ── Synth sounds (default) ──────────────────────────────────────────────────

function playSynthCorrect() {
  const ctx = getAudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = "sine";
  osc.frequency.value = 880;
  gain.gain.setValueAtTime(0.06, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.08);
}

function playSynthError() {
  const ctx = getAudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sawtooth";
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = 180;
  gain.gain.setValueAtTime(0.08, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.12);
}

// ── Cherry MX (bright, clicky) ──────────────────────────────────────────────

function playCherryMxCorrect() {
  const ctx = getAudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = "square";
  osc.frequency.value = 1200;
  gain.gain.setValueAtTime(0.04, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.04);
  // Click tail
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.type = "sine";
  osc2.frequency.value = 4000;
  gain2.gain.setValueAtTime(0.02, ctx.currentTime + 0.01);
  gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.035);
  osc2.start(ctx.currentTime + 0.01);
  osc2.stop(ctx.currentTime + 0.04);
}

function playCherryMxError() {
  const ctx = getAudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "square";
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = 200;
  gain.gain.setValueAtTime(0.06, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.1);
}

// ── Topre (soft, thocky) ────────────────────────────────────────────────────

function playTopreCorrect() {
  const ctx = getAudioCtx();
  // Low thock
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = "sine";
  osc.frequency.value = 300;
  gain.gain.setValueAtTime(0.07, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.06);
  // Noise burst via high-freq
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.type = "triangle";
  osc2.frequency.value = 600;
  gain2.gain.setValueAtTime(0.03, ctx.currentTime);
  gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
  osc2.start(ctx.currentTime);
  osc2.stop(ctx.currentTime + 0.05);
}

function playTopreError() {
  const ctx = getAudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = 150;
  gain.gain.setValueAtTime(0.08, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.15);
}

// ── Buckling Spring (loud, metallic) ────────────────────────────────────────

function playBucklingCorrect() {
  const ctx = getAudioCtx();
  // Sharp metal ping
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = "sawtooth";
  osc.frequency.value = 2000;
  gain.gain.setValueAtTime(0.05, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.04);
  // Spring rattle
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.type = "square";
  osc2.frequency.value = 800;
  gain2.gain.setValueAtTime(0.04, ctx.currentTime + 0.01);
  gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
  osc2.start(ctx.currentTime + 0.01);
  osc2.stop(ctx.currentTime + 0.07);
}

function playBucklingError() {
  const ctx = getAudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sawtooth";
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = 120;
  gain.gain.setValueAtTime(0.08, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.15);
}

// ── Public API ──────────────────────────────────────────────────────────────

function getCurrentPack(): SoundPack {
  return useAppSettings.getState().soundPack;
}

export function playCorrectSound() {
  try {
    const pack = getCurrentPack();
    switch (pack) {
      case "cherry-mx": playCherryMxCorrect(); break;
      case "topre": playTopreCorrect(); break;
      case "buckling-spring": playBucklingCorrect(); break;
      default: playSynthCorrect(); break;
    }
  } catch {
    // ignore audio errors
  }
}

export function playErrorSound() {
  try {
    const pack = getCurrentPack();
    switch (pack) {
      case "cherry-mx": playCherryMxError(); break;
      case "topre": playTopreError(); break;
      case "buckling-spring": playBucklingError(); break;
      default: playSynthError(); break;
    }
  } catch {
    // ignore audio errors
  }
}
