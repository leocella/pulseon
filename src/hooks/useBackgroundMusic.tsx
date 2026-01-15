import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { UNIDADE } from '@/lib/config';
import { subscribeToAlertEvents } from '@/hooks/useAlertSound';

// Configurações de música de fundo sincronizadas via Supabase
// Assim você configura no PC e a TV puxa automaticamente!

export interface BackgroundMusicConfig {
    url: string;
    volume: number; // 0 a 1
    enabled: boolean;
}

export interface RadioStation {
    id: string;
    name: string;
    url: string;
    genre: string;
    description: string;
}

// Rádios online gratuitas com streams de áudio direto (sem limitação de preview!)
export const RADIO_STATIONS: RadioStation[] = [
    {
        id: 'somafm-spacestation',
        name: 'Space Station Soma',
        url: 'https://ice1.somafm.com/spacestation-128-mp3',
        genre: 'Ambient / Eletrônica',
        description: 'Música ambiente espacial relaxante',
    },
    {
        id: 'somafm-drone',
        name: 'Drone Zone',
        url: 'https://ice1.somafm.com/dronezone-128-mp3',
        genre: 'Ambient / Drone',
        description: 'Paisagens sonoras atmosféricas e meditativas',
    },
    {
        id: 'somafm-groove',
        name: 'Groove Salad',
        url: 'https://ice1.somafm.com/groovesalad-128-mp3',
        genre: 'Chillout / Downtempo',
        description: 'Mix de chillout e downtempo suave',
    },
    {
        id: 'somafm-deepspace',
        name: 'Deep Space One',
        url: 'https://ice1.somafm.com/deepspaceone-128-mp3',
        genre: 'Ambient / Space',
        description: 'Música deep space e ambient profundo',
    },
    {
        id: 'somafm-lush',
        name: 'Lush',
        url: 'https://ice1.somafm.com/lush-128-mp3',
        genre: 'Downtempo / Vocal',
        description: 'Eletrônica sensual com vocais femininos',
    },
    {
        id: 'somafm-beatblender',
        name: 'Beat Blender',
        url: 'https://ice1.somafm.com/beatblender-128-mp3',
        genre: 'Deep House / Trip-Hop',
        description: 'Deep house e trip-hop para relaxar',
    },
    {
        id: 'somafm-fluid',
        name: 'Fluid',
        url: 'https://ice1.somafm.com/fluid-128-mp3',
        genre: 'Instrumental / Hip-Hop',
        description: 'Instrumental hip-hop e trip-hop suave',
    },
    {
        id: 'anotherplanet',
        name: 'Another Planet FM',
        url: 'https://stream.anotherplanet.fm:8000/stream',
        genre: 'Ambient / Chillout',
        description: 'Rádio ambient e chillout independente',
    },
];

const SETTING_KEY = 'background_music';

const defaultConfig: BackgroundMusicConfig = {
    url: '',
    volume: 0.3, // 30% do volume - confortável
    enabled: true,
};

// Detecta o tipo de URL de música
export function getMusicType(url: string): 'spotify' | 'youtube' | 'radio' | 'audio' | 'unknown' {
    if (!url) return 'unknown';
    if (url.includes('spotify.com')) return 'spotify';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    // Detectar rádios conhecidas
    if (url.includes('somafm.com') || url.includes('anotherplanet.fm') || url.includes('ice1.') || url.includes('stream.')) return 'radio';
    if (url.match(/\.(mp3|wav|ogg|m4a|aac)(\?.*)?$/i)) return 'audio';
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

// Encontra a estação de rádio pelo URL
export function getRadioStationByUrl(url: string): RadioStation | undefined {
    return RADIO_STATIONS.find(station => station.url === url);
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
        staleTime: 1000 * 5, // Cache por 5 segundos apenas
        refetchInterval: 1000 * 10, // Polling a cada 10 segundos como fallback
    });

    // Realtime: sincroniza instantaneamente quando configuração muda
    useEffect(() => {
        console.log('useBackgroundMusic: Subscribing to realtime for unit:', UNIDADE);
        
        const channel = supabase
            .channel(`panel-settings-${UNIDADE}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'panel_settings',
                    filter: `unidade=eq.${UNIDADE}`,
                },
                (payload) => {
                    console.log('Realtime panel_settings update:', payload);
                    queryClient.invalidateQueries({ queryKey: ['panelSettings', UNIDADE, SETTING_KEY] });
                }
            )
            .subscribe((status) => {
                console.log('Realtime panel_settings subscription status:', status);
            });

        return () => {
            console.log('useBackgroundMusic: Unsubscribing from realtime');
            supabase.removeChannel(channel);
        };
    }, [queryClient]);

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
    const currentRadioStation = getRadioStationByUrl(config.url);

    return {
        config,
        setUrl,
        setVolume,
        setEnabled,
        toggleEnabled,
        musicType,
        spotifyEmbedUrl: musicType === 'spotify' ? getSpotifyEmbedUrl(config.url) : null,
        currentRadioStation,
        radioStations: RADIO_STATIONS,
        isSaving: saveMutation.isPending,
    };
}

// Componente de player de áudio para usar no Painel
export function BackgroundMusicPlayer() {
    const { config, musicType, spotifyEmbedUrl, currentRadioStation } = useBackgroundMusic();
    const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
    const [hasInteracted, setHasInteracted] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const wasPlayingBeforeAlertRef = useRef(false);
    const audioElementRef = useRef<HTMLAudioElement | null>(null);

    // Keep ref in sync with state
    useEffect(() => {
        audioElementRef.current = audioElement;
    }, [audioElement]);

    // Subscribe to alert events to pause/resume music
    useEffect(() => {
        const handleAlertStart = () => {
            // Store if we were playing before the alert
            if (audioElementRef.current && !audioElementRef.current.paused) {
                wasPlayingBeforeAlertRef.current = true;
                // Lower volume during alert instead of pausing
                if (audioElementRef.current) {
                    audioElementRef.current.volume = Math.max(0.05, config.volume * 0.2);
                }
            }
        };

        const handleAlertEnd = () => {
            // Resume playing if we were playing before
            if (wasPlayingBeforeAlertRef.current && audioElementRef.current) {
                // Restore volume
                audioElementRef.current.volume = config.volume;
                // If somehow paused, resume
                if (audioElementRef.current.paused) {
                    audioElementRef.current.play().catch(e => {
                        console.log('Could not resume music after alert:', e);
                    });
                }
                wasPlayingBeforeAlertRef.current = false;
            }
        };

        const unsubscribe = subscribeToAlertEvents(handleAlertStart, handleAlertEnd);
        return unsubscribe;
    }, [config.volume]);

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

    // Para áudio direto (MP3, rádio, etc)
    useEffect(() => {
        const isAudioType = musicType === 'audio' || musicType === 'radio';
        
        if (!config.url || !config.enabled || !isAudioType) {
            if (audioElement) {
                audioElement.pause();
                audioElement.src = '';
                setAudioElement(null);
            }
            setIsPlaying(false);
            return;
        }

        const audio = new Audio();
        audio.volume = config.volume;
        audio.src = config.url;
        audio.crossOrigin = 'anonymous';
        
        audio.onplay = () => setIsPlaying(true);
        audio.onpause = () => setIsPlaying(false);
        audio.onwaiting = () => setIsLoading(true);
        audio.onplaying = () => setIsLoading(false);
        audio.onerror = () => {
            console.error('Erro ao carregar áudio:', config.url);
            setIsLoading(false);
        };
        
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

    // Tentar tocar quando o usuário interagir
    useEffect(() => {
        const isAudioType = musicType === 'audio' || musicType === 'radio';
        if (!audioElement || !config.enabled || !hasInteracted || !isAudioType) return;

        const playAudio = async () => {
            try {
                setIsLoading(true);
                await audioElement.play();
            } catch (e) {
                console.log('Autoplay bloqueado, aguardando interação do usuário');
                setIsLoading(false);
            }
        };

        playAudio();
    }, [audioElement, config.enabled, hasInteracted, musicType]);

    const handlePlayPause = async () => {
        if (!audioElement) return;
        
        if (isPlaying) {
            audioElement.pause();
        } else {
            try {
                setIsLoading(true);
                await audioElement.play();
            } catch (e) {
                console.error('Erro ao tocar:', e);
                setIsLoading(false);
            }
        }
    };

    // Player para Rádio online
    if (config.enabled && musicType === 'radio') {
        return (
            <div
                style={{
                    width: '300px',
                    height: '80px',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                    flexShrink: 0,
                    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px',
                    gap: '12px',
                }}
            >
                <button
                    onClick={handlePlayPause}
                    style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        background: isPlaying ? '#1DB954' : 'rgba(255,255,255,0.1)',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s',
                        flexShrink: 0,
                    }}
                >
                    {isLoading ? (
                        <span style={{ color: 'white', fontSize: '16px' }}>⏳</span>
                    ) : isPlaying ? (
                        <span style={{ color: 'white', fontSize: '20px' }}>⏸</span>
                    ) : (
                        <span style={{ color: 'white', fontSize: '20px', marginLeft: '2px' }}>▶</span>
                    )}
                </button>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ 
                        color: 'white', 
                        fontSize: '13px', 
                        fontWeight: 600, 
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    }}>
                        📻 {currentRadioStation?.name || 'Rádio Online'}
                    </div>
                    <div style={{ 
                        color: 'rgba(255,255,255,0.6)', 
                        fontSize: '11px',
                        marginTop: '2px',
                    }}>
                        {currentRadioStation?.genre || 'Stream de áudio'}
                    </div>
                    <div style={{ 
                        color: isPlaying ? '#1DB954' : 'rgba(255,255,255,0.4)', 
                        fontSize: '10px',
                        marginTop: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                    }}>
                        {isPlaying && <span style={{ animation: 'pulse 1.5s infinite' }}>●</span>}
                        {isPlaying ? 'Tocando ao vivo' : 'Clique para tocar'}
                    </div>
                </div>
            </div>
        );
    }

    // Renderizar iframe do Spotify
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

// Componente seletor de rádios para o Admin
export function RadioSelector({ onSelect, currentUrl }: { onSelect: (url: string) => void; currentUrl: string }) {
    return (
        <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Rádios Online (sem limitação!)</label>
            <div className="grid gap-2">
                {RADIO_STATIONS.map((station) => (
                    <button
                        key={station.id}
                        onClick={() => onSelect(station.url)}
                        className={`text-left p-3 rounded-lg border transition-all ${
                            currentUrl === station.url
                                ? 'border-primary bg-primary/10'
                                : 'border-border bg-card hover:border-primary/50'
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            <span className="text-lg">📻</span>
                            <div className="flex-1">
                                <div className="font-medium text-sm">{station.name}</div>
                                <div className="text-xs text-muted-foreground">{station.genre}</div>
                            </div>
                            {currentUrl === station.url && (
                                <span className="text-primary text-sm">✓</span>
                            )}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
