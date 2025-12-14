const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export interface GitHubRepo {
  id: number;
  name: string;
  fullName: string;
  private: boolean;
  url: string;
  defaultBranch: string;
}

export interface GitHubAuthResult {
  authUrl: string;
  state: string;
}

export interface GitHubPushResult {
  success: boolean;
  url: string;
  commitSha: string;
}

/**
 * Initiate GitHub OAuth flow
 */
export async function authenticateGitHub(): Promise<GitHubAuthResult> {
  try {
    const response = await fetch(`${API_BASE}/github/auth`);
    if (!response.ok) {
      throw new Error('Failed to initiate GitHub authentication');
    }
    return await response.json();
  } catch (error: any) {
    throw new Error(error.message || 'Failed to authenticate with GitHub');
  }
}

/**
 * Get stored GitHub token from URL or localStorage
 */
export function getGitHubToken(): string | null {
  // Check URL params first (from OAuth callback)
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('github_token');
  if (token) {
    // Store in localStorage
    localStorage.setItem('github_token', token);
    // Clean URL
    window.history.replaceState({}, '', window.location.pathname);
    return token;
  }
  
  // Check localStorage
  return localStorage.getItem('github_token');
}

/**
 * Store GitHub token
 */
export function setGitHubToken(token: string): void {
  localStorage.setItem('github_token', token);
}

/**
 * Remove GitHub token
 */
export function removeGitHubToken(): void {
  localStorage.removeItem('github_token');
}

/**
 * List user repositories
 */
export async function listRepositories(token: string): Promise<GitHubRepo[]> {
  try {
    const response = await fetch(`${API_BASE}/github/repos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch repositories');
    }
    
    const data = await response.json();
    return data.repos || [];
  } catch (error: any) {
    throw new Error(error.message || 'Failed to list repositories');
  }
}

/**
 * Create a new repository
 */
export async function createRepository(
  token: string,
  name: string,
  description?: string,
  isPrivate: boolean = false
): Promise<GitHubRepo> {
  try {
    const response = await fetch(`${API_BASE}/github/create-repo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        name,
        description,
        isPrivate,
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create repository');
    }
    
    return await response.json();
  } catch (error: any) {
    throw new Error(error.message || 'Failed to create repository');
  }
}

/**
 * Push files to GitHub repository
 */
export async function pushToRepository(
  token: string,
  repo: GitHubRepo | string,
  files: Array<{ path: string; content: string } | string>,
  commitMessage?: string,
  branch?: string
): Promise<GitHubPushResult> {
  try {
    const response = await fetch(`${API_BASE}/github/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        repo,
        files,
        commitMessage: commitMessage || 'Update from NEVRA',
        branch: branch || 'main',
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to push to repository');
    }
    
    return await response.json();
  } catch (error: any) {
    throw new Error(error.message || 'Failed to push to repository');
  }
}

/**
 * Auto-sync files to GitHub (watch for changes and auto-push)
 */
export class GitHubAutoSync {
  private syncInterval: number | null = null;
  private lastSyncTime: Date | null = null;
  private isSyncing: boolean = false;
  private token: string;
  private repo: GitHubRepo;
  private branch: string;
  private onSyncStatus?: (status: 'syncing' | 'success' | 'error', message?: string) => void;

  constructor(
    token: string,
    repo: GitHubRepo,
    branch: string = 'main',
    onSyncStatus?: (status: 'syncing' | 'success' | 'error', message?: string) => void
  ) {
    this.token = token;
    this.repo = repo;
    this.branch = branch;
    this.onSyncStatus = onSyncStatus;
  }

  /**
   * Start auto-sync (check for changes every N seconds)
   */
  start(intervalSeconds: number = 30): void {
    if (this.syncInterval) return; // Already running
    
    this.syncInterval = window.setInterval(async () => {
      if (!this.isSyncing) {
        await this.sync();
      }
    }, intervalSeconds * 1000);
  }

  /**
   * Stop auto-sync
   */
  stop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Manual sync
   */
  async sync(files?: Array<{ path: string; content: string; type: string }>): Promise<boolean> {
    if (this.isSyncing) return false;
    
    this.isSyncing = true;
    this.onSyncStatus?.('syncing', 'Syncing to GitHub...');
    
    try {
      if (!files) {
        // Get files from current project state
        // This would need to be passed from the component
        this.onSyncStatus?.('error', 'No files to sync');
        return false;
      }

      const result = await pushToRepository(
        this.token,
        this.repo,
        exportProjectForGitHub(files),
        `Auto-sync: ${new Date().toLocaleString()}`,
        this.branch
      );

      this.lastSyncTime = new Date();
      this.onSyncStatus?.('success', 'Synced successfully');
      return true;
    } catch (error: any) {
      this.onSyncStatus?.('error', error.message || 'Sync failed');
      return false;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Get last sync time
   */
  getLastSyncTime(): Date | null {
    return this.lastSyncTime;
  }

  /**
   * Check if auto-sync is running
   */
  isRunning(): boolean {
    return this.syncInterval !== null;
  }
}

/**
 * Export project files for GitHub
 */
export function exportProjectForGitHub(
  files: Array<{ path: string; content: string; type: string }>,
  framework?: string
): Array<{ path: string; content: string }> {
  const exported: Array<{ path: string; content: string }> = [];
  
  // Add all project files
  files.forEach(file => {
    exported.push({
      path: file.path,
      content: file.content,
    });
  });
  
  // Add framework-specific files
  if (framework === 'react' || framework === 'next') {
    // Add package.json if not exists
    if (!files.some(f => f.path.includes('package.json'))) {
      exported.push({
        path: 'package.json',
        content: JSON.stringify({
          name: 'nevra-project',
          version: '1.0.0',
          private: true,
          scripts: {
            dev: 'vite',
            build: 'vite build',
            preview: 'vite preview',
          },
          dependencies: {
            react: '^18.2.0',
            'react-dom': '^18.2.0',
          },
          devDependencies: {
            vite: '^5.0.0',
            '@vitejs/plugin-react': '^4.2.0',
          },
        }, null, 2),
      });
    }
    
    // Add README.md if not exists
    if (!files.some(f => f.path.includes('README.md'))) {
      exported.push({
        path: 'README.md',
        content: '# NEVRA Project\n\nGenerated with NEVRA AI Builder.\n',
      });
    }
    
    // Add .gitignore if not exists
    if (!files.some(f => f.path.includes('.gitignore'))) {
      exported.push({
        path: '.gitignore',
        content: 'node_modules\n.DS_Store\ndist\n*.log\n',
      });
    }
  }
  
  return exported;
}
