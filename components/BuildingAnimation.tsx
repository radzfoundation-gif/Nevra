import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileCode, FileText, Settings, Image as ImageIcon } from 'lucide-react';

interface BuildingFile {
  path: string;
  type: 'component' | 'page' | 'style' | 'config' | 'other';
}

interface BuildingAnimationProps {
  isBuilding: boolean;
  files?: BuildingFile[];
  currentStep?: string;
}

const BuildingAnimation: React.FC<BuildingAnimationProps> = ({
  isBuilding,
  files = [],
  currentStep = 'Building...',
}) => {
  const getFileIcon = (type: BuildingFile['type']) => {
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
        return <FileCode size={14} className="text-gray-400" />;
    }
  };

  if (!isBuilding) return null;

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-8 bg-[#0a0a0a]">
      {/* Main Building Message */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 mx-auto mb-4 rounded-full border-2 border-purple-500/30 border-t-purple-500"
        />
        <h3 className="text-lg font-semibold text-white mb-2">{currentStep}</h3>
        <p className="text-sm text-gray-400">Generating your web application...</p>
      </motion.div>

      {/* Animated File Boxes (like v0.app) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-4xl">
        <AnimatePresence>
          {files.length > 0 ? (
            files.slice(0, 4).map((file, idx) => (
              <motion.div
                key={file.path}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-[#1a1a1a] border border-white/10 rounded-lg overflow-hidden"
              >
                {/* File Header (like code editor window) */}
                <div className="flex items-center justify-between px-3 py-2 bg-[#0f0f0f] border-b border-white/5">
                  <div className="flex items-center gap-2">
                    {getFileIcon(file.type)}
                    <span className="text-xs font-mono text-gray-300 truncate">{file.path}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
                  </div>
                </div>

                {/* Animated Code Lines (like v0.app) */}
                <div className="p-4 space-y-2">
                  {Array.from({ length: 8 }).map((_, lineIdx) => (
                    <motion.div
                      key={lineIdx}
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ 
                        opacity: [0.3, 0.6, 0.3],
                        width: ['20%', '100%', '20%'],
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        delay: lineIdx * 0.15,
                        ease: 'easeInOut',
                      }}
                      className="h-3 bg-gray-700/50 rounded"
                      style={{
                        width: `${Math.random() * 60 + 40}%`,
                      }}
                    />
                  ))}
                </div>
              </motion.div>
            ))
          ) : (
            // Default animated boxes when no files yet
            Array.from({ length: 2 }).map((_, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.2 }}
                className="bg-[#1a1a1a] border border-white/10 rounded-lg overflow-hidden"
              >
                <div className="flex items-center justify-between px-3 py-2 bg-[#0f0f0f] border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <FileCode size={14} className="text-gray-400" />
                    <span className="text-xs font-mono text-gray-500">Generating...</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  {Array.from({ length: 8 }).map((_, lineIdx) => (
                    <motion.div
                      key={lineIdx}
                      initial={{ opacity: 0 }}
                      animate={{ 
                        opacity: [0.2, 0.5, 0.2],
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        delay: lineIdx * 0.15,
                        ease: 'easeInOut',
                      }}
                      className="h-3 bg-gray-700/50 rounded"
                      style={{
                        width: `${Math.random() * 60 + 40}%`,
                      }}
                    />
                  ))}
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Progress Steps (like v0.app) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-8 flex flex-col gap-2 text-sm text-gray-400"
      >
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="w-2 h-2 rounded-full bg-green-500"
          />
          <span>Exploring codebase</span>
        </div>
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0.3 }}
            className="w-2 h-2 rounded-full bg-blue-500"
          />
          <span>Generating components</span>
        </div>
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0.6 }}
            className="w-2 h-2 rounded-full bg-purple-500"
          />
          <span>{currentStep}</span>
        </div>
      </motion.div>
    </div>
  );
};

export default BuildingAnimation;
