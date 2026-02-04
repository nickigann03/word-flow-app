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
    loginAsGuest: () => void;
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

    function loginAsGuest() {
        const guestUser: AuthUser = {
            uid: 'guest-demo-user',
            email: 'guest@wordflow.app',
            displayName: 'Guest User',
            photoURL: null
        };
        setUser(guestUser);
        // Note: Guest data uses localStorage only, no cloud sync
        localStorage.setItem('cached_user', JSON.stringify(guestUser));
    }

    // =====================================================
    // SESSION LISTENER
    // =====================================================

    useEffect(() => {
        // Get initial session
        const getInitialSession = async () => {
            // 1. Optimistic Load from Local Cache
            const cachedJson = typeof window !== 'undefined' ? localStorage.getItem('cached_user') : null;
            let hasCache = false;

            if (cachedJson) {
                try {
                    const cachedUser = JSON.parse(cachedJson);
                    setUser(cachedUser);
                    hasCache = true;
                } catch (e) {
                    localStorage.removeItem('cached_user');
                }
            }

            try {
                // 2. Network Verify
                const { data: { session }, error } = await supabase.auth.getSession();

                if (error) throw error; // Will be caught below if network fails

                if (session?.user) {
                    const authUser = toAuthUser(session.user);
                    setUser(authUser);
                    localStorage.setItem('cached_user', JSON.stringify(authUser));
                } else {
                    // Valid response but no session -> User is actually logged out
                    setUser(null);
                    localStorage.removeItem('cached_user');
                }
            } catch (error) {
                console.warn('Supabase connection failed, falling back to offline cache:', error);
                // If we failed to connect (e.g. outage), we rely on the cache we loaded at step 1.
                // If no cache, we force logout.
                if (!hasCache) setUser(null);
            } finally {
                setLoading(false);
            }
        };

        getInitialSession();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log('Auth state changed:', event);

                if (event === 'SIGNED_OUT') {
                    setUser(null);
                    localStorage.removeItem('cached_user');
                } else if (session?.user) {
                    const authUser = toAuthUser(session.user);
                    setUser(authUser);
                    localStorage.setItem('cached_user', JSON.stringify(authUser));
                } else if (!session && event !== 'INITIAL_SESSION') {
                    // Only clear if explicitly missing session and not just initializing
                    // Actually, rely on SIGNED_OUT event for clearing usually
                }

                setLoading(false);

                // Create/update profile on sign in
                if (event === 'SIGNED_IN' && session?.user) {
                    const { data: existingProfile } = await supabase
                        .from('profiles')
                        .select('id')
                        .eq('id', session.user.id)
                        .maybeSingle();

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
        loginAsGuest,
    };

    return (
        <AuthContext.Provider value={value}>
            {loading ? <LoadingScreen /> : children}
        </AuthContext.Provider>
    );
}
