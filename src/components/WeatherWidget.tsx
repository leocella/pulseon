import { useEffect, useState } from 'react';
import { Cloud, CloudRain, Sun, CloudSnow, Wind, CloudSun, CloudFog } from 'lucide-react';

interface WeatherData {
    temperature: number;
    condition: string;
    icon: string;
}

// Coordenadas exatas de Guaíra-PR
const GUAIRA_LAT = -24.0853;
const GUAIRA_LON = -54.2569;

// Mapeamento de códigos WMO para condições em português
const WMO_CODES: Record<number, string> = {
    0: 'Céu limpo',
    1: 'Céu limpo',
    2: 'Parcialmente nublado',
    3: 'Nublado',
    45: 'Neblina',
    48: 'Neblina',
    51: 'Garoa leve',
    53: 'Garoa',
    55: 'Garoa forte',
    61: 'Chuva leve',
    63: 'Chuva',
    65: 'Chuva forte',
    71: 'Neve leve',
    73: 'Neve',
    75: 'Neve forte',
    80: 'Pancadas de chuva',
    81: 'Pancadas de chuva',
    82: 'Pancadas fortes',
    95: 'Tempestade',
    96: 'Tempestade com granizo',
    99: 'Tempestade com granizo',
};

export function WeatherWidget() {
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Função para buscar clima usando Open-Meteo (gratuito e confiável)
        const fetchWeather = async () => {
            try {
                // Open-Meteo API - gratuita, sem chave, dados precisos
                const url = `https://api.open-meteo.com/v1/forecast?latitude=${GUAIRA_LAT}&longitude=${GUAIRA_LON}&current=temperature_2m,weather_code&timezone=America/Sao_Paulo`;

                const response = await fetch(url);
                const data = await response.json();

                if (data && data.current) {
                    const weatherCode = data.current.weather_code || 0;
                    setWeather({
                        temperature: Math.round(data.current.temperature_2m),
                        condition: WMO_CODES[weatherCode] || 'Parcialmente nublado',
                        icon: String(weatherCode)
                    });
                }
                setLoading(false);
            } catch (error) {
                console.error('Erro ao buscar clima:', error);
                // Fallback com dados simulados
                setWeather({
                    temperature: 28,
                    condition: 'Parcialmente nublado',
                    icon: '2'
                });
                setLoading(false);
            }
        };

        fetchWeather();
        // Atualizar clima a cada 15 minutos
        const interval = setInterval(fetchWeather, 15 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const getWeatherIcon = (condition: string) => {
        const cond = condition.toLowerCase();
        if (cond.includes('chuva') || cond.includes('pancada') || cond.includes('garoa')) {
            return <CloudRain className="w-8 h-8" />;
        } else if (cond.includes('neve')) {
            return <CloudSnow className="w-8 h-8" />;
        } else if (cond.includes('nublado')) {
            return <Cloud className="w-8 h-8" />;
        } else if (cond.includes('neblina')) {
            return <CloudFog className="w-8 h-8" />;
        } else if (cond.includes('tempestade')) {
            return <CloudRain className="w-8 h-8" />;
        } else if (cond.includes('parcial')) {
            return <CloudSun className="w-8 h-8" />;
        } else {
            return <Sun className="w-8 h-8" />;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center gap-3 text-white/80">
                <div className="animate-pulse">
                    <Cloud className="w-8 h-8" />
                </div>
                <div className="animate-pulse">
                    <div className="h-6 w-16 bg-white/20 rounded" />
                </div>
            </div>
        );
    }

    if (!weather) return null;

    return (
        <div className="flex items-center gap-3 text-white">
            <div className="opacity-90">
                {getWeatherIcon(weather.condition)}
            </div>
            <div>
                <div className="text-3xl font-bold">
                    {weather.temperature}°C
                </div>
                <div className="text-sm opacity-80 -mt-1">
                    Guaíra-PR • {weather.condition}
                </div>
            </div>
        </div>
    );
}
