import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  File, 
  Folder, 
  FolderOpen, 
  ChevronRight, 
  ChevronDown,
  Plus,
  Trash2,
  Edit2,
  Search,
  FileCode,
  FileText,
  Settings,
  Image as ImageIcon
} from 'lucide-react';
import { ProjectFile } from '@/lib/fileManager';
import clsx from 'clsx';

interface FileTreeProps {
  files: ProjectFile[];
  selectedFile: string | null;
  onSelectFile: (path: string) => void;
  onNewFile?: (parentPath?: string) => void;
  onDeleteFile?: (path: string) => void;
  onRenameFile?: (oldPath: string, newPath: string) => void;
  entry?: string;
}

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  fileType?: ProjectFile['type'];
  children?: { [key: string]: TreeNode };
}

const FileTree: React.FC<FileTreeProps> = ({
  files,
  selectedFile,
  onSelectFile,
  onNewFile,
  onDeleteFile,
  onRenameFile,
  entry,
}) => {
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; path: string } | null>(null);
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Build tree structure from files
  const buildTree = (): { [key: string]: TreeNode } => {
    const tree: { [key: string]: TreeNode } = {};

    files.forEach(file => {
      // Ensure path is always a string
      const filePath = typeof file?.path === 'string' ? file.path : String(file?.path || '');
      if (!filePath) return; // Skip invalid files
      
      const parts = filePath.split('/').filter(p => p);
      let current = tree;

      parts.forEach((part, index) => {
        if (index === parts.length - 1) {
          // File
          current[part] = {
            name: part,
            path: filePath,
            type: 'file',
            fileType: file?.type || 'other',
          };
        } else {
          // Directory
          if (!current[part]) {
            current[part] = {
              name: part,
              path: parts.slice(0, index + 1).join('/'),
              type: 'directory',
              children: {},
            };
          }
          current = current[part].children || {};
        }
      });
    });

    return tree;
  };

  const tree = buildTree();

  // Auto-expand directories containing selected file
  useEffect(() => {
    if (selectedFile && typeof selectedFile === 'string') {
      const parts = selectedFile.split('/').filter(p => p);
      const paths: string[] = [];
      for (let i = 1; i < parts.length; i++) {
        paths.push(parts.slice(0, i).join('/'));
      }
      setExpandedDirs(prev => new Set([...prev, ...paths]));
    }
  }, [selectedFile]);

  // Filter files based on search
  const filterTree = (node: TreeNode, query: string): TreeNode | null => {
    if (!query) return node;

    const lowerQuery = query.toLowerCase();
    if (node.name.toLowerCase().includes(lowerQuery)) {
      return node;
    }

    if (node.type === 'directory' && node.children) {
      const filteredChildren: { [key: string]: TreeNode } = {};
      Object.values(node.children).forEach(child => {
        const filtered = filterTree(child, query);
        if (filtered) {
          filteredChildren[filtered.name] = filtered;
        }
      });
      if (Object.keys(filteredChildren).length > 0) {
        return { ...node, children: filteredChildren };
      }
    }

    return null;
  };

  const filteredTree = searchQuery
    ? Object.fromEntries(
        Object.entries(tree)
          .map(([key, node]) => [key, filterTree(node, searchQuery)])
          .filter(([_, node]) => node !== null)
      )
    : tree;

  const toggleDirectory = (path: string) => {
    setExpandedDirs(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const getFileIcon = (fileType?: ProjectFile['type']) => {
    switch (fileType) {
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

  const handleContextMenu = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, path });
  };

  const handleRename = (path: string) => {
    setRenamingPath(path);
    const safePath = typeof path === 'string' ? path : String(path || '');
    setRenameValue(safePath.split('/').pop() || '');
    setContextMenu(null);
  };

  const confirmRename = () => {
    if (renamingPath && renameValue && onRenameFile) {
      const safePath = typeof renamingPath === 'string' ? renamingPath : String(renamingPath || '');
      const parts = safePath.split('/');
      parts[parts.length - 1] = renameValue;
      const newPath = parts.join('/');
      onRenameFile(renamingPath, newPath);
    }
    setRenamingPath(null);
    setRenameValue('');
  };

  const cancelRename = () => {
    setRenamingPath(null);
    setRenameValue('');
  };

  const renderNode = (node: TreeNode, level: number = 0): React.ReactNode => {
    const isExpanded = expandedDirs.has(node.path);
    const isSelected = selectedFile === node.path;
    const isEntry = entry === node.path;
    const isRenaming = renamingPath === node.path;

    if (node.type === 'directory') {
      return (
        <div key={node.path}>
          <div
            className={clsx(
              "flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer hover:bg-white/5 transition-colors group",
              isSelected && "bg-purple-500/20"
            )}
            style={{ paddingLeft: `${level * 16 + 8}px` }}
            onClick={() => toggleDirectory(node.path)}
            onContextMenu={(e) => handleContextMenu(e, node.path)}
          >
            {isExpanded ? (
              <ChevronDown size={14} className="text-gray-400" />
            ) : (
              <ChevronRight size={14} className="text-gray-400" />
            )}
            {isExpanded ? (
              <FolderOpen size={16} className="text-yellow-400" />
            ) : (
              <Folder size={16} className="text-yellow-400" />
            )}
            <span className="text-sm text-gray-300 flex-1 truncate">{node.name}</span>
            {onNewFile && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onNewFile(node.path);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded transition-opacity"
                title="New file"
              >
                <Plus size={12} />
              </button>
            )}
          </div>
          <AnimatePresence>
            {isExpanded && node.children && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                {Object.values(node.children).map(child => renderNode(child, level + 1))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    }

    return (
      <div
        key={node.path}
        className={clsx(
          "flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer hover:bg-white/5 transition-colors group",
          isSelected && "bg-purple-500/20 border-l-2 border-purple-500",
          isEntry && "border-l-2 border-green-500"
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => onSelectFile(node.path)}
        onContextMenu={(e) => handleContextMenu(e, node.path)}
      >
        {isRenaming ? (
          <>
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={confirmRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmRename();
                if (e.key === 'Escape') cancelRename();
              }}
              autoFocus
              className="flex-1 bg-white/10 border border-purple-500/50 rounded px-2 py-1 text-sm text-white"
              onClick={(e) => e.stopPropagation()}
            />
          </>
        ) : (
          <>
            {getFileIcon(node.fileType)}
            <span className="text-sm text-gray-300 flex-1 truncate">{node.name}</span>
            {isEntry && (
              <span className="text-xs text-green-400 font-medium">entry</span>
            )}
            {(onDeleteFile || onRenameFile) && (
              <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                {onRenameFile && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRename(node.path);
                    }}
                    className="p-1 hover:bg-white/10 rounded"
                    title="Rename"
                  >
                    <Edit2 size={12} />
                  </button>
                )}
                {onDeleteFile && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete ${node.name}?`)) {
                        onDeleteFile(node.path);
                      }
                    }}
                    className="p-1 hover:bg-red-500/20 rounded text-red-400"
                    title="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };

    if (contextMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [contextMenu]);

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a] border-r border-white/5">
      {/* Header */}
      <div className="p-3 border-b border-white/5">
        <div className="flex items-center gap-2 mb-2">
          <FileCode size={16} className="text-purple-400" />
          <span className="text-sm font-semibold text-white">Files</span>
          {onNewFile && (
            <button
              onClick={() => onNewFile()}
              className="ml-auto p-1.5 hover:bg-white/10 rounded transition-colors"
              title="New file"
            >
              <Plus size={14} className="text-gray-400" />
            </button>
          )}
        </div>
        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-2 py-1.5 bg-white/5 border border-white/10 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
          />
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto p-2">
        {Object.keys(filteredTree).length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            {searchQuery ? 'No files found' : 'No files yet'}
          </div>
        ) : (
          Object.values(filteredTree).map(node => renderNode(node))
        )}
      </div>

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            ref={contextMenuRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl z-50 min-w-[160px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            {onNewFile && (
              <button
                onClick={() => {
                  onNewFile(contextMenu.path);
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-gray-300 hover:bg-white/10 transition-colors"
              >
                <Plus size={14} />
                New File
              </button>
            )}
            {onRenameFile && (
              <button
                onClick={() => {
                  handleRename(contextMenu.path);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-gray-300 hover:bg-white/10 transition-colors border-t border-white/5"
              >
                <Edit2 size={14} />
                Rename
              </button>
            )}
            {onDeleteFile && (
              <button
                onClick={() => {
                  if (confirm(`Delete ${contextMenu.path}?`)) {
                    onDeleteFile(contextMenu.path);
                  }
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-red-400 hover:bg-red-500/10 transition-colors border-t border-white/5"
              >
                <Trash2 size={14} />
                Delete
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FileTree;
