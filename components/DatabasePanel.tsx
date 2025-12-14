import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Database, 
  Plus, 
  Trash2, 
  Edit2, 
  Play,
  Check,
  AlertCircle,
  Table,
  Key,
  Link as LinkIcon
} from 'lucide-react';
import { 
  databaseManager, 
  DatabaseConnection, 
  DatabaseSchema, 
  DatabaseTable,
  DatabaseColumn
} from '@/lib/databaseIntegration';
import clsx from 'clsx';

interface DatabasePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerateCode?: (code: string) => void;
}

const DatabasePanel: React.FC<DatabasePanelProps> = ({
  isOpen,
  onClose,
  onGenerateCode,
}) => {
  const [connections, setConnections] = useState<DatabaseConnection[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<DatabaseConnection | null>(null);
  const [schemas, setSchemas] = useState<Map<string, DatabaseSchema>>(new Map());
  const [showConnectionForm, setShowConnectionForm] = useState(false);
  const [showSchemaEditor, setShowSchemaEditor] = useState(false);
  const [connectionForm, setConnectionForm] = useState<Partial<DatabaseConnection>>({
    name: '',
    type: 'supabase',
    baseUrl: '',
    supabaseUrl: '',
    supabaseKey: '',
  });

  useEffect(() => {
    if (isOpen) {
      loadConnections();
    }
  }, [isOpen]);

  const loadConnections = () => {
    const allConnections = databaseManager.getAllConnections();
    setConnections(allConnections);
    if (allConnections.length > 0 && !selectedConnection) {
      setSelectedConnection(allConnections[0]);
    }
  };

  const handleCreateConnection = () => {
    if (!connectionForm.name || !connectionForm.type) return;
    
    const newConnection = databaseManager.createConnection({
      name: connectionForm.name,
      type: connectionForm.type as 'supabase' | 'postgresql' | 'mysql' | 'sqlite',
      supabaseUrl: connectionForm.supabaseUrl,
      supabaseKey: connectionForm.supabaseKey,
      baseUrl: connectionForm.baseUrl,
    } as DatabaseConnection);
    
    setConnections(databaseManager.getAllConnections());
    setSelectedConnection(newConnection);
    setShowConnectionForm(false);
    setConnectionForm({ name: '', type: 'supabase' });
  };

  const handleDeleteConnection = (id: string) => {
    if (confirm('Are you sure you want to delete this connection?')) {
      databaseManager.deleteConnection(id);
      loadConnections();
      if (selectedConnection?.id === id) {
        setSelectedConnection(null);
      }
    }
  };

  const handleGenerateCRUD = (table: DatabaseTable) => {
    if (!selectedConnection) return;
    
    const crudCode = databaseManager.generateCRUDCode(table, selectedConnection);
    if (onGenerateCode) {
      onGenerateCode(crudCode);
    }
  };

  const handleGenerateMigration = (schema: DatabaseSchema) => {
    const migrationCode = databaseManager.generateSQLMigration(schema);
    if (onGenerateCode) {
      onGenerateCode(migrationCode);
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
            <h2 className="text-2xl font-bold text-white mb-1">Database Integration</h2>
            <p className="text-sm text-gray-400">Connect to databases and generate CRUD operations</p>
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
                className="w-full flex items-center gap-2 px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg text-sm text-blue-300 transition-colors"
              >
                <Plus size={16} />
                <span>New Connection</span>
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
                      ? "bg-blue-500/20 border border-blue-500/30 text-white"
                      : "bg-white/5 hover:bg-white/10 text-gray-300"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Database size={16} />
                    <div className="font-medium text-sm flex-1">{conn.name}</div>
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
                  <div className="text-xs text-gray-500">{conn.type}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {selectedConnection ? (
              <div className="flex-1 overflow-y-auto p-6">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-2">{selectedConnection.name}</h3>
                  <div className="text-sm text-gray-400">
                    Type: {selectedConnection.type} • Created: {new Date(selectedConnection.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <div className="space-y-4">
                  <button
                    onClick={() => setShowSchemaEditor(true)}
                    className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Plus size={16} className="inline mr-2" />
                    Generate Schema from Description
                  </button>

                  <div className="bg-white/5 rounded-lg border border-white/10 p-4">
                    <h4 className="text-sm font-semibold text-white mb-3">Quick Actions</h4>
                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          // Generate basic CRUD template based on connection type
                          const connectionType = selectedConnection.type;
                          const template = `// Database CRUD Operations Template
// Connection Type: ${connectionType}
// Replace with your actual table schema

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

// TODO: Implement CRUD operations using ${connectionType}
// Use the databaseManager.generateCRUDCode() method for full CRUD generation
`;
                          if (onGenerateCode) {
                            onGenerateCode(template);
                          }
                        }}
                        className="w-full text-left px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-gray-300 transition-colors"
                      >
                        Generate CRUD Template
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <Database size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No connection selected</p>
                  <p className="text-sm mt-2">Create a new connection to get started</p>
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
              <h3 className="text-lg font-semibold text-white mb-4">New Database Connection</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
                  <input
                    type="text"
                    value={connectionForm.name || ''}
                    onChange={(e) => setConnectionForm({ ...connectionForm, name: e.target.value })}
                    placeholder="My Database"
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
                  <select
                    value={connectionForm.type || 'supabase'}
                    onChange={(e) => setConnectionForm({ ...connectionForm, type: e.target.value as 'supabase' | 'postgresql' | 'mysql' | 'sqlite' })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                  >
                    <option value="supabase">Supabase</option>
                    <option value="postgresql">PostgreSQL</option>
                    <option value="mysql">MySQL</option>
                    <option value="sqlite">SQLite</option>
                  </select>
                </div>
                {connectionForm.type === 'supabase' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Supabase URL</label>
                      <input
                        type="text"
                        value={connectionForm.supabaseUrl || ''}
                        onChange={(e) => setConnectionForm({ ...connectionForm, supabaseUrl: e.target.value })}
                        placeholder="https://your-project.supabase.co"
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Supabase Key</label>
                      <input
                        type="password"
                        value={connectionForm.supabaseKey || ''}
                        onChange={(e) => setConnectionForm({ ...connectionForm, supabaseKey: e.target.value })}
                        placeholder="Your anon key"
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500"
                      />
                    </div>
                  </>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateConnection}
                    className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => {
                      setShowConnectionForm(false);
                      setConnectionForm({ name: '', type: 'supabase' });
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

export default DatabasePanel;
