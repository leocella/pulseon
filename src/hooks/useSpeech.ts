import { useCallback } from 'react';

export function useSpeech() {
  const speak = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) {
      console.warn('Web Speech API não suportada neste navegador.');
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    console.log('Iniciando fala:', text);

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set language to Brazilian Portuguese
    utterance.lang = 'pt-BR';
    utterance.rate = 0.9;
    utterance.pitch = 1.0;

    // Help browser load voices
    const speakWithVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const ptBRVoice = voices.find(voice => 
        voice.lang === 'pt-BR' || voice.lang === 'pt_BR' || voice.name.includes('Brazil')
      );
      
      if (ptBRVoice) {
        utterance.voice = ptBRVoice;
      }
      
      window.speechSynthesis.speak(utterance);
    };

    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {
        speakWithVoice();
        window.speechSynthesis.onvoiceschanged = null;
      };
    } else {
      speakWithVoice();
    }
  }, []);

  const speakTicket = useCallback((ticketId: string) => {
    // Example: "A123" -> "Senha, A, um, dois, três"
    const parts = ticketId.split('');
    const spokenTicket = parts.map(char => {
      // If it's a number, ensure it's spoken as a digit
      return char;
    }).join(' ');

    speak(`Senha, ${spokenTicket}`);
  }, [speak]);

  return { speakTicket, speak };
}
