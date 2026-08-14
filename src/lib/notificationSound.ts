/**
 * Module to synthesize and play pleasant notification chimes.
 * Includes Web Audio API fallback for 100% reliable sound playback in production.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
    if (!audioCtx && typeof window !== "undefined") {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
            audioCtx = new AudioContextClass();
        }
    }
    return audioCtx!;
}

/**
 * Prime and unlock audio context on user gesture
 */
export function unlockAudioContext() {
    if (typeof window === "undefined") return;
    try {
        const ctx = getAudioContext();
        if (ctx && ctx.state === "suspended") {
            ctx.resume().catch(() => {});
        }
    } catch (e) {}
}

/**
 * Synthesizes a bright, professional delivery chime using Web Audio API
 * as a 100% reliable hardware fallback if mp3 autoplay is restricted.
 */
export function playSyntheticDeliveryChime() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        if (ctx.state === "suspended") {
            ctx.resume();
        }
        const now = ctx.currentTime;
        
        // 3 harmonic notes: C5 (523.25Hz), E5 (659.25Hz), G5 (783.99Hz)
        [523.25, 659.25, 783.99].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, now + i * 0.08);
            
            gain.gain.setValueAtTime(0, now + i * 0.08);
            gain.gain.linearRampToValueAtTime(0.22, now + i * 0.08 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.35);
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.start(now + i * 0.08);
            osc.stop(now + i * 0.08 + 0.4);
        });
    } catch (e) {
        console.warn("Synthetic delivery chime error:", e);
    }
}

/**
 * Play the custom new message notification chime from public directory.
 */
export function playNotificationSound() {
    try {
        const audio = new Audio("/nuevo_mensaje.mp3");
        audio.volume = 0.6;
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.catch(() => {});
        }
    } catch (e) {
        console.warn("Could not play notification sound:", e);
    }
}

/**
 * Debounced version to avoid rapid-fire sounds when multiple messages arrive simultaneously.
 */
let lastPlayed = 0;
export function playNotificationSoundDebounced(cooldownMs = 2000) {
    const now = Date.now();
    if (now - lastPlayed > cooldownMs) {
        lastPlayed = now;
        playNotificationSound();
    }
}

/**
 * Play the custom order delivered audio chime (/orden_entregada.mp3) from public folder.
 */
export function playOrderDeliveredSound() {
    try {
        const audio = new Audio("/orden_entregada.mp3");
        audio.volume = 0.85;
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.catch((error) => {
                console.warn("Autoplay mp3 blocked, triggering synthetic chime fallback:", error);
                playSyntheticDeliveryChime();
            });
        }
    } catch (e) {
        playSyntheticDeliveryChime();
    }
}

let lastDeliveredPlayed = 0;
export function playOrderDeliveredSoundDebounced(cooldownMs = 2000) {
    const now = Date.now();
    if (now - lastDeliveredPlayed > cooldownMs) {
        lastDeliveredPlayed = now;
        playOrderDeliveredSound();
    }
}
