import { useState, useEffect, useCallback } from 'react';

// Configurações de música de fundo armazenadas em localStorage
// para persistir entre sessões sem necessidade de banco de dados

export interface BackgroundMusicConfig {
    url: string;
    volume: number; // 0 a 1
    enabled: boolean;
}

const STORAGE_KEY = 'panel_background_music';

const defaultConfig: BackgroundMusicConfig = {
    url: '',
    volume: 0.3, // 30% do volume - confortável
    enabled: true,
};

export function useBackgroundMusic() {
    const [config, setConfig] = useState<BackgroundMusicConfig>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                return { ...defaultConfig, ...JSON.parse(stored) };
            }
        } catch (e) {
            console.error('Error loading background music config:', e);
        }
        return defaultConfig;
    });

    // Salvar no localStorage quando a config mudar
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
        } catch (e) {
            console.error('Error saving background music config:', e);
        }
    }, [config]);

    const setUrl = useCallback((url: string) => {
        setConfig(prev => ({ ...prev, url }));
    }, []);

    const setVolume = useCallback((volume: number) => {
        setConfig(prev => ({ ...prev, volume: Math.max(0, Math.min(1, volume)) }));
    }, []);

    const setEnabled = useCallback((enabled: boolean) => {
        setConfig(prev => ({ ...prev, enabled }));
    }, []);

    const toggleEnabled = useCallback(() => {
        setConfig(prev => ({ ...prev, enabled: !prev.enabled }));
    }, []);

    return {
        config,
        setUrl,
        setVolume,
        setEnabled,
        toggleEnabled,
    };
}

// Componente de player de áudio para usar no Painel
export function BackgroundMusicPlayer() {
    const { config } = useBackgroundMusic();
    const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [hasInteracted, setHasInteracted] = useState(false);

    // Criar elemento de áudio
    useEffect(() => {
        if (!config.url || !config.enabled) {
            if (audioElement) {
                audioElement.pause();
                audioElement.src = '';
            }
            setIsPlaying(false);
            return;
        }

        const audio = new Audio();
        audio.loop = true;
        audio.volume = config.volume;

        // Converte URLs do YouTube para aviso (não suporta direto)
        if (config.url.includes('youtube.com') || config.url.includes('youtu.be')) {
            console.warn('YouTube não suporta reprodução de áudio direto. Use um link de MP3 ou streaming.');
            return;
        }

        // Converte URLs do Spotify para embed (nota: Spotify embed tem limitações)
        let audioUrl = config.url;
        if (config.url.includes('spotify.com')) {
            console.warn('Spotify não permite reprodução direta de áudio. Use um link de MP3.');
            return;
        }

        audio.src = audioUrl;
        setAudioElement(audio);

        return () => {
            audio.pause();
            audio.src = '';
        };
    }, [config.url, config.enabled]);

    // Atualizar volume quando mudar
    useEffect(() => {
        if (audioElement) {
            audioElement.volume = config.volume;
        }
    }, [audioElement, config.volume]);

    // Tentar tocar quando o usuário interagir
    useEffect(() => {
        if (!audioElement || !config.enabled || !hasInteracted) return;

        const playAudio = async () => {
            try {
                await audioElement.play();
                setIsPlaying(true);
            } catch (e) {
                console.log('Autoplay bloqueado, aguardando interação do usuário');
            }
        };

        playAudio();
    }, [audioElement, config.enabled, hasInteracted]);

    // Listener global para detectar interação do usuário
    useEffect(() => {
        const handleInteraction = () => {
            setHasInteracted(true);
        };

        document.addEventListener('click', handleInteraction, { once: true });
        document.addEventListener('keydown', handleInteraction, { once: true });

        return () => {
            document.removeEventListener('click', handleInteraction);
            document.removeEventListener('keydown', handleInteraction);
        };
    }, []);

    // Este componente não renderiza nada visualmente
    return null;
}
