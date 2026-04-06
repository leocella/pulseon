import { useCallback, useRef, useEffect } from 'react';

// Event emitter para coordenar áudio entre componentes
type AudioEventCallback = () => void;
const audioEventListeners: { onAlertStart: AudioEventCallback[]; onAlertEnd: AudioEventCallback[] } = {
  onAlertStart: [],
  onAlertEnd: [],
};

export function subscribeToAlertEvents(onStart: AudioEventCallback, onEnd: AudioEventCallback) {
  audioEventListeners.onAlertStart.push(onStart);
  audioEventListeners.onAlertEnd.push(onEnd);
  
  return () => {
    audioEventListeners.onAlertStart = audioEventListeners.onAlertStart.filter(cb => cb !== onStart);
    audioEventListeners.onAlertEnd = audioEventListeners.onAlertEnd.filter(cb => cb !== onEnd);
  };
}

function emitAlertStart() {
  audioEventListeners.onAlertStart.forEach(cb => cb());
}

function emitAlertEnd() {
  audioEventListeners.onAlertEnd.forEach(cb => cb());
}

// Alert sound using Web Audio API - a pleasant chime
export function useAlertSound() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const isPlayingRef = useRef(false);

  // Initialize AudioContext on first user interaction or when needed
  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  // Play a pleasant two-tone chime
  const playAlertSound = useCallback(async () => {
    if (isPlayingRef.current) return;
    
    try {
      const audioContext = initAudioContext();
      
      // Resume if suspended (required by browsers)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      // Notify that alert is starting
      isPlayingRef.current = true;
      emitAlertStart();

      const now = audioContext.currentTime;
      const alertDuration = 0.9; // Total duration of the alert sound
      
      // Create oscillator for first tone
      const osc1 = audioContext.createOscillator();
      const gain1 = audioContext.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now); // C5
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.6, now + 0.05);
      gain1.gain.linearRampToValueAtTime(0.4, now + 0.2);
      gain1.gain.linearRampToValueAtTime(0, now + 0.5);
      osc1.connect(gain1);
      gain1.connect(audioContext.destination);
      osc1.start(now);
      osc1.stop(now + 0.5);

      // Create oscillator for second tone (higher pitch)
      const osc2 = audioContext.createOscillator();
      const gain2 = audioContext.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, now + 0.15); // E5
      gain2.gain.setValueAtTime(0, now + 0.15);
      gain2.gain.linearRampToValueAtTime(0.6, now + 0.2);
      gain2.gain.linearRampToValueAtTime(0.4, now + 0.35);
      gain2.gain.linearRampToValueAtTime(0, now + 0.65);
      osc2.connect(gain2);
      gain2.connect(audioContext.destination);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.65);

      // Create oscillator for third tone (even higher - pleasant resolution)
      const osc3 = audioContext.createOscillator();
      const gain3 = audioContext.createGain();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(783.99, now + 0.3); // G5
      gain3.gain.setValueAtTime(0, now + 0.3);
      gain3.gain.linearRampToValueAtTime(0.7, now + 0.35);
      gain3.gain.linearRampToValueAtTime(0.5, now + 0.5);
      gain3.gain.linearRampToValueAtTime(0, now + 0.9);
      osc3.connect(gain3);
      gain3.connect(audioContext.destination);
      osc3.start(now + 0.3);
      osc3.stop(now + 0.9);

      // Notify that alert ended after the sound finishes
      setTimeout(() => {
        isPlayingRef.current = false;
        emitAlertEnd();
      }, alertDuration * 1000 + 100); // Add small buffer

    } catch (error) {
      console.error('Error playing alert sound:', error);
      isPlayingRef.current = false;
      emitAlertEnd();
    }
  }, [initAudioContext]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return { playAlertSound, initAudioContext };
}
