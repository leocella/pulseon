import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';

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
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchUserRoles(session.user.id);
            } else {
                setLoading(false);
            }
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchUserRoles(session.user.id);
            } else {
                setRoles([]);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchUserRoles = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('user_roles')
                .select('role, unidade')
                .eq('user_id', userId);

            if (error) {
                console.error('Error fetching roles:', error);
            } else {
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

    const isAdmin = roles.some(r => r.role === 'admin');
    const isSecretary = roles.some(r => r.role === 'secretary' || r.role === 'admin');
    
    const getUnidades = () => {
        return roles.map(r => r.unidade).filter(Boolean) as string[];
    };

    const hasUnitAccess = (unidade: string) => {
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
