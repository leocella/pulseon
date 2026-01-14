import { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

const ADMIN_PASSWORD = 'admin123'; // TODO: Mover para variável de ambiente
const AUTH_KEY = 'admin_authenticated';
const AUTH_EXPIRY = 'admin_auth_expiry';

interface AdminAuthProps {
    children: React.ReactNode;
}

export function AdminAuth({ children }: AdminAuthProps) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check if already authenticated
        const auth = localStorage.getItem(AUTH_KEY);
        const expiry = localStorage.getItem(AUTH_EXPIRY);

        if (auth === 'true' && expiry) {
            const expiryTime = parseInt(expiry);
            if (Date.now() < expiryTime) {
                setIsAuthenticated(true);
            } else {
                // Session expired
                localStorage.removeItem(AUTH_KEY);
                localStorage.removeItem(AUTH_EXPIRY);
            }
        }

        setIsLoading(false);
    }, []);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();

        if (password === ADMIN_PASSWORD) {
            // Set authentication for 8 hours
            const expiryTime = Date.now() + (8 * 60 * 60 * 1000);
            localStorage.setItem(AUTH_KEY, 'true');
            localStorage.setItem(AUTH_EXPIRY, expiryTime.toString());

            setIsAuthenticated(true);
            toast.success('Acesso autorizado!');
        } else {
            toast.error('Senha incorreta');
            setPassword('');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem(AUTH_KEY);
        localStorage.removeItem(AUTH_EXPIRY);
        setIsAuthenticated(false);
        setPassword('');
        toast.info('Sessão encerrada');
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-pulse text-muted-foreground">Carregando...</div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background flex items-center justify-center p-6">
                <Card className="w-full max-w-md p-8">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                            <Lock className="w-8 h-8 text-primary" />
                        </div>
                        <h1 className="text-2xl font-bold text-foreground mb-2">
                            Painel Administrativo
                        </h1>
                        <p className="text-muted-foreground">
                            Digite a senha para acessar
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="relative">
                            <Input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Senha de administrador"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="pr-10"
                                autoFocus
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                {showPassword ? (
                                    <EyeOff className="w-4 h-4" />
                                ) : (
                                    <Eye className="w-4 h-4" />
                                )}
                            </button>
                        </div>

                        <Button type="submit" className="w-full" disabled={!password}>
                            <Lock className="w-4 h-4 mr-2" />
                            Entrar
                        </Button>
                    </form>

                    <p className="text-xs text-muted-foreground text-center mt-6">
                        A sessão expira após 8 horas de inatividade
                    </p>
                </Card>
            </div>
        );
    }

    return (
        <div>
            {/* Logout button in header */}
            <div className="fixed top-4 right-4 z-50">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogout}
                    className="bg-background/95 backdrop-blur"
                >
                    <Lock className="w-4 h-4 mr-2" />
                    Sair
                </Button>
            </div>
            {children}
        </div>
    );
}
