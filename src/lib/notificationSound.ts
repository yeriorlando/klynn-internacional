/**
 * Module to synthesize a pleasant, short notification chime using the Web Audio API.
 * No external audio files needed — everything is synthesized on-the-fly.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtx;
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
            playPromise.catch((error) => {
                console.warn("Autoplay de audio prevenido por el navegador hasta interacción del usuario.");
            });
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
        audio.volume = 0.75;
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.catch((error) => {
                console.warn("Autoplay de audio prevenido por el navegador hasta interacción del usuario:", error);
            });
        }
    } catch (e) {
        console.warn("Could not play order delivered sound:", e);
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
