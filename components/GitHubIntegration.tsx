import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Github, 
  X, 
  Plus, 
  Loader2, 
  Check, 
  ExternalLink,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import {
  authenticateGitHub,
  getGitHubToken,
  setGitHubToken,
  removeGitHubToken,
  listRepositories,
  createRepository,
  pushToRepository,
  exportProjectForGitHub,
  GitHubRepo,
  GitHubAutoSync,
} from '@/lib/github';
import { ProjectFile } from '@/lib/fileManager';
import clsx from 'clsx';

interface GitHubIntegrationProps {
  isOpen: boolean;
  onClose: () => void;
  files: ProjectFile[];
  framework?: string;
  projectName?: string;
}

const GitHubIntegration: React.FC<GitHubIntegrationProps> = ({
  isOpen,
  onClose,
  files,
  framework,
  projectName,
}) => {
  const [token, setToken] = useState<string | null>(null);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [pushResult, setPushResult] = useState<{ success: boolean; url?: string; error?: string } | null>(null);
  const [newRepoName, setNewRepoName] = useState('');
  const [newRepoDescription, setNewRepoDescription] = useState('');
  const [showCreateRepo, setShowCreateRepo] = useState(false);
  const [commitMessage, setCommitMessage] = useState('Update from NEVRA');
  const [branch, setBranch] = useState('main');
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [autoSyncStatus, setAutoSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [autoSyncMessage, setAutoSyncMessage] = useState<string>('');
  const autoSyncRef = React.useRef<GitHubAutoSync | null>(null);

  useEffect(() => {
    if (isOpen) {
      const storedToken = getGitHubToken();
      setToken(storedToken);
      if (storedToken) {
        loadRepositories(storedToken);
      }
    }
    
    // Cleanup auto-sync on unmount
    return () => {
      if (autoSyncRef.current) {
        autoSyncRef.current.stop();
        autoSyncRef.current = null;
      }
    };
  }, [isOpen]);

  const loadRepositories = async (githubToken: string) => {
    setIsLoading(true);
    try {
      const reposList = await listRepositories(githubToken);
      setRepos(reposList);
    } catch (error) {
      console.error('Error loading repositories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      const { authUrl } = await authenticateGitHub();
      window.location.href = authUrl;
    } catch (error) {
      console.error('GitHub auth error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert('Failed to connect to GitHub: ' + errorMessage);
    }
  };

  const handleDisconnect = () => {
    removeGitHubToken();
    setToken(null);
    setRepos([]);
    setSelectedRepo(null);
  };

  const handleCreateRepo = async () => {
    if (!newRepoName || !token) return;
    
    setIsLoading(true);
    try {
      const newRepo = await createRepository(
        token,
        newRepoName,
        newRepoDescription,
        false
      );
      setRepos(prev => [newRepo, ...prev]);
      setSelectedRepo(newRepo);
      setShowCreateRepo(false);
      setNewRepoName('');
      setNewRepoDescription('');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert('Failed to create repository: ' + errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePush = async () => {
    if (!selectedRepo || !token || files.length === 0) return;
    
    setIsPushing(true);
    setPushResult(null);
    
    try {
      // Export files for GitHub
      const exportedFiles = exportProjectForGitHub(files, framework);
      
      const result = await pushToRepository(
        token,
        selectedRepo,
        exportedFiles,
        commitMessage || `Update from NEVRA - ${new Date().toLocaleDateString()}`,
        branch
      );
      
      setPushResult({
        success: true,
        url: result.url,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to push to GitHub';
      setPushResult({
        success: false,
        error: errorMessage,
      });
    } finally {
      setIsPushing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-2xl max-h-[90vh] bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Github size={24} className="text-white" />
            <div>
              <h2 className="text-xl font-bold text-white">GitHub Integration</h2>
              <p className="text-sm text-gray-400">Push your project to GitHub</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Authentication Status */}
          {!token ? (
            <div className="text-center py-8">
              <Github size={48} className="mx-auto mb-4 text-gray-600" />
              <h3 className="text-lg font-semibold text-white mb-2">Connect to GitHub</h3>
              <p className="text-sm text-gray-400 mb-6">
                Connect your GitHub account to push your projects
              </p>
              <button
                onClick={handleConnect}
                className="px-6 py-3 bg-white hover:bg-gray-100 text-black rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto"
              >
                <Github size={20} />
                Connect GitHub
              </button>
            </div>
          ) : (
            <>
              {/* Connected Status */}
              <div className="flex items-center justify-between p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <Check size={20} className="text-green-400" />
                  <div>
                    <p className="text-sm font-medium text-white">Connected to GitHub</p>
                    <p className="text-xs text-gray-400">Ready to push your project</p>
                  </div>
                </div>
                <button
                  onClick={handleDisconnect}
                  className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded transition-colors"
                >
                  Disconnect
                </button>
              </div>

              {/* Repository Selection */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white">Select Repository</h3>
                  <button
                    onClick={() => {
                      setShowCreateRepo(!showCreateRepo);
                      if (token) loadRepositories(token);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded transition-colors"
                  >
                    <Plus size={14} />
                    {showCreateRepo ? 'Cancel' : 'New Repo'}
                  </button>
                </div>

                {/* Create New Repo */}
                <AnimatePresence>
                  {showCreateRepo && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mb-4 p-4 bg-white/5 border border-white/10 rounded-lg space-y-3"
                    >
                      <input
                        type="text"
                        placeholder="Repository name"
                        value={newRepoName}
                        onChange={(e) => setNewRepoName(e.target.value)}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
                      />
                      <input
                        type="text"
                        placeholder="Description (optional)"
                        value={newRepoDescription}
                        onChange={(e) => setNewRepoDescription(e.target.value)}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
                      />
                      <button
                        onClick={handleCreateRepo}
                        disabled={!newRepoName || isLoading}
                        className="w-full px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 size={14} className="inline mr-2 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          'Create Repository'
                        )}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Repository List */}
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 size={24} className="text-gray-400 animate-spin" />
                  </div>
                ) : repos.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    No repositories found
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {repos.map((repo) => (
                      <button
                        key={repo.id}
                        onClick={() => setSelectedRepo(repo)}
                        className={clsx(
                          "w-full p-3 rounded-lg border transition-all text-left",
                          selectedRepo?.id === repo.id
                            ? "bg-purple-500/20 border-purple-500/30"
                            : "bg-white/5 border-white/10 hover:bg-white/10"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-white">{repo.name}</p>
                            <p className="text-xs text-gray-400">{repo.fullName}</p>
                          </div>
                          {repo.private && (
                            <span className="px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-400 rounded">
                              Private
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Commit Settings */}
              {selectedRepo && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-white">Commit Settings</h3>
                  <input
                    type="text"
                    placeholder="Commit message"
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
                  />
                  <input
                    type="text"
                    placeholder="Branch (default: main)"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
                  />
                  
                  {/* Auto-Sync Toggle */}
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                    <div>
                      <p className="text-sm font-medium text-white">Auto-Sync</p>
                      <p className="text-xs text-gray-400">Automatically push changes every 30 seconds</p>
                    </div>
                    <button
                      onClick={() => {
                        if (autoSyncEnabled) {
                          // Stop auto-sync
                          if (autoSyncRef.current) {
                            autoSyncRef.current.stop();
                            autoSyncRef.current = null;
                          }
                          setAutoSyncEnabled(false);
                          setAutoSyncStatus('idle');
                        } else {
                          // Start auto-sync
                          if (token && selectedRepo) {
                            const autoSync = new GitHubAutoSync(
                              token,
                              selectedRepo,
                              branch,
                              (status, message) => {
                                setAutoSyncStatus(status);
                                setAutoSyncMessage(message || '');
                              }
                            );
                            autoSync.start(30);
                            autoSyncRef.current = autoSync;
                            setAutoSyncEnabled(true);
                          }
                        }
                      }}
                      className={clsx(
                        "relative w-12 h-6 rounded-full transition-colors",
                        autoSyncEnabled ? "bg-green-500" : "bg-gray-600"
                      )}
                    >
                      <div className={clsx(
                        "absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform",
                        autoSyncEnabled ? "translate-x-6" : "translate-x-0"
                      )} />
                    </button>
                  </div>
                  
                  {/* Auto-Sync Status */}
                  {autoSyncEnabled && (
                    <div className={clsx(
                      "p-3 rounded-lg border text-xs",
                      autoSyncStatus === 'syncing' ? "bg-blue-500/10 border-blue-500/30 text-blue-400" :
                      autoSyncStatus === 'success' ? "bg-green-500/10 border-green-500/30 text-green-400" :
                      autoSyncStatus === 'error' ? "bg-red-500/10 border-red-500/30 text-red-400" :
                      "bg-white/5 border-white/10 text-gray-400"
                    )}>
                      {autoSyncStatus === 'syncing' && <span>⏳ Syncing...</span>}
                      {autoSyncStatus === 'success' && <span>✅ {autoSyncMessage || 'Synced successfully'}</span>}
                      {autoSyncStatus === 'error' && <span>❌ {autoSyncMessage || 'Sync failed'}</span>}
                      {autoSyncStatus === 'idle' && <span>🔄 Waiting for changes...</span>}
                    </div>
                  )}
                </div>
              )}

              {/* Push Result */}
              {pushResult && (
                <div className={clsx(
                  "p-4 rounded-lg border",
                  pushResult.success
                    ? "bg-green-500/10 border-green-500/30"
                    : "bg-red-500/10 border-red-500/30"
                )}>
                  <div className="flex items-start gap-3">
                    {pushResult.success ? (
                      <Check size={20} className="text-green-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle size={20} className="text-red-400 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className={clsx(
                        "text-sm font-medium mb-1",
                        pushResult.success ? "text-green-400" : "text-red-400"
                      )}>
                        {pushResult.success ? 'Successfully pushed to GitHub!' : 'Failed to push'}
                      </p>
                      {pushResult.success && pushResult.url && (
                        <a
                          href={pushResult.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                        >
                          View on GitHub <ExternalLink size={12} />
                        </a>
                      )}
                      {pushResult.error && (
                        <p className="text-xs text-red-300 mt-1">{pushResult.error}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {token && selectedRepo && (
          <div className="p-6 border-t border-white/10">
            <button
              onClick={handlePush}
              disabled={isPushing || files.length === 0}
              className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isPushing ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Pushing to GitHub...
                </>
              ) : (
                <>
                  <Github size={18} />
                  Push to GitHub
                </>
              )}
            </button>
            <p className="text-xs text-gray-500 text-center mt-2">
              {files.length} file{files.length !== 1 ? 's' : ''} ready to push
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default GitHubIntegration;
