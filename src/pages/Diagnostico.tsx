import { useState, useCallback } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Play, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePanelMedia } from '@/hooks/usePanelMedia';
import { UNIDADE } from '@/lib/config';

// Página de diagnóstico do painel.
// Objetivo: rodar no PC problemático (o da TV via HDMI) e mostrar NA TELA
// por que o vídeo não aparece, sem precisar abrir o DevTools.

type Status = 'ok' | 'aviso' | 'falha';

interface Linha {
  titulo: string;
  valor: string;
  status: Status;
}

const MEDIA_ERROR_LABELS: Record<number, string> = {
  1: 'MEDIA_ERR_ABORTED - carregamento cancelado',
  2: 'MEDIA_ERR_NETWORK - falha de rede ao baixar o vídeo',
  3: 'MEDIA_ERR_DECODE - o PC NÃO consegue decodificar esse vídeo (codec)',
  4: 'MEDIA_ERR_SRC_NOT_SUPPORTED - formato/codec não suportado por este navegador',
};

// Perfis testados via canPlayType. HEVC é o suspeito nº 1 em vídeo de celular.
const CODECS: { nome: string; mime: string }[] = [
  { nome: 'MP4 H.264 (baseline)', mime: 'video/mp4; codecs="avc1.42E01E"' },
  { nome: 'MP4 H.264 (high)', mime: 'video/mp4; codecs="avc1.640028"' },
  { nome: 'MP4 H.265 / HEVC', mime: 'video/mp4; codecs="hev1.1.6.L93.B0"' },
  { nome: 'MP4 AV1', mime: 'video/mp4; codecs="av01.0.05M.08"' },
  { nome: 'WebM VP9', mime: 'video/webm; codecs="vp9"' },
  { nome: 'WebM VP8', mime: 'video/webm; codecs="vp8, vorbis"' },
  { nome: 'QuickTime (.mov)', mime: 'video/quicktime' },
  { nome: 'Matroska (.mkv)', mime: 'video/x-matroska' },
  { nome: 'AVI (.avi)', mime: 'video/x-msvideo' },
];

function statusDoCanPlay(r: string): Status {
  if (r === 'probably') return 'ok';
  if (r === 'maybe') return 'aviso';
  return 'falha';
}

function getGpu(): string {
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (!gl) return 'WebGL indisponível (aceleração de hardware DESLIGADA)';
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    if (!info) return 'GPU não identificada';
    return String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL));
  } catch {
    return 'erro ao consultar GPU';
  }
}

interface ResultadoVideo {
  src: string;
  alt: string;
  etapa: string;
  detalhes: Linha[];
}

export default function Diagnostico() {
  const { data: dbMediaItems = [], isLoading } = usePanelMedia();
  const [resultados, setResultados] = useState<ResultadoVideo[]>([]);
  const [rodando, setRodando] = useState(false);

  const ambiente: Linha[] = [
    { titulo: 'Unidade configurada', valor: UNIDADE, status: 'ok' },
    { titulo: 'Navegador (User-Agent)', valor: navigator.userAgent, status: 'ok' },
    {
      titulo: 'GPU / aceleração de hardware',
      valor: getGpu(),
      status: getGpu().includes('DESLIGADA') ? 'falha' : 'ok',
    },
    {
      titulo: 'Tela desta janela',
      valor: `janela ${window.innerWidth}x${window.innerHeight} · monitor ${window.screen.width}x${window.screen.height} · escala ${window.devicePixelRatio}x`,
      status: 'ok',
    },
    {
      titulo: 'Mídias ativas no banco',
      valor: `${dbMediaItems.filter((m) => m.active).length} ativas de ${dbMediaItems.length} (${dbMediaItems.filter((m) => m.active && m.type === 'video').length} vídeo)`,
      status: dbMediaItems.some((m) => m.active && m.type === 'video') ? 'ok' : 'aviso',
    },
  ];

  const suporteCodecs: Linha[] = CODECS.map(({ nome, mime }) => {
    const r = document.createElement('video').canPlayType(mime) || 'não suportado';
    return { titulo: nome, valor: r, status: statusDoCanPlay(r) };
  });

  // Testa um vídeo de verdade: baixa, decodifica e confere se pinta frame não-preto.
  // O teste do frame preto é o que separa "codec não suportado" de
  // "decodifica mas a tela estendida mostra preto".
  const testarVideo = useCallback((src: string, alt: string): Promise<ResultadoVideo> => {
    return new Promise((resolve) => {
      const detalhes: Linha[] = [];
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = 'anonymous';
      video.preload = 'auto';

      let finalizado = false;
      const finalizar = (etapa: string) => {
        if (finalizado) return;
        finalizado = true;
        video.removeAttribute('src');
        video.load();
        resolve({ src, alt, etapa, detalhes });
      };

      const limite = setTimeout(() => {
        detalhes.push({
          titulo: 'Timeout',
          valor: `Travou em readyState=${video.readyState}, networkState=${video.networkState} após 20s`,
          status: 'falha',
        });
        finalizar('TRAVOU AO CARREGAR');
      }, 20000);

      video.onerror = () => {
        clearTimeout(limite);
        const err = video.error;
        detalhes.push({
          titulo: 'Erro de mídia',
          valor: err
            ? `${MEDIA_ERROR_LABELS[err.code] || `código ${err.code}`}${err.message ? ` — ${err.message}` : ''}`
            : 'erro desconhecido',
          status: 'falha',
        });
        finalizar('NÃO REPRODUZ NESTE PC');
      };

      video.onloadedmetadata = () => {
        detalhes.push({
          titulo: 'Metadados lidos',
          valor: `${video.videoWidth}x${video.videoHeight} · ${video.duration.toFixed(1)}s`,
          status: video.videoWidth > 0 ? 'ok' : 'falha',
        });
      };

      video.oncanplay = async () => {
        clearTimeout(limite);
        try {
          await video.play();
        } catch (e) {
          detalhes.push({
            titulo: 'Autoplay bloqueado',
            valor: String(e),
            status: 'falha',
          });
          finalizar('AUTOPLAY BLOQUEADO');
          return;
        }

        // Deixa rodar um pouco e checa se há imagem real (não preto).
        setTimeout(() => {
          detalhes.push({
            titulo: 'Reprodução',
            valor: `tempo avançou para ${video.currentTime.toFixed(2)}s`,
            status: video.currentTime > 0 ? 'ok' : 'falha',
          });

          try {
            const canvas = document.createElement('canvas');
            canvas.width = 64;
            canvas.height = 36;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('sem contexto 2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
            let soma = 0;
            for (let i = 0; i < data.length; i += 4) {
              soma += data[i] + data[i + 1] + data[i + 2];
            }
            const brilhoMedio = soma / (data.length / 4) / 3;
            detalhes.push({
              titulo: 'Frame realmente desenhado',
              valor:
                brilhoMedio < 2
                  ? `TELA PRETA (brilho médio ${brilhoMedio.toFixed(1)}) — decodifica mas não pinta imagem`
                  : `imagem OK (brilho médio ${brilhoMedio.toFixed(1)})`,
              status: brilhoMedio < 2 ? 'falha' : 'ok',
            });
            video.pause();
            finalizar(brilhoMedio < 2 ? 'DECODIFICA MAS PINTA PRETO' : 'FUNCIONA NESTE PC');
          } catch (e) {
            detalhes.push({
              titulo: 'Teste de frame',
              valor: `não foi possível ler o frame (CORS/canvas): ${String(e)}`,
              status: 'aviso',
            });
            video.pause();
            finalizar('DECODIFICA (frame não verificável)');
          }
        }, 2500);
      };

      video.src = src;
      video.load();
    });
  }, []);

  const rodarTestes = useCallback(async () => {
    setRodando(true);
    setResultados([]);
    const videos = dbMediaItems.filter((m) => m.active && m.type === 'video');
    for (const item of videos) {
      const r = await testarVideo(item.src, item.alt || 'sem título');
      setResultados((prev) => [...prev, r]);
    }
    setRodando(false);
  }, [dbMediaItems, testarVideo]);

  const icone = (s: Status) =>
    s === 'ok' ? (
      <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
    ) : s === 'aviso' ? (
      <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0" />
    ) : (
      <XCircle className="w-5 h-5 text-red-500 shrink-0" />
    );

  const Secao = ({ titulo, linhas }: { titulo: string; linhas: Linha[] }) => (
    <section className="mb-8">
      <h2 className="text-xl font-bold mb-3">{titulo}</h2>
      <div className="rounded-lg border divide-y">
        {linhas.map((l, i) => (
          <div key={i} className="flex items-start gap-3 p-3">
            {icone(l.status)}
            <div className="min-w-0 flex-1">
              <p className="font-medium">{l.titulo}</p>
              <p className="text-sm text-muted-foreground break-all">{l.valor}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );

  return (
    <div className="min-h-screen bg-background p-6 overflow-auto">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Diagnóstico de mídia do painel</h1>
        <p className="text-muted-foreground mb-6">
          Abra esta página <strong>no PC que está ligado na TV</strong> e clique em testar. O
          resultado diz exatamente por que o vídeo não aparece naquela máquina.
        </p>

        <Secao titulo="Ambiente deste PC" linhas={ambiente} />
        <Secao titulo="Codecs que este navegador aceita" linhas={suporteCodecs} />

        <section className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-xl font-bold">Teste real dos vídeos do painel</h2>
            <Button onClick={rodarTestes} disabled={rodando || isLoading}>
              {rodando ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Testando...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" /> Testar vídeos
                </>
              )}
            </Button>
          </div>

          {resultados.length === 0 && !rodando && (
            <p className="text-muted-foreground text-sm">Nenhum teste executado ainda.</p>
          )}

          {resultados.map((r, i) => (
            <div key={i} className="rounded-lg border mb-4 overflow-hidden">
              <div className="bg-muted p-3">
                <p className="font-bold">{r.etapa}</p>
                <p className="text-sm text-muted-foreground break-all">
                  {r.alt} — {r.src}
                </p>
              </div>
              <div className="divide-y">
                {r.detalhes.map((d, j) => (
                  <div key={j} className="flex items-start gap-3 p-3">
                    {icone(d.status)}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{d.titulo}</p>
                      <p className="text-sm text-muted-foreground break-all">{d.valor}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
