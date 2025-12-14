import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Globe, 
  Plus, 
  Trash2, 
  Play,
  Check,
  AlertCircle,
  Key,
  Settings,
  TestTube
} from 'lucide-react';
import { 
  generateAPIClient,
  testAPIEndpoint,
  APIConnection,
  APIEndpoint
} from '@/lib/apiIntegration';
import clsx from 'clsx';

interface APIIntegrationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerateCode?: (code: string) => void;
}

const APIIntegrationWizard: React.FC<APIIntegrationWizardProps> = ({
  isOpen,
  onClose,
  onGenerateCode,
}) => {
  const [connections, setConnections] = useState<APIConnection[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<APIConnection | null>(null);
  const [showConnectionForm, setShowConnectionForm] = useState(false);
  const [testingEndpoint, setTestingEndpoint] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; data?: any; error?: string } | null>(null);
  const [connectionForm, setConnectionForm] = useState<Partial<APIConnection>>({
    name: '',
    baseUrl: '',
    type: 'rest',
    authType: 'none',
  });

  useEffect(() => {
    if (isOpen) {
      loadConnections();
    }
  }, [isOpen]);

  const loadConnections = () => {
    try {
      const stored = localStorage.getItem('nevra_api_connections');
      if (stored) {
        const data = JSON.parse(stored);
        setConnections(data.map((conn: any) => ({
          ...conn,
          createdAt: new Date(conn.createdAt),
        })));
      }
    } catch (error) {
      console.error('Failed to load API connections:', error);
    }
  };

  const saveConnections = (conns: APIConnection[]) => {
    try {
      localStorage.setItem('nevra_api_connections', JSON.stringify(conns));
    } catch (error) {
      console.error('Failed to save API connections:', error);
    }
  };

  const handleCreateConnection = () => {
    if (!connectionForm.name || !connectionForm.baseUrl) return;
    
    const newConnection: APIConnection = {
      id: `api-${Date.now()}`,
      name: connectionForm.name,
      baseUrl: connectionForm.baseUrl,
      type: connectionForm.type || 'rest',
      authType: connectionForm.authType || 'none',
      apiKey: connectionForm.apiKey,
      bearerToken: connectionForm.bearerToken,
      headers: connectionForm.headers,
      endpoints: [],
      createdAt: new Date(),
    };
    
    const updated = [...connections, newConnection];
    setConnections(updated);
    saveConnections(updated);
    setSelectedConnection(newConnection);
    setShowConnectionForm(false);
    setConnectionForm({ name: '', baseUrl: '', type: 'rest', authType: 'none' });
  };

  const handleDeleteConnection = (id: string) => {
    if (confirm('Are you sure you want to delete this API connection?')) {
      const updated = connections.filter(c => c.id !== id);
      setConnections(updated);
      saveConnections(updated);
      if (selectedConnection?.id === id) {
        setSelectedConnection(null);
      }
    }
  };

  const handleAddEndpoint = () => {
    if (!selectedConnection) return;
    
    const newEndpoint: APIEndpoint = {
      method: 'GET',
      path: '/api/endpoint',
      description: '',
    };
    
    const updated = connections.map(conn => 
      conn.id === selectedConnection.id
        ? { ...conn, endpoints: [...conn.endpoints, newEndpoint] }
        : conn
    );
    
    setConnections(updated);
    saveConnections(updated);
    setSelectedConnection(updated.find(c => c.id === selectedConnection.id) || null);
  };

  const handleTestEndpoint = async (endpoint: APIEndpoint) => {
    if (!selectedConnection) return;
    
    setTestingEndpoint(endpoint.path);
    setTestResult(null);
    
    const result = await testAPIEndpoint(selectedConnection, endpoint);
    setTestResult(result);
    setTestingEndpoint(null);
  };

  const handleGenerateClient = () => {
    if (!selectedConnection) return;
    
    const clientCode = generateAPIClient(selectedConnection);
    if (onGenerateCode) {
      onGenerateCode(clientCode);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-6xl max-h-[90vh] bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">API Integration Wizard</h2>
            <p className="text-sm text-gray-400">Connect to external APIs and generate client code</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar - Connections */}
          <div className="w-64 border-r border-white/10 bg-[#050505] flex flex-col">
            <div className="p-4 border-b border-white/10">
              <button
                onClick={() => setShowConnectionForm(true)}
                className="w-full flex items-center gap-2 px-3 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 rounded-lg text-sm text-green-300 transition-colors"
              >
                <Plus size={16} />
                <span>New API</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {connections.map((conn) => (
                <button
                  key={conn.id}
                  onClick={() => setSelectedConnection(conn)}
                  className={clsx(
                    "w-full text-left p-3 rounded-lg mb-2 transition-colors",
                    selectedConnection?.id === conn.id
                      ? "bg-green-500/20 border border-green-500/30 text-white"
                      : "bg-white/5 hover:bg-white/10 text-gray-300"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Globe size={16} />
                    <div className="font-medium text-sm flex-1 truncate">{conn.name}</div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteConnection(conn.id);
                      }}
                      className="p-1 hover:bg-red-500/20 rounded text-red-400"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <div className="text-xs text-gray-500">{conn.type.toUpperCase()}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {selectedConnection ? (
              <div className="flex-1 overflow-y-auto p-6">
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-white">{selectedConnection.name}</h3>
                    <button
                      onClick={handleGenerateClient}
                      className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Generate Client Code
                    </button>
                  </div>
                  <div className="text-sm text-gray-400">
                    {selectedConnection.baseUrl} • {selectedConnection.type.toUpperCase()}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-white">Endpoints</h4>
                    <button
                      onClick={handleAddEndpoint}
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-gray-300 transition-colors"
                    >
                      <Plus size={14} className="inline mr-1" />
                      Add Endpoint
                    </button>
                  </div>

                  {selectedConnection.endpoints.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <Globe size={32} className="mx-auto mb-2 opacity-50" />
                      <p>No endpoints configured</p>
                      <p className="text-xs mt-1">Add endpoints to generate API client</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedConnection.endpoints.map((endpoint, index) => (
                        <div
                          key={index}
                          className="p-4 bg-white/5 rounded-lg border border-white/10"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className={clsx(
                                "px-2 py-0.5 rounded text-xs font-medium",
                                endpoint.method === 'GET' ? "bg-blue-500/20 text-blue-400" :
                                endpoint.method === 'POST' ? "bg-green-500/20 text-green-400" :
                                endpoint.method === 'PUT' ? "bg-yellow-500/20 text-yellow-400" :
                                endpoint.method === 'DELETE' ? "bg-red-500/20 text-red-400" :
                                "bg-gray-500/20 text-gray-400"
                              )}>
                                {endpoint.method}
                              </span>
                              <span className="text-sm text-white font-mono">{endpoint.path}</span>
                            </div>
                            <button
                              onClick={() => handleTestEndpoint(endpoint)}
                              disabled={testingEndpoint === endpoint.path}
                              className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded text-xs text-gray-300 transition-colors disabled:opacity-50"
                            >
                              {testingEndpoint === endpoint.path ? (
                                <span className="animate-spin">⏳</span>
                              ) : (
                                <TestTube size={14} />
                              )}
                            </button>
                          </div>
                          {testResult && testingEndpoint === null && (
                            <div className={clsx(
                              "mt-2 p-2 rounded text-xs",
                              testResult.success
                                ? "bg-green-500/20 text-green-400"
                                : "bg-red-500/20 text-red-400"
                            )}>
                              {testResult.success ? (
                                <Check size={14} className="inline mr-1" />
                              ) : (
                                <AlertCircle size={14} className="inline mr-1" />
                              )}
                              {testResult.success ? 'Success' : testResult.error}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <Globe size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No API connection selected</p>
                  <p className="text-sm mt-2">Create a new API connection to get started</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Connection Form Modal */}
        {showConnectionForm && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-10">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-md bg-[#1a1a1a] border border-white/10 rounded-xl p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">New API Connection</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
                  <input
                    type="text"
                    value={connectionForm.name || ''}
                    onChange={(e) => setConnectionForm({ ...connectionForm, name: e.target.value })}
                    placeholder="My API"
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Base URL</label>
                  <input
                    type="text"
                    value={connectionForm.baseUrl || ''}
                    onChange={(e) => setConnectionForm({ ...connectionForm, baseUrl: e.target.value })}
                    placeholder="https://api.example.com"
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
                  <select
                    value={connectionForm.type || 'rest'}
                    onChange={(e) => setConnectionForm({ ...connectionForm, type: e.target.value as any })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                  >
                    <option value="rest">REST API</option>
                    <option value="graphql">GraphQL</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Authentication</label>
                  <select
                    value={connectionForm.authType || 'none'}
                    onChange={(e) => setConnectionForm({ ...connectionForm, authType: e.target.value as any })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                  >
                    <option value="none">None</option>
                    <option value="api-key">API Key</option>
                    <option value="bearer">Bearer Token</option>
                    <option value="basic">Basic Auth</option>
                  </select>
                </div>
                {connectionForm.authType === 'api-key' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">API Key</label>
                    <input
                      type="password"
                      value={connectionForm.apiKey || ''}
                      onChange={(e) => setConnectionForm({ ...connectionForm, apiKey: e.target.value })}
                      placeholder="Your API key"
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500"
                    />
                  </div>
                )}
                {connectionForm.authType === 'bearer' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Bearer Token</label>
                    <input
                      type="password"
                      value={connectionForm.bearerToken || ''}
                      onChange={(e) => setConnectionForm({ ...connectionForm, bearerToken: e.target.value })}
                      placeholder="Your bearer token"
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500"
                    />
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateConnection}
                    className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => {
                      setShowConnectionForm(false);
                      setConnectionForm({ name: '', baseUrl: '', type: 'rest', authType: 'none' });
                    }}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default APIIntegrationWizard;
