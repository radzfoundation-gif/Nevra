import { supabase, createAuthenticatedClient } from './supabase';

// Token costs per provider (estimated)
const TOKEN_COSTS = {
    anthropic: 10,      // 10 tokens per request (Claude Sonnet 4.5 via OpenRouter)
    deepseek: 10,    // 10 tokens per request
    openai: 10,    // 10 tokens per request
    gemini: 10,      // 10 tokens per request (Claude Sonnet 4.5 via OpenRouter)
};

// Free tier limit (tokens). Temporarily disabled for testing - set to very high value
export const FREE_TOKEN_LIMIT = 999999999;

// Helpers: WIB (UTC+7) date boundaries
const getWIBBounds = (date: Date = new Date()) => {
    const utc = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
    // WIB = UTC+7 => subtract 7 hours to get UTC start, then add back to ISO
    const year = utc.getUTCFullYear();
    const month = utc.getUTCMonth();
    const day = utc.getUTCDate();
    const startUTC = Date.UTC(year, month, day, -7, 0, 0, 0); // 00:00 WIB
    const endUTC = Date.UTC(year, month, day + 1, -7, 0, 0, 0); // 00:00 WIB next day
    return {
        start: new Date(startUTC).toISOString(),
        end: new Date(endUTC).toISOString(),
    };
};

/**
 * Check if user has exceeded token limit
 */
export async function checkTokenLimit(userId: string, token?: string | null): Promise<{
    hasExceeded: boolean;
    tokensUsed: number;
    tokensRemaining: number;
    isSubscribed: boolean;
}> {
    const client = token ? createAuthenticatedClient(token) : supabase;
    const { start, end } = getWIBBounds();

    // Check if user is subscribed
    const { data: prefs, error: prefsError } = await client
        .from('user_preferences')
        .select('preferences')
        .eq('user_id', userId)
        .single();

    // If no preferences found (PGRST116), user is not subscribed
    if (prefsError && prefsError.code !== 'PGRST116') {
        throw prefsError;
    }

    const isSubscribed = prefs?.preferences?.subscription === 'premium' ||
        prefs?.preferences?.subscription === 'pro' ||
        prefs?.preferences?.subscription === 'enterprise';

    // If subscribed, unlimited tokens
    if (isSubscribed) {
        return {
            hasExceeded: false,
            tokensUsed: 0,
            tokensRemaining: Infinity,
            isSubscribed: true,
        };
    }

    // Get total tokens used
    const { data: usage, error: usageError } = await client
        .from('ai_usage')
        .select('tokens_used')
        .eq('user_id', userId)
        .gte('created_at', start)
        .lt('created_at', end);
    
    if (usageError) {
        throw usageError;
    }

    const tokensUsed = usage?.reduce((sum, record) => sum + (record.tokens_used || 0), 0) || 0;
    const tokensRemaining = Math.max(0, FREE_TOKEN_LIMIT - tokensUsed);
    const hasExceeded = tokensUsed >= FREE_TOKEN_LIMIT;

    return {
        hasExceeded,
        tokensUsed,
        tokensRemaining,
        isSubscribed: false,
    };
}

/**
 * Track AI usage
 */
export async function trackAIUsage(
    userId: string,
    sessionId: string,
    provider: 'anthropic' | 'deepseek' | 'openai' | 'gemini',
    model?: string,
    token?: string | null
): Promise<boolean> {
    try {
        const client = token ? createAuthenticatedClient(token) : supabase;
        const tokensUsed = TOKEN_COSTS[provider];

        await client
            .from('ai_usage')
            .insert({
                user_id: userId,
                session_id: sessionId,
                provider,
                model: model || provider,
                tokens_used: tokensUsed,
                cost_usd: 0, // Free tier
            });

        return true;
    } catch (error) {
        console.error('Error tracking AI usage:', error);
        return false;
    }
}

/**
 * Get user's token usage summary
 */
export async function getTokenUsageSummary(userId: string): Promise<{
    totalTokens: number;
    usageByProvider: Record<string, number>;
    recentUsage: Array<{ date: string; tokens: number }>;
}> {
    try {
        const { start, end } = getWIBBounds();
        const { data: usage } = await supabase
            .from('ai_usage')
            .select('*')
            .eq('user_id', userId)
            .gte('created_at', start)
            .lt('created_at', end)
            .order('created_at', { ascending: false });

        if (!usage) {
            return {
                totalTokens: 0,
                usageByProvider: {},
                recentUsage: [],
            };
        }

        const totalTokens = usage.reduce((sum, record) => sum + (record.tokens_used || 0), 0);

        const usageByProvider = usage.reduce((acc, record) => {
            const provider = record.provider;
            acc[provider] = (acc[provider] || 0) + (record.tokens_used || 0);
            return acc;
        }, {} as Record<string, number>);

        // Group by date
        const usageByDate = usage.reduce((acc, record) => {
            const date = new Date(record.created_at).toLocaleDateString();
            acc[date] = (acc[date] || 0) + (record.tokens_used || 0);
            return acc;
        }, {} as Record<string, number>);

        const recentUsage = Object.entries(usageByDate)
            .map(([date, tokens]) => ({ date, tokens: tokens as number }))
            .slice(0, 7);

        return {
            totalTokens,
            usageByProvider,
            recentUsage,
        };
    } catch (error) {
        console.error('Error getting token usage summary:', error);
        return {
            totalTokens: 0,
            usageByProvider: {},
            recentUsage: [],
        };
    }
}

/**
 * Upgrade user to subscription
 */
export async function upgradeSubscription(
    userId: string,
    plan: 'premium' | 'pro' | 'enterprise'
): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('user_preferences')
            .upsert({
                user_id: userId,
                preferences: {
                    subscription: plan,
                    subscribed_at: new Date().toISOString(),
                },
            });

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error upgrading subscription:', error);
        return false;
    }
}
