import { useState, useEffect } from 'react';
import { Settings, X, Save, Printer, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

const SETTINGS_PASSWORD = '1234'; // Senha padrão para acessar configurações
const STORAGE_KEY = 'totem_print_server_ip';
const DEFAULT_IP = 'localhost';
const DEFAULT_PORT = '3001';

export function getPrintServerUrl(): string {
  try {
    const savedIp = localStorage.getItem(STORAGE_KEY);
    if (savedIp) {
      const { ip, port } = JSON.parse(savedIp);
      return `http://${ip}:${port}`;
    }
  } catch (e) {
    console.error('Erro ao ler IP do localStorage:', e);
  }
  return `http://${DEFAULT_IP}:${DEFAULT_PORT}`;
}

interface TotemSettingsProps {
  open: boolean;
  onClose: () => void;
}

export function TotemSettings({ open, onClose }: TotemSettingsProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  
  const [ip, setIp] = useState(DEFAULT_IP);
  const [port, setPort] = useState(DEFAULT_PORT);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  // Carregar configurações salvas
  useEffect(() => {
    if (open) {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const { ip: savedIp, port: savedPort } = JSON.parse(saved);
          setIp(savedIp || DEFAULT_IP);
          setPort(savedPort || DEFAULT_PORT);
        }
      } catch (e) {
        console.error('Erro ao carregar configurações:', e);
      }
    }
  }, [open]);

  // Reset ao fechar
  useEffect(() => {
    if (!open) {
      setIsAuthenticated(false);
      setPassword('');
      setPasswordError(false);
      setTestResult(null);
    }
  }, [open]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === SETTINGS_PASSWORD) {
      setIsAuthenticated(true);
      setPasswordError(false);
    } else {
      setPasswordError(true);
      setPassword('');
    }
  };

  const handleSave = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ip, port }));
      toast.success('Configurações salvas com sucesso!');
      onClose();
    } catch (e) {
      toast.error('Erro ao salvar configurações');
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    
    const url = `http://${ip}:${port}/health`;
    console.log('[TotemSettings] Testando conexão:', url);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(url, {
        signal: controller.signal,
        mode: 'cors',
      });
      
      clearTimeout(timeoutId);
      
      console.log('[TotemSettings] Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[TotemSettings] Response data:', data);
        setTestResult('success');
        
        if (data.printer?.status === 'offline') {
          toast.success('Servidor OK! (Impressora offline - verifique conexão da impressora)');
        } else {
          toast.success('Conexão OK! Servidor e impressora respondendo.');
        }
      } else {
        setTestResult('error');
        const text = await response.text();
        console.error('[TotemSettings] Error response:', text);
        toast.error(`Servidor respondeu com erro: ${response.status}`);
      }
    } catch (error) {
      console.error('[TotemSettings] Connection error:', error);
      setTestResult('error');
      if (error instanceof Error && error.name === 'AbortError') {
        toast.error('Timeout: servidor não respondeu em 5s');
      } else if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        toast.error('CORS/Rede: servidor não acessível. Verifique IP e firewall.');
      } else {
        toast.error(`Erro: ${error instanceof Error ? error.message : 'Falha na conexão'}`);
      }
    } finally {
      setTesting(false);
    }
  };

  const handleTestPrint = async () => {
    setTesting(true);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`http://${ip}:${port}/test`, {
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        toast.success('Teste de impressão enviado!');
      } else {
        toast.error('Erro ao enviar teste de impressão');
      }
    } catch (error) {
      toast.error('Falha na comunicação com impressora');
    } finally {
      setTesting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configurações Técnicas
          </DialogTitle>
        </DialogHeader>

        {!isAuthenticated ? (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="settings-password">Senha de Acesso</Label>
              <Input
                id="settings-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite a senha"
                autoFocus
                className={passwordError ? 'border-destructive' : ''}
              />
              {passwordError && (
                <p className="text-sm text-destructive">Senha incorreta</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" className="flex-1">
                Entrar
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Printer className="w-4 h-4" />
                  Servidor de Impressão
                </CardTitle>
                <CardDescription>
                  Configure o IP do computador com o servidor de impressão
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="server-ip">Endereço IP</Label>
                    <Input
                      id="server-ip"
                      value={ip}
                      onChange={(e) => setIp(e.target.value)}
                      placeholder="192.168.1.100"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="server-port">Porta</Label>
                    <Input
                      id="server-port"
                      value={port}
                      onChange={(e) => setPort(e.target.value)}
                      placeholder="3001"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2 rounded bg-muted text-sm">
                  <span className="text-muted-foreground">URL:</span>
                  <code className="font-mono">http://{ip}:{port}/print</code>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleTestConnection}
                    disabled={testing}
                    className="flex-1"
                  >
                    {testing ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : testResult === 'success' ? (
                      <CheckCircle className="w-4 h-4 mr-1 text-green-500" />
                    ) : testResult === 'error' ? (
                      <XCircle className="w-4 h-4 mr-1 text-destructive" />
                    ) : null}
                    Testar Conexão
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleTestPrint}
                    disabled={testing}
                    className="flex-1"
                  >
                    <Printer className="w-4 h-4 mr-1" />
                    Imprimir Teste
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} className="flex-1">
                <X className="w-4 h-4 mr-1" />
                Cancelar
              </Button>
              <Button onClick={handleSave} className="flex-1">
                <Save className="w-4 h-4 mr-1" />
                Salvar
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Senha padrão: 1234 • Altere no código para maior segurança
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
