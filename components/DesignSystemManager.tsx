import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Palette, 
  Type, 
  Layers, 
  Sparkles, 
  Save, 
  Trash2, 
  Copy, 
  Plus,
  Check,
  Edit2,
  Download,
  Upload
} from 'lucide-react';
import { 
  designSystemManager, 
  DesignSystem, 
  ColorToken, 
  TypographyToken,
  SpacingToken,
  EffectToken,
  DEFAULT_DESIGN_SYSTEM
} from '@/lib/designSystem';
import clsx from 'clsx';

interface DesignSystemManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onApply?: (system: DesignSystem) => void;
}

const DesignSystemManager: React.FC<DesignSystemManagerProps> = ({
  isOpen,
  onClose,
  onApply,
}) => {
  const [systems, setSystems] = useState<DesignSystem[]>([]);
  const [currentSystem, setCurrentSystem] = useState<DesignSystem>(DEFAULT_DESIGN_SYSTEM);
  const [activeTab, setActiveTab] = useState<'colors' | 'typography' | 'spacing' | 'effects' | 'systems'>('systems');
  const [editingColor, setEditingColor] = useState<{ category: string; index: number } | null>(null);
  const [newSystemName, setNewSystemName] = useState('');
  const [showCreateSystem, setShowCreateSystem] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSystems();
    }
  }, [isOpen]);

  const loadSystems = () => {
    const allSystems = designSystemManager.getAllSystems();
    setSystems(allSystems);
    setCurrentSystem(designSystemManager.getCurrentSystem());
  };

  const handleCreateSystem = () => {
    if (!newSystemName.trim()) return;
    const newSystem = designSystemManager.createSystem(newSystemName.trim());
    setSystems(designSystemManager.getAllSystems());
    setCurrentSystem(newSystem);
    setNewSystemName('');
    setShowCreateSystem(false);
  };

  const handleSelectSystem = (systemId: string) => {
    designSystemManager.setCurrentSystem(systemId);
    setCurrentSystem(designSystemManager.getCurrentSystem());
  };

  const handleDeleteSystem = (systemId: string) => {
    if (confirm('Are you sure you want to delete this design system?')) {
      designSystemManager.deleteSystem(systemId);
      loadSystems();
    }
  };

  const handleUpdateColor = (category: string, index: number, newValue: string) => {
    const updated = { ...currentSystem };
    const color = updated.colors[category as keyof typeof updated.colors][index];
    if (color) {
      color.value = newValue;
      designSystemManager.updateSystem(currentSystem.id, updated);
      setCurrentSystem(updated);
    }
  };

  const handleApply = () => {
    if (onApply) {
      onApply(currentSystem);
    }
    onClose();
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(currentSystem, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `design-system-${currentSystem.name.toLowerCase().replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string) as DesignSystem;
        const newSystem = designSystemManager.createSystem(imported.name, imported);
        loadSystems();
        setCurrentSystem(newSystem);
      } catch (error) {
        alert('Failed to import design system. Invalid file format.');
      }
    };
    reader.readAsText(file);
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
            <h2 className="text-2xl font-bold text-white mb-1">Design System Manager</h2>
            <p className="text-sm text-gray-400">Manage colors, typography, spacing, and effects</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              title="Export"
            >
              <Download size={20} />
            </button>
            <label className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer">
              <Upload size={20} />
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </label>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar - Systems List */}
          <div className="w-64 border-r border-white/10 bg-[#050505] flex flex-col">
            <div className="p-4 border-b border-white/10">
              <button
                onClick={() => setShowCreateSystem(true)}
                className="w-full flex items-center gap-2 px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-lg text-sm text-purple-300 transition-colors"
              >
                <Plus size={16} />
                <span>New System</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {systems.map((system) => (
                <button
                  key={system.id}
                  onClick={() => handleSelectSystem(system.id)}
                  className={clsx(
                    "w-full text-left p-3 rounded-lg mb-2 transition-colors",
                    currentSystem.id === system.id
                      ? "bg-purple-500/20 border border-purple-500/30 text-white"
                      : "bg-white/5 hover:bg-white/10 text-gray-300"
                  )}
                >
                  <div className="font-medium text-sm">{system.name}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(system.updatedAt).toLocaleDateString()}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Tabs */}
            <div className="flex items-center gap-1 p-4 border-b border-white/10">
              {(['systems', 'colors', 'typography', 'spacing', 'effects'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={clsx(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize",
                    activeTab === tab
                      ? "bg-white text-black"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'systems' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Current System: {currentSystem.name}</h3>
                    <p className="text-sm text-gray-400 mb-4">
                      Created: {new Date(currentSystem.createdAt).toLocaleString()}
                      <br />
                      Updated: {new Date(currentSystem.updatedAt).toLocaleString()}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleApply}
                        className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        Apply to Project
                      </button>
                      {currentSystem.id !== 'default' && (
                        <button
                          onClick={() => handleDeleteSystem(currentSystem.id)}
                          className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors"
                        >
                          <Trash2 size={16} className="inline mr-2" />
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'colors' && (
                <div className="space-y-6">
                  {Object.entries(currentSystem.colors).map(([category, tokens]) => (
                    <div key={category}>
                      <h4 className="text-sm font-semibold text-white mb-3 capitalize">{category}</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {tokens.map((token, index) => (
                          <div
                            key={index}
                            className="p-3 bg-white/5 rounded-lg border border-white/10"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <div
                                className="w-8 h-8 rounded border border-white/20"
                                style={{ backgroundColor: token.value }}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium text-white truncate">{token.name}</div>
                                <div className="text-xs text-gray-400 truncate">{token.value}</div>
                              </div>
                            </div>
                            <input
                              type="color"
                              value={token.value.startsWith('#') ? token.value : '#000000'}
                              onChange={(e) => handleUpdateColor(category, index, e.target.value)}
                              className="w-full h-8 rounded border border-white/10 cursor-pointer"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'typography' && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-3">Headings</h4>
                    <div className="space-y-3">
                      {currentSystem.typography.headings.map((heading, index) => (
                        <div key={index} className="p-4 bg-white/5 rounded-lg border border-white/10">
                          <div className="text-2xl font-bold text-white mb-2" style={{
                            fontFamily: heading.fontFamily,
                            fontSize: heading.fontSize,
                            fontWeight: heading.fontWeight,
                            lineHeight: heading.lineHeight,
                          }}>
                            Heading {index + 1}
                          </div>
                          <div className="text-xs text-gray-400">
                            {heading.fontFamily} • {heading.fontSize} • {heading.fontWeight} • Line-height: {heading.lineHeight}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-3">Body Text</h4>
                    <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                      <div className="text-white mb-2" style={{
                        fontFamily: currentSystem.typography.body.fontFamily,
                        fontSize: currentSystem.typography.body.fontSize,
                        fontWeight: currentSystem.typography.body.fontWeight,
                        lineHeight: currentSystem.typography.body.lineHeight,
                      }}>
                        The quick brown fox jumps over the lazy dog.
                      </div>
                      <div className="text-xs text-gray-400">
                        {currentSystem.typography.body.fontFamily} • {currentSystem.typography.body.fontSize} • {currentSystem.typography.body.fontWeight} • Line-height: {currentSystem.typography.body.lineHeight}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'spacing' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {currentSystem.spacing.map((spacing, index) => (
                      <div key={index} className="p-4 bg-white/5 rounded-lg border border-white/10">
                        <div className="text-sm font-medium text-white mb-2">{spacing.name}</div>
                        <div className="text-xs text-gray-400 mb-3">{spacing.value}</div>
                        <div
                          className="h-8 bg-purple-500/30 rounded"
                          style={{ width: spacing.value }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'effects' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {currentSystem.effects.map((effect, index) => (
                      <div key={index} className="p-4 bg-white/5 rounded-lg border border-white/10">
                        <div className="text-sm font-medium text-white mb-2">{effect.name}</div>
                        <div className="text-xs text-gray-400 mb-3">{effect.type}</div>
                        <div className="text-xs text-purple-400 font-mono">{effect.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Create System Modal */}
        {showCreateSystem && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-10">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-md bg-[#1a1a1a] border border-white/10 rounded-xl p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Create New Design System</h3>
              <input
                type="text"
                value={newSystemName}
                onChange={(e) => setNewSystemName(e.target.value)}
                placeholder="System name..."
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 mb-4"
                onKeyPress={(e) => e.key === 'Enter' && handleCreateSystem()}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCreateSystem}
                  className="flex-1 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Create
                </button>
                <button
                  onClick={() => {
                    setShowCreateSystem(false);
                    setNewSystemName('');
                  }}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default DesignSystemManager;
