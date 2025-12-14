import { useState, useEffect, useCallback, useRef } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { checkTokenLimit, trackAIUsage, getTokenUsageSummary, FREE_TOKEN_LIMIT } from '@/lib/tokenLimit';
import { supabase } from '@/lib/supabase';

const SUPABASE_TEMPLATE = import.meta.env.VITE_CLERK_SUPABASE_TEMPLATE || 'supabase';

/**
 * Hook to manage token limits and usage
 */
export function useTokenLimit() {
    const { user } = useUser();
    const { getToken } = useAuth();
    const [tokenData, setTokenData] = useState({
        hasExceeded: false,
        tokensUsed: 0,
        tokensRemaining: FREE_TOKEN_LIMIT,
        isSubscribed: false,
        loading: true,
    });
    
    // Ref untuk mencegah multiple simultaneous checks
    const isCheckingRef = useRef(false);
    const lastCheckTimeRef = useRef(0);
    const isRealtimeActiveRef = useRef(false);

    const checkLimit = useCallback(async () => {
        if (!user) return;
        
        // Debounce: jangan check terlalu sering (min 500ms antara checks)
        const now = Date.now();
        if (isCheckingRef.current || (now - lastCheckTimeRef.current < 500)) {
            return;
        }

        isCheckingRef.current = true;
        lastCheckTimeRef.current = now;

        try {
            const token = await getToken({ template: SUPABASE_TEMPLATE }).catch(() => null);
            const data = await checkTokenLimit(user.id, token);
            
            console.log('Token limit checked:', data);
            
            setTokenData(prev => {
                const next = {
                    ...data,
                    loading: false,
                };
                
                // Cache to sessionStorage for refresh and navigation persistence
                // This ensures token data persists when navigating between pages
                try {
                    const cacheKey = `nevra_token_session_${user.id}`;
                    const cacheData = {
                        ...next,
                        cachedAt: Date.now(),
                    };
                    sessionStorage.setItem(cacheKey, JSON.stringify(cacheData));
                    console.log('💾 Cached token data to sessionStorage:', cacheData);
                } catch (e) {
                    console.warn('Failed to cache token data to sessionStorage', e);
                }
                
                // Hanya update jika ada perubahan untuk menghindari unnecessary re-renders
                if (prev.tokensUsed !== data.tokensUsed || prev.hasExceeded !== data.hasExceeded || prev.isSubscribed !== data.isSubscribed) {
                    return next;
                }
                return { ...prev, loading: false };
            });
        } catch (error) {
            console.error('Error checking token limit:', error);
            // Jangan reset ke default; pertahankan state sebelumnya, hanya matikan loading
            setTokenData(prev => ({ ...prev, loading: false }));
        } finally {
            isCheckingRef.current = false;
        }
    }, [user, getToken]);

    useEffect(() => {
        if (!user) {
            setTokenData({
                hasExceeded: false,
                tokensUsed: 0,
                tokensRemaining: FREE_TOKEN_LIMIT,
                isSubscribed: false,
                loading: false,
            });
            return;
        }

        // Load from sessionStorage cache first (for refresh and navigation persistence)
        // This prevents reset when navigating between pages
        try {
            const cacheKey = `nevra_token_session_${user.id}`;
            const cached = sessionStorage.getItem(cacheKey);
            if (cached) {
                const parsed = JSON.parse(cached);
                // Use cache if it's less than 10 minutes old (longer for navigation)
                const cacheAge = Date.now() - (parsed.cachedAt || 0);
                if (cacheAge < 10 * 60 * 1000) {
                    // Restore from cache immediately to prevent reset
                    setTokenData({
                        ...parsed,
                        loading: true, // Still loading, will update from DB
                    });
                    console.log('📦 Restored token data from sessionStorage:', parsed);
                } else {
                    // Cache expired, clear it
                    sessionStorage.removeItem(cacheKey);
                }
            }
        } catch (e) {
            console.warn('Failed to read token session cache', e);
        }

        // Always sync with database (but don't reset if we have valid cache)
        checkLimit();

        // Real-time subscription untuk auto-update token usage
        let channel: ReturnType<typeof supabase.channel> | null = null;
        
        try {
            channel = supabase
                .channel(`ai_usage_changes_${user.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'ai_usage',
                        filter: `user_id=eq.${user.id}`,
                    },
                    (payload) => {
                        console.log('🔔 Real-time: Token usage updated:', payload);
                        setTimeout(() => {
                            checkLimit();
                        }, 800);
                    }
                )
                .subscribe((status, err) => {
                    if (err) {
                        console.warn('⚠️ Real-time subscription error:', err);
                        isRealtimeActiveRef.current = false;
                    } else {
                        console.log('📡 Real-time subscription status:', status);
                        if (status === 'SUBSCRIBED') {
                            isRealtimeActiveRef.current = true;
                        } else if (status === 'CHANNEL_ERROR') {
                            isRealtimeActiveRef.current = false;
                            console.warn('❌ Real-time channel error - using polling fallback');
                        }
                    }
                });
        } catch (error) {
            isRealtimeActiveRef.current = false;
            console.warn('⚠️ Real-time subscription failed, using polling fallback:', error);
        }

        // Fallback polling hanya ketika real-time tidak aktif
        const pollInterval = setInterval(() => {
            if (!isRealtimeActiveRef.current) {
                checkLimit();
            }
        }, 10_000);

        return () => {
            if (channel) {
                supabase.removeChannel(channel);
            }
            clearInterval(pollInterval);
        };
    }, [user, checkLimit]);

    // Optimistic update function
    const incrementTokenUsage = useCallback((tokens: number = 10) => {
        setTokenData(prev => {
            if (prev.isSubscribed) return prev; // Unlimited untuk subscribed users
            
            const newTokensUsed = prev.tokensUsed + tokens;
            const newTokensRemaining = Math.max(0, FREE_TOKEN_LIMIT - newTokensUsed);
            const newHasExceeded = newTokensUsed >= FREE_TOKEN_LIMIT;

            console.log('Optimistic update:', {
                old: prev.tokensUsed,
                new: newTokensUsed,
                remaining: newTokensRemaining
            });

            const nextState = {
                ...prev,
                tokensUsed: newTokensUsed,
                tokensRemaining: newTokensRemaining,
                hasExceeded: newHasExceeded,
            };

            // Cache optimistic update immediately to prevent reset on navigation
            if (user?.id) {
                try {
                    const cacheKey = `nevra_token_session_${user.id}`;
                    sessionStorage.setItem(cacheKey, JSON.stringify({
                        ...nextState,
                        cachedAt: Date.now(),
                    }));
                } catch (e) {
                    console.warn('Failed to cache optimistic token update', e);
                }
            }

            return nextState;
        });
    }, [user?.id]);

    const refreshLimit = useCallback(async () => {
        // Tidak memanggil setTokenData fallback default; hanya sync ke Supabase
        await checkLimit();
    }, [checkLimit]);

    return { ...tokenData, refreshLimit, incrementTokenUsage };
}

/**
 * Hook to track AI usage
 */
export function useTrackAIUsage() {
    const { user } = useUser();
    const { getToken } = useAuth();

    const trackUsage = async (
        sessionId: string,
        provider: 'anthropic' | 'deepseek' | 'openai' | 'gemini',
        model?: string
    ) => {
        if (!user) return false;

        try {
            const token = await getToken({ template: SUPABASE_TEMPLATE });
            await trackAIUsage(user.id, sessionId, provider, model, token);
            return true;
        } catch (error) {
            console.error('Error tracking AI usage:', error);
            return false;
        }
    };

    return { trackUsage };
}

/**
 * Hook to get usage summary
 */
export function useTokenUsageSummary() {
    const { user } = useUser();
    const [summary, setSummary] = useState({
        totalTokens: 0,
        usageByProvider: {} as Record<string, number>,
        recentUsage: [] as Array<{ date: string; tokens: number }>,
        loading: true,
    });

    useEffect(() => {
        if (!user) {
            setSummary({
                totalTokens: 0,
                usageByProvider: {},
                recentUsage: [],
                loading: false,
            });
            return;
        }

        loadSummary();
    }, [user]);

    const loadSummary = async () => {
        if (!user) return;

        try {
            const data = await getTokenUsageSummary(user.id);
            setSummary({
                ...data,
                loading: false,
            });
        } catch (error) {
            console.error('Error loading usage summary:', error);
            setSummary(prev => ({ ...prev, loading: false }));
        }
    };

    const refreshSummary = () => {
        loadSummary();
    };

    return { ...summary, refreshSummary };
}
