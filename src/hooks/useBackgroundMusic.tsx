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

// Detecta o tipo de URL de música
function getMusicType(url: string): 'spotify' | 'youtube' | 'audio' | 'unknown' {
    if (url.includes('spotify.com')) return 'spotify';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.match(/\.(mp3|wav|ogg|m4a|aac)(\?.*)?$/i) || url.includes('stream')) return 'audio';
    return 'unknown';
}

// Converte URL do Spotify para embed
function getSpotifyEmbedUrl(url: string): string | null {
    // Formatos suportados:
    // https://open.spotify.com/playlist/37i9dQZF1DX4WYpdgoIcn6
    // https://open.spotify.com/album/4aawyAB9vmqN3uQ7FjRGTy
    // https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh

    const spotifyMatch = url.match(/spotify\.com\/(playlist|album|track)\/([a-zA-Z0-9]+)/);
    if (spotifyMatch) {
        const [, type, id] = spotifyMatch;
        return `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`;
    }
    return null;
}

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

    const musicType = getMusicType(config.url);

    return {
        config,
        setUrl,
        setVolume,
        setEnabled,
        toggleEnabled,
        musicType,
        spotifyEmbedUrl: musicType === 'spotify' ? getSpotifyEmbedUrl(config.url) : null,
    };
}

// Componente de player de áudio para usar no Painel
export function BackgroundMusicPlayer() {
    const { config, musicType, spotifyEmbedUrl } = useBackgroundMusic();
    const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
    const [hasInteracted, setHasInteracted] = useState(false);

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

    // Para áudio direto (MP3, etc)
    useEffect(() => {
        if (!config.url || !config.enabled || musicType !== 'audio') {
            if (audioElement) {
                audioElement.pause();
                audioElement.src = '';
            }
            return;
        }

        const audio = new Audio();
        audio.loop = true;
        audio.volume = config.volume;
        audio.src = config.url;
        setAudioElement(audio);

        return () => {
            audio.pause();
            audio.src = '';
        };
    }, [config.url, config.enabled, musicType]);

    // Atualizar volume quando mudar
    useEffect(() => {
        if (audioElement) {
            audioElement.volume = config.volume;
        }
    }, [audioElement, config.volume]);

    // Tentar tocar quando o usuário interagir (para MP3)
    useEffect(() => {
        if (!audioElement || !config.enabled || !hasInteracted || musicType !== 'audio') return;

        const playAudio = async () => {
            try {
                await audioElement.play();
            } catch (e) {
                console.log('Autoplay bloqueado, aguardando interação do usuário');
            }
        };

        playAudio();
    }, [audioElement, config.enabled, hasInteracted, musicType]);

    // Renderizar iframe do Spotify - VISÍVEL para permitir interação do usuário
    // Spotify NÃO permite autoplay sem interação direta no player
    if (config.enabled && musicType === 'spotify' && spotifyEmbedUrl) {
        return (
            <div
                style={{
                    position: 'fixed',
                    bottom: '16px',
                    left: '16px',
                    width: '300px',
                    height: '80px',
                    zIndex: 50,
                    borderRadius: '12px',
                    overflow: 'hidden',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                }}
            >
                <iframe
                    src={spotifyEmbedUrl}
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                    title="Spotify Music Player"
                />
            </div>
        );
    }

    return null;
}

// Componente para preview do Spotify no Admin
export function SpotifyPreview({ url }: { url: string }) {
    const embedUrl = getSpotifyEmbedUrl(url);

    if (!embedUrl) return null;

    return (
        <div className="rounded-lg overflow-hidden">
            <iframe
                src={embedUrl}
                width="100%"
                height="152"
                frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                title="Spotify Preview"
            />
        </div>
    );
}
