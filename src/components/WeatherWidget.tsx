import { useEffect, useState } from 'react';
import { Cloud, CloudRain, Sun, CloudSnow, Wind } from 'lucide-react';

interface WeatherData {
    temperature: number;
    condition: string;
    icon: string;
}

export function WeatherWidget() {
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Função para buscar clima
        const fetchWeather = async () => {
            try {
                // Usando wttr.in - API gratuita sem necessidade de chave
                // Formato: cidade?format=j1 retorna JSON
                const response = await fetch('https://wttr.in/Guaira,PR?format=j1&lang=pt');
                const data = await response.json();

                if (data && data.current_condition && data.current_condition[0]) {
                    const current = data.current_condition[0];
                    setWeather({
                        temperature: parseInt(current.temp_C),
                        condition: current.lang_pt?.[0]?.value || current.weatherDesc[0].value,
                        icon: current.weatherCode
                    });
                }
                setLoading(false);
            } catch (error) {
                console.error('Erro ao buscar clima:', error);
                // Fallback com dados simulados
                setWeather({
                    temperature: 25,
                    condition: 'Parcialmente nublado',
                    icon: '116'
                });
                setLoading(false);
            }
        };

        fetchWeather();
        // Atualizar clima a cada 30 minutos
        const interval = setInterval(fetchWeather, 30 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const getWeatherIcon = (condition: string) => {
        const cond = condition.toLowerCase();
        if (cond.includes('chuva') || cond.includes('rain')) {
            return <CloudRain className="w-8 h-8" />;
        } else if (cond.includes('neve') || cond.includes('snow')) {
            return <CloudSnow className="w-8 h-8" />;
        } else if (cond.includes('nublado') || cond.includes('cloud')) {
            return <Cloud className="w-8 h-8" />;
        } else if (cond.includes('vento') || cond.includes('wind')) {
            return <Wind className="w-8 h-8" />;
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
                    {weather.condition}
                </div>
            </div>
        </div>
    );
}
