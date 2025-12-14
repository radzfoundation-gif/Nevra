import React, { useState, useEffect, useCallback } from 'react';
import {
    MessageSquare, Search, Settings,
    CreditCard, LogOut, Plus,
    MoreHorizontal, Trash2, X,
    Pencil, Folder, FolderOpen
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useClerk, useUser } from '@clerk/clerk-react';
import { useChatSessions } from '@/hooks/useSupabase';
import Logo from './Logo';

interface SidebarProps {
    activeSessionId?: string;
    onNewChat: () => void;
    onSelectSession: (sessionId: string) => void;
    onOpenSettings: () => void;
    onClose?: () => void;
    onCollapse?: () => void;
    isSubscribed?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ 
    activeSessionId, 
    onNewChat, 
    onSelectSession, 
    onOpenSettings, 
    onClose, 
    onCollapse, 
    isSubscribed = false 
}) => {
    const { user } = useUser();
    const { signOut } = useClerk();
    const navigate = useNavigate();
    const { sessions, loading, error, deleteSession, refreshSessions } = useChatSessions();
    const [searchTerm, setSearchTerm] = useState('');
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showLibrary, setShowLibrary] = useState(false);
    const [showProjects, setShowProjects] = useState(false);

    // Auto-refresh sessions periodically to ensure sync
    useEffect(() => {
        if (!user) return;
        
        // Refresh every 5 seconds to catch new sessions
        const interval = setInterval(() => {
            refreshSessions();
        }, 5000);
        
        return () => clearInterval(interval);
    }, [user, refreshSessions]);

    // Filter sessions: show all modes (tutor/builder) to keep history in sync
    const filteredSessions = sessions.filter(session =>
        session.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Sort sessions by updated_at (most recent first)
    const sortedSessions = [...filteredSessions].sort((a, b) => {
        const dateA = new Date(a.updated_at || a.created_at).getTime();
        const dateB = new Date(b.updated_at || b.created_at).getTime();
        return dateB - dateA;
    });

    // Group sessions by date (simplified - just show all, no grouping for now)
    const groupedSessions: Record<string, typeof sortedSessions> = {
        'Recent': sortedSessions
    };

    const handleSignOut = async () => {
        await signOut();
        navigate('/');
    };

    // Get user initials for avatar
    const getUserInitials = () => {
        if (user?.fullName) {
            const names = user.fullName.split(' ');
            if (names.length >= 2) {
                return (names[0][0] + names[names.length - 1][0]).toUpperCase();
            }
            return user.fullName.substring(0, 2).toUpperCase();
        }
        return 'U';
    };

    const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
        e.stopPropagation();
        await deleteSession(sessionId);
        // Refresh after delete
        setTimeout(() => refreshSessions(), 500);
    };

    return (
        <div className="flex flex-col h-full bg-[#171717] w-full">
            {/* Top Section - Logo and New Chat */}
            <div className="px-2 py-2 space-y-1">
                {/* Logo */}
                <div className="px-2 py-1.5">
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 flex items-center justify-center">
                            <Logo size={18} />
                        </div>
                        <span className="text-xs font-semibold text-white">NEVRA</span>
                    </div>
                </div>

                {/* New Chat Button - ChatGPT Style */}
                <button
                    onClick={onNewChat}
                    className="w-full flex items-center gap-2 px-2 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors text-xs font-medium group"
                >
                    <div className="w-4 h-4 flex items-center justify-center">
                        <Plus size={14} className="group-hover:rotate-90 transition-transform duration-200" />
                    </div>
                    <span>New chat</span>
                </button>

                {/* Search Chats */}
                <div className="relative">
                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search chats"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white/5 hover:bg-white/10 border-0 rounded-lg pl-8 pr-2 py-1.5 text-xs text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-white/20 transition-colors"
                    />
                </div>

                {/* Library */}
                <button
                    onClick={() => setShowLibrary(!showLibrary)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-gray-300 hover:bg-white/5 rounded-lg transition-colors"
                >
                    {showLibrary ? <FolderOpen size={14} /> : <Folder size={14} />}
                    <span>Library</span>
                </button>

                {/* Projects */}
                <button
                    onClick={() => setShowProjects(!showProjects)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-gray-300 hover:bg-white/5 rounded-lg transition-colors"
                >
                    {showProjects ? <FolderOpen size={14} /> : <Folder size={14} />}
                    <span>Projects</span>
                </button>
            </div>

            {/* Divider */}
            <div className="h-px bg-white/10 mx-2 my-1"></div>

            {/* Chat History Section */}
            <div className="flex-1 overflow-y-auto px-1 py-1 min-h-0">
                {error && (
                    <div className="mx-2 mb-2 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-2 py-1.5">
                        {error}
                    </div>
                )}
                
                {loading ? (
                    <div className="text-center py-8 text-xs text-gray-400">Loading chats...</div>
                ) : (
                    <>
                        {sortedSessions.length > 0 && (
                            <div className="px-2 mb-1">
                                <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                                    Recent
                                </h3>
                            </div>
                        )}
                        
                        <div className="space-y-0.5">
                            {sortedSessions.map((session) => (
                                <div
                                    key={session.id}
                                    className={`group relative flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-colors ${
                                        activeSessionId === session.id
                                            ? 'bg-white/10 text-white'
                                            : 'text-gray-300 hover:bg-white/5'
                                    }`}
                                    onClick={() => onSelectSession(session.id)}
                                >
                                    <MessageSquare 
                                        size={14} 
                                        className={activeSessionId === session.id ? 'text-white shrink-0' : 'text-gray-400 shrink-0'} 
                                    />
                                    <span className="text-xs truncate flex-1 min-w-0">{session.title}</span>

                                    {/* Delete Button (visible on hover) */}
                                    <button
                                        onClick={(e) => handleDeleteSession(e, session.id)}
                                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 hover:text-red-400 rounded transition-all shrink-0"
                                        title="Delete chat"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {sortedSessions.length === 0 && !loading && (
                            <div className="text-center py-12 px-4">
                                <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <MessageSquare size={18} className="text-gray-500" />
                                </div>
                                <p className="text-xs text-gray-400">No chats yet</p>
                                <p className="text-[10px] text-gray-500 mt-1">Start a new conversation</p>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Bottom Section - User Profile */}
            <div className="px-2 py-2 border-t border-white/10">
                <div className="relative">
                    <button
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        className="w-full flex items-center gap-2 px-2 py-2 hover:bg-white/5 rounded-lg transition-colors"
                    >
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-[10px] font-semibold shrink-0">
                            {user?.imageUrl ? (
                                <img
                                    src={user.imageUrl}
                                    alt={user.fullName || 'User'}
                                    className="w-full h-full rounded-full object-cover"
                                />
                            ) : (
                                getUserInitials()
                            )}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                            <div className="text-xs font-medium text-white truncate">
                                {user?.fullName || 'User'}
                            </div>
                            <div className="text-[10px] text-gray-400">
                                {isSubscribed ? 'Pro' : 'Free'}
                            </div>
                        </div>
                        {!isSubscribed && (
                            <Link
                                to="/pricing"
                                onClick={(e) => e.stopPropagation()}
                                className="px-2 py-0.5 text-[10px] font-medium bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors shrink-0"
                            >
                                Upgrade
                            </Link>
                        )}
                        <MoreHorizontal size={14} className="text-gray-400 shrink-0" />
                    </button>

                    {/* User Dropdown */}
                    {showUserMenu && (
                        <>
                            <div 
                                className="fixed inset-0 z-40" 
                                onClick={() => setShowUserMenu(false)}
                            />
                            <div className="absolute bottom-full left-0 w-full mb-2 bg-[#1f1f1f] border border-white/10 rounded-lg shadow-xl overflow-hidden z-50">
                                <button
                                    onClick={onOpenSettings}
                                    className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-gray-300 hover:bg-white/5 transition-colors"
                                >
                                    <Settings size={14} />
                                    Settings
                                </button>
                                <Link
                                    to="/pricing"
                                    className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-gray-300 hover:bg-white/5 transition-colors"
                                >
                                    <CreditCard size={14} />
                                    My Subscription
                                </Link>
                                <button
                                    onClick={handleSignOut}
                                    className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-red-400 hover:bg-white/5 transition-colors"
                                >
                                    <LogOut size={14} />
                                    Sign Out
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
