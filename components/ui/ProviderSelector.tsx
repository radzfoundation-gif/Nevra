import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Brain, Check, Lock, AlertCircle, Sparkles, Zap } from 'lucide-react';
import { AIProvider } from '@/lib/ai';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

const cn = (...inputs: Parameters<typeof clsx>) => twMerge(clsx(inputs));

interface ProviderSelectorProps {
  value: AIProvider;
  onChange: (value: AIProvider) => void;
  className?: string;
  isSubscribed?: boolean; // For premium features
}

// Custom icon component wrappers
const ClaudeIconComponent: React.FC<{ size?: number; className?: string }> = ({ size = 12, className }) => (
  <Sparkles size={size} className={className} />
);

const GeminiIconComponent: React.FC<{ size?: number; className?: string }> = ({ size = 12, className }) => (
  <Zap size={size} className={className} />
);

const DeepSeekIconComponent: React.FC<{ size?: number; className?: string }> = ({ size = 12, className }) => (
  <Zap size={size} className={className} />
);

const providers: { id: AIProvider; name: string; icon: React.ComponentType<{ size?: number; className?: string }>; color: string; disabled?: boolean; premium?: boolean }[] = [
  { id: 'anthropic', name: 'GPT OSS 20B', icon: ClaudeIconComponent, color: 'text-orange-400' }, // Free model via OpenRouter
  { id: 'openai', name: 'GPT-5-Nano', icon: Brain, color: 'text-green-400', premium: false }, // GPT-5-Nano via Puter.js
  { id: 'deepseek', name: 'Mistral Devstral', icon: DeepSeekIconComponent, color: 'text-blue-400' },
];

const ProviderSelector: React.FC<ProviderSelectorProps> = ({ value, onChange, className, isSubscribed = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedProvider = providers.find(p => p.id === value) || providers[0];
  
  // Determine if provider should be disabled - DISABLED FOR TESTING
  const isProviderDisabled = (provider: typeof providers[0]) => {
    // DISABLED FOR TESTING - Allow all providers
    return false;
    // if (provider.disabled) return true;
    // // Temporarily allow GPT-4o for all users (testing)
    // if (provider.id === 'openai') return false;
    // if (provider.premium && !isSubscribed) return true;
    // return false;
  };

  // Get disabled reason for tooltip
  const getDisabledReason = (provider: typeof providers[0]) => {
    if (provider.premium && !isSubscribed) {
      return 'Subscribe to unlock GPT-5.2';
    }
    return undefined;
  };

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isCompact = className?.includes('text-[10px]') || className?.includes('text-xs');
  
  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-gray-300 rounded-full transition-all justify-between",
          isCompact 
            ? "gap-1 px-2 py-0.5 min-w-[70px]" 
            : "gap-2 px-3 py-1.5 min-w-[100px]"
        )}
      >
        <div className={cn("flex items-center", isCompact ? "gap-1" : "gap-2")}>
          <selectedProvider.icon size={isCompact ? 10 : 12} className={selectedProvider.color} />
          <span className={cn(isCompact ? "text-[10px]" : "text-xs")}>{selectedProvider.name}</span>
        </div>
        <ChevronDown size={isCompact ? 10 : 12} className={cn("text-gray-500 transition-transform", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute bottom-full right-0 mb-2 w-48 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50 backdrop-blur-xl"
          >
            <div className="p-1 space-y-0.5">
              {providers.map((provider) => {
                const disabled = isProviderDisabled(provider);
                const disabledReason = getDisabledReason(provider);
                
                return (
                  <button
                    key={provider.id}
                    onClick={() => {
                      if (disabled) return;
                      onChange(provider.id);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-left transition-colors group relative",
                      value === provider.id ? "bg-white/10 text-white" : "text-gray-400 hover:bg-white/5 hover:text-gray-200",
                      disabled && "opacity-50 cursor-not-allowed hover:bg-transparent"
                    )}
                    title={disabledReason}
                  >
                    <div className={cn("p-1.5 rounded-md bg-black/50 flex items-center justify-center", value === provider.id ? "bg-white/10" : "")}>
                      <provider.icon size={14} className={provider.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium flex items-center gap-2">
                        {provider.name}
                      </div>
                      {provider.premium && !isSubscribed && (
                        <div className="text-[10px] text-amber-400/70 mt-0.5">Premium</div>
                      )}
                    </div>
                    {disabled ? (
                      <Lock size={12} className="text-gray-500 shrink-0" />
                    ) : (
                      value === provider.id && <Check size={12} className="text-purple-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProviderSelector;
