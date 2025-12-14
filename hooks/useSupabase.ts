import { useState, useEffect, useCallback } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import {
    getUserSessions,
    getSessionMessages,
    getUserPreferences,
    syncUser,
    deleteChatSession,
    ChatSession,
    Message,
    UserPreferences,
} from '@/lib/database';
import { supabase } from '@/lib/supabase';

const SUPABASE_TEMPLATE = import.meta.env.VITE_CLERK_SUPABASE_TEMPLATE || 'supabase';

/**
 * Hook to load and manage user's chat sessions
 */
export function useChatSessions() {
    const { user } = useUser();
    const { getToken } = useAuth();
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadSessions = useCallback(async () => {
        if (!user) return;

        try {
            setLoading(true);
            setError(null);
            // Get Clerk JWT token first (needed for both sync and queries)
            let token;
            try {
                token = await getToken({ template: SUPABASE_TEMPLATE });
            } catch (e) {
                console.warn("Clerk Supabase template missing or misconfigured. See CLERK_SUPABASE_GUIDE.md");
                setError(`Clerk Supabase token not available. Configure template "${SUPABASE_TEMPLATE}".`);
                setLoading(false);
                return;
            }

            // Ensure user is synced to Supabase (helps cross-device access)
            // Pass token to syncUser to bypass RLS policy
            try {
                await syncUser({
                    id: user.id,
                    emailAddresses: user.emailAddresses,
                    fullName: user.fullName,
                    imageUrl: user.imageUrl,
                }, token);
            } catch (e) {
                console.warn('Sync user to Supabase failed (non-fatal):', e);
            }
            const data = await getUserSessions(user.id, token);
            setSessions(data);
        } catch (err) {
            setError('Failed to load chat sessions');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [user, getToken]);

    useEffect(() => {
        if (!user) {
            setSessions([]);
            setLoading(false);
            return;
        }

        loadSessions();

        // Real-time subscription with better error handling
        let channel: ReturnType<typeof supabase.channel> | null = null;
        try {
            channel = supabase
                .channel(`chat_sessions_${user.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'chat_sessions',
                        filter: `user_id=eq.${user.id}`,
                    },
                    (payload) => {
                        console.log('📡 Real-time session update:', payload.eventType, payload.new || payload.old);
                        if (payload.eventType === 'INSERT') {
                            setSessions((prev) => {
                                // Check if session already exists to avoid duplicates
                                const exists = prev.some(s => s.id === (payload.new as ChatSession).id);
                                if (exists) return prev;
                                return [(payload.new as ChatSession), ...prev];
                            });
                        } else if (payload.eventType === 'DELETE') {
                            setSessions((prev) => prev.filter((s) => s.id !== (payload.old as ChatSession).id));
                        } else if (payload.eventType === 'UPDATE') {
                            setSessions((prev) =>
                                prev.map((s) => (s.id === (payload.new as ChatSession).id ? (payload.new as ChatSession) : s))
                            );
                        }
                    }
                )
                .subscribe((status, err) => {
                    if (err) {
                        console.warn('⚠️ Real-time subscription error:', err);
                    } else {
                        console.log('📡 Real-time subscription status:', status);
                    }
                });
        } catch (error) {
            console.warn('⚠️ Failed to setup real-time subscription:', error);
        }

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, loadSessions]);

    const refreshSessions = () => {
        loadSessions();
    };

    const deleteSession = async (sessionId: string) => {
        try {
            const success = await deleteChatSession(sessionId);
            if (success) {
                setSessions(prev => prev.filter(s => s.id !== sessionId));
            }
        } catch (err) {
            console.error('Failed to delete session:', err);
        }
    };

    return { sessions, loading, error, refreshSessions, deleteSession };
}

/**
 * Hook to load messages for a specific chat session
 */
export function useChatMessages(sessionId: string | null) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadMessages = useCallback(async () => {
        if (!sessionId) return;

        try {
            setLoading(true);
            setError(null);
            const data = await getSessionMessages(sessionId);
            setMessages(data);
        } catch (err) {
            setError('Failed to load messages');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [sessionId]);

    useEffect(() => {
        if (!sessionId) {
            setMessages([]);
            setLoading(false);
            return;
        }

        loadMessages();
    }, [sessionId, loadMessages]);

    const refreshMessages = () => {
        loadMessages();
    };

    return { messages, loading, error, refreshMessages };
}

/**
 * Hook to manage user preferences
 */
export function useUserPreferences() {
    const { user } = useUser();
    const [preferences, setPreferences] = useState<UserPreferences | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadPreferences = useCallback(async () => {
        if (!user) return;

        try {
            setLoading(true);
            setError(null);
            const data = await getUserPreferences(user.id);
            setPreferences(data);
        } catch (err) {
            setError('Failed to load preferences');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (!user) {
            setPreferences(null);
            setLoading(false);
            return;
        }

        loadPreferences();
    }, [user, loadPreferences]);

    const refreshPreferences = () => {
        loadPreferences();
    };

    return { preferences, loading, error, refreshPreferences };
}

/**
 * Hook to sync Clerk user with Supabase on mount
 */
export function useUserSync() {
    const { user } = useUser();
    const { getToken } = useAuth();
    const [synced, setSynced] = useState(false);

    useEffect(() => {
        if (!user) {
            setSynced(false);
            return;
        }

        const sync = async () => {
            try {
                // Get Clerk JWT token for authenticated Supabase request
                let token: string | null = null;
                try {
                    token = await getToken({ template: SUPABASE_TEMPLATE });
                } catch (e) {
                    console.warn('Clerk Supabase template missing, syncing without token (may fail due to RLS):', e);
                }
                
                await syncUser({
                    id: user.id,
                    emailAddresses: user.emailAddresses,
                    fullName: user.fullName,
                    imageUrl: user.imageUrl,
                }, token);
                setSynced(true);
            } catch (error) {
                console.error('Failed to sync user:', error);
            }
        };

        sync();
    }, [user, getToken]);

    return { synced };
}
