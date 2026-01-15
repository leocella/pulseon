import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { UNIDADE } from '@/lib/config';

// Configurações de música de fundo sincronizadas via Supabase
// Assim você configura no PC e a TV puxa automaticamente!

export interface BackgroundMusicConfig {
    url: string;
    volume: number; // 0 a 1
    enabled: boolean;
}

const SETTING_KEY = 'background_music';

const defaultConfig: BackgroundMusicConfig = {
    url: '',
    volume: 0.3, // 30% do volume - confortável
    enabled: true,
};

// Detecta o tipo de URL de música
function getMusicType(url: string): 'spotify' | 'youtube' | 'audio' | 'unknown' {
    if (!url) return 'unknown';
    if (url.includes('spotify.com')) return 'spotify';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.match(/\.(mp3|wav|ogg|m4a|aac)(\?.*)?$/i) || url.includes('stream')) return 'audio';
    return 'unknown';
}

// Converte URL do Spotify para embed
function getSpotifyEmbedUrl(url: string): string | null {
    const spotifyMatch = url.match(/spotify\.com\/(playlist|album|track)\/([a-zA-Z0-9]+)/);
    if (spotifyMatch) {
        const [, type, id] = spotifyMatch;
        return `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`;
    }
    return null;
}

// Hook para buscar e atualizar configurações de música de fundo
export function useBackgroundMusic() {
    const queryClient = useQueryClient();

    // Buscar configuração do banco de dados
    const { data: dbConfig } = useQuery({
        queryKey: ['panelSettings', UNIDADE, SETTING_KEY],
        queryFn: async () => {
            const { data, error } = await (supabase
                .from('panel_settings' as any)
                .select('setting_value')
                .eq('unidade', UNIDADE)
                .eq('setting_key', SETTING_KEY)
                .maybeSingle() as any);

            if (error) {
                console.error('Error fetching music config:', error);
                return null;
            }
            return data?.setting_value as BackgroundMusicConfig | null;
        },
        staleTime: 1000 * 60, // Cache por 1 minuto
    });

    // Config atual (do banco ou default)
    const config: BackgroundMusicConfig = dbConfig || defaultConfig;

    // Mutation para salvar configuração
    const saveMutation = useMutation({
        mutationFn: async (newConfig: BackgroundMusicConfig) => {
            const { error } = await (supabase
                .from('panel_settings' as any)
                .upsert({
                    unidade: UNIDADE,
                    setting_key: SETTING_KEY,
                    setting_value: newConfig,
                }, {
                    onConflict: 'unidade,setting_key',
                }) as any);

            if (error) throw error;
            return newConfig;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['panelSettings', UNIDADE, SETTING_KEY] });
        },
    });

    // Funções para atualizar configuração
    const setUrl = useCallback((url: string) => {
        const newConfig = { ...config, url };
        saveMutation.mutate(newConfig);
    }, [config, saveMutation]);

    const setVolume = useCallback((volume: number) => {
        const newConfig = { ...config, volume: Math.max(0, Math.min(1, volume)) };
        saveMutation.mutate(newConfig);
    }, [config, saveMutation]);

    const setEnabled = useCallback((enabled: boolean) => {
        const newConfig = { ...config, enabled };
        saveMutation.mutate(newConfig);
    }, [config, saveMutation]);

    const toggleEnabled = useCallback(() => {
        const newConfig = { ...config, enabled: !config.enabled };
        saveMutation.mutate(newConfig);
    }, [config, saveMutation]);

    const musicType = getMusicType(config.url);

    return {
        config,
        setUrl,
        setVolume,
        setEnabled,
        toggleEnabled,
        musicType,
        spotifyEmbedUrl: musicType === 'spotify' ? getSpotifyEmbedUrl(config.url) : null,
        isSaving: saveMutation.isPending,
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

    // Renderizar iframe do Spotify - posicionado no header do painel
    if (config.enabled && musicType === 'spotify' && spotifyEmbedUrl) {
        return (
            <div
                id="spotify-player-container"
                style={{
                    width: '300px',
                    height: '80px',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                    flexShrink: 0,
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

    // Placeholder quando não há música configurada
    if (!config.url || !config.enabled) {
        return (
            <div
                style={{
                    width: '300px',
                    height: '80px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    border: '1px dashed rgba(255,255,255,0.3)',
                }}
            >
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', textAlign: 'center', padding: '8px' }}>
                    {!config.url ? '🎵 Configure música no Admin' : '🔇 Música desativada'}
                </span>
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
