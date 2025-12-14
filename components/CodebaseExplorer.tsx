import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileCode, File, FileText, Settings, Image as ImageIcon, Search, Loader2 } from 'lucide-react';
import { ExploredComponent, CodebaseAnalysis } from '@/lib/codebaseExplorer';
import clsx from 'clsx';

interface CodebaseExplorerProps {
  analysis: CodebaseAnalysis | null;
  isExploring: boolean;
  onComponentSelect?: (component: ExploredComponent) => void;
}

const CodebaseExplorer: React.FC<CodebaseExplorerProps> = ({
  analysis,
  isExploring,
  onComponentSelect,
}) => {
  const getFileIcon = (type: ExploredComponent['type']) => {
    switch (type) {
      case 'component':
        return <FileCode size={14} className="text-blue-400" />;
      case 'page':
        return <FileText size={14} className="text-green-400" />;
      case 'style':
        return <ImageIcon size={14} className="text-purple-400" />;
      case 'config':
        return <Settings size={14} className="text-yellow-400" />;
      default:
        return <File size={14} className="text-gray-400" />;
    }
  };

  if (isExploring) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <Loader2 className="animate-spin text-purple-400 mb-4" size={32} />
        <p className="text-lg font-medium text-white mb-2">Exploring codebase...</p>
        <p className="text-sm text-gray-400">
          Analyzing existing files and components
        </p>
        {analysis && analysis.components.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2 justify-center max-w-2xl">
            {analysis.components.slice(0, 12).map((comp, idx) => (
              <motion.div
                key={comp.path}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 0.6, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg"
              >
                {getFileIcon(comp.type)}
                <span className="text-xs text-gray-300 font-mono">{comp.name}</span>
              </motion.div>
            ))}
            {analysis.components.length > 12 && (
              <div className="flex items-center px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg">
                <span className="text-xs text-gray-400">+{analysis.components.length - 12} more</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  if (!analysis || analysis.totalFiles === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Search size={16} className="text-purple-400" />
            Codebase Analysis
          </h3>
          <span className="text-xs text-gray-400">
            {analysis.totalFiles} file{analysis.totalFiles !== 1 ? 's' : ''}
          </span>
        </div>
        
        <div className="flex flex-wrap gap-3 text-xs">
          {analysis.frameworks.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400">Frameworks:</span>
              {analysis.frameworks.map((fw) => (
                <span
                  key={fw}
                  className="px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded"
                >
                  {fw}
                </span>
              ))}
            </div>
          )}
          {analysis.libraries.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400">Libraries:</span>
              {analysis.libraries.slice(0, 3).map((lib) => (
                <span
                  key={lib}
                  className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded"
                >
                  {lib}
                </span>
              ))}
              {analysis.libraries.length > 3 && (
                <span className="text-gray-500">+{analysis.libraries.length - 3}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Components List */}
      {analysis.components.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-400 uppercase mb-3">
            Available Components ({analysis.components.length})
          </h4>
          <div className="space-y-2">
            <AnimatePresence>
              {analysis.components.map((comp, idx) => (
                <motion.div
                  key={comp.path}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  onClick={() => onComponentSelect?.(comp)}
                  className={clsx(
                    "flex items-start gap-3 p-3 rounded-lg border transition-all",
                    onComponentSelect
                      ? "bg-white/5 border-white/10 hover:bg-white/10 hover:border-purple-500/30 cursor-pointer"
                      : "bg-white/5 border-white/10"
                  )}
                >
                  <div className="mt-0.5">{getFileIcon(comp.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-white font-mono">
                        {comp.name}
                      </span>
                      <span className="text-xs text-gray-500 font-mono truncate">
                        {comp.path}
                      </span>
                    </div>
                    {comp.summary && (
                      <p className="text-xs text-gray-400 line-clamp-1">
                        {comp.summary}
                      </p>
                    )}
                    {comp.exports && comp.exports.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {comp.exports.slice(0, 3).map((exp) => (
                          <span
                            key={exp}
                            className="text-xs px-1.5 py-0.5 bg-purple-500/10 text-purple-300 rounded"
                          >
                            {exp}
                          </span>
                        ))}
                        {comp.exports.length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{comp.exports.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
};

export default CodebaseExplorer;
