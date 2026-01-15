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
        setLoading(true);

        // Listener FIRST (avoid missing auth events)
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, nextSession) => {
            // Only synchronous state updates in callback
            setSession(nextSession);

            if (!nextSession) {
                setHasAccess(false);
                setLoading(false);
                return;
            }

            if (!requiredRole) {
                setHasAccess(true);
                setLoading(false);
                return;
            }

            // Defer Supabase query to avoid auth deadlocks
            setLoading(true);
            setHasAccess(false);
            setTimeout(() => {
                checkUserRole(nextSession.user.id, requiredRole);
            }, 0);
        });

        // THEN check for existing session
        supabase.auth
            .getSession()
            .then(({ data: { session: existingSession } }) => {
                setSession(existingSession);

                if (!existingSession) {
                    setHasAccess(false);
                    setLoading(false);
                    return;
                }

                if (!requiredRole) {
                    setHasAccess(true);
                    setLoading(false);
                    return;
                }

                checkUserRole(existingSession.user.id, requiredRole);
            })
            .catch(() => {
                setHasAccess(false);
                setLoading(false);
            });

        return () => subscription.unsubscribe();
    }, [requiredRole]);

    const checkUserRole = async (userId: string, role: 'admin' | 'secretary') => {
        try {
            const allowedRoles = role === 'admin' ? ['admin'] : ['admin', 'secretary'];
            
            // Ensure we have a valid session before querying
            const { data: sessionData } = await supabase.auth.getSession();
            if (!sessionData.session) {
                console.error('No session when checking role');
                setHasAccess(false);
                setLoading(false);
                return;
            }
            
            const { data, error } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', userId);

            if (error) {
                console.error('Error checking role:', error);
                setHasAccess(false);
            } else {
                console.log('User roles found:', data);
                const userHasRole = data?.some(r => allowedRoles.includes(r.role)) ?? false;
                setHasAccess(userHasRole);
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
