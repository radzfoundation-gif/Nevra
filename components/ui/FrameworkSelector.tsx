import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Code, Check, Zap, FileCode } from 'lucide-react';
import { Framework } from '@/lib/ai';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

const cn = (...inputs: Parameters<typeof clsx>) => twMerge(clsx(inputs));

interface FrameworkSelectorProps {
  value: Framework;
  onChange: (value: Framework) => void;
  className?: string;
}

const frameworks: { id: Framework; name: string; icon: React.ComponentType<{ size?: number; className?: string }>; description: string }[] = [
  { id: 'html', name: 'HTML', icon: FileCode, description: 'Single-file HTML dengan CDN' },
  { id: 'react', name: 'React', icon: Code, description: 'React project structure' },
  { id: 'vite', name: 'Vite + React', icon: Zap, description: 'Vite + React + TypeScript' },
  { id: 'nextjs', name: 'Next.js', icon: Code, description: 'Next.js 14+ App Router' },
];

const FrameworkSelector: React.FC<FrameworkSelectorProps> = ({ value, onChange, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedFramework = frameworks.find(f => f.id === value) || frameworks[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isCompact = className?.includes('text-xs');

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-gray-300 rounded-full transition-all justify-between",
          isCompact 
            ? "gap-1 px-2 py-0.5 min-w-[80px]" 
            : "gap-2 px-3 py-1.5 min-w-[120px]"
        )}
      >
        <div className={cn("flex items-center", isCompact ? "gap-1" : "gap-2")}>
          <selectedFramework.icon size={isCompact ? 10 : 12} className="text-purple-400" />
          <span className={cn(isCompact ? "text-[10px]" : "text-xs")}>{selectedFramework.name}</span>
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
            className="absolute bottom-full right-0 mb-2 w-56 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50 backdrop-blur-xl"
          >
            <div className="p-1 space-y-0.5">
              {frameworks.map((framework) => (
                <button
                  key={framework.id}
                  onClick={() => {
                    onChange(framework.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-start gap-3 px-3 py-2 rounded-lg text-xs text-left transition-colors",
                    value === framework.id ? "bg-white/10 text-white" : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                  )}
                >
                  <div className={cn("p-1.5 rounded-md bg-black/50 flex items-center justify-center mt-0.5", value === framework.id ? "bg-white/10" : "")}>
                    <framework.icon size={14} className="text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{framework.name}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">{framework.description}</div>
                  </div>
                  {value === framework.id && <Check size={12} className="text-purple-400 shrink-0 mt-1" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FrameworkSelector;
