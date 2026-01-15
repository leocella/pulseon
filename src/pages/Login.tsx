import { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, Mail, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

type RoleRow = { role: 'admin' | 'secretary' };

type LocationState = {
    from?: { pathname?: string };
};

export default function Login() {
    const navigate = useNavigate();
    const location = useLocation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                if (error.message.includes('Invalid login credentials')) {
                    toast.error('Email ou senha incorretos');
                } else {
                    toast.error(error.message);
                }
                return;
            }

            if (!data.user) {
                toast.error('Não foi possível concluir o login');
                return;
            }

            toast.success('Login realizado com sucesso!');

            const state = location.state as LocationState | null;
            const fromPath = state?.from?.pathname;
            if (fromPath && fromPath !== '/login') {
                navigate(fromPath, { replace: true });
                return;
            }

            const { data: rolesData, error: rolesError } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', data.user.id);

            if (rolesError) {
                toast.error('Não foi possível verificar suas permissões');
                navigate('/', { replace: true });
                return;
            }

            const roles = (rolesData as RoleRow[] | null)?.map((r) => r.role) ?? [];
            if (roles.includes('admin')) {
                navigate('/admin', { replace: true });
                return;
            }

            if (roles.includes('secretary')) {
                navigate('/secretaria', { replace: true });
                return;
            }

            toast.error('Seu usuário não tem acesso. Contate o administrador.');
            navigate('/', { replace: true });
        } catch {
            toast.error('Erro ao fazer login');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background flex items-center justify-center p-6">
            <Card className="w-full max-w-md p-8">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                        <Lock className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground mb-2">Acesso do Sistema</h1>
                    <p className="text-muted-foreground">Entre com email e senha</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                type="email"
                                placeholder="Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="pl-10"
                                autoFocus
                                required
                            />
                        </div>
                    </div>

                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Senha"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="pl-10 pr-10"
                            required
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

                    <Button type="submit" className="w-full" disabled={isLoading || !email || !password}>
                        {isLoading ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Lock className="w-4 h-4 mr-2" />
                        )}
                        Entrar
                    </Button>
                </form>

                <div className="mt-6 text-center">
                    <Link to="/" className="text-xs text-muted-foreground hover:text-foreground underline">
                        Voltar para o início
                    </Link>
                </div>
            </Card>
        </div>
    );
}
