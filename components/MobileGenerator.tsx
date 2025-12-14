import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Smartphone, 
  Download,
  Code,
  Play,
  Check
} from 'lucide-react';
import { 
  generateMobileProject,
  MobileAppConfig,
  MobileFramework
} from '@/lib/mobileGenerator';
import clsx from 'clsx';

interface MobileGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  webCode: string;
  onGenerateCode?: (files: Array<{ path: string; content: string }>) => void;
}

const MobileGenerator: React.FC<MobileGeneratorProps> = ({
  isOpen,
  onClose,
  webCode,
  onGenerateCode,
}) => {
  const [config, setConfig] = useState<MobileAppConfig>({
    name: 'My App',
    packageName: 'com.example.myapp',
    version: '1.0.0',
    framework: 'react-native',
    platform: 'both',
  });
  const [generated, setGenerated] = useState<Array<{ path: string; content: string }> | null>(null);

  const handleGenerate = () => {
    const project = generateMobileProject(webCode, config);
    setGenerated(project.files);
    if (onGenerateCode) {
      // Pass files to parent
      onGenerateCode(project.files);
    }
  };

  const handleDownload = () => {
    if (!generated) return;
    
    // Create a zip-like structure (simplified - in production use JSZip)
    generated.forEach((file) => {
      const blob = new Blob([file.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.path;
      a.click();
      URL.revokeObjectURL(url);
    });
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
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Mobile App Generator</h2>
            <p className="text-sm text-gray-400">Convert web app to React Native or Flutter</p>
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
          {/* Configuration */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">App Name</label>
              <input
                type="text"
                value={config.name}
                onChange={(e) => setConfig({ ...config, name: e.target.value })}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Package Name</label>
              <input
                type="text"
                value={config.packageName}
                onChange={(e) => setConfig({ ...config, packageName: e.target.value })}
                placeholder="com.example.myapp"
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Framework</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setConfig({ ...config, framework: 'react-native' })}
                  className={clsx(
                    "p-4 rounded-lg border transition-colors text-left",
                    config.framework === 'react-native'
                      ? "bg-blue-500/20 border-blue-500/30 text-white"
                      : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
                  )}
                >
                  <div className="font-medium text-sm mb-1">React Native</div>
                  <div className="text-xs text-gray-400">iOS & Android</div>
                </button>
                <button
                  onClick={() => setConfig({ ...config, framework: 'flutter' })}
                  className={clsx(
                    "p-4 rounded-lg border transition-colors text-left",
                    config.framework === 'flutter'
                      ? "bg-blue-500/20 border-blue-500/30 text-white"
                      : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
                  )}
                >
                  <div className="font-medium text-sm mb-1">Flutter</div>
                  <div className="text-xs text-gray-400">iOS, Android & Web</div>
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Platform</label>
              <div className="flex gap-3">
                {(['ios', 'android', 'both'] as const).map((platform) => (
                  <button
                    key={platform}
                    onClick={() => setConfig({ ...config, platform })}
                    className={clsx(
                      "px-4 py-2 rounded-lg border transition-colors capitalize",
                      config.platform === platform
                        ? "bg-purple-500/20 border-purple-500/30 text-white"
                        : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
                    )}
                  >
                    {platform}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Generated Files */}
          {generated && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-white">Generated Files</h3>
              <div className="space-y-2">
                {generated.map((file, index) => (
                  <div
                    key={index}
                    className="p-3 bg-white/5 rounded-lg border border-white/10 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Code size={16} className="text-gray-400" />
                      <span className="text-sm text-white font-mono">{file.path}</span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {file.content.length} chars
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 flex gap-3">
          <button
            onClick={handleGenerate}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
          >
            <Smartphone size={18} />
            Generate Mobile App
          </button>
          {generated && (
            <button
              onClick={handleDownload}
              className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Download size={18} />
              Download
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default MobileGenerator;
