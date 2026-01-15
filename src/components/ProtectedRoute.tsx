import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredRole?: 'admin' | 'secretary';
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [hasAccess, setHasAccess] = useState(false);
    const location = useLocation();

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session && requiredRole) {
                checkUserRole(session.user.id, requiredRole);
            } else if (session) {
                setHasAccess(true);
                setLoading(false);
            } else {
                setLoading(false);
            }
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session && requiredRole) {
                checkUserRole(session.user.id, requiredRole);
            } else if (session) {
                setHasAccess(true);
                setLoading(false);
            } else {
                setHasAccess(false);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, [requiredRole]);

    const checkUserRole = async (userId: string, role: 'admin' | 'secretary') => {
        try {
            const { data, error } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', userId)
                .in('role', role === 'admin' ? ['admin'] : ['admin', 'secretary']);

            if (error) {
                console.error('Error checking role:', error);
                setHasAccess(false);
            } else {
                setHasAccess(data && data.length > 0);
            }
        } catch (error) {
            console.error('Error checking role:', error);
            setHasAccess(false);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-pulse text-muted-foreground">Verificando acesso...</div>
            </div>
        );
    }

    if (!session) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (requiredRole && !hasAccess) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-foreground mb-2">Acesso Negado</h1>
                    <p className="text-muted-foreground">Você não tem permissão para acessar esta página.</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
