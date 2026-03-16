import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';

import { MASTER_ADMIN_IDS } from '@/lib/authConfig';

interface UserRole {
    role: 'admin' | 'secretary';
    unidade: string | null;
}

export function useAuth() {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [roles, setRoles] = useState<UserRole[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);

        // Listen for auth changes FIRST (avoid missing events)
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, nextSession) => {
            // Only synchronous state updates in the callback
            setSession(nextSession);
            setUser(nextSession?.user ?? null);

            if (!nextSession?.user) {
                setRoles([]);
                setLoading(false);
                return;
            }

            // Defer any Supabase queries to prevent auth deadlocks
            setLoading(true);
            setTimeout(() => {
                fetchUserRoles(nextSession.user.id);
            }, 0);
        });

        // THEN check for existing session
        supabase.auth
            .getSession()
            .then(({ data: { session: existingSession } }) => {
                setSession(existingSession);
                setUser(existingSession?.user ?? null);

                if (!existingSession?.user) {
                    setRoles([]);
                    setLoading(false);
                    return;
                }

                fetchUserRoles(existingSession.user.id);
            })
            .catch(() => {
                setRoles([]);
                setLoading(false);
            });

        return () => subscription.unsubscribe();
    }, []);

    const fetchUserRoles = async (userId: string) => {
        try {
            // Ensure session is fully propagated before querying
            const { data: sessionData } = await supabase.auth.getSession();
            if (!sessionData.session) {
                console.error('No session when fetching roles');
                setRoles([]);
                setLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from('user_roles')
                .select('role, unidade')
                .eq('user_id', userId);

            if (error) {
                console.error('Error fetching roles:', error);
            } else {
                console.log('Roles fetched:', data);
                setRoles(data as UserRole[] || []);
            }
        } catch (error) {
            console.error('Error fetching roles:', error);
        } finally {
            setLoading(false);
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    const isAdmin = roles.some(r => r.role === 'admin') || (user && MASTER_ADMIN_IDS.includes(user.id));
    const isSecretary = roles.some(r => r.role === 'secretary' || r.role === 'admin') || (user && MASTER_ADMIN_IDS.includes(user.id));
    
    const getUnidades = () => {
        return roles.map(r => r.unidade).filter(Boolean) as string[];
    };

    const hasUnitAccess = (unidade: string) => {
        if (user && MASTER_ADMIN_IDS.includes(user.id)) return true;
        return roles.some(r => r.unidade === null || r.unidade === unidade);
    };

    return {
        session,
        user,
        roles,
        loading,
        isAdmin,
        isSecretary,
        getUnidades,
        hasUnitAccess,
        signOut,
    };
}
