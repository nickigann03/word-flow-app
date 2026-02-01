"use client"

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User, Session } from '@supabase/supabase-js';
import { LoadingScreen } from '@/components/LoadingScreen';

// =====================================================
// TYPE DEFINITIONS
// =====================================================

interface AuthUser {
    uid: string;
    email: string | null;
    displayName?: string | null;
    photoURL?: string | null;
}

interface AuthContextType {
    user: AuthUser | null;
    loading: boolean;
    signup: (email: string, password: string) => Promise<void>;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    loginWithGoogle: () => Promise<void>;
}

// =====================================================
// CONTEXT
// =====================================================

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function useAuth() {
    return useContext(AuthContext);
}

// =====================================================
// HELPER: Convert Supabase User to App User format
// =====================================================

function toAuthUser(user: User | null): AuthUser | null {
    if (!user) return null;
    return {
        uid: user.id,
        email: user.email ?? null,
        displayName: user.user_metadata?.full_name || user.user_metadata?.name || null,
        photoURL: user.user_metadata?.avatar_url || null,
    };
}

// =====================================================
// AUTH PROVIDER
// =====================================================

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    // =====================================================
    // AUTH METHODS
    // =====================================================

    async function signup(email: string, password: string) {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    theme: 'dark',
                },
            },
        });

        if (error) throw error;

        // Create user profile
        if (data.user) {
            await supabase.from('profiles').upsert({
                id: data.user.id,
                email: data.user.email,
                preferences: { theme: 'dark' },
            });
        }
    }

    async function login(email: string, password: string) {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw error;
    }

    async function logout() {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        setUser(null);
    }

    async function loginWithGoogle() {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: typeof window !== 'undefined'
                    ? `${window.location.origin}/auth/callback`
                    : undefined,
            },
        });

        if (error) throw error;
    }

    // =====================================================
    // SESSION LISTENER
    // =====================================================

    useEffect(() => {
        // Get initial session
        const getInitialSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                setUser(toAuthUser(session?.user ?? null));
            } catch (error) {
                console.error('Error getting session:', error);
            } finally {
                setLoading(false);
            }
        };

        getInitialSession();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log('Auth state changed:', event);
                setUser(toAuthUser(session?.user ?? null));
                setLoading(false);

                // Create/update profile on sign in
                if (event === 'SIGNED_IN' && session?.user) {
                    const { data: existingProfile } = await supabase
                        .from('profiles')
                        .select('id')
                        .eq('id', session.user.id)
                        .single();

                    if (!existingProfile) {
                        await supabase.from('profiles').upsert({
                            id: session.user.id,
                            email: session.user.email,
                            display_name: session.user.user_metadata?.full_name || null,
                            avatar_url: session.user.user_metadata?.avatar_url || null,
                            preferences: { theme: 'dark' },
                        });
                    }
                }
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    // =====================================================
    // CONTEXT VALUE
    // =====================================================

    const value = {
        user,
        loading,
        signup,
        login,
        logout,
        loginWithGoogle,
    };

    return (
        <AuthContext.Provider value={value}>
            {loading ? <LoadingScreen /> : children}
        </AuthContext.Provider>
    );
}
