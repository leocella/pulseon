import { useCallback } from 'react';

export function useSpeech() {
  const speakTicket = useCallback((ticketId: string) => {
    if (!('speechSynthesis' in window)) {
      console.warn('Web Speech API não suportada neste navegador.');
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    // Prepare the text to be spoken
    // We want to speak the letters and then each digit individually for clarity
    // Example: "A123" -> "Senha, A, um, dois, três"
    const parts = ticketId.split('');
    const spokenTicket = parts.map(char => {
      if (isNaN(parseInt(char))) return char;
      return char;
    }).join(' ');

    const text = `Senha, ${spokenTicket}`;
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set language to Brazilian Portuguese
    utterance.lang = 'pt-BR';
    utterance.rate = 0.9; // Slightly slower for better clarity
    utterance.pitch = 1.0;

    // Optional: Find a Brazilian Portuguese voice if available
    const voices = window.speechSynthesis.getVoices();
    const ptBRVoice = voices.find(voice => voice.lang === 'pt-BR' || voice.lang === 'pt_BR');
    if (ptBRVoice) {
      utterance.voice = ptBRVoice;
    }

    window.speechSynthesis.speak(utterance);
  }, []);

  return { speakTicket };
}
