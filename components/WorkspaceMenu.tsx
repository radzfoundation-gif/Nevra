import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Code, 
  Github, 
  Clock, 
  ChevronDown,
  MoreVertical,
  Palette,
  Database,
  Globe,
  Smartphone
} from 'lucide-react';
import clsx from 'clsx';

interface WorkspaceMenuProps {
  onOpenComponents: () => void;
  onOpenGitHub: () => void;
  onOpenHistory: () => void;
  onOpenDesignSystem?: () => void;
  onOpenDatabase?: () => void;
  onOpenAPI?: () => void;
  onOpenMobile?: () => void;
  className?: string;
}

const WorkspaceMenu: React.FC<WorkspaceMenuProps> = ({
  onOpenComponents,
  onOpenGitHub,
  onOpenHistory,
  onOpenDesignSystem,
  onOpenDatabase,
  onOpenAPI,
  onOpenMobile,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const menuItems = [
    {
      id: 'components',
      label: 'Components',
      icon: Code,
      onClick: () => {
        onOpenComponents();
        setIsOpen(false);
      },
    },
    {
      id: 'design-system',
      label: 'Design System',
      icon: Palette,
      onClick: () => {
        onOpenDesignSystem?.();
        setIsOpen(false);
      },
    },
    {
      id: 'database',
      label: 'Database',
      icon: Database,
      onClick: () => {
        onOpenDatabase?.();
        setIsOpen(false);
      },
    },
    {
      id: 'api',
      label: 'API Integration',
      icon: Globe,
      onClick: () => {
        onOpenAPI?.();
        setIsOpen(false);
      },
    },
    {
      id: 'mobile',
      label: 'Mobile Generator',
      icon: Smartphone,
      onClick: () => {
        onOpenMobile?.();
        setIsOpen(false);
      },
    },
    {
      id: 'github',
      label: 'GitHub',
      icon: Github,
      onClick: () => {
        onOpenGitHub();
        setIsOpen(false);
      },
    },
    {
      id: 'history',
      label: 'History',
      icon: Clock,
      onClick: () => {
        onOpenHistory();
        setIsOpen(false);
      },
    },
  ];

  return (
    <div className={clsx("relative z-[101]", className)} ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
        title="Workspace Tools"
      >
        <MoreVertical size={16} />
        <span className="hidden sm:inline">Tools</span>
        <ChevronDown 
          size={12} 
          className={clsx("transition-transform", isOpen && "rotate-180")} 
        />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full right-0 mt-2 w-48 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl overflow-hidden z-[102] backdrop-blur-xl"
          >
            <div className="p-1">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={item.onClick}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left text-gray-300 hover:bg-white/10 transition-colors rounded-lg"
                >
                  <item.icon size={16} className="text-gray-400" />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WorkspaceMenu;
