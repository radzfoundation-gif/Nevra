import { supabase, createAuthenticatedClient, User, ChatSession, Message, UserPreferences } from './supabase';
import { encryptApiKey, decryptApiKey } from './crypto';

// Re-export types for convenience
export type { User, ChatSession, Message, UserPreferences };

export interface UserApiKey {
    id: string;
    user_id: string;
    provider: 'anthropic' | 'deepseek' | 'openai' | 'openai_image' | 'gemini';
    api_key_encrypted: string;
    is_active: boolean;
    auto_route_for: string[];
    priority: number;
    created_at: string;
    updated_at: string;
}


// =====================================================
// USER OPERATIONS
// =====================================================

/**
 * Sync Clerk user to Supabase
 * @param clerkUser - Clerk user data
 * @param token - Optional Clerk JWT token for authenticated requests (required for RLS)
 */
export async function syncUser(
    clerkUser: {
        id: string;
        emailAddresses: { emailAddress: string }[];
        fullName: string | null;
        imageUrl: string | null;
    },
    token?: string | null
): Promise<User | null> {
    try {
        // Use authenticated client if token provided, otherwise use anon client
        const client = token ? createAuthenticatedClient(token) : supabase;
        const { data, error } = await client
            .from('users')
            .upsert({
                id: clerkUser.id,
                email: clerkUser.emailAddresses[0]?.emailAddress || '',
                full_name: clerkUser.fullName,
                avatar_url: clerkUser.imageUrl,
                updated_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error syncing user:', error);
        return null;
    }
}

/**
 * Get user by ID
 */
export async function getUser(userId: string): Promise<User | null> {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error getting user:', error);
        return null;
    }
}

// =====================================================
// CHAT SESSION OPERATIONS
// =====================================================

/**
 * Create a new chat session
 */
export async function createChatSession(
    userId: string,
    mode: 'builder' | 'tutor',
    provider: 'anthropic' | 'deepseek' | 'openai' | 'gemini',
    title: string = 'New Chat',
    token?: string | null
): Promise<ChatSession | null> {
    try {
        const client = token ? createAuthenticatedClient(token) : supabase;
        const { data, error } = await client
            .from('chat_sessions')
            .insert({
                user_id: userId,
                title,
                mode,
                provider,
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error creating chat session:', error);
        return null;
    }
}

/**
 * Get all chat sessions for a user
 */
export async function getUserSessions(userId: string, token?: string | null): Promise<ChatSession[]> {
    try {
        const client = token ? createAuthenticatedClient(token) : supabase;
        const { data, error } = await client
            .from('chat_sessions')
            .select('*')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error getting user sessions:', error);
        return [];
    }
}

/**
 * Get a single chat session
 */
export async function getChatSession(sessionId: string): Promise<ChatSession | null> {
    try {
        const { data, error } = await supabase
            .from('chat_sessions')
            .select('*')
            .eq('id', sessionId)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error getting chat session:', error);
        return null;
    }
}

/**
 * Update chat session title
 */
export async function updateSessionTitle(sessionId: string, title: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('chat_sessions')
            .update({ title })
            .eq('id', sessionId);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error updating session title:', error);
        return false;
    }
}

/**
 * Update chat session mode
 */
export async function updateSessionMode(sessionId: string, mode: 'builder' | 'tutor', token?: string | null): Promise<boolean> {
    try {
        const client = token ? createAuthenticatedClient(token) : supabase;
        const { error } = await client
            .from('chat_sessions')
            .update({ mode, updated_at: new Date().toISOString() })
            .eq('id', sessionId);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error updating session mode:', error);
        return false;
    }
}

/**
 * Delete a chat session (cascade deletes messages)
 */
export async function deleteChatSession(sessionId: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('chat_sessions')
            .delete()
            .eq('id', sessionId);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error deleting chat session:', error);
        return false;
    }
}

// =====================================================
// MESSAGE OPERATIONS
// =====================================================

/**
 * Save a message to the database
 */
export async function saveMessage(
    sessionId: string,
    role: 'user' | 'ai',
    content: string,
    code?: string,
    images?: string[],
    token?: string | null
): Promise<Message | null> {
    try {
        const client = token ? createAuthenticatedClient(token) : supabase;
        const { data, error } = await client
            .from('messages')
            .insert({
                session_id: sessionId,
                role,
                content,
                code: code || null,
                images: images || null,
            })
            .select()
            .single();

        if (error) throw error;

        // Update session's updated_at
        await client
            .from('chat_sessions')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', sessionId);

        return data;
    } catch (error) {
        console.error('Error saving message:', error);
        return null;
    }
}

/**
 * Get all messages for a chat session
 */
export async function getSessionMessages(sessionId: string, token?: string | null): Promise<Message[]> {
    try {
        const client = token ? createAuthenticatedClient(token) : supabase;
        const { data, error } = await client
            .from('messages')
            .select('*')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error getting session messages:', error);
        return [];
    }
}

/**
 * Delete a message
 */
export async function deleteMessage(messageId: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('messages')
            .delete()
            .eq('id', messageId);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error deleting message:', error);
        return false;
    }
}

// =====================================================
// USER PREFERENCES OPERATIONS
// =====================================================

/**
 * Get user preferences
 */
export async function getUserPreferences(userId: string): Promise<UserPreferences | null> {
    try {
        const { data, error } = await supabase
            .from('user_preferences')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error) {
            // If no preferences exist, create default ones
            if (error.code === 'PGRST116') {
                return await createDefaultPreferences(userId);
            }
            throw error;
        }
        return data;
    } catch (error) {
        console.error('Error getting user preferences:', error);
        return null;
    }
}

/**
 * Create default preferences for a user
 */
async function createDefaultPreferences(userId: string): Promise<UserPreferences | null> {
    try {
        const { data, error } = await supabase
            .from('user_preferences')
            .insert({
                user_id: userId,
                default_provider: 'anthropic',
                theme: 'dark',
                preferences: {},
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error creating default preferences:', error);
        return null;
    }
}

/**
 * Update user preferences
 */
export async function updateUserPreferences(
    userId: string,
    updates: Partial<Omit<UserPreferences, 'user_id'>>
): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('user_preferences')
            .upsert({
                user_id: userId,
                ...updates,
            });

        if (error) throw error;
    } catch (error) {
        console.error('Error updating user preferences:', error);
        return false;
    }
}

// =====================================================
// USER API KEYS OPERATIONS
// =====================================================

/**
 * Get user API keys (decrypted on client side)
 */
export async function getUserApiKeys(userId: string, token?: string | null): Promise<UserApiKey[]> {
    try {
        const client = token ? await createAuthenticatedClient(token) : supabase;
        const { data, error } = await client
            .from('user_api_keys')
            .select('*')
            .eq('user_id', userId)
            .eq('is_active', true)
            .order('priority', { ascending: false });

        if (error) throw error;
        
        // Decrypt API keys asynchronously
        if (data && data.length > 0) {
            const decryptedKeys = await Promise.all(
                data.map(async (key) => {
                    try {
                        const decrypted = await decryptApiKey(userId, key.api_key_encrypted);
                        return {
                            ...key,
                            api_key_encrypted: decrypted, // Store decrypted value temporarily
                        };
                    } catch (decryptError) {
                        console.error(`Error decrypting key for provider ${key.provider}:`, decryptError);
                        // Return original encrypted value if decryption fails
                        return key;
                    }
                })
            );
            return decryptedKeys;
        }
        
        return data || [];
    } catch (error) {
        console.error('Error getting user API keys:', error);
        return [];
    }
}

/**
 * Save/Update user API key
 */
export async function saveUserApiKey(
    userId: string,
    provider: UserApiKey['provider'],
    apiKey: string, // Plain text, will be encrypted on client
    autoRouteFor: string[] = [],
    priority: number = 0,
    token?: string | null
): Promise<boolean> {
    try {
        const client = token ? await createAuthenticatedClient(token) : supabase;
        
        // Encrypt API key before storing
        const encryptedKey = await encryptApiKey(userId, apiKey);
        
        const { error } = await client
            .from('user_api_keys')
            .upsert({
                user_id: userId,
                provider,
                api_key_encrypted: encryptedKey,
                auto_route_for: autoRouteFor,
                priority,
                is_active: true,
                updated_at: new Date().toISOString(),
            });

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error saving user API key:', error);
        return false;
    }
}

/**
 * Delete user API key
 */
export async function deleteUserApiKey(
    userId: string,
    provider: UserApiKey['provider'],
    token?: string | null
): Promise<boolean> {
    try {
        const client = token ? await createAuthenticatedClient(token) : supabase;
        const { error } = await client
            .from('user_api_keys')
            .delete()
            .eq('user_id', userId)
            .eq('provider', provider);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error deleting user API key:', error);
        return false;
    }
}

/**
 * Get API key for specific task type (auto-routing)
 */
export async function getApiKeyForTask(
    userId: string,
    taskType: 'image' | 'text' | 'code' | 'voice',
    preferredProvider?: string,
    token?: string | null
): Promise<{ provider: string; apiKey: string } | null> {
    try {
        const keys = await getUserApiKeys(userId, token);
        
        // Filter keys that support this task type
        const supportedKeys = keys.filter(key => 
            key.auto_route_for.includes(taskType) || key.auto_route_for.length === 0
        );

        if (supportedKeys.length === 0) return null;

        // If preferred provider specified, try to use it
        if (preferredProvider) {
            const preferred = supportedKeys.find(k => k.provider === preferredProvider);
            if (preferred) {
                return {
                    provider: preferred.provider,
                    apiKey: preferred.api_key_encrypted
                };
            }
        }

        // Use highest priority key
        const bestKey = supportedKeys.sort((a, b) => b.priority - a.priority)[0];
        
        return {
            provider: bestKey.provider,
            apiKey: bestKey.api_key_encrypted
        };
    } catch (error) {
        console.error('Error getting API key for task:', error);
        return null;
    }
}

/**
 * Mark feedback as given for a user
 */
export async function markFeedbackGiven(userId: string): Promise<boolean> {
    try {
        // First get existing preferences to merge
        const current = await getUserPreferences(userId);
        const currentPrefs = current?.preferences || {};

        const { error } = await supabase
            .from('user_preferences')
            .upsert({
                user_id: userId,
                preferences: { ...currentPrefs, has_given_feedback: true }
            });

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error marking feedback as given:', error);
        return false;
    }
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Generate a chat title from the first message
 */
export function generateChatTitle(firstMessage: string): string {
    const maxLength = 50;
    const cleaned = firstMessage.trim().replace(/\s+/g, ' ');

    if (cleaned.length <= maxLength) {
        return cleaned;
    }

    return cleaned.substring(0, maxLength).trim() + '...';
}

/**
 * Search chat sessions by title
 */
export async function searchChatSessions(userId: string, query: string): Promise<ChatSession[]> {
    try {
        const { data, error } = await supabase
            .from('chat_sessions')
            .select('*')
            .eq('user_id', userId)
            .ilike('title', `%${query}%`)
            .order('updated_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error searching chat sessions:', error);
        return [];
    }
}


