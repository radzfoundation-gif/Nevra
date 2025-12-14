import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send, Menu, Plus, MessageSquare, User,
  Code, Play, Layout, Smartphone, Monitor, Download,
  X, Settings, ChevronRight, ChevronDown, FileCode,
  Folder, Terminal as TerminalIcon, RefreshCw, Globe,
  CheckCircle2, Loader2, GraduationCap, Brain, Bot, Paperclip, Image as ImageIcon, Trash2, AlertTriangle, Phone, Lock, Camera, ImagePlus, Clock, Undo2, Redo2, Github, Search, FileText, Terminal, MoreVertical, Copy, Eye, ZoomIn, ZoomOut, Type, Palette, Save, Sparkles, Zap
} from 'lucide-react';
import { Link, useLocation, useParams, useNavigate } from 'react-router-dom';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { generateCode, AIProvider, Framework } from '@/lib/ai';
import { CodebaseExplorer as CodebaseExplorerClass, CodebaseAnalysis } from '@/lib/codebaseExplorer';
import CodebaseExplorer from '@/components/CodebaseExplorer';
import BuildingAnimation from '@/components/BuildingAnimation';
import ProviderSelector from '@/components/ui/ProviderSelector';
import FrameworkSelector from '@/components/ui/FrameworkSelector';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import SubscriptionPopup from '../SubscriptionPopup';
import TokenBadge from '../TokenBadge';
import { useTokenLimit, useTrackAIUsage } from '@/hooks/useTokenLimit';
import { FREE_TOKEN_LIMIT } from '@/lib/tokenLimit';
import { createChatSession, saveMessage, getUserSessions, getSessionMessages, updateSessionMode } from '@/lib/database';
import { useUser, useAuth } from '@clerk/clerk-react';
import FeedbackPopup from '../FeedbackPopup';
import { useUserPreferences, useChatSessions } from '@/hooks/useSupabase';
import Logo from '../Logo';
import VoiceCall from '../VoiceCall';
import Sidebar from '../Sidebar';
import FileTree from '../FileTree';
import CodeEditor from '../CodeEditor';
import VisualEditor from '../VisualEditor';
import CodeQualityPanel from '../CodeQualityPanel';
import VersionHistory from '../VersionHistory';
import ComponentLibrary from '../ComponentLibrary';
import GitHubIntegration from '../GitHubIntegration';
import WorkspaceMenu from '../WorkspaceMenu';
import { FileManager, ProjectFile } from '@/lib/fileManager';
import { Component, getComponentLibrary } from '@/lib/componentLibrary';
import { CodeResponse } from '@/lib/ai';
import { checkTypeScript, TypeError } from '@/lib/typescript';
import { lintCode, autoFix, LintError } from '@/lib/eslint';
import { formatCode } from '@/lib/prettier';
import { getVersionManager } from '@/lib/versionManager';
import { getUndoRedoManager } from '@/lib/undoRedo';
import { performWebSearch, combineSearchAndResponse, SearchResult } from '@/lib/webSearch';
import { parseDocument, ParsedDocument } from '@/lib/documentParser';
import SearchResults from '../SearchResults';
import CodeSandbox from '../CodeSandbox';
import DocumentViewer from '../DocumentViewer';
import PlannerPanel from '../PlannerPanel';
import { generatePlan, Plan } from '@/lib/agenticPlanner';
import DesignSystemManager from '../DesignSystemManager';
import { designSystemManager, DesignSystem } from '@/lib/designSystem';
import DatabasePanel from '../DatabasePanel';
import APIIntegrationWizard from '../APIIntegrationWizard';
import MobileGenerator from '../MobileGenerator';

// --- Types ---
type AppMode = 'builder' | 'tutor' | null;

type Message = {
  id: string;
  role: 'user' | 'ai';
  content: string;
  code?: string;
  images?: string[]; // Array of base64 strings
  timestamp: Date;
};

type FileNode = {
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  isOpen?: boolean;
};

// --- Utility ---
const cn = (...inputs: Parameters<typeof clsx>) => twMerge(clsx(inputs));

const detectMode = (text: string): AppMode => {
  if (!text || text.trim().length === 0) return 'tutor';
  
  const lowerText = text.toLowerCase().trim();
  
  // Exclusion patterns - these should NOT trigger builder mode even if they contain builder keywords
  // HIGHEST PRIORITY: Clear question patterns that should always be tutor mode
  const clearQuestionPatterns = [
    // Question words at the start (highest priority)
    /^(apa|what|why|how|when|where|who|which|mengapa|kenapa|bagaimana|kapan|dimana|siapa)\s+/i,
    // Specific question patterns
    /^(apa itu|apa ini|apa artinya|apa maksudnya|what is|what are|what does|what do)/i,
    /^(bagaimana cara|bagaimana untuk|how to|how do|how does|how can)/i,
    /^(jelaskan|terangkan|explain|describe|tell me|teach me)/i,
    // Learning intent
    /^(saya ingin belajar|saya perlu belajar|saya ingin tahu|saya perlu tahu|i want to learn|i need to learn)/i,
  ];
  
  // Check clear question patterns FIRST (highest priority)
  const isClearQuestion = clearQuestionPatterns.some(pattern => pattern.test(text));
  if (isClearQuestion) {
    return 'tutor';
  }
  
  const tutorOnlyPatterns = [
    // Schedule/Planning related (should be tutor mode)
    /jadwal|schedule|routine|plan|rencana|agenda|kalender|calendar/i,
    // Learning/Education related
    /belajar|learn|study|tutorial|panduan|guide|explain|jelaskan/i,
    // Question patterns
    /^buatkan\s+(jadwal|schedule|routine|plan|rencana|agenda)/i,
    /^buat\s+(jadwal|schedule|routine|plan|rencana|agenda)/i,
    /^tolong\s+(buatkan|buat)\s+(jadwal|schedule|routine|plan)/i,
    // General help requests (but not edit commands)
    /^tolong\s+(bantu|help|jelaskan|explain|ajarkan)/i,
    /^bantu\s+(saya|aku|me|i)/i,
  ];
  
  // Check if text matches tutor-only patterns (second priority)
  const matchesTutorOnly = tutorOnlyPatterns.some(pattern => pattern.test(text));
  if (matchesTutorOnly) {
    return 'tutor';
  }
  
  // Builder keywords - English and Indonesian (only for web/app development)
  // Note: Removed generic words like 'buat', 'buatkan', 'create', 'make' to avoid false positives
  // Only include specific tech-related phrases
  const builderKeywords = [
    // English - specific tech phrases only
    'build web', 'build website', 'build app', 'build application', 'build page', 'build site',
    'create web', 'create website', 'create app', 'create application', 'create page', 'create site',
    'make web', 'make website', 'make app', 'make application',
    'generate code', 'generate app', 'generate website',
    'code', 'app', 'website', 'web app', 'webapp',
    'landing page', 'landing', 'dashboard', 'component', 'react', 'html', 'css', 'javascript', 'js',
    'style', 'design', 'ui', 'ux', 'page', 'site', 'application', 'program', 'project',
    'frontend', 'front-end', 'ui component', 'template', 'layout', 'interface',
    // Indonesian - specific tech phrases only
    'buat web', 'buat website', 'buat aplikasi', 'buat app',
    'buat landing page', 'buat dashboard', 'buat halaman web', 'buat situs', 'buat program',
    'generate kode', 'kode', 'coding', 'program aplikasi', 'aplikasi web', 'web', 'website', 'situs',
    'halaman web', 'komponen', 'template web', 'desain web', 'ui', 'frontend',
    // Edit/Modification commands - these should stay in builder mode
    'ubah', 'edit', 'ganti', 'modify', 'change', 'update', 'ubah warna', 'ganti warna', 'buat warna',
    'ubah warna', 'ubah style', 'ubah desain', 'ubah layout', 'ubah background', 'ubah font',
    'change color', 'change style', 'change design', 'change background', 'change font',
    'make it', 'make the', 'buat jadi', 'buat menjadi', 'jadikan', 'jadikan warna',
    'warna kuning', 'warna merah', 'warna biru', 'yellow', 'red', 'blue', 'green', 'warna hijau',
    'add', 'tambah', 'hapus', 'remove', 'delete', 'tambah button', 'add button', 'tambah gambar'
  ];
  
  // Tutor keywords - Questions and learning intent
  // NOTE: 'tolong' is removed from tutor keywords to prevent false positives in builder mode
  const tutorKeywords = [
    // English question words
    'what', 'why', 'how', 'when', 'where', 'who', 'which', 'explain', 'describe', 'tell me',
    'teach', 'learn', 'understand', 'help', 'help me', 'can you', 'could you', 'please explain',
    'what is', 'what are', 'what does', 'what do', 'how to', 'how do', 'how does', 'how can',
    'why is', 'why are', 'why does', 'why do', 'when is', 'when are', 'when does', 'when do',
    'where is', 'where are', 'where does', 'where do', 'who is', 'who are', 'who does', 'who do',
    'which is', 'which are', 'which does', 'which do',
    // Learning phrases
    'i want to learn', 'i need to learn', 'i want to know', 'i need to know',
    'teach me', 'show me', 'guide me', 'tutorial', 'example', 'examples',
    // Indonesian question words (removed 'tolong' to avoid conflict with edit commands)
    'apa', 'mengapa', 'kenapa', 'bagaimana', 'kapan', 'dimana', 'dimana', 'siapa', 'yang mana',
    'jelaskan', 'terangkan', 'bantu', 'tolong jelaskan', 'tolong bantu', 'tolong ajarkan',
    'apa itu', 'apa ini', 'apa artinya', 'apa maksudnya', 'bagaimana cara', 'bagaimana untuk',
    'kenapa', 'mengapa', 'kapan', 'dimana', 'siapa', 'yang mana',
    // Indonesian learning phrases
    'saya ingin belajar', 'saya perlu belajar', 'saya ingin tahu', 'saya perlu tahu',
    'ajarkan', 'tunjukkan', 'panduan', 'tutorial', 'contoh', 'contohnya',
    // Schedule/Planning related (should be tutor)
    'jadwal', 'schedule', 'routine', 'plan', 'rencana', 'agenda', 'kalender', 'calendar',
    'buatkan jadwal', 'buat jadwal', 'jadwal harian', 'daily schedule', 'morning routine',
    'evening routine', 'rutinitas', 'rutinitas pagi', 'rutinitas sore'
  ];
  
  // Check for builder intent (only count if NOT in exclusion patterns)
  const builderScore = builderKeywords.reduce((score, keyword) => {
    if (lowerText.includes(keyword)) {
      // Skip if this keyword is part of a tutor-only pattern
      const isExcluded = tutorOnlyPatterns.some(pattern => {
        const match = text.match(pattern);
        return match && match[0].toLowerCase().includes(keyword);
      });
      if (isExcluded) return score;
      
      // Give higher weight to more specific keywords
      if (['buat web', 'buat website', 'buat aplikasi', 'build web', 'create website', 'make app'].includes(keyword)) {
        return score + 3;
      }
      return score + 1;
    }
    return score;
  }, 0);
  
  // Check for tutor intent (questions)
  const tutorScore = tutorKeywords.reduce((score, keyword) => {
    if (lowerText.includes(keyword)) {
      // Give higher weight to question words at the start
      if (lowerText.startsWith(keyword) || lowerText.startsWith(keyword + ' ')) {
        return score + 3;
      }
      // Give higher weight to specific question patterns
      if (['what is', 'what are', 'how to', 'bagaimana cara', 'apa itu'].includes(keyword)) {
        return score + 2;
      }
      // Give higher weight to schedule/routine related keywords
      if (['jadwal', 'schedule', 'routine', 'plan', 'rencana', 'agenda', 'morning routine', 'evening routine'].includes(keyword)) {
        return score + 3;
      }
      return score + 1;
    }
    return score;
  }, 0);
  
  // Check for question mark (strong indicator of tutor mode)
  const hasQuestionMark = text.includes('?');
  if (hasQuestionMark && tutorScore > 0) {
    return 'tutor';
  }
  
  // Check for imperative builder commands
  const imperativeBuilderPatterns = [
    /^buat\s+(web|website|aplikasi|app|halaman|situs)/i,
    /^build\s+(web|website|app|application|page|site)/i,
    /^create\s+(web|website|app|application|page|site)/i,
    /^make\s+(web|website|app|application|page|site)/i,
    /^generate\s+(web|website|app|application|page|site)/i
  ];
  
  const hasImperativeBuilder = imperativeBuilderPatterns.some(pattern => pattern.test(text));
  if (hasImperativeBuilder) {
    return 'builder';
  }
  
  // Decision logic
  if (builderScore > tutorScore && builderScore > 0) {
    return 'builder';
  }
  
  if (tutorScore > builderScore && tutorScore > 0) {
    return 'tutor';
  }
  
  // If scores are equal or both zero, check for specific patterns
  if (builderScore === tutorScore) {
    // If text contains both, prioritize based on context
    if (hasQuestionMark) {
      return 'tutor';
    }
    // If starts with builder command, it's builder
    if (hasImperativeBuilder) {
      return 'builder';
    }
  }
  
  // Default to tutor mode for general queries
  return 'tutor';
};

// Helper function to extract readable text from error HTML
const extractTextFromErrorHtml = (html: string): string => {
  try {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Try to get text content
    let text = tempDiv.textContent || tempDiv.innerText || '';
    
    // If we got text, clean it up
    if (text.trim().length > 0) {
      // Remove extra whitespace and newlines
      text = text.replace(/\s+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
      return text;
    }
    
    // Fallback: try to extract specific error elements
    const strongMatch = html.match(/<strong[^>]*>([^<]+)<\/strong>/gi);
    const pMatch = html.match(/<p[^>]*class="text-sm[^"]*"[^>]*>([^<]+)<\/p>/gi);
    
    if (strongMatch || pMatch) {
      const parts: string[] = [];
      if (strongMatch) {
        strongMatch.forEach(m => {
          const content = m.replace(/<[^>]+>/g, '').trim();
          if (content) parts.push(content);
        });
      }
      if (pMatch) {
        pMatch.forEach(m => {
          const content = m.replace(/<[^>]+>/g, '').trim();
          if (content) parts.push(content);
        });
      }
      if (parts.length > 0) {
        return parts.join('\n\n');
      }
    }
    
    // Last resort: return original HTML
    return html;
  } catch (error) {
    console.error('Error extracting text from HTML:', error);
    return html;
  }
};

const extractCode = (response: string): { text: string; code: string | null } => {
  if (!response || typeof response !== 'string') {
    return { text: 'No response received.', code: null };
  }

  // Try to match markdown code blocks with various languages or no language
  // Support both ```html and ``` with newline or without
  const codeBlockMatch = response.match(/```(?:html|xml|jsx|tsx|react)?\s*\n?([\s\S]*?)\n?```/);

  if (codeBlockMatch && codeBlockMatch[1]) {
    const code = codeBlockMatch[1].trim();
    // Validate: code should not be empty or only whitespace/newlines
    if (!code || code.length === 0 || /^[\s\n\r\t]+$/.test(code)) {
      // Invalid code, return null
      const text = response.replace(codeBlockMatch[0], '').trim() || response || 'No valid code found.';
      return { text, code: null };
    }
    
    const text = response.replace(codeBlockMatch[0], '').trim();
    // If code looks like HTML, return it
    if (code.includes('<html') || code.includes('<!DOCTYPE') || code.includes('<div') || code.includes('<body')) {
      // CRITICAL: If text is empty after removing code block, use original response
      // This prevents losing content when code block extraction removes everything
      return { 
        text: text || response || 'Generated app successfully.', 
        code 
      };
    }
  }

  // Check for raw HTML structure (with or without DOCTYPE)
  if (response.includes('<!DOCTYPE html>') || response.includes('<html') || response.includes('<body')) {
    // Extract HTML from response (might have text before/after)
    const htmlMatch = response.match(/(<!DOCTYPE[\s\S]*?<\/html>)/i) || 
                     response.match(/(<html[\s\S]*?<\/html>)/i) ||
                     response.match(/(<body[\s\S]*?<\/body>)/i);
    
    if (htmlMatch && htmlMatch[1]) {
      const code = htmlMatch[1].trim();
      // Validate: code should not be empty or only whitespace/newlines
      if (!code || code.length === 0 || /^[\s\n\r\t]+$/.test(code)) {
        const text = response.replace(htmlMatch[0], '').trim() || response || 'No valid code found.';
        return { text, code: null };
      }
      const text = response.replace(htmlMatch[0], '').trim();
      return { text: text || 'Generated app successfully.', code };
    }
    
    // If entire response looks like HTML, use it directly
    if (response.trim().startsWith('<')) {
      const trimmedResponse = response.trim();
      // Validate: response should not be empty or only whitespace/newlines
      if (trimmedResponse.length > 0 && !/^[\s\n\r\t]+$/.test(trimmedResponse)) {
        return { text: 'Generated app successfully.', code: trimmedResponse };
      }
    }
  }

  // Last resort: if response contains HTML tags, try to extract
  if (response.includes('<') && response.includes('>')) {
    // Try to find complete HTML document
    const htmlStart = response.indexOf('<html');
    const htmlEnd = response.lastIndexOf('</html>');
    if (htmlStart !== -1 && htmlEnd !== -1) {
      const code = response.substring(htmlStart, htmlEnd + 7).trim();
      // Validate: code should not be empty or only whitespace/newlines
      if (code && code.length > 0 && !/^[\s\n\r\t]+$/.test(code)) {
        return { text: 'Generated app successfully.', code };
      }
    }
    
    // Try to find body content
    const bodyStart = response.indexOf('<body');
    const bodyEnd = response.lastIndexOf('</body>');
    if (bodyStart !== -1 && bodyEnd !== -1) {
      const bodyContent = response.substring(bodyStart, bodyEnd + 7);
      // Wrap in minimal HTML structure
      const code = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Generated App</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
${bodyContent}
</html>`;
      return { text: 'Generated app successfully.', code };
    }
  }

  return { text: response, code: null };
};

// Helper to create React preview HTML (direct React execution, no conversion)
const createReactPreviewHTML = (componentCode: string, framework?: string): string => {
  // CRITICAL: Validate that code is not an error HTML message
  const isErrorCode = componentCode.includes('<!-- Error Generating Code -->') ||
                     componentCode.includes('text-red-500') ||
                     componentCode.includes('bg-red-900') ||
                     componentCode.includes('ANTHROPIC Error') ||
                     componentCode.includes('OpenRouter API Error') ||
                     componentCode.includes('This operation was aborted');
  
  if (isErrorCode) {
    // Return error HTML instead of trying to compile error message as React
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Error</title>
  <style>
    body { margin: 0; padding: 20px; font-family: system-ui, sans-serif; background: #050505; color: #fff; }
    .error { background: #7f1d1d; border: 1px solid #ef4444; padding: 16px; border-radius: 8px; }
    h1 { color: #ef4444; margin: 0 0 12px 0; }
    p { margin: 8px 0; }
  </style>
</head>
<body>
  <div class="error">
    <h1>Error Rendering Component</h1>
    <p>Code generation failed. Please try again with a different prompt or provider.</p>
  </div>
</body>
</html>`;
  }
  
  // Extract component name - try multiple patterns
  let componentName = 'App';
  const patterns = [
    /export\s+default\s+function\s+(\w+)/,
    /export\s+default\s+const\s+(\w+)/,
    /export\s+function\s+(\w+)/,
    /export\s+const\s+(\w+)\s*=/,
    /function\s+(\w+)\s*\(/,
    /const\s+(\w+)\s*=\s*(?:\(|function)/,
  ];
  
  for (const pattern of patterns) {
    const match = componentCode.match(pattern);
    if (match && match[1]) {
      componentName = match[1];
      break;
    }
  }
  
  // Helper function to strip TypeScript type annotations
  const stripTypeScript = (code: string): string => {
    let stripped = code;
    
    // Remove generic type parameters from hooks and functions: useState<Type[]>() => useState()
    // Be careful with JSX tags, so we match specific patterns
    stripped = stripped.replace(/(useState|useEffect|useRef|useMemo|useCallback|useReducer|useContext)\s*<[^>]+>/g, '$1');
    
    // Remove generic type parameters from other function calls: func<Type>() => func()
    // But avoid JSX tags by checking if it's followed by ( or whitespace
    stripped = stripped.replace(/(\w+)\s*<[^>]+>\s*(?=[(\s])/g, '$1 ');
    
    // Remove type annotations from variable declarations: const x: Type[] = value => const x = value
    stripped = stripped.replace(/(const|let|var)\s+(\w+)\s*:\s*[^=]+=/g, '$1 $2 =');
    
    // Remove type annotations from destructured assignments: const [x, y]: [Type, Type] = value => const [x, y] = value
    stripped = stripped.replace(/(const|let|var)\s+(\[[^\]]+\])\s*:\s*[^=]+=/g, '$1 $2 =');
    
    // Remove type annotations from object destructuring: const { x, y }: { x: Type, y: Type } = value => const { x, y } = value
    stripped = stripped.replace(/(const|let|var)\s+(\{[^}]+\})\s*:\s*[^=]+=/g, '$1 $2 =');
    
    // Remove type annotations from function parameters: (param: Type) => (param)
    // Handle complex cases with nested parentheses
    stripped = stripped.replace(/\(([^)]*)\)/g, (match, params) => {
      if (!params.includes(':')) return match; // No type annotations
      
      return '(' + params
        .split(',')
        .map((p: string) => {
          const trimmed = p.trim();
          if (!trimmed.includes(':')) return trimmed;
          
          // Handle default values: param: Type = value => param = value
          if (trimmed.includes('=')) {
            const [namePart, ...defaultParts] = trimmed.split('=');
            const name = namePart.trim().split(':')[0].trim();
            return `${name} = ${defaultParts.join('=').trim()}`;
          }
          
          // Remove type annotation: param: Type => param
          return trimmed.split(':')[0].trim();
        })
        .join(', ') + ')';
    });
    
    // Remove type assertions: value as Type => value
    stripped = stripped.replace(/\s+as\s+[A-Z][a-zA-Z0-9<>[\],\s|&]*/g, '');
    
    // Remove return type annotations: function name(): Type { => function name() {
    stripped = stripped.replace(/\)\s*:\s*[A-Z][a-zA-Z0-9<>[\],\s|&]*\s*{/g, ') {');
    stripped = stripped.replace(/\)\s*:\s*[A-Z][a-zA-Z0-9<>[\],\s|&]*\s*=>/g, ') =>');
    
    // Remove interface definitions (multi-line)
    stripped = stripped.replace(/interface\s+\w+\s*[^{]*\{[^}]*\}/gs, '');
    
    // Remove type aliases
    stripped = stripped.replace(/type\s+\w+\s*=\s*[^;]+;/g, '');
    
    return stripped;
  };
  
  // Keep component code as-is, only remove external imports
  let cleanedCode = componentCode
    .replace(/^import\s+.*?from\s+['"](?!react|react-dom)[^'"]*['"];?$/gm, '') // Remove non-react imports
    .replace(/export\s+(default\s+)?/g, '') // Remove export keywords
    .trim();
  
  // Strip TypeScript type annotations for Babel compatibility
  cleanedCode = stripTypeScript(cleanedCode);
  
  // Escape code for safe embedding in HTML/JS (escape backticks, ${}, and </script>)
  const escapedCode = cleanedCode
    .replace(/\\/g, '\\\\')  // Escape backslashes first
    .replace(/`/g, '\\`')    // Escape backticks
    .replace(/\${/g, '\\${') // Escape template literal expressions
    .replace(/<\/script>/gi, '<\\/script>'); // Escape script closing tags
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>React Preview</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; background-color: #050505; color: #fff; font-family: 'Inter', sans-serif; }
    #root { min-height: 100vh; }
  </style>
</head>
<body>
  <div id="root"></div>
  
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  
  <script>
    (function() {
      // Get component code directly from template literal (no JSON.parse needed)
      const componentCode = \`${escapedCode}\`;
      const componentName = ${JSON.stringify(componentName)};
      
      // Transform with Babel
      try {
        // Try with TypeScript preset first, fallback to react/env if not available
        let transformed;
        try {
          transformed = Babel.transform(componentCode, {
            presets: ['react', 'typescript', 'env'],
            filename: 'component.tsx'
          }).code;
        } catch (tsError) {
          // If TypeScript preset not available, use react/env (code should already be stripped)
          transformed = Babel.transform(componentCode, {
            presets: ['react', 'env'],
            filename: 'component.tsx'
          }).code;
        }
        
        // Execute transformed code with React hooks available
        const executeCode = new Function(
          'React', 'ReactDOM', 
          'useState', 'useEffect', 'useRef', 'useMemo', 'useCallback', 
          'forwardRef', 'Fragment', 'createElement',
          transformed + '\\n' +
          'const root = ReactDOM.createRoot(document.getElementById("root"));\\n' +
          'const AppComponent = typeof ' + componentName + ' !== "undefined" ? ' + componentName + ' : ' +
          '(typeof App !== "undefined" ? App : ' +
          '(() => React.createElement("div", {className: "p-8 text-red-400"}, "Component: ' + componentName + ' not found")));\\n' +
          'root.render(React.createElement(AppComponent));'
        );
        
        executeCode(
          React, ReactDOM,
          React.useState, React.useEffect, React.useRef,
          React.useMemo, React.useCallback, React.forwardRef,
          React.Fragment, React.createElement
        );
      } catch (error) {
        console.error('Error:', error);
        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(React.createElement('div', { 
          className: 'p-8 text-red-400'
        }, 
          React.createElement('h1', null, 'Error rendering component'),
          React.createElement('pre', { style: { whiteSpace: 'pre-wrap', fontSize: '12px' } }, error.toString())
        ));
      }
    })();
  </script>
</body>
</html>`;
};

const getIframeSrc = (code: string, entryPath?: string, framework?: string) => {
  // Clean and validate code
  const cleanedCode = code ? code.trim() : '';
  
  // Check if code is empty or only contains whitespace/newlines
  if (!cleanedCode || cleanedCode.length === 0 || /^[\s\n\r\t]+$/.test(cleanedCode)) {
    console.warn('⚠️ getIframeSrc called with empty or whitespace-only code');
    return 'data:text/html;charset=utf-8,<!DOCTYPE html><html><body><p>No code to display</p></body></html>';
  }
  
  try {
    // Check if entry is React/TSX/JSX file or framework project
    const isReactFile = entryPath && /\.(tsx|jsx|ts|js)$/.test(entryPath);
    const isFrameworkProject = framework && framework !== 'html';
    
    // If already HTML, return as is
    if (cleanedCode.includes('<!DOCTYPE') || cleanedCode.includes('<html')) {
      const encoded = encodeURIComponent(cleanedCode);
      return `data:text/html;charset=utf-8,${encoded}`;
    }
    
    // For React/Next.js/Vite: Use direct React execution (no HTML conversion)
    let htmlCode = cleanedCode;
    if (isReactFile || isFrameworkProject) {
      htmlCode = createReactPreviewHTML(cleanedCode, framework);
      console.log('⚛️ Using direct React execution for preview');
    } else {
      // Wrap plain content in HTML
      // Ensure code doesn't start/end with only newlines
      const contentCode = cleanedCode.replace(/^\s+|\s+$/g, '');
      htmlCode = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Generated App</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
${contentCode}
</body>
</html>`;
    }
    
    // Final validation: ensure htmlCode is not empty
    if (!htmlCode || htmlCode.trim().length === 0) {
      console.warn('⚠️ Generated HTML code is empty');
      return 'data:text/html;charset=utf-8,<!DOCTYPE html><html><body><p>No code to display</p></body></html>';
    }
    
    const encoded = encodeURIComponent(htmlCode);
    const dataUrl = `data:text/html;charset=utf-8,${encoded}`;
    console.log('🔗 Iframe src generated:', {
      codeLength: cleanedCode.length,
      htmlCodeLength: htmlCode.length,
      entryPath,
      framework,
      isReactFile,
      preview: htmlCode.substring(0, 100)
    });
    return dataUrl;
  } catch (error) {
    console.error('❌ Error encoding iframe src:', error);
    return 'data:text/html;charset=utf-8,<!DOCTYPE html><html><body><p>Error loading preview</p></body></html>';
  }
};

// --- Splash Screen Component ---
const SplashScreen: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 2000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="flex items-center justify-center h-screen bg-[#050505] text-white">
      <div className="text-center space-y-6 animate-pulse">
        <div className="w-16 h-16 mx-auto flex items-center justify-center">
          <Logo size={64} />
        </div>
        <h1 className="text-3xl font-display font-bold tracking-widest">NEVRA</h1>
        <p className="text-sm text-gray-400">Initializing Neural Automation...</p>
      </div>
    </div>
  );
};

// --- Mode Selection Component ---
// ModeSelection component removed - mode is now auto-detected from Home.tsx prompt

// --- Main Chat Interface ---
const ChatInterface: React.FC = () => {
  const { user } = useUser();
  const { id: sessionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Helper: Get optimal provider for mode (moved outside component to be accessible)
  const getOptimalProviderForMode = (mode: AppMode | null, isSubscribed: boolean = false): AIProvider => {
    if (!mode) return 'deepseek'; // Default to Mistral Devstral (free)
    
    if (mode === 'builder') {
      // Builder mode: Mistral Devstral (free, good for code generation)
      return 'deepseek'; // Mistral Devstral for code generation
    } else {
      // Tutor mode: Mistral Devstral (optimized for NEVRA Tutor)
      return 'deepseek'; // Mistral Devstral for Tutor mode (default)
    }
  };

  // Helper: Get initial state safely
  const getInitialState = () => {
    const initialPrompt = location.state?.initialPrompt;
    const initialProvider = location.state?.initialProvider as AIProvider;
    const initialImages = location.state?.initialImages as string[];
    const targetFile = location.state?.targetFile as string | undefined;
    const codebaseMode = location.state?.mode === 'codebase';

    if (initialPrompt || (initialImages && initialImages.length > 0)) {
      // If codebase mode (from Home.tsx), force builder mode and focus on code
      const detectedMode = codebaseMode ? 'builder' : (initialPrompt ? detectMode(initialPrompt) : 'tutor');
      const userMsgId = Date.now().toString();
      const content = initialPrompt || "Analyzing image...";
      
      // Get optimal provider for detected mode (default to Mistral Devstral for free users)
      const optimalProvider = initialProvider || getOptimalProviderForMode(detectedMode, false);

      return {
        mode: detectedMode,
        messages: [{
          id: userMsgId,
          role: 'user',
          content: content,
          images: initialImages,
          timestamp: new Date()
        }] as Message[],
        shouldAutoSend: true,
        initialProvider: optimalProvider,
        initialImages: initialImages || [],
        targetFile: targetFile,
        codebaseMode: codebaseMode || false
      };
    }
    // Default to tutor mode if no prompt (auto-detect from Home.tsx)
    return { mode: 'tutor' as AppMode, messages: [], shouldAutoSend: false, initialProvider: 'deepseek' as AIProvider, initialImages: [], targetFile: undefined, codebaseMode: false };
  };

  const initialState = getInitialState();
  const [templateName, setTemplateName] = useState<string | undefined>((initialState as any).templateName);

  // Token Limit Hooks
  const { hasExceeded, isSubscribed, refreshLimit, tokensUsed, incrementTokenUsage, loading: tokenLoading } = useTokenLimit();

  // Global State
  const [appMode, setAppMode] = useState<AppMode>(initialState.mode);
  // Always use React framework (not HTML) - auto-explore codebase
  const initialFramework = (initialState as any).framework || 'react';
  const [framework, setFramework] = useState<Framework>(initialFramework);
  
  // Codebase mode state (from Home.tsx navigation)
  const [codebaseMode] = useState<boolean>((initialState as any).codebaseMode || false);
  const [targetFile] = useState<string | undefined>((initialState as any).targetFile);
  
  // Get optimal default provider based on mode
  const getDefaultProvider = (mode: AppMode | null): AIProvider => {
    if (!mode) return 'deepseek'; // Default to Mistral Devstral
    return getOptimalProviderForMode(mode, isSubscribed);
  };
  
  const defaultProvider = initialState.initialProvider || getDefaultProvider(initialState.mode);
  const [provider, setProvider] = useState<AIProvider>(defaultProvider as AIProvider);
  
  // Auto-switch provider when mode changes - DISABLED FOR TESTING
  // useEffect(() => {
  //   if (appMode) {
  //     const optimalProvider = getOptimalProviderForMode(appMode, isSubscribed, false);
  //     if (provider !== optimalProvider) {
  //       console.log(`🔄 Auto-switching provider: ${provider} → ${optimalProvider} (mode: ${appMode})`);
  //       setProvider(optimalProvider);
  //     }
  //   }
  // }, [appMode, isSubscribed, false, provider]);
  
  // Update provider if Grok becomes locked/unlocked - DISABLED FOR TESTING
  // useEffect(() => {
  //   if (provider === 'gemini' && false && !isSubscribed) {
  //     const fallbackProvider = getOptimalProviderForMode(appMode, isSubscribed, false);
  //     console.log(`🔄 Grok locked, switching to ${fallbackProvider}`);
  //     setProvider(fallbackProvider);
  //   }
  // }, [false, isSubscribed, provider, appMode]);
  // Skip splash screen if we have initial prompt or mode is already set
  const [showSplash, setShowSplash] = useState(!initialState.shouldAutoSend && !initialState.mode);

  // Chat State
  const [messages, setMessages] = useState<Message[]>(initialState.messages);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const MAX_IMAGES = 3;
  const MAX_SIZE_MB = 2;
  
  // AI Memory State - History yang akan dikirim ke AI
  const [aiMemoryHistory, setAiMemoryHistory] = useState<Message[]>([]);
  const [lastResetTime, setLastResetTime] = useState<Date | null>(null);
  
  // Helper: Get current WIB time
  const getWIBTime = (): Date => {
    const now = new Date();
    // Convert to WIB (UTC+7)
    const wibOffset = 7 * 60 * 60 * 1000;
    return new Date(now.getTime() + wibOffset);
  };
  
  // Helper: Check if it's past 12:00 WIB today
  const shouldResetMemory = (): boolean => {
    const wibTime = getWIBTime();
    const hour = wibTime.getUTCHours();
    const minute = wibTime.getUTCMinutes();
    
    // Check if it's 12:00 WIB or later
    if (hour > 12 || (hour === 12 && minute >= 0)) {
      const today = wibTime.toISOString().split('T')[0]; // YYYY-MM-DD
      const lastReset = localStorage.getItem('nevra_ai_memory_last_reset');
      
      // Reset if we haven't reset today yet
      if (lastReset !== today) {
        return true;
      }
    }
    return false;
  };
  
  // Reset AI memory at 12:00 WIB daily
  useEffect(() => {
    const checkAndReset = () => {
      if (shouldResetMemory()) {
        const wibTime = getWIBTime();
        const today = wibTime.toISOString().split('T')[0];
        
        console.log('🔄 Resetting AI memory - Daily reset at 12:00 WIB');
        setAiMemoryHistory([]);
        setLastResetTime(new Date());
        localStorage.setItem('nevra_ai_memory_last_reset', today);
      }
    };
    
    // Check immediately
    checkAndReset();
    
    // Check every minute to catch 12:00 WIB
    const interval = setInterval(checkAndReset, 60000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Update AI memory when messages change (only if token available)
  useEffect(() => {
    // Only update memory if token is available
    if (isSubscribed) {
      // Subscribed users always have memory
      setAiMemoryHistory(prev => {
        const updated = messages.slice(-20);
        return updated.length !== prev.length || updated.some((m, i) => m.id !== prev[i]?.id) ? updated : prev;
      });
    } else if (!hasExceeded) {
      // For free users, only keep memory if tokens available
      const tokensRemaining = FREE_TOKEN_LIMIT - tokensUsed;
      if (tokensRemaining > 0) {
        setAiMemoryHistory(prev => {
          const updated = messages.slice(-20);
          return updated.length !== prev.length || updated.some((m, i) => m.id !== prev[i]?.id) ? updated : prev;
        });
      } else {
        // Clear memory if tokens exhausted
        setAiMemoryHistory(prev => {
          if (prev.length > 0) {
            console.log('⚠️ AI Memory: Cleared - Token limit reached');
            return [];
          }
          return prev;
        });
      }
    } else {
      // Token exceeded - clear memory
      setAiMemoryHistory(prev => {
        if (prev.length > 0) {
          console.log('⚠️ AI Memory: Cleared - Token limit exceeded');
          return [];
        }
        return prev;
      });
    }
  }, [messages, hasExceeded, isSubscribed, tokensUsed]);

  // Builder State - Multi-File Support
  const [fileManager] = useState(() => new FileManager());
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [openFiles, setOpenFiles] = useState<string[]>([]);
  const [currentCode, setCurrentCode] = useState<string>(''); // Keep for backward compatibility
  const [currentFramework, setCurrentFramework] = useState<string | undefined>(undefined); // Track framework for preview
  const [isBuildingCode, setIsBuildingCode] = useState(false); // Loading state for code generation
  const [codebaseAnalysis, setCodebaseAnalysis] = useState<CodebaseAnalysis | null>(null);
  const [isExploringCodebase, setIsExploringCodebase] = useState(false);
  // If codebase mode, default to 'code' tab instead of 'preview'
  const [activeTab, setActiveTab] = useState<'preview' | 'design' | 'code' | 'visual'>(((initialState as any).codebaseMode) ? 'code' : 'preview');
  const [showDesignTools, setShowDesignTools] = useState(false);
  const [canvasZoom, setCanvasZoom] = useState(75);
  const [typescriptErrors, setTypeScriptErrors] = useState<TypeError[]>([]);
  const [lintErrors, setLintErrors] = useState<LintError[]>([]);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showComponentLibrary, setShowComponentLibrary] = useState(false);
  const [showGitHubIntegration, setShowGitHubIntegration] = useState(false);
  const [showDesignSystem, setShowDesignSystem] = useState(false);
  const [showDatabasePanel, setShowDatabasePanel] = useState(false);
  const [showAPIIntegration, setShowAPIIntegration] = useState(false);
  const [showMobileGenerator, setShowMobileGenerator] = useState(false);
  const undoRedoManager = getUndoRedoManager();
  const [logs, setLogs] = useState<string[]>([]);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const canExport = Boolean(currentCode || fileManager.getAllFiles().length > 0);
  const [freeFallback, setFreeFallback] = useState(false);

  // Mobile State
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isTablet, setIsTablet] = useState(window.innerWidth >= 768 && window.innerWidth < 1024);
  const [mobileTab, setMobileTab] = useState<'chat' | 'workbench'>('chat');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [deviceScale, setDeviceScale] = useState(1);
  const [fileTreeOpen, setFileTreeOpen] = useState(false); // For mobile/tablet collapsible file tree
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const previewIframeRef = useRef<HTMLIFrameElement>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasAutoSent = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showImageMenu, setShowImageMenu] = useState(false);
  const imageMenuRef = useRef<HTMLDivElement>(null);
  const [showTutorFeaturesMenu, setShowTutorFeaturesMenu] = useState(false);
  const tutorFeaturesMenuRef = useRef<HTMLDivElement>(null);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const attachmentMenuRef = useRef<HTMLDivElement>(null);
  const restoredSessionRef = useRef(false);
  // Refs for camera cleanup
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const cameraModalRef = useRef<HTMLElement | null>(null);
  const cameraEventListenersRef = useRef<Array<{ element: HTMLElement; event: string; handler: EventListener }>>([]);
  const { getToken } = useAuth();
  const SUPABASE_TEMPLATE = import.meta.env.VITE_CLERK_SUPABASE_TEMPLATE || 'supabase';
  const { trackUsage } = useTrackAIUsage();
  const [showSubscriptionPopup, setShowSubscriptionPopup] = useState(false);

  // Feedback Popup State
  const [showFeedbackPopup, setShowFeedbackPopup] = useState(false);
  const hasShownSessionPopup = useRef(false);
  const { preferences } = useUserPreferences();

  // Voice Call State (only for tutor mode)
  const [showVoiceCall, setShowVoiceCall] = useState(false);

  // Sidebar State (only for tutor mode)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // Chat Sessions (for sidebar)
  const { sessions, deleteSession, refreshSessions } = useChatSessions();

  // New Features for Tutor Mode
  const [enableWebSearch, setEnableWebSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [uploadedDocument, setUploadedDocument] = useState<ParsedDocument | null>(null);
  const [showCodeSandbox, setShowCodeSandbox] = useState(false);
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const documentInputRef = useRef<HTMLInputElement>(null);

  // Agentic Planning for Builder Mode
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [showPlanner, setShowPlanner] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);

  // Feedback Logic
  useEffect(() => {
    if (!preferences || hasShownSessionPopup.current) return;

    const userMsgCount = messages.filter(m => m.role === 'user').length;

    // Show popup if:
    // 1. User has sent at least 2 messages
    // 2. User hasn't given feedback yet (checked from DB)
    // 3. Popup hasn't been shown in this session (checked via ref)
    if (userMsgCount >= 2 && !preferences.preferences?.has_given_feedback) {
      setShowFeedbackPopup(true);
      hasShownSessionPopup.current = true;
    }
  }, [messages, preferences]);

  // Responsive handler
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024);
    };
    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load messages when sessionId changes (for sidebar session selection)
  useEffect(() => {
    const loadSessionMessages = async () => {
      if (!sessionId || !user) return;
      
      try {
        const token = await getToken({ template: SUPABASE_TEMPLATE }).catch(() => null);
        const sessionMessages = await getSessionMessages(sessionId, token);
        
        // Convert database messages to Message format
        const convertedMessages: Message[] = sessionMessages.map((msg: any) => ({
          id: msg.id,
          role: msg.role as 'user' | 'ai',
          content: msg.content,
          code: msg.code || undefined,
          images: msg.images || undefined,
          timestamp: new Date(msg.created_at)
        }));
        
        setMessages(convertedMessages);
        
        // Update appMode from session if available
        if (sessionMessages.length > 0) {
          const sessions = await getUserSessions(user.id, token);
          const session = sessions.find(s => s.id === sessionId);
          
          if (session?.mode) {
            setAppMode(session.mode as AppMode);
          }
        }
      } catch (error) {
        console.error('Error loading session messages:', error);
      }
    };
    
    loadSessionMessages();
  }, [sessionId, user, getToken]);

  // Calculate device scale to fit canvas
  useEffect(() => {
    if (previewDevice === 'desktop' || !previewContainerRef.current) {
      setDeviceScale(1);
      return;
    }

    const calculateScale = () => {
      const container = previewContainerRef.current?.parentElement;
      if (!container) return;

      // Account for padding (p-4 = 1rem = 16px each side = 32px total)
      // Account for address bar height (~40px) + margin bottom (mb-4 = 1rem = 16px) + extra padding
      const containerWidth = container.clientWidth - 32; // 16px padding each side
      const containerHeight = container.clientHeight - 100; // address bar + margins + padding

      let deviceWidth = 375;
      let deviceHeight = 812;

      if (previewDevice === 'tablet') {
        deviceWidth = 768;
        deviceHeight = 1024;
      }

      const scaleX = containerWidth / deviceWidth;
      const scaleY = containerHeight / deviceHeight;
      const scale = Math.min(scaleX, scaleY, 1); // Don't scale up, only down
      const finalScale = Math.max(0.3, scale); // Minimum scale to prevent too small

      setDeviceScale(finalScale);
    };

    // Initial calculation
    calculateScale();

    // Use ResizeObserver for container
    const resizeObserver = new ResizeObserver(calculateScale);
    if (previewContainerRef.current?.parentElement) {
      resizeObserver.observe(previewContainerRef.current.parentElement);
    }

    // Also listen to window resize
    window.addEventListener('resize', calculateScale);
    
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', calculateScale);
    };
  }, [previewDevice]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load session messages when sessionId is in URL
  useEffect(() => {
    const loadSessionMessages = async () => {
      if (!sessionId || !user || restoredSessionRef.current) return;

      try {
        const token = await getToken({ template: SUPABASE_TEMPLATE }).catch(() => null);
        const dbMessages = await getSessionMessages(sessionId, token);
        
        if (dbMessages && dbMessages.length > 0) {
          const restoredMessages = dbMessages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            code: m.code || undefined,
            images: m.images || undefined,
            timestamp: new Date(m.created_at),
          }));
          setMessages(restoredMessages);
          
          // Restore AI memory from session (only if token available)
          if (!hasExceeded || isSubscribed) {
            setAiMemoryHistory(restoredMessages.slice(-20)); // Keep last 20 messages
            console.log(`🧠 AI Memory: Restored ${restoredMessages.length} messages from session`);
          }
        }
        restoredSessionRef.current = true;
      } catch (error) {
        console.error('Error loading session messages', error);
      }
    };

    loadSessionMessages();
  }, [sessionId, user, hasExceeded, isSubscribed, getToken]);

  // Auto-resume latest session when no session is selected
  useEffect(() => {
    const resumeLatestSession = async () => {
      if (sessionId || restoredSessionRef.current || !user) return;

      try {
        const token = await getToken({ template: SUPABASE_TEMPLATE }).catch(() => null);
        const sessions = await getUserSessions(user.id, token);
        if (!sessions || sessions.length === 0) return;

        const latest = sessions[0];
        const dbMessages = await getSessionMessages(latest.id, token);

        setAppMode(latest.mode as AppMode);
        setProvider(latest.provider as AIProvider);
        const restoredMessages = dbMessages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          code: m.code || undefined,
          images: m.images || undefined,
          timestamp: new Date(m.created_at),
        }));
        setMessages(restoredMessages);
        
        // Restore AI memory from session (only if token available)
        if (!hasExceeded || isSubscribed) {
          setAiMemoryHistory(restoredMessages.slice(-20)); // Keep last 20 messages
        }
        
        setShowSplash(false);
        restoredSessionRef.current = true;
        navigate(`/chat/${latest.id}`, { replace: true });
      } catch (error) {
        console.error('Error resuming latest session', error);
      }
    };

    resumeLatestSession();
  }, [sessionId, user, hasExceeded, isSubscribed, getToken, navigate]);

  // Auto-Start Logic - moved after handleSend definition

  // No auto-greeting; wait for user prompt

  // Mode selection is now automatic from Home.tsx prompt detection
  // No manual mode selection needed

  // Sidebar handlers (only for tutor mode)
  const handleNewChat = () => {
    setMessages([]);
    setInput('');
    setAttachedImages([]);
    setUploadedDocument(null);
    setSearchResults([]);
    setAppMode('tutor');
    // Clear sessionId to start fresh
    navigate('/chat');
    window.history.replaceState(null, '', '/chat');
    // Force refresh sessions in sidebar
    if (sessions && refreshSessions) {
      setTimeout(() => refreshSessions(), 500);
    }
  };

  const handleSelectSession = (selectedSessionId: string) => {
    navigate(`/chat/${selectedSessionId}`);
    // Messages will be loaded via useEffect when sessionId changes
  };

  const handleOpenSettings = () => {
    // Open settings modal - you can implement this
    console.log('Open settings');
  };

  // Handle File Upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    if (attachedImages.length >= MAX_IMAGES) {
      alert(`Maximum ${MAX_IMAGES} images per message.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const filesArray = Array.from(files);
    const validFiles = filesArray.filter(file => {
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        alert(`File ${file.name} is too large (> ${MAX_SIZE_MB}MB).`);
        return false;
      }
      return true;
    });

    const filesToProcess = validFiles.slice(0, MAX_IMAGES - attachedImages.length);
    
    if (filesToProcess.length === 0) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Process all files in parallel
    const imagePromises = filesToProcess.map(file => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => {
          console.error('Error reading file:', file.name);
          reject(new Error(`Failed to read file: ${file.name}`));
        };
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result);
          } else {
            reject(new Error(`Failed to read file: ${file.name}`));
          }
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(imagePromises)
      .then(newImages => {
        setAttachedImages(prev => {
          const updated = [...prev, ...newImages];
          console.log('✅ Images added:', { count: newImages.length, total: updated.length });
          return updated;
        });
        // Reset input after all files are processed
        if (fileInputRef.current) fileInputRef.current.value = '';
        setShowAttachmentMenu(false);
      })
      .catch(error => {
        console.error('Error processing images:', error);
        alert(`Error processing images: ${error instanceof Error ? error.message : 'Unknown error'}`);
        if (fileInputRef.current) fileInputRef.current.value = '';
      });
  };

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      // Cleanup camera stream
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(track => track.stop());
        cameraStreamRef.current = null;
      }
      // Cleanup modal
      if (cameraModalRef.current && document.body.contains(cameraModalRef.current)) {
        document.body.removeChild(cameraModalRef.current);
        cameraModalRef.current = null;
      }
      // Cleanup event listeners
      cameraEventListenersRef.current.forEach(({ element, event, handler }) => {
        element.removeEventListener(event, handler);
      });
      cameraEventListenersRef.current = [];
    };
  }, []);

  const handleCameraCapture = async () => {
    let stream: MediaStream | null = null;
    let modal: HTMLElement | null = null;
    
    const cleanup = () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
        cameraStreamRef.current = null;
      }
      if (modal && document.body.contains(modal)) {
        // Remove all event listeners
        cameraEventListenersRef.current.forEach(({ element, event, handler }) => {
          element.removeEventListener(event, handler);
        });
        cameraEventListenersRef.current = [];
        document.body.removeChild(modal);
        modal = null;
        cameraModalRef.current = null;
      }
      setShowImageMenu(false);
    };

    try {
      stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Use back camera on mobile
      });
      cameraStreamRef.current = stream;
      
      // Create modal for camera preview
      modal = document.createElement('div');
      modal.className = 'fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4';
      modal.innerHTML = `
        <div class="w-full max-w-md flex flex-col items-center">
          <video id="camera-preview" class="w-full max-w-full rounded-lg mb-4 aspect-video object-cover" autoplay playsinline></video>
          <div class="flex gap-3 justify-center w-full">
            <button id="capture-btn" class="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors">
              Capture Photo
            </button>
            <button id="cancel-btn" class="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors">
              Cancel
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      cameraModalRef.current = modal;
      
      const preview = modal.querySelector('#camera-preview') as HTMLVideoElement;
      if (!preview) {
        cleanup();
        return;
      }
      preview.srcObject = stream;
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        cleanup();
        return;
      }
      
      const captureBtn = modal.querySelector('#capture-btn');
      const cancelBtn = modal.querySelector('#cancel-btn');
      
      if (!captureBtn || !cancelBtn) {
        cleanup();
        return;
      }
      
      const handleCapture = () => {
        if (attachedImages.length >= MAX_IMAGES) {
          alert(`Maximum ${MAX_IMAGES} images per message.`);
          cleanup();
          return;
        }
        
        if (preview && ctx) {
          canvas.width = preview.videoWidth;
          canvas.height = preview.videoHeight;
          ctx.drawImage(preview, 0, 0);
          
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          setAttachedImages(prev => [...prev, dataUrl]);
        }
        
        cleanup();
      };
      
      const handleCancel = () => {
        cleanup();
      };
      
      captureBtn.addEventListener('click', handleCapture);
      cancelBtn.addEventListener('click', handleCancel);
      
      // Store listeners for cleanup
      cameraEventListenersRef.current = [
        { element: captureBtn as HTMLElement, event: 'click', handler: handleCapture },
        { element: cancelBtn as HTMLElement, event: 'click', handler: handleCancel }
      ];
      
    } catch (error: unknown) {
      console.error('Error accessing camera:', error);
      let errorMessage = 'Unable to access camera.';
      
      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          errorMessage = 'Camera access denied. Please allow camera access in your browser settings.';
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'Camera not found.';
        } else if (error.name === 'NotReadableError') {
          errorMessage = 'Camera is being used by another application.';
        }
      }
      
      alert(errorMessage);
      cleanup();
    }
  };

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (imageMenuRef.current && !imageMenuRef.current.contains(event.target as Node)) {
        setShowImageMenu(false);
      }
      if (tutorFeaturesMenuRef.current && !tutorFeaturesMenuRef.current.contains(event.target as Node)) {
        setShowTutorFeaturesMenu(false);
      }
      if (attachmentMenuRef.current && !attachmentMenuRef.current.contains(event.target as Node)) {
        setShowAttachmentMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const removeImage = (index: number) => {
    setAttachedImages(prev => prev.filter((_, i) => i !== index));
  };

  // Download function for multi-file projects
  const downloadProjectFiles = async () => {
    const files = fileManager.getAllFiles();
    if (files.length === 0) return;
    
    // For React/Next.js/Vite projects, download all files sequentially
    // Create a simple download for each file (user can manually create folder structure)
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const blob = new Blob([file.content], { 
        type: file.path.endsWith('.json') ? 'application/json' :
              file.path.endsWith('.css') ? 'text/css' :
              file.path.endsWith('.ts') || file.path.endsWith('.tsx') ? 'text/typescript' :
              file.path.endsWith('.js') || file.path.endsWith('.jsx') ? 'text/javascript' :
              'text/plain'
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      // Use file path as download name, replace slashes with underscores for safety
      anchor.download = file.path.replace(/\//g, '_').replace(/\\/g, '_');
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      
      // Small delay between downloads to avoid browser blocking
      if (i < files.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    // Show notification
    setLogs(prev => [...prev, `> Downloaded ${files.length} file(s) from ${currentFramework || 'react'} project`]);
  };

  const downloadCurrentCode = async () => {
    // Check if it's a multi-file project
    const files = fileManager.getAllFiles();
    if (files.length > 0 && currentFramework && currentFramework !== 'html') {
      await downloadProjectFiles();
      return;
    }
    
    // Single-file HTML download
    if (!currentCode) return;
    const blob = new Blob([currentCode], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'nevra-app.html';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const clearPreview = () => {
    setCurrentCode('');
    setActiveTab('preview');
    setLogs(prev => [...prev, '> Preview cleared']);
  };

  // Generate Plan (Builder Mode) with timeout handling
  const handleGeneratePlan = async (promptText: string) => {
    if (!promptText.trim() || isGeneratingPlan) return;

    setIsGeneratingPlan(true);
    try {
      // Generate plan with built-in timeout (15 seconds in agenticPlanner)
      // Use Mistral Devstral for plan generation (now default)
      const planProvider = provider === 'deepseek' ? 'deepseek' : 
                          (provider === 'openai' || provider === 'gemini' || provider === 'anthropic') ? provider : 'deepseek';
      const plan = await generatePlan(promptText, planProvider as 'anthropic' | 'gemini' | 'openai' | 'deepseek');
      setCurrentPlan(plan);
      setShowPlanner(true);
    } catch (error: any) {
      console.error('Failed to generate plan:', error);
      // generatePlan already returns fallback plan on error, so we should have a plan
      // But just in case, create a simple fallback
      const { createFallbackPlan } = await import('@/lib/agenticPlanner');
      const fallbackPlan = createFallbackPlan(promptText);
      setCurrentPlan(fallbackPlan);
      setShowPlanner(true);
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  // Handle Send
  // Helper: Estimate token count (rough: ~4 chars per token)
  const estimateTokenCount = (text: string): number => {
    return Math.ceil(text.length / 4);
  };

  // Helper: Truncate history to fit within token limit
  const truncateHistory = (history: any[], maxTokens: number = 1500): any[] => {
    // Estimate system prompt tokens (~500-800 tokens)
    const systemPromptTokens = 600;
    // Reserve tokens for current prompt (~500 tokens)
    const currentPromptTokens = 500;
    // Available tokens for history
    const availableTokens = maxTokens - systemPromptTokens - currentPromptTokens;
    
    if (availableTokens <= 0) return [];
    
    // Calculate total tokens in history
    let totalTokens = 0;
    const truncated: any[] = [];
    
    // Keep latest messages first (most important)
    for (let i = history.length - 1; i >= 0; i--) {
      const msg = history[i];
      const msgText = msg.parts?.[0]?.text || msg.content || '';
      const msgTokens = estimateTokenCount(msgText);
      
      if (totalTokens + msgTokens <= availableTokens) {
        truncated.unshift(msg);
        totalTokens += msgTokens;
      } else {
        // If adding this message would exceed, try to truncate it
        if (truncated.length === 0 && msgTokens > 0) {
          // At least keep the latest message, but truncated
          const maxLength = (availableTokens * 4) - 100; // Reserve some buffer
          const truncatedText = msgText.substring(0, maxLength) + '...[truncated]';
          truncated.unshift({
            ...msg,
            parts: [{ text: truncatedText }]
          });
        }
        break;
      }
    }
    
    return truncated;
  };

  const handleSend = async (textOverride?: string, modeOverride?: AppMode, historyOverride?: Message[]) => {
    let text = textOverride || input;
    const imagesToSend = historyOverride ? [] : attachedImages; // Only send new images if not overriding history

    if ((!text.trim() && imagesToSend.length === 0) || isTyping) return;

    // Declare codeResponse in outer scope to avoid "not defined" errors
    let codeResponse: CodeResponse | null = null;

    // Check if we have existing code in messages (indicates builder context)
    const hasExistingCode = messages.some(m => m.role === 'ai' && m.code && m.code.trim().length > 0);
    
    // Always detect mode from user input (unless explicitly overridden)
    let detectedMode = modeOverride || detectMode(text) || 'tutor';
    
    // Debug logging
    console.log(`🔍 Mode Detection Debug:`, {
      text: text.substring(0, 50),
      detectedMode,
      currentAppMode: appMode,
      hasExistingCode,
      modeOverride
    });
    
    // IMPORTANT: If we're in builder mode and have existing code, we need to be smart about mode switching
    // - Allow tutor questions (like "apa itu", "what is") to switch to tutor mode
    // - Keep edit commands in builder mode
    if (appMode === 'builder' && hasExistingCode && !modeOverride) {
      // Check if it's an edit command (should stay in builder mode)
      const editCommandPatterns = [
        /^(ubah|edit|ganti|modify|change|update|tambah|add|hapus|remove|delete)/i,
        /^(make it|make the|buat jadi|buat menjadi|jadikan)/i,
        /^(ubah|ganti|buat|change)\s+(warna|color|style|desain|layout|background|font)/i,
        /(warna|color)\s+(kuning|yellow|merah|red|biru|blue|hijau|green|putih|white|hitam|black)/i,
        /^(tambah|add)\s+(button|gambar|image|komponen|component)/i,
      ];
      
      const isEditCommand = editCommandPatterns.some(pattern => pattern.test(text.trim()));
      
      // Only force builder mode if it's a clear edit command
      // Otherwise, trust detectMode() which already handles tutor questions well
      if (isEditCommand) {
        detectedMode = 'builder'; // Force builder mode for edit commands
        console.log(`🔧 Edit command detected, keeping builder mode: "${text.substring(0, 50)}..."`);
      }
      // If detectedMode is 'tutor' and it's NOT an edit command, allow the switch to tutor mode
      // This handles cases like "apa itu", "what is", etc.
    }
    
    const mode = detectedMode;
    
    // Auto-switch mode if detected mode is different from current mode
    if (detectedMode !== appMode && !modeOverride) {
      console.log(`🔄 Auto-switching mode: ${appMode} → ${detectedMode} (detected from: "${text.substring(0, 50)}...")`);
      setAppMode(detectedMode);
      
      // When switching to tutor mode, reset activeTab to preview (hide code editor)
      if (detectedMode === 'tutor') {
        setActiveTab('preview');
        console.log(`📚 Switched to tutor mode, resetting tab to preview`);
      }
      
      // Auto-switch to optimal provider for the new mode - DISABLED FOR TESTING
      // const optimalProvider = getOptimalProviderForMode(detectedMode, isSubscribed, false);
      // if (provider !== optimalProvider) {
      //   console.log(`🔄 Auto-switching provider: ${provider} → ${optimalProvider} (optimal for ${detectedMode} mode)`);
      //   setProvider(optimalProvider);
      // }
      
      // Update session mode in database if session exists (non-blocking)
      if (sessionId && user) {
        getToken({ template: SUPABASE_TEMPLATE })
          .then(token => updateSessionMode(sessionId, detectedMode, token))
          .then(() => console.log(`✅ Session mode updated to ${detectedMode}`))
          .catch(error => console.error('Error updating session mode:', error));
      }
      
      // Show visual feedback for mode switch - DISABLED FOR TESTING (optimalProvider tidak lagi dihitung)
      // if (detectedMode === 'builder') {
      //   setLogs(prev => [...prev, `> Switched to Builder mode - Using ${optimalProvider === 'gemini' ? 'Claude Sonnet 4.5' : optimalProvider === 'openai' ? 'GPT-5.2' : 'Claude Opus 4.5'} (optimal for UI generation)`]);
      // } else {
      //   setLogs(prev => [...prev, `> Switched to Tutor mode - Using ${optimalProvider === 'openai' ? 'GPT-5.2' : optimalProvider === 'gemini' ? 'Claude Sonnet 4.5' : 'Claude Opus 4.5'} (optimal for Q&A)`]);
      // }
    }

    // Auto-switch to OpenAI if images are attached - DISABLED FOR TESTING (all providers support images now)
    let effectiveProvider = provider;
    // DISABLED FOR TESTING - Allow images with any provider
    // if (imagesToSend.length > 0 && provider !== 'openai' && provider !== 'gemini' && provider !== 'anthropic') {
    //   if (!isSubscribed) {
    //     alert('Image analysis requires GPT-5.2 (OpenAI). Please subscribe to use this feature, or remove the images to use other providers.');
    //     return;
    //   }
    //   effectiveProvider = 'openai';
    //   setProvider('openai'); // Update UI
    //   console.log('🖼️ Images detected, switching to OpenAI for vision analysis');
    // }

    // Check Grok (Claude Sonnet 4.5) token limit - DISABLED FOR TESTING
    // if (provider === 'gemini' && !isSubscribed && user) {
    //   // Check if Grok is locked
    //   if (false) {
    //     console.log(`⚠️ Grok (Claude Sonnet 4.5) is locked due to token limit. Switching to Claude Opus 4.5.`);
    //     effectiveProvider = 'anthropic';
    //     setProvider('anthropic'); // Update UI
    //     
    //     // Show notification
    //     if (mode === 'builder') {
    //       setLogs(prev => [...prev, `⚠️ Claude Sonnet 4.5 locked (token limit reached). Switched to Claude Opus 4.5.`]);
    //     }
    //     
    //     // Show alert to user
    //     alert('Claude Sonnet 4.5 token limit has been reached. Please recharge tokens to use Claude Sonnet 4.5, or continue with Claude Opus 4.5.');
    //   } else {
    //     // Double-check with server before proceeding
    //     try {
    //       const token = await getToken({ template: SUPABASE_TEMPLATE }).catch(() => null);
    //       const grokLimit = await checkGrokTokenLimit(user.id, token);
    //       
    //       if (grokLimit.shouldFallback) {
    //         console.log(`⚠️ Grok (Claude Sonnet 4.5) token limit exceeded (${grokLimit.tokensUsed}/${GROK_TOKEN_LIMIT}), falling back to Claude Opus 4.5`);
    //         effectiveProvider = 'anthropic';
    //         setProvider('anthropic'); // Update UI
    //         
    //         // Refresh Grok limit status
    //         refreshLimit();
    //         
    //         // Show notification in logs (for builder mode) or console
    //         if (mode === 'builder') {
    //           setLogs(prev => [...prev, `⚠️ Claude Sonnet 4.5 limit reached (${grokLimit.tokensUsed}/${GROK_TOKEN_LIMIT}), switched to Claude Opus 4.5`]);
    //         }
    //       }
    //     } catch (error) {
    //       console.error('Error checking grok token limit:', error);
    //       // On error, allow grok usage
    //     }
    //   }
    // }

    // Check general token limit - DISABLED FOR TESTING
    // if (!isSubscribed && hasExceeded) {
    //   if (!freeFallback) {
    //     setShowSubscriptionPopup(true);
    //     return;
    //   }
    //   // fallback gratis: paksa provider ke Claude Opus 4.5
    //   if (provider !== 'anthropic') {
    //     setProvider('anthropic');
    //   }
    // }

    // Ensure appMode is set (should already be set above if auto-switched)
    if (!appMode) setAppMode(mode);

    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      images: imagesToSend,
      timestamp: new Date()
    };

    if (!textOverride) {
      setMessages(prev => [...prev, newMessage]);
      setInput('');
      setAttachedImages([]);
    }

    setIsTyping(true);

    if (mode === 'builder') {
      setLogs(prev => [...prev, `> Processing request: "${text.substring(0, 20)}..."`]);
    }

    // Optimistic token decrement even sebelum tracking ke server (agar badge sinkron)
    incrementTokenUsage(10);

    // Initialize variables outside try block so they're accessible in error handler
    let historyForAI: any[] = [];
    let currentSessionId = sessionId;
    let searchResults: any[] = [];

    try {
      // 1. Create session if it doesn't exist
      let token;
      try {
        token = await getToken({ template: SUPABASE_TEMPLATE });
      } catch (e) {
        console.warn("Clerk Supabase template missing. See CLERK_SUPABASE_GUIDE.md");
      }

      if (!currentSessionId && user) {
        try {
          const sessionTitle = text.trim().length > 0 ? text.substring(0, 30) + '...' : 'New Chat';
          const newSession = await createChatSession(user.id, mode || 'tutor', effectiveProvider, sessionTitle, token);
          if (newSession) {
            currentSessionId = newSession.id;
            setCurrentSessionId(newSession.id);
            // Update URL without reloading
            window.history.replaceState(null, '', `/chat/${newSession.id}`);
            // Trigger sidebar refresh after a short delay to ensure session is in DB
            setTimeout(() => {
              // The real-time subscription should catch this, but refresh as backup
              if (refreshSessions) {
                refreshSessions();
              }
            }, 1000);
          } else {
            console.warn('⚠️ Failed to create chat session, continuing without session');
            // Continue without session - messages won't be saved but app won't crash
          }
        } catch (error) {
          console.error('❌ Error creating chat session:', error);
          // Continue without session - messages won't be saved but app won't crash
        }
      }

      // 2. Save User Message
      if (currentSessionId && user) {
        await saveMessage(currentSessionId, 'user', text, undefined, imagesToSend, token);
      }

      if (historyOverride) {
        historyForAI = historyOverride.map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: (m as any).code ? `${m.content}\n\nCode Generated:\n${(m as any).code}` : m.content }]
        }));
      } else {
        // Use AI memory history if available and token not exhausted
        // If token exhausted, don't send history (AI won't remember)
        const shouldUseMemory = !hasExceeded || isSubscribed;
        const historyToUse = shouldUseMemory ? aiMemoryHistory : [];
        
        const tempMessage: Message = { id: 'temp', role: 'user', content: text, timestamp: new Date() };
        const fullHistory = [...historyToUse, tempMessage].map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.code ? `${m.content}\n\nCode Generated:\n${m.code}` : m.content }]
        }));
        
        // Truncate history if using OpenRouter (has prompt token limit ~2150 for free accounts)
        // Only truncate if provider is openai, gemini, or anthropic (OpenRouter providers)
        if ((effectiveProvider === 'openai' || effectiveProvider === 'gemini' || effectiveProvider === 'anthropic') && fullHistory.length > 0) {
          const OPENROUTER_PROMPT_TOKEN_LIMIT = 2000; // Safe limit for free accounts
          historyForAI = truncateHistory(fullHistory, OPENROUTER_PROMPT_TOKEN_LIMIT);
          
          if (historyForAI.length < fullHistory.length) {
            console.log(`⚠️ History truncated: ${fullHistory.length} → ${historyForAI.length} messages (to fit OpenRouter prompt token limit)`);
          }
        } else {
          historyForAI = fullHistory;
        }
        
        // Log memory status
        if (shouldUseMemory && historyToUse.length > 0) {
          console.log(`🧠 AI Memory: Using ${historyForAI.length} previous messages for context`);
        } else if (!shouldUseMemory) {
          console.log('⚠️ AI Memory: Disabled - Token limit reached. AI will not remember previous messages.');
        }
      }

      // Perform web search if enabled (Tutor mode only)
      if (mode === 'tutor' && enableWebSearch && text.trim()) {
        try {
          const searchResponse = await performWebSearch(text, 5);
          searchResults = searchResponse.results;
          setSearchResults(searchResults);
          
          // Enhance prompt with search context
          if (searchResults.length > 0) {
            const searchContext = searchResults
              .map((r, i) => `[${i + 1}] ${r.title}: ${r.snippet}`)
              .join('\n');
            text = `${text}\n\n[Web Search Results]\n${searchContext}\n\nPlease use the above search results to provide a comprehensive answer with citations.`;
          }
        } catch (error) {
          console.error('Web search error:', error);
          // Continue without search results
        }
      }

      // Include uploaded document context if available
      if (uploadedDocument && mode === 'tutor') {
        const docContext = `\n\n[Document Context: ${uploadedDocument.title}]\n${uploadedDocument.content.substring(0, 2000)}...\n\nPlease use the above document context to answer the question.`;
        text = text + docContext;
      }

      // Auto-explore codebase before generating (like v0.app) - Always for builder mode
      let explorationContext = '';
      if (mode === 'builder') {
        const existingFiles = fileManager.getAllFiles();
        // Always explore codebase (even if empty, to understand structure)
        setIsExploringCodebase(true);
        try {
          const analysis = CodebaseExplorerClass.analyzeCodebase(existingFiles);
          setCodebaseAnalysis(analysis);
          explorationContext = CodebaseExplorerClass.generateContextSummary(analysis);
          // Add exploration context to prompt
          text = explorationContext + '\n\n' + text;
        } catch (error) {
          console.error('Error exploring codebase:', error);
        } finally {
          setIsExploringCodebase(false);
        }
      }

      // IMPORTANT: Only generate code for builder mode
      // For tutor mode, generate text response only (no code)
      let code: string | null = null;
      let responseText = '';
      
      if (mode === 'builder') {
        // Set building state - show animation
        setIsBuildingCode(true);
        
        // Always use React framework for builder mode (never HTML)
        // Use 'mode' variable (already updated) instead of 'appMode' (may be stale due to async state)
        const frameworkToUse = framework;
        
        // Show building animation with file list
        const existingFiles = fileManager.getAllFiles();
        if (existingFiles.length > 0) {
          // Update building animation with current files
          setCodebaseAnalysis({
            components: existingFiles.map(f => ({
              name: f.path.split('/').pop() || f.path,
              path: f.path,
              type: f.type,
              summary: `File: ${f.path}`,
            })),
            totalFiles: existingFiles.length,
            frameworks: [],
            libraries: [],
            structure: {
              components: existingFiles.filter(f => f.type === 'component').map(f => f.path),
              pages: existingFiles.filter(f => f.type === 'page').map(f => f.path),
              styles: existingFiles.filter(f => f.type === 'style').map(f => f.path),
              config: existingFiles.filter(f => f.type === 'config').map(f => f.path),
            },
          });
        }
        
        // Debug: Log mode before generating code
        console.log(`🎯 Generating code with mode: ${mode}, framework: ${frameworkToUse}, text: "${text.substring(0, 50)}..."`);
        
        codeResponse = await generateCode(text, historyForAI, mode, effectiveProvider, imagesToSend, frameworkToUse);
      
        // Handle multi-file or single-file response (BUILDER MODE ONLY)
        if (!codeResponse) {
          console.error('❌ No response received from generateCode');
          responseText = 'Error: No response received from AI. Please try again.';
          code = null;
          setIsBuildingCode(false);
          return;
        }
        
        if (codeResponse.type === 'multi-file') {
          // Multi-file project
          // CRITICAL: Check if any file contains error HTML
          const hasErrorFile = codeResponse.files.some(file => 
            file.content.includes('<!-- Error Generating Code -->') ||
            file.content.includes('text-red-500') ||
            file.content.includes('bg-red-900') ||
            file.content.includes('ANTHROPIC Error') ||
            file.content.includes('OpenRouter API Error')
          );
          
          if (hasErrorFile) {
            // Error detected in files - don't set code for preview
            console.error('❌ Error response detected in multi-file response, not setting code for preview');
            code = null;
            responseText = 'Error: Code generation failed. Please try again.';
            setIsBuildingCode(false);
            setLogs(prev => [...prev, '⚠️ Error: Code generation failed. Please try again with a different prompt or provider.']);
          } else {
            fileManager.clear();
            codeResponse.files.forEach(file => {
              fileManager.addFile(file.path, file.content, file.type);
            });
            if (codeResponse.entry) {
              fileManager.setEntry(codeResponse.entry);
              const entryFile = fileManager.getFile(codeResponse.entry);
              code = entryFile?.content || null;
              
              // If codebase mode, prioritize target file, otherwise use entry
              const fileToSelect = (codebaseMode && targetFile && fileManager.hasFile(targetFile)) 
                ? targetFile 
                : codeResponse.entry;
              
              // Set selected file
              setSelectedFile(fileToSelect);
              if (!openFiles.includes(fileToSelect)) {
                setOpenFiles(prev => [...prev, fileToSelect]);
              }
              
              // If codebase mode, switch to code tab
              if (codebaseMode) {
                setActiveTab('code');
              }
              
              // IMPORTANT: Set currentCode for preview (only if not error)
              if (code) {
                setCurrentCode(code);
                setCurrentFramework(codeResponse.framework || 'react'); // Store framework for preview
              }
            } else if (codeResponse.files.length > 0) {
              // Fallback: use first file as entry
              const firstFile = codeResponse.files[0];
              fileManager.setEntry(firstFile.path);
              code = firstFile.content;
              setCurrentCode(code);
              setCurrentFramework(codeResponse.framework || 'react');
              
              // If codebase mode, prioritize target file, otherwise use first file
              const fileToSelect = (codebaseMode && targetFile && fileManager.hasFile(targetFile)) 
                ? targetFile 
                : firstFile.path;
              
              setSelectedFile(fileToSelect);
              if (!openFiles.includes(fileToSelect)) {
                setOpenFiles(prev => [...prev, fileToSelect]);
              }
              
              // If codebase mode, switch to code tab
              if (codebaseMode) {
                setActiveTab('code');
              }
            }
            responseText = `Generated ${codeResponse.files.length} file(s) for ${codeResponse.framework || 'react'} project.`;
          }
        } else {
          // Single-file HTML (backward compatibility)
          code = codeResponse.content;
          
          // CRITICAL: Check if response is an error HTML BEFORE processing
          const isErrorResponse = code.includes('<!-- Error Generating Code -->') ||
                                 code.includes('text-red-500') ||
                                 code.includes('bg-red-900') ||
                                 code.includes('ANTHROPIC Error') ||
                                 code.includes('OpenRouter API Error') ||
                                 code.includes('This operation was aborted');
          
          if (isErrorResponse) {
            // This is an error response - don't set as code for preview
            console.error('❌ Error response detected in builder mode, not setting code for preview');
            code = null;
            responseText = extractTextFromErrorHtml(code) || 'Error: Code generation failed. Please try again.';
            setIsBuildingCode(false);
            setLogs(prev => [...prev, '⚠️ Error: Code generation failed. Please try again with a different prompt or provider.']);
          } else {
            const extracted = extractCode(code);
            responseText = extracted.text || 'Generated app successfully.';
            
            // Use extracted code if available, otherwise use original
            code = extracted.code || code;

            // Validate code - ensure it's valid HTML and not just whitespace/newlines
            if (!code || code.trim().length === 0 || /^[\s\n\r\t]+$/.test(code)) {
              console.error('⚠️ No valid code extracted from response (empty or whitespace only):', codeResponse.content.substring(0, 200));
              code = null;
              responseText = 'Error: No valid code found in response. Please try again.';
            } else if (!code.includes('<') && !code.includes('<!DOCTYPE')) {
              // Code doesn't look like HTML, might be plain text
              console.warn('⚠️ Code doesn\'t appear to be HTML:', code.substring(0, 100));
              // Try to wrap in HTML if it's just text
              if (code.trim().length > 0) {
                code = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Generated App</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
  <div class="p-8">
    <pre class="text-gray-800">${code}</pre>
  </div>
</body>
</html>`;
              }
            }
          }
          
          // Convert single-file to FileManager for consistency
          fileManager.clear();
          if (code && !isErrorResponse) {
            // If codebase mode and target file specified, use that instead of index
            // Always use .tsx for React code, not .html
            const fileName = (codebaseMode && targetFile) ? targetFile : 'App.tsx';
            fileManager.addFile(fileName, code, codebaseMode ? 'component' : 'page');
            fileManager.setEntry(fileName);
            setSelectedFile(fileName);
            if (!openFiles.includes(fileName)) {
              setOpenFiles(prev => [...prev, fileName]);
            }
            
            // If codebase mode, switch to code tab
            if (codebaseMode) {
              setActiveTab('code');
            }
            
            // IMPORTANT: Set currentCode for preview (only if not error)
            setCurrentCode(code);
            // Keep framework from response, or use 'react' for builder mode (never HTML)
            // Note: single-file responses don't have framework, so we default to 'react' for builder mode
            let responseFramework: Framework | undefined = undefined;
            // Type guard: check if codeResponse has 'files' property (multi-file)
            if ('files' in codeResponse && Array.isArray((codeResponse as any).files)) {
              responseFramework = (codeResponse as any).framework;
            }
            setCurrentFramework(codebaseMode ? 'react' : (responseFramework || 'react'));
            console.log('✅ Single-file code set:', {
              codeLength: code.length,
              hasDoctype: code.includes('<!DOCTYPE'),
              preview: code.substring(0, 150),
              fileName: fileName,
              codebaseMode: codebaseMode
            });
          } else {
            console.error('❌ No code extracted from single-file response');
          }
        }
        
        // Clear building state
        setIsBuildingCode(false);
      } else {
        // TUTOR MODE: Generate text response only (no code)
        console.log(`📚 Tutor mode: Generating text response for: "${text.substring(0, 50)}..."`);
        
        // Check if user is asking to build/create something in tutor mode
        // If so, auto-switch to builder mode for better code generation
        const buildRequestPatterns = [
          /^(buat|build|create|make|generate)\s+(web|website|app|aplikasi|page|halaman|site|situs)/i,
          /^(buatkan|buat|build|create|make|generate)\s+(saya|aku|me|i)\s+(web|website|app|aplikasi|page|halaman)/i,
        ];
        const isBuildRequest = buildRequestPatterns.some(pattern => pattern.test(text.trim()));
        
        if (isBuildRequest) {
          console.log('🔄 Tutor mode detected build request, switching to builder mode...');
          setAppMode('builder');
          // Update session mode
          if (currentSessionId && user) {
            getToken({ template: SUPABASE_TEMPLATE })
              .then(token => updateSessionMode(currentSessionId, 'builder', token))
              .catch(error => console.error('Error updating session mode:', error));
          }
          // Recursively call handleSend with builder mode
          return handleSend(text, 'builder', historyOverride);
        }
        
        // For tutor mode, generate text response (no code)
        try {
          codeResponse = await generateCode(text, historyForAI, mode, effectiveProvider, imagesToSend, 'html');
        } catch (error) {
          console.error('❌ Error calling generateCode in tutor mode:', error);
          codeResponse = null;
        }
        
        // Extract text from response (tutor mode should not have code)
        let responseText = '';
        let code: string | null = null;
        
        if (!codeResponse) {
          console.error('❌ No response received from generateCode in tutor mode');
          responseText = 'I apologize, but I encountered an error while processing your request.\n\n' +
            '**Possible causes:**\n' +
            '- API connection issue\n' +
            '- API key configuration problem\n' +
            '- Service temporarily unavailable\n\n' +
            '**Please try:**\n' +
            '- Check your internet connection\n' +
            '- Verify API keys are configured correctly\n' +
            '- Switch to a different AI provider\n' +
            '- Try again in a moment';
          code = null;
          setIsBuildingCode(false);
        } else if (codeResponse.type === 'multi-file') {
          // If tutor mode returns multi-file (shouldn't happen, but handle it)
          responseText = codeResponse.files.map(f => f.content).join('\n\n');
          console.log('📚 Tutor mode: Multi-file response (unexpected)', { fileCount: codeResponse.files.length });
        } else {
          // Single-file response - for tutor mode, use content directly as text
          // Tutor mode should return plain text, not code
          const content = codeResponse.content || '';
          
          console.log('📚 Tutor mode: Processing response', { 
            contentLength: content.length, 
            hasCodeBlocks: content.includes('```'),
            contentPreview: content.substring(0, 100),
            hasError: content.includes('Error') || content.includes('error') || content.includes('<!-- Error'),
            isEmpty: !content || content.trim().length === 0,
            provider: effectiveProvider,
            mode: mode
          });
          
          // Check if response is an error HTML (from formatErrorHtml) - MUST CHECK FIRST
          const isErrorResponse = content.includes('<!-- Error Generating Code -->') || 
                                 content.includes('text-red-500') || 
                                 content.includes('bg-red-900') ||
                                 content.includes('Error:') ||
                                 content.includes('error:');
          
          if (isErrorResponse) {
            // This is an error response - extract readable text from HTML
            console.log('📚 Tutor mode: Error response detected, extracting text from HTML');
            responseText = extractTextFromErrorHtml(content);
            
            // Ensure we have meaningful text
            if (!responseText || responseText.trim().length === 0) {
              responseText = content; // Fallback to original
            }
          } else if (!content || content.trim().length === 0) {
            // Empty content
            console.error('📚 Tutor mode: Empty content received from API', {
              codeResponseType: codeResponse.type,
              provider: effectiveProvider,
              mode: mode
            });
            responseText = 'I apologize, but I received an empty response from the AI service.\n\n' +
              'This might be due to:\n' +
              '- The AI service is temporarily unavailable\n' +
              '- Your prompt was too short or unclear\n' +
              '- API rate limiting\n\n' +
              '**Please try:**\n' +
              '- Rephrasing your question\n' +
              '- Switching to a different AI provider\n' +
              '- Trying again in a moment';
          } else {
            // Normal response - process it
            // For tutor mode, always use content directly as response text
            // Only try to extract if content looks like it has code blocks AND text
            if (content.includes('```') && content.length > 100) {
              // Has code blocks, try to extract text portion
              const extracted = extractCode(content);
              console.log('📚 Tutor mode: Extracted from code blocks', { 
                extractedTextLength: extracted.text?.length || 0,
                hasExtractedText: !!(extracted.text && extracted.text.trim().length > 0),
                extractedCodeLength: extracted.code?.length || 0
              });
              // Use extracted text if it's meaningful, otherwise use full content
              if (extracted.text && extracted.text.trim().length > 0) {
                responseText = extracted.text;
              } else {
                // If no text extracted, use full content (might be code-only response)
                responseText = content;
              }
            } else {
              // No code blocks or simple response, use content directly
              responseText = content;
            }
            
            // CRITICAL: Double-check that responseText is set
            // This handles edge cases where extractCode might return empty text
            if (!responseText || responseText.trim().length === 0) {
              console.warn('⚠️ ResponseText became empty after processing, using content directly', {
                contentLength: content.length,
                contentPreview: content.substring(0, 200),
                hasCodeBlocks: content.includes('```')
              });
              // Always fallback to original content if responseText is empty
              responseText = content;
            }
            
            // Additional check: if content has HTML tags, try to extract text
            if (content.includes('<') && (!responseText || responseText.trim().length === 0)) {
              const tempDiv = document.createElement('div');
              tempDiv.innerHTML = content;
              const textContent = tempDiv.textContent || tempDiv.innerText || '';
              if (textContent.trim().length > 0) {
                responseText = textContent.trim();
              }
            }
          }
          
          // Final validation - ensure we have a response
          if (!responseText || responseText.trim().length === 0) {
            console.warn('📚 Tutor mode: Response text is still empty after processing', { 
              contentLength: content.length,
              hasContent: !!content,
              contentPreview: content.substring(0, 200),
              isErrorResponse
            });
            
            // Last resort fallback
            responseText = 'I apologize, but I couldn\'t process the response properly.\n\n' +
              '**Please try:**\n' +
              '- Rephrasing your question\n' +
              '- Checking your internet connection\n' +
              '- Switching to a different AI provider';
          }
          
          console.log('📚 Tutor mode: Final responseText', { 
            responseTextLength: responseText.length,
            responseTextPreview: responseText.substring(0, 100),
            isErrorResponse,
            originalContentLength: content.length,
            originalContentPreview: content.substring(0, 100)
          });
          
          // CRITICAL: Ensure responseText is never empty if we have content
          if ((!responseText || responseText.trim().length === 0) && content && content.trim().length > 0) {
            console.warn('⚠️ ResponseText is empty but content exists! Using content directly.', {
              contentLength: content.length,
              contentPreview: content.substring(0, 200)
            });
            // Use content directly as last resort
            responseText = content;
          }
          
          // Don't set code for tutor mode
          code = null;
        }
        
        // Clear building state (if it was set)
        setIsBuildingCode(false);
      }

      // 3. Save AI Response
      if (currentSessionId && user) {
        await saveMessage(currentSessionId, 'ai', responseText, code || undefined, undefined, token);
      }

      // Combine search results with response if available
      // For tutor mode, ensure we always have a response (never "Done.")
      let finalResponseText = responseText;
      if (!finalResponseText || finalResponseText.trim().length === 0) {
        // Only use "Done." for builder mode, never for tutor mode
        if (mode === 'tutor') {
          // Try to get more information about why response is empty
          console.error('📚 Tutor mode: Empty response detected after processing', {
            mode,
            provider: effectiveProvider,
            hasCodeResponse: !!codeResponse,
            codeResponseType: codeResponse?.type || 'unknown',
            codeResponseContentLength: codeResponse?.type === 'single-file' ? codeResponse.content?.length : 0,
            originalResponseText: responseText
          });
          
          // Check if codeResponse has content that we might have missed
          if (codeResponse && codeResponse.type === 'single-file' && codeResponse.content) {
            const content = codeResponse.content;
            console.log('📚 Tutor mode: Attempting to recover from codeResponse.content', {
              contentLength: content.length,
              contentPreview: content.substring(0, 200),
              isError: content.includes('<!-- Error') || content.includes('text-red-500')
            });
            
            // Try to extract from HTML if it's HTML content
            if (content.includes('<')) {
              const tempDiv = document.createElement('div');
              tempDiv.innerHTML = content;
              const extractedText = tempDiv.textContent || tempDiv.innerText || '';
              if (extractedText.trim().length > 0) {
                finalResponseText = extractedText.trim();
                console.log('📚 Tutor mode: Successfully extracted text from HTML content');
              } else {
                // If HTML extraction failed, use content directly
                finalResponseText = content;
                console.log('📚 Tutor mode: Using content directly as fallback');
              }
            } else {
              // Not HTML, use content directly
              finalResponseText = content;
              console.log('📚 Tutor mode: Using non-HTML content directly');
            }
          }
          
          // Only use fallback if we still don't have a response
          if (!finalResponseText || finalResponseText.trim().length === 0) {
            finalResponseText = 'I apologize, but I encountered an issue processing your request.\n\n' +
              '**Please try:**\n' +
              '- Rephrasing your question\n' +
              '- Checking your internet connection\n' +
              '- Switching to a different AI provider\n' +
              '- Trying again in a moment';
          }
        } else {
          finalResponseText = "Done.";
        }
      }
      if (searchResults.length > 0 && mode === 'tutor') {
        finalResponseText = combineSearchAndResponse(searchResults, responseText || finalResponseText);
      }

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(), 
        role: 'ai', 
        content: finalResponseText, 
        code: code || undefined, 
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiResponse]);
      
      // Update AI memory with new messages (only if token available)
      if (!hasExceeded || isSubscribed) {
        setAiMemoryHistory(prev => {
          const updated = [...prev, newMessage, aiResponse];
          // Limit memory to last 20 messages to prevent token overflow
          return updated.slice(-20);
        });
      }

      if (code && mode === 'builder') {
        setLogs(prev => [...prev, '> Code generation complete.', '> Bundling assets...', '> Starting development server...']);
        
        // Ensure currentCode is set (should already be set above, but double-check)
        if (!currentCode || currentCode !== code) {
          setCurrentCode(code);
        }
        
        // Ensure entry is set in fileManager
        if (!fileManager.getEntry() && fileManager.getAllFiles().length > 0) {
          const firstFile = fileManager.getAllFiles()[0];
          fileManager.setEntry(firstFile.path);
        }
        
        setActiveTab('preview');
        setRefreshKey(k => k + 1);
        
        // Auto-save version
        const versionManager = getVersionManager();
        versionManager.saveVersion(fileManager.getAllFiles(), 'Auto-save after generation');
        
        setTimeout(() => setLogs(prev => [...prev, '> Server running at http://localhost:3000', '> Ready.']), 800);
        
        // Debug: Log code preview info
        console.log('✅ Code set for preview:', {
          hasCode: !!code,
          codeLength: code?.length,
          codePreview: code?.substring(0, 200),
          entryFile: fileManager.getEntry(),
          entryContent: fileManager.getFile(fileManager.getEntry())?.content?.substring(0, 200),
          currentCodeSet: !!currentCode,
          fileManagerFiles: fileManager.getAllFiles().length
        });
      } else if (mode === 'builder' && !code) {
        console.error('❌ No code to preview:', { 
          codeResponse: codeResponse || null, 
          extracted: codeResponse?.type === 'single-file' ? extractCode(codeResponse.content) : null,
          files: codeResponse?.type === 'multi-file' ? codeResponse.files.map(f => ({ path: f.path, contentLength: f.content?.length })) : null
        });
        setLogs(prev => [...prev, '⚠️ Warning: No code generated. Please try again with a clearer prompt.']);
      }

      // Track token usage dengan optimistic update
      if (currentSessionId) {
        // Track ke database (async, tidak blocking) - use effective provider
        trackUsage(currentSessionId, effectiveProvider)
          .then((success) => {
            if (success) {
              console.log('✅ Token tracked successfully');
              // Delay untuk memastikan database commit, lalu sync
              setTimeout(() => {
                refreshLimit();
                refreshLimit(); // Also refresh Grok limit status
              }, 1000); // Increased delay untuk memastikan database commit
            } else {
              console.warn('⚠️ Token tracking returned false');
              // Refresh untuk sync dengan database
              setTimeout(() => {
                refreshLimit();
              }, 1000);
            }
          })
          .catch((error) => {
            console.error('❌ Error tracking usage:', error);
            // Rollback jika tracking gagal - refresh untuk sync dengan database
            setTimeout(() => {
              refreshLimit();
            }, 1000);
          });
      }

    } catch (error) {
      setIsBuildingCode(false); // Clear building state on error
      console.error(error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : typeof error === 'string' 
          ? error 
          : "Connection error. Please check your API Key.";
      
      // Auto-fallback: If OpenRouter providers fail with prompt token limit error
      const isPromptTokenError = (effectiveProvider === 'openai' || effectiveProvider === 'gemini' || effectiveProvider === 'anthropic') &&
        (errorMessage.toLowerCase().includes('prompt tokens') || 
         errorMessage.toLowerCase().includes('prompt token') ||
         errorMessage.toLowerCase().includes('token limit exceeded'));
      
      // Auto-retry with truncated history if prompt token limit error
      if (isPromptTokenError) {
        console.log(`🔄 ${effectiveProvider} prompt token limit exceeded, retrying with shorter history...`);
        
        // Truncate history more aggressively
        const truncatedHistory = truncateHistory(historyForAI, 1500); // Even shorter limit
        
        try {
          // Always use React framework for builder mode, html for tutor mode
          const fallbackResponse = await generateCode(text, truncatedHistory, mode, effectiveProvider, imagesToSend, mode === 'builder' ? framework : 'html');
          
          // Handle response (same logic as above)
          let code: string | null = null;
          let responseText = '';
          
          // For tutor mode, handle differently
          if (mode === 'tutor') {
            if (fallbackResponse.type === 'multi-file') {
              responseText = fallbackResponse.files.map(f => f.content).join('\n\n');
            } else {
              const content = fallbackResponse.content || '';
              // Extract text from content (remove HTML if present)
              if (content.includes('```')) {
                const extracted = extractCode(content);
                responseText = extracted.text || content;
              } else {
                responseText = content;
              }
            }
            code = null; // No code for tutor mode
          } else if (fallbackResponse.type === 'multi-file') {
            fileManager.clear();
            fallbackResponse.files.forEach(file => {
              fileManager.addFile(file.path, file.content, file.type);
            });
            if (fallbackResponse.entry) {
              fileManager.setEntry(fallbackResponse.entry);
              const entryFile = fileManager.getFile(fallbackResponse.entry);
              code = entryFile?.content || null;
              if (code) {
                setCurrentCode(code);
                setCurrentFramework(fallbackResponse.framework || 'react');
              }
              setSelectedFile(fallbackResponse.entry);
              if (!openFiles.includes(fallbackResponse.entry)) {
                setOpenFiles(prev => [...prev, fallbackResponse.entry]);
              }
            }
            setIsBuildingCode(false);
            responseText = `Generated ${fallbackResponse.files.length} file(s). (Note: History was shortened due to token limits)`;
          } else {
            code = fallbackResponse.content;
            const extracted = extractCode(code);
            responseText = (extracted.text || 'Generated successfully.') + ' (Note: History was shortened due to token limits)';
            code = extracted.code || code;
            fileManager.clear();
            if (code) {
              // Always use React/TSX for builder mode, not HTML
              const fileName = codebaseMode && targetFile ? targetFile : 'App.tsx';
              fileManager.addFile(fileName, code, codebaseMode ? 'component' : 'page');
              fileManager.setEntry(fileName);
              setCurrentCode(code);
              setCurrentFramework('react'); // Always React for builder mode
              setSelectedFile(fileName);
              if (!openFiles.includes(fileName)) {
                setOpenFiles(prev => [...prev, fileName]);
              }
              if (codebaseMode) {
                setActiveTab('code');
              }
            }
            setIsBuildingCode(false);
          }
          
          // Save response
          if (currentSessionId && user) {
            try {
              const token = await getToken({ template: SUPABASE_TEMPLATE });
              await saveMessage(currentSessionId, 'ai', responseText, code || undefined, undefined, token);
            } catch (e) {
              console.error('Error saving fallback message:', e);
            }
          }
          
          // Combine search results if available
          let finalResponseText = responseText || "Done.";
          if (searchResults.length > 0 && mode === 'tutor') {
            finalResponseText = combineSearchAndResponse(searchResults, responseText);
          }
          
          setMessages(prev => [...prev, {
            id: (Date.now() + 1).toString(), 
            role: 'ai', 
            content: finalResponseText, 
            code: code || undefined, 
            timestamp: new Date()
          }]);
          
          if (code && mode === 'builder') {
            setLogs(prev => [...prev, '> Code generation complete (with shortened history).', '> Bundling assets...', '> Starting development server...']);
            setCurrentCode(code);
            setActiveTab('preview');
            setRefreshKey(k => k + 1);
            const versionManager = getVersionManager();
            versionManager.saveVersion(fileManager.getAllFiles(), 'Auto-save after generation');
            setTimeout(() => setLogs(prev => [...prev, '> Server running at http://localhost:3000', '> Ready.']), 800);
          }
          
          // Track usage
          if (currentSessionId) {
            trackUsage(currentSessionId, effectiveProvider)
              .then(() => {
                setTimeout(() => {
                  refreshLimit();
                  refreshLimit();
                }, 1000);
              })
              .catch((e) => {
                console.error('Error tracking fallback usage:', e);
                setTimeout(() => refreshLimit(), 1000);
              });
          }
          
          setIsTyping(false);
          setIsBuildingCode(false);
          return; // Success with truncated history
        } catch (truncatedError) {
          setIsBuildingCode(false); // Clear building state on error
          setIsTyping(false); // Also clear typing state
          console.error('Retry with truncated history also failed:', truncatedError);
          // Continue to try fallback provider
        }
      }
      
      // Auto-fallback: If OpenRouter providers fail with token limit or credit error, switch to DeepSeek (free, no OpenRouter credits needed)
      const isCreditError = errorMessage.toLowerCase().includes('credit') || errorMessage.toLowerCase().includes('insufficient');
      const isTokenLimitError = (effectiveProvider === 'openai' || effectiveProvider === 'gemini' || effectiveProvider === 'anthropic') && 
        (errorMessage.toLowerCase().includes('prompt tokens') || 
         errorMessage.toLowerCase().includes('token limit exceeded') ||
         isCreditError);
      
      if (isTokenLimitError && effectiveProvider !== 'deepseek' as AIProvider) {
        const errorType = isCreditError ? 'credits exceeded' : 'token limit exceeded';
        const providerName = effectiveProvider === 'openai' ? 'GPT-5-Nano' : 
                            effectiveProvider === 'anthropic' ? 'GPT OSS 20B' :
                            effectiveProvider === 'gemini' ? 'GPT OSS 20B' : 'GPT OSS 20B';
        console.log(`🔄 ${effectiveProvider} ${errorType}, auto-switching to Mistral Devstral (free alternative)...`);
        setProvider('deepseek');
        setLogs(prev => [...prev, `⚠️ ${providerName} ${errorType}, retrying with Mistral Devstral (free, no OpenRouter credits needed)...`]);
        
        // Retry with DeepSeek and shorter history
        const truncatedHistory = truncateHistory(historyForAI, 1500);
        try {
          const fallbackResponse = await generateCode(text, truncatedHistory, mode, 'deepseek', imagesToSend, mode === 'builder' ? framework : 'html');
          
          // Handle response (same logic as above)
          let code: string | null = null;
          let responseText = '';
          
          if (fallbackResponse.type === 'multi-file') {
            fileManager.clear();
            fallbackResponse.files.forEach(file => {
              fileManager.addFile(file.path, file.content, file.type);
            });
            if (fallbackResponse.entry) {
              fileManager.setEntry(fallbackResponse.entry);
              const entryFile = fileManager.getFile(fallbackResponse.entry);
              code = entryFile?.content || null;
              if (code) {
                setCurrentCode(code);
                setCurrentFramework(fallbackResponse.framework || 'react');
              }
              setSelectedFile(fallbackResponse.entry);
              if (!openFiles.includes(fallbackResponse.entry)) {
                setOpenFiles(prev => [...prev, fallbackResponse.entry]);
              }
            }
            setIsBuildingCode(false);
            setIsTyping(false);
            responseText = `Generated ${fallbackResponse.files.length} file(s) with Mistral Devstral.`;
          } else {
            code = fallbackResponse.content;
            const extracted = extractCode(code);
            responseText = extracted.text + ' (Generated with Mistral Devstral)';
            code = extracted.code || code;
            fileManager.clear();
            if (code) {
              // Always use React/TSX for builder mode, not HTML
              const fileName = codebaseMode && targetFile ? targetFile : 'App.tsx';
              fileManager.addFile(fileName, code, codebaseMode ? 'component' : 'page');
              fileManager.setEntry(fileName);
              setCurrentCode(code);
              setCurrentFramework('react'); // Always React for builder mode
              setSelectedFile(fileName);
              if (!openFiles.includes(fileName)) {
                setOpenFiles(prev => [...prev, fileName]);
              }
              if (codebaseMode) {
                setActiveTab('code');
              }
            }
            setIsBuildingCode(false);
            setIsTyping(false);
          }
          
          // Save response
          if (currentSessionId && user) {
            try {
              const token = await getToken({ template: SUPABASE_TEMPLATE });
              await saveMessage(currentSessionId, 'ai', responseText, code || undefined, undefined, token);
            } catch (e) {
              console.error('Error saving fallback message:', e);
            }
          }
          
          // Combine search results if available
          let finalResponseText = responseText || "Done.";
          if (searchResults.length > 0 && mode === 'tutor') {
            finalResponseText = combineSearchAndResponse(searchResults, responseText);
          }
          
          setMessages(prev => [...prev, {
            id: (Date.now() + 1).toString(), 
            role: 'ai', 
            content: finalResponseText, 
            code: code || undefined, 
            timestamp: new Date()
          }]);
          
          if (code && mode === 'builder') {
            setLogs(prev => [...prev, '> Code generation complete (Mistral Devstral).', '> Bundling assets...', '> Starting development server...']);
            setCurrentCode(code);
            setActiveTab('preview');
            setRefreshKey(k => k + 1);
            const versionManager = getVersionManager();
            versionManager.saveVersion(fileManager.getAllFiles(), 'Auto-save after generation (Mistral Devstral)');
            setTimeout(() => setLogs(prev => [...prev, '> Server running at http://localhost:3000', '> Ready.']), 800);
          }
          
          // Track usage with Claude Opus 4.5
          if (currentSessionId) {
            trackUsage(currentSessionId, 'anthropic')
              .then(() => {
                setTimeout(() => {
                  refreshLimit();
                  refreshLimit();
                }, 1000);
              })
              .catch((e) => {
                console.error('Error tracking fallback usage:', e);
                setTimeout(() => refreshLimit(), 1000);
              });
          }
          
          return; // Success with fallback
        } catch (fallbackError) {
          setIsBuildingCode(false); // Clear building state on error
          console.error('Fallback to Groq also failed:', fallbackError);
          // Continue to show error message
        }
      }
      
      // Show error message
      setIsBuildingCode(false); // Clear building state before showing error
      setIsTyping(false); // Ensure typing state is cleared
      
      // Format error message based on mode
      let errorContent = '';
      if (mode === 'tutor') {
        // For tutor mode, provide helpful error message
        errorContent = `I apologize, but I encountered an error while processing your request.\n\n` +
          `**Error Details:** ${errorMessage}\n\n` +
          `**Possible Solutions:**\n` +
          `1. **Check your internet connection** - Ensure you're connected to the internet\n` +
          `2. **Verify API configuration** - Check if your API keys are set correctly\n` +
          `3. **Try a different provider** - Switch to a different AI model (e.g., Mistral Devstral)\n` +
          `4. **Restart the server** - If you're running a local server, try restarting it\n` +
          `5. **Check server logs** - Look for detailed error messages in the server console\n\n` +
          `If the problem persists, please try:\n` +
          `- Rephrasing your question\n` +
          `- Breaking down complex questions into smaller parts\n` +
          `- Contacting support if the issue continues`;
      } else {
        // For builder mode, show technical error
        errorContent = `Error: ${errorMessage}`;
      }
      
      setMessages(prev => [...prev, {
        id: Date.now().toString(), 
        role: 'ai', 
        content: errorContent, 
        timestamp: new Date()
      }]);
    } finally {
      setIsTyping(false);
      setIsBuildingCode(false); // Ensure loading state is cleared
    }
  };

  // Auto-Start Logic - runs after handleSend is defined
  // Store handleSend in ref to avoid stale closure issues
  const handleSendRef = useRef(handleSend);
  useEffect(() => {
    handleSendRef.current = handleSend;
  }, [handleSend]);

  useEffect(() => {
    if (initialState.shouldAutoSend && !hasAutoSent.current && initialState.messages.length > 0) {
      hasAutoSent.current = true;
      // Use ref to get latest handleSend without adding it to dependencies
      handleSendRef.current(initialState.messages[0].content, initialState.mode as AppMode, initialState.messages);
    }
    // Only run once on mount - initialState is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mock File Tree
  const files: FileNode[] = [
    { name: 'node_modules', type: 'folder' },
    { name: 'public', type: 'folder', children: [{ name: 'vite.svg', type: 'file' }] },
    {
      name: 'src', type: 'folder', isOpen: true, children: [
        { name: 'components', type: 'folder' },
        { name: 'App.tsx', type: 'file' },
        { name: 'main.tsx', type: 'file' },
        { name: 'index.css', type: 'file' }
      ]
    },
    { name: 'package.json', type: 'file' },
    { name: 'vite.config.ts', type: 'file' },
  ];

  const FileTreeItem: React.FC<{ node: FileNode; depth?: number }> = ({ node, depth = 0 }) => {
    const [isOpen, setIsOpen] = useState(node.isOpen || false);
    return (
      <div>
        <div
          className={cn(
            "flex items-center gap-2 py-1.5 px-3 text-xs text-gray-400 hover:bg-white/5 rounded-lg cursor-pointer select-none transition-all duration-200 group",
            node.name === 'App.tsx' && "bg-purple-500/10 text-purple-300 border border-purple-500/20"
          )}
          style={{ paddingLeft: `${depth * 14 + 12}px` }}
          onClick={() => node.type === 'folder' && setIsOpen(!isOpen)}
        >
          {node.type === 'folder' && (
            <ChevronRight size={12} className={cn("text-gray-600 transition-transform duration-200", isOpen && "rotate-90")} />
          )}
          {node.type === 'folder' ? (
            <Folder size={14} className="text-blue-400 group-hover:text-blue-300" />
          ) : (
            <FileCode size={14} className={cn(
              node.name === 'App.tsx' ? "text-purple-400" : "text-gray-500 group-hover:text-gray-400"
            )} />
          )}
          <span className="font-medium">{node.name}</span>
        </div>
        {node.type === 'folder' && isOpen && node.children && (
          <div className="ml-2 border-l border-white/5">
            {node.children.map(child => <FileTreeItem key={child.name} node={child} depth={depth + 1} />)}
          </div>
        )}
      </div>
    );
  };

  const mainContentClass = showSplash ? 'opacity-0' : 'opacity-100 transition-opacity duration-1000 ease-out';

  // Handle voice call message
  const handleVoiceMessage = async (text: string, isAI: boolean = false) => {
    const message: Message = {
      id: Date.now().toString(),
      role: isAI ? 'ai' : 'user',
      content: text,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, message]);

    // Save to database if session exists
    if (sessionId && user) {
      try {
        const token = await getToken({ template: SUPABASE_TEMPLATE }).catch(() => null);
        await saveMessage(sessionId, isAI ? 'ai' : 'user', text, undefined, undefined, token);
      } catch (error) {
        console.error('Error saving voice message:', error);
      }
    }
  };

  // --- Render Content ---
  const chatContent = (
    <div className="flex flex-col h-full bg-[#0a0a0a] relative overflow-hidden">
      {/* Header - Clean v0.app Style */}
      <div className="relative h-12 md:h-14 border-b border-white/[0.08] flex items-center px-4 md:px-6 justify-between shrink-0 bg-[#0a0a0a]">
        {/* Left: Menu button (tutor mode only) + Logo */}
        <div className="flex items-center gap-3">
          {appMode === 'tutor' && !isMobile && (
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-md hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
              title={isSidebarOpen ? "Hide sidebar" : "Show sidebar"}
            >
              <Menu size={18} />
            </button>
          )}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-6 h-6 flex items-center justify-center">
              <Logo size={24} />
            </div>
            <span className="text-sm font-medium text-white">
              {appMode === 'tutor' ? 'NEVRA' : 'NEVRA'}
            </span>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleOpenSettings}
            className="p-2 rounded-md hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      {/* Chat List - Clean v0.app Style */}
      <div className={cn(
        "relative flex-1 overflow-y-auto px-4 md:px-5 lg:px-6 py-6 md:py-8",
        messages.length === 0 ? "flex flex-col items-center justify-center text-center" : "block"
      )}>
        {messages.length === 0 ? (
          appMode === 'tutor' ? (
            <div className="flex flex-col items-center justify-center w-full max-w-2xl px-4 space-y-4">
              <h2 className="text-3xl md:text-4xl font-medium text-white">
                Ready when you are.
              </h2>
              <p className="text-gray-400 text-sm max-w-xl">
                Ask anything or share context, and I’ll help you learn, solve problems, or review code.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center w-full max-w-2xl px-4 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center">
                <Bot size={22} className="text-purple-300" />
              </div>
              <h2 className="text-2xl font-semibold text-white">Describe what you want to build</h2>
              <p className="text-gray-400 text-sm max-w-xl">
                Contoh: “Buat landing page SaaS modern dengan hero, fitur grid, pricing, dan footer.”<br/>
                Sertakan gaya (minimalis, glassmorphism), warna, atau referensi UI jika ada.
              </p>
            </div>
          )
        ) : (
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Show codebase exploration if active */}
          {isExploringCodebase && (
            <div className="flex flex-col gap-3 items-start animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center">
                  <Bot size={14} className="text-gray-400" />
                </div>
                <span className="text-xs text-gray-400">NEVRA Builder</span>
              </div>
              <div className="max-w-[85%] bg-[#0a0a0a] border border-white/10 rounded-xl p-4">
                <CodebaseExplorer 
                  analysis={codebaseAnalysis}
                  isExploring={isExploringCodebase}
                />
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={msg.id} className={cn("flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300", msg.role === 'user' ? 'items-end' : 'items-start')}>
              {msg.role === 'ai' && (
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center">
                    <Bot size={14} className="text-gray-400" />
                  </div>
                  <span className="text-xs text-gray-500 font-medium">
                    {appMode === 'tutor' ? 'Nevra Tutor' : 'Nevra Builder'}
                  </span>
                </div>
              )}
              <div className={cn(
                "relative leading-relaxed transition-all duration-200",
                msg.role === 'user'
                  ? "rounded-2xl px-4 py-3 bg-white/[0.08] border border-white/10 text-white max-w-[85%]"
                  : "rounded-2xl px-4 py-3 bg-white/[0.03] border border-white/10 text-gray-200 max-w-[90%]"
              )}>
                {msg.images && msg.images.length > 0 && (
                  <div className="flex gap-3 mb-4 flex-wrap">
                    {msg.images.map((img, imgIdx) => (
                      <div key={imgIdx} className="relative group">
                        <img src={img} alt="Attached" className={cn(
                          "object-cover shadow-xl",
                          appMode === 'tutor'
                            ? "w-28 h-28 md:w-36 md:h-36 rounded-xl md:rounded-2xl border-2 border-blue-500/30"
                            : "w-24 h-24 md:w-32 md:h-32 rounded-lg md:rounded-xl border border-purple-500/30 shadow-lg"
                        )} />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl md:rounded-2xl"></div>
                      </div>
                    ))}
                  </div>
                )}
                {msg.role === 'ai' ? (
                  <div className="prose prose-sm max-w-none prose-invert prose-p:text-gray-200 prose-headings:text-white prose-strong:text-white prose-code:text-purple-300 prose-pre:bg-[#0a0a0a] prose-pre:border prose-pre:border-white/10">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeRaw]}
                      components={{
                        code({ node, inline, className, children, ...props }: any) {
                          const match = /language-(\w+)/.exec(className || '');
                          return !inline && match ? (
                            <div className="overflow-hidden border border-white/10 rounded-lg bg-[#0a0a0a] my-3">
                              <div className="flex items-center justify-between border-b border-white/10 px-4 py-2 bg-[#111]">
                                <span className="text-xs font-medium text-gray-300 uppercase">{match[1]}</span>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
                                  }}
                                  className="text-xs text-gray-400 hover:text-gray-200 px-2 py-1 rounded hover:bg-white/5 transition-colors"
                                >
                                  Copy
                                </button>
                              </div>
                              <div className="overflow-x-auto">
                                <SyntaxHighlighter
                                  style={vscDarkPlus}
                                  language={match[1]}
                                  PreTag="div"
                                  customStyle={{ 
                                    margin: 0, 
                                    padding: '1rem', 
                                    background: 'transparent', 
                                    fontSize: '13px', 
                                    lineHeight: '1.6'
                                  }}
                                  {...props}
                                >
                                  {String(children).replace(/\n$/, '')}
                                </SyntaxHighlighter>
                              </div>
                            </div>
                          ) : (
                            <code className="rounded px-1.5 py-0.5 text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30" {...props}>
                              {children}
                            </code>
                          );
                        }
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap text-white leading-relaxed text-sm">
                    {msg.content}
                  </div>
                )}
              </div>
              {/* Action Buttons - Different for Tutor vs Builder */}
              {msg.role === 'ai' && (
                <div className="space-y-3 mt-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    {appMode === 'builder' && msg.code && (
                      <>
                        <button 
                          onClick={() => { 
                            if (msg.code) {
                              setCurrentCode(msg.code);
                              fileManager.clear();
                              fileManager.addFile('index.html', msg.code, 'page');
                              fileManager.setEntry('index.html');
                              setSelectedFile('index.html');
                              if (!openFiles.includes('index.html')) {
                                setOpenFiles(prev => [...prev, 'index.html']);
                              }
                              setRefreshKey(k => k + 1);
                            }
                            setActiveTab('preview');
                            if (isMobile) setMobileTab('workbench'); 
                          }} 
                          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-300 hover:text-white hover:bg-white/5 rounded-md transition-colors border border-white/10"
                        >
                          <Eye size={14} /> View Generated
                        </button>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(msg.code || '');
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-300 hover:text-white hover:bg-white/5 rounded-md transition-colors border border-white/10"
                        >
                          <Copy size={14} /> Copy Code
                        </button>
                      </>
                    )}
                    {appMode === 'tutor' && (
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(msg.content || '');
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-300 hover:text-white hover:bg-white/5 rounded-md transition-colors border border-white/10"
                      >
                        <Copy size={14} /> Copy Message
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
          {isTyping && (
            <div className={cn(
              "flex items-center gap-3 md:gap-4 text-sm md:text-base pl-2 animate-pulse",
              appMode === 'tutor' ? "text-gray-300" : "text-gray-400"
            )}>
              <div className={cn(
                "flex items-center justify-center border shadow-lg",
                appMode === 'tutor'
                  ? "w-9 h-9 md:w-10 md:h-10 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border-blue-500/30"
                  : "w-7 h-7 md:w-8 md:h-8 rounded-lg md:rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border-purple-500/20"
              )}>
                <Loader2 size={isMobile ? (appMode === 'tutor' ? 20 : 18) : (appMode === 'tutor' ? 18 : 16)} className={cn(
                  "animate-spin",
                  appMode === 'tutor' ? "text-blue-400" : "text-purple-400"
                )} />
              </div>
              <span className={appMode === 'tutor' ? "font-semibold" : "font-medium"}>Thinking...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        )}
      </div>

      {/* Input Area - ChatGPT Style - Show after first message or always for tutor mode */}
      {(messages.length > 0 || appMode === 'tutor') && (
      <div className="relative p-4 md:p-6 border-t border-white/[0.08] bg-[#0a0a0a] shrink-0 pb-safe">
        {/* DISABLED FOR TESTING - Token limit warnings */}
        {/* {!isSubscribed && hasExceeded && !tokenLoading && (
          <div className="mb-3 md:mb-4 text-xs md:text-sm font-medium text-amber-300 bg-amber-500/10 border border-amber-500/30 px-3 md:px-4 py-2.5 md:py-3 rounded-lg md:rounded-xl flex items-center gap-2 md:gap-2.5 shadow-lg shadow-amber-500/10">
            <AlertTriangle size={isMobile ? 18 : 16} className="text-amber-400 shrink-0" />
            <div className="flex flex-col gap-1">
              <span className="text-[11px] md:text-xs">Free quota reached. Upgrade to continue generating responses.</span>
              <span className="text-[10px] text-amber-400/80">⚠️ AI memory disabled - Previous messages will not be remembered.</span>
            </div>
          </div>
        )} */}
        {/* {!isSubscribed && false && provider === 'gemini' && (
          <div className="mb-3 md:mb-4 text-xs md:text-sm font-medium text-amber-300 bg-amber-500/10 border border-amber-500/30 px-3 md:px-4 py-2.5 md:py-3 rounded-lg md:rounded-xl flex items-center gap-2 md:gap-2.5 shadow-lg shadow-amber-500/10">
            <AlertTriangle size={isMobile ? 18 : 16} className="text-amber-400 shrink-0" />
            <span className="text-[11px] md:text-xs">Claude Sonnet 4.5 token limit reached. Switching to Mistral Devstral. Recharge tokens to unlock Claude Sonnet 4.5.</span>
          </div>
        )} */}
        {/* Attached Images Preview - Above Input Box */}
        {attachedImages.length > 0 && (
          <div className="mb-3 md:mb-4">
            <div className="flex items-center gap-2 mb-2">
              <ImageIcon size={isMobile ? 14 : 12} className="text-purple-400" />
              <span className="text-[10px] md:text-xs text-purple-400 font-medium">
                {attachedImages.length} image{attachedImages.length > 1 ? 's' : ''} ready for AI analysis
              </span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none -mx-3 md:mx-0 px-3 md:px-0">
              {attachedImages.map((img, idx) => (
                <div key={idx} className="relative group shrink-0">
                  <img src={img} alt="Preview" className="w-12 h-12 md:w-14 md:h-14 object-cover rounded-md border border-purple-500/30 shadow-sm" />
                  <button
                    onClick={() => removeImage(idx)}
                    className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all shadow-sm min-w-[20px] min-h-[20px] flex items-center justify-center"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="max-w-3xl mx-auto w-full">
          <div className="relative bg-white/[0.04] border border-white/10 rounded-2xl shadow-sm transition-all duration-200 hover:shadow-md hover:border-white/20 focus-within:shadow-md focus-within:border-white/20">
            {/* Mobile: Simplified layout */}
            {isMobile ? (
              <>
                {/* Textarea */}
                <textarea
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                  placeholder={appMode === 'tutor' ? "Ask me anything..." : "Describe your app..."}
                  className="w-full bg-transparent border-0 rounded-2xl px-4 py-3 text-base text-white placeholder-gray-400 focus:outline-none resize-none min-h-[60px] max-h-[150px] leading-relaxed"
                  style={{ paddingRight: '48px' }}
                />
                
                {/* Send button */}
                <button
                  onClick={() => handleSend()}
                  disabled={(!input.trim() && attachedImages.length === 0) || isTyping}
                  className="absolute top-3 right-3 p-2 bg-white text-black rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-200"
                >
                  <Send size={16} />
                </button>

                {/* Attachment & Actions Row - ChatGPT Style */}
                <div className="flex items-center justify-between px-4 py-2 border-t border-white/10">
                  {/* Left: Attachment Dropdown */}
                  <div className="relative" ref={attachmentMenuRef}>
                    <button
                      onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                      className="p-2 rounded-md hover:bg-white/5 text-gray-400 hover:text-gray-300 transition-colors"
                      title="Attach files"
                    >
                      <Plus size={16} />
                    </button>
                    {showAttachmentMenu && (
                      <>
                        <div 
                          className="fixed inset-0 z-40" 
                          onClick={() => setShowAttachmentMenu(false)}
                        />
                        <div className="absolute bottom-full left-0 mb-2 w-56 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl overflow-hidden z-50">
                          <button
                            onClick={() => {
                              documentInputRef.current?.click();
                              setShowAttachmentMenu(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left text-gray-300 hover:bg-white/10 transition-colors"
                          >
                            <FileText size={18} className="text-green-400" />
                            <div className="flex flex-col">
                              <span className="font-medium">Upload Document</span>
                              <span className="text-xs text-gray-500">PDF, DOCX, TXT, MD</span>
                            </div>
                          </button>
                          <button
                            onClick={() => {
                              fileInputRef.current?.click();
                              setShowAttachmentMenu(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left text-gray-300 hover:bg-white/10 transition-colors border-t border-white/10"
                          >
                            <ImageIcon size={18} className="text-blue-400" />
                            <div className="flex flex-col">
                              <span className="font-medium">Upload Image</span>
                              <span className="text-xs text-gray-500">JPG, PNG, GIF</span>
                            </div>
                          </button>
                          <button
                            onClick={() => {
                              handleCameraCapture();
                              setShowAttachmentMenu(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left text-gray-300 hover:bg-white/10 transition-colors border-t border-white/10"
                          >
                            <Camera size={18} className="text-purple-400" />
                            <div className="flex flex-col">
                              <span className="font-medium">Take Photo</span>
                              <span className="text-xs text-gray-500">Use camera</span>
                            </div>
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Right: Web Search Toggle, Token & Provider */}
                  <div className="flex items-center gap-2 ml-auto shrink-0">
                    {appMode === 'tutor' && (
                      <button
                        onClick={() => setEnableWebSearch(!enableWebSearch)}
                        className={cn(
                          "p-1.5 rounded-md border transition-all duration-200 min-w-[32px] min-h-[32px] flex items-center justify-center shrink-0",
                          enableWebSearch
                            ? "bg-blue-500/20 border-blue-500/30 text-blue-400"
                            : "bg-white/5 border-white/10 hover:bg-blue-500/20 hover:border-blue-500/30 text-gray-400 hover:text-blue-400"
                        )}
                        title="Web Search"
                      >
                        <Search size={14} />
                      </button>
                    )}
                    <div className="text-[10px] text-gray-400 font-medium">
                      ${Math.max(0, FREE_TOKEN_LIMIT - tokensUsed)}
                    </div>
                    <ProviderSelector
                      value={provider}
                      onChange={(p) => {
                        // DISABLED FOR TESTING - Allow all provider selection
                        // if (p === 'openai' && !isSubscribed) {
                        //   setShowSubscriptionPopup(true);
                        //   return;
                        // }
                        // if (p === 'gemini' && false && !isSubscribed) {
                        //   alert('Claude Sonnet 4.5 token limit has been reached. Please recharge tokens to use Claude Sonnet 4.5, or select another provider.');
                        //   return;
                        // }
                        setProvider(p);
                      }}
                      className="text-xs"
                      isSubscribed={isSubscribed}
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Desktop: v0.app Clean Style - Large Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  multiple
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                />
                <input
                  type="file"
                  ref={documentInputRef}
                  className="hidden"
                  accept=".pdf,.docx,.txt,.md"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const parsed = await parseDocument(file);
                      setUploadedDocument(parsed);
                      setShowDocumentViewer(true);
                    } catch (error: unknown) {
                      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                      alert(`Failed to parse document: ${errorMessage}`);
                    }
                    if (documentInputRef.current) documentInputRef.current.value = '';
                  }}
                />
                
            <div className="flex items-center gap-2 px-3 md:px-4 py-3 border-t border-white/10 bg-[#0a0a0a]/80 backdrop-blur-sm sticky bottom-0 left-0 right-0 z-20">
                  {/* Left: Attachment Dropdown Button - ChatGPT Style */}
                  <div className="relative shrink-0" ref={attachmentMenuRef}>
                    <button
                      onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-gray-300 transition-all"
                      title="Attach files"
                    >
                      <Plus size={18} />
                    </button>
                    {showAttachmentMenu && (
                      <>
                        <div 
                          className="fixed inset-0 z-40" 
                          onClick={() => setShowAttachmentMenu(false)}
                        />
                        <div className="absolute bottom-full left-0 mb-2 w-56 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl overflow-hidden z-50">
                          <button
                            onClick={() => {
                              documentInputRef.current?.click();
                              setShowAttachmentMenu(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left text-gray-300 hover:bg-white/10 transition-colors"
                          >
                            <FileText size={18} className="text-green-400" />
                            <div className="flex flex-col">
                              <span className="font-medium">Upload Document</span>
                              <span className="text-xs text-gray-500">PDF, DOCX, TXT, MD</span>
                            </div>
                          </button>
                          <button
                            onClick={() => {
                              fileInputRef.current?.click();
                              setShowAttachmentMenu(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left text-gray-300 hover:bg-white/10 transition-colors border-t border-white/10"
                          >
                            <ImageIcon size={18} className="text-blue-400" />
                            <div className="flex flex-col">
                              <span className="font-medium">Upload Image</span>
                              <span className="text-xs text-gray-500">JPG, PNG, GIF</span>
                            </div>
                          </button>
                          <button
                            onClick={() => {
                              handleCameraCapture();
                              setShowAttachmentMenu(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left text-gray-300 hover:bg-white/10 transition-colors border-t border-white/10"
                          >
                            <Camera size={18} className="text-purple-400" />
                            <div className="flex flex-col">
                              <span className="font-medium">Take Photo</span>
                              <span className="text-xs text-gray-500">Use camera</span>
                            </div>
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Input Field */}
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                    placeholder={appMode === 'tutor' ? "Ask me anything..." : "Describe your app..."}
                    className="flex-1 bg-transparent border-0 text-white placeholder-gray-400 focus:outline-none resize-none min-h-[60px] max-h-[200px] leading-relaxed text-base"
                  />

                  {/* Right: Web Search Toggle & Send Button */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setEnableWebSearch(!enableWebSearch)}
                      className={cn(
                        "p-2 rounded-lg transition-all border",
                        enableWebSearch
                          ? "bg-blue-500/20 border-blue-500/30 text-blue-400"
                          : "bg-white/5 border-white/10 hover:bg-blue-500/20 hover:border-blue-500/30 text-gray-400 hover:text-blue-400"
                      )}
                      title={enableWebSearch ? "Web search enabled - Click to disable" : "Enable web search - Get real-time information"}
                    >
                      <Search size={18} />
                    </button>
                    <button
                      onClick={() => handleSend()}
                      disabled={(!input.trim() && attachedImages.length === 0) || isTyping}
                      className="p-2 rounded-lg bg-white text-black hover:bg-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                </div>

                {/* Status indicators & Provider - Below input */}
                <div className="flex items-center justify-between px-4 py-2 border-t border-white/10">
                  {/* Left: Status indicators */}
                  <div className="flex items-center gap-4">
                    {uploadedDocument && (
                      <div className="flex items-center gap-2 text-xs text-green-400">
                        <FileText size={14} />
                        <span className="truncate max-w-[200px]">{uploadedDocument.title}</span>
                        <button
                          onClick={() => {
                            setUploadedDocument(null);
                            setShowDocumentViewer(false);
                          }}
                          className="p-0.5 hover:bg-white/10 rounded transition-colors"
                          title="Remove document"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )}
                    {enableWebSearch && (
                      <div className="flex items-center gap-2 text-xs text-blue-400">
                        <Search size={14} />
                        <span>Web search enabled</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Right: Provider & Token (Framework auto-detected, no dropdown) */}
                  <div className="flex items-center gap-3">
                    {/* Framework auto-selected: React/Vite - no dropdown needed */}
                    <ProviderSelector
                      value={provider}
                      onChange={(p) => {
                        // DISABLED FOR TESTING - Allow all provider selection
                        // if (p === 'openai' && !isSubscribed) {
                        //   setShowSubscriptionPopup(true);
                        //   return;
                        // }
                        // if (p === 'gemini' && false && !isSubscribed) {
                        //   alert('Claude Sonnet 4.5 token limit has been reached. Please recharge tokens to use Claude Sonnet 4.5, or select another provider.');
                        //   return;
                        // }
                        setProvider(p);
                      }}
                      className="text-xs"
                      isSubscribed={isSubscribed}
                    />
                    <span className="text-xs text-gray-400">
                      ${Math.max(0, FREE_TOKEN_LIMIT - tokensUsed)} remaining
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  );

  const workbenchContent = (
    <div className="flex flex-col h-full bg-[#0a0a0a] border-l border-white/10 font-sans relative overflow-hidden">
      {/* Workbench Header - Clean Dark Style */}
      <div className={cn(
        "relative z-[100] border-b border-white/10 flex items-center justify-between shrink-0 bg-[#0f0f0f]",
        isMobile ? "h-12 px-3" : "h-11 px-4"
      )}>
        {/* Left: Tabs & FileTree Toggle (Mobile/Tablet) */}
        <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
          {/* FileTree Toggle Button - Mobile/Tablet Only */}
          {(isMobile || isTablet) && activeTab === 'code' && fileManager.getAllFiles().length > 0 && (
            <button
              onClick={() => setFileTreeOpen(!fileTreeOpen)}
              className={cn(
                "p-2 rounded-lg transition-colors shrink-0",
                "bg-white/5 hover:bg-white/10 border border-white/5",
                fileTreeOpen && "bg-purple-500/20 border-purple-500/30"
              )}
              title={fileTreeOpen ? "Hide File Tree" : "Show File Tree"}
            >
              <Folder size={16} className={fileTreeOpen ? "text-purple-400" : "text-gray-400"} />
            </button>
          )}
          {/* Tabs - Clean Dark Style */}
          <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1 border border-white/10">
            <button
              onClick={() => setActiveTab('preview')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                activeTab === 'preview'
                  ? "bg-white text-black shadow-sm"
                  : "text-gray-400 hover:text-gray-300"
              )}
            >
              <Play size={12} className={activeTab === 'preview' ? "fill-current" : ""} />
              <span>Preview</span>
            </button>
            <button
              onClick={() => setActiveTab('design')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                activeTab === 'design'
                  ? "bg-white text-black shadow-sm"
                  : "text-gray-400 hover:text-gray-300"
              )}
            >
              <Palette size={12} />
              <span>Design</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('code');
                if (!selectedFile && fileManager.getEntry()) {
                  setSelectedFile(fileManager.getEntry());
                  if (!openFiles.includes(fileManager.getEntry()!)) {
                    setOpenFiles(prev => [...prev, fileManager.getEntry()!]);
                  }
                }
              }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                activeTab === 'code'
                  ? "bg-white text-black shadow-sm"
                  : "text-gray-400 hover:text-gray-300"
              )}
            >
              <Code size={12} />
              <span>Code</span>
            </button>
          </div>
          {/* Design Tools (when Design tab is active) */}
          {activeTab === 'design' && (
            <div className="flex items-center gap-1 ml-2 pl-2 border-l border-white/10">
              <button
                onClick={() => setShowDesignTools(!showDesignTools)}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-md transition-colors"
                title="Fonts"
              >
                <Type size={12} />
              </button>
              <button
                onClick={() => setShowDesignTools(!showDesignTools)}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-md transition-colors"
                title="Colors"
              >
                <Palette size={12} />
              </button>
              <button
                onClick={() => setShowDesignTools(!showDesignTools)}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-md transition-colors"
                title="Assets"
              >
                <ImageIcon size={12} />
              </button>
            </div>
          )}
        </div>

        {/* Center: Canvas Controls - Clean Dark Style */}
        {activeTab === 'preview' && (
          <div className="flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
            <div className="flex items-center bg-white/5 rounded-lg p-0.5 border border-white/10">
              <button
                onClick={() => {
                  const newZoom = Math.max(canvasZoom - 10, 25);
                  setCanvasZoom(newZoom);
                }}
                className="p-1.5 hover:bg-white/10 rounded transition-colors w-6 h-6 flex items-center justify-center"
                disabled={canvasZoom <= 25}
              >
                <ZoomOut size={12} className={canvasZoom <= 25 ? "text-gray-600" : "text-gray-400"} />
              </button>
              <span className="text-xs text-gray-400 min-w-[40px] text-center font-mono">{canvasZoom}%</span>
              <button
                onClick={() => {
                  const newZoom = Math.min(canvasZoom + 10, 200);
                  setCanvasZoom(newZoom);
                }}
                className="p-1.5 hover:bg-white/10 rounded transition-colors w-6 h-6 flex items-center justify-center"
                disabled={canvasZoom >= 200}
              >
                <ZoomIn size={12} className={canvasZoom >= 200 ? "text-gray-600" : "text-gray-400"} />
              </button>
            </div>
          </div>
        )}

        {/* Right: Actions */}
        <div className={cn(
          "flex items-center shrink-0",
          isMobile ? "gap-1" : "gap-2"
        )}>
          {/* Undo/Redo - Hide on very small mobile screens */}
          {!isMobile && (
          <div className="flex items-center gap-0.5 bg-white/5 rounded-lg p-0.5 border border-white/5 mr-1">
            <button
              onClick={() => {
                const undoRedo = getUndoRedoManager();
                const operation = undoRedo.undo();
                if (operation && selectedFile) {
                  // Get content from operation (oldContent for undo)
                  const content = operation.oldContent || '';
                  if (content) {
                    fileManager.addFile(selectedFile, content, 'page');
                    setCurrentCode(content);
                    setRefreshKey(k => k + 1);
                  }
                }
              }}
              className="p-1.5 hover:bg-white/10 rounded-md transition-colors"
              title="Undo"
            >
              <Undo2 size={12} className="text-gray-400" />
            </button>
            <button
              onClick={() => {
                const undoRedo = getUndoRedoManager();
                const operation = undoRedo.redo();
                if (operation && selectedFile) {
                  // Get content from operation (newContent for redo)
                  const content = operation.newContent || '';
                  if (content) {
                    fileManager.addFile(selectedFile, content, 'page');
                    setCurrentCode(content);
                    setRefreshKey(k => k + 1);
                  }
                }
              }}
              className="p-1.5 hover:bg-white/10 rounded-md transition-colors"
              title="Redo"
            >
              <Redo2 size={12} className="text-gray-400" />
            </button>
          </div>
          )}

          {/* Device Preview Toggles - Responsive sizing */}
          {activeTab === 'preview' && (
            <div className={cn(
              "flex items-center gap-0.5 bg-white/5 rounded-lg p-0.5 border border-white/5",
              isMobile ? "mr-1" : "mr-1"
            )}>
              <button
                onClick={() => setPreviewDevice('desktop')}
                className={cn(
                  "rounded-md transition-colors",
                  isMobile ? "p-1" : "p-1.5",
                  previewDevice === 'desktop' 
                    ? "bg-white/10 text-white" 
                    : "text-gray-500 hover:text-gray-300"
                )}
                title="Desktop"
              >
                <Monitor size={isMobile ? 10 : 12} />
              </button>
              <button
                onClick={() => setPreviewDevice('tablet')}
                className={cn(
                  "rounded-md transition-colors",
                  isMobile ? "p-1" : "p-1.5",
                  previewDevice === 'tablet' 
                    ? "bg-white/10 text-white" 
                    : "text-gray-500 hover:text-gray-300"
                )}
                title="Tablet"
              >
                <Smartphone size={isMobile ? 10 : 12} className="rotate-90" />
              </button>
              <button
                onClick={() => setPreviewDevice('mobile')}
                className={cn(
                  "rounded-md transition-colors",
                  isMobile ? "p-1" : "p-1.5",
                  previewDevice === 'mobile' 
                    ? "bg-white/10 text-white" 
                    : "text-gray-500 hover:text-gray-300"
                )}
                title="Mobile"
              >
                <Smartphone size={isMobile ? 10 : 12} />
              </button>
            </div>
          )}

          {/* Export Button */}
          <button
            onClick={async () => {
              // Check if it's multi-file project
              const files = fileManager.getAllFiles();
              if (files.length > 0 && currentFramework && currentFramework !== 'html') {
                await downloadProjectFiles();
              } else {
                const code = currentCode || fileManager.getFile(fileManager.getEntry())?.content || '';
                if (!code) return;
                const blob = new Blob([code], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'index.html';
                a.click();
                URL.revokeObjectURL(url);
              }
            }}
            className={cn(
              "flex items-center font-medium text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors border border-white/5",
              isMobile ? "gap-1 px-2 py-1.5 text-[10px]" : "gap-1.5 px-3 py-1.5 text-[11px]"
            )}
            title="Export"
          >
            <Download size={isMobile ? 10 : 10} />
            {!isMobile && <span>Export</span>}
          </button>

          {/* Workspace Menu */}
          <div className="ml-1">
            <WorkspaceMenu
              onOpenComponents={() => setShowComponentLibrary(true)}
              onOpenGitHub={() => setShowGitHubIntegration(true)}
              onOpenHistory={() => setShowVersionHistory(true)}
              onOpenDesignSystem={() => setShowDesignSystem(true)}
              onOpenDatabase={() => setShowDatabasePanel(true)}
              onOpenAPI={() => setShowAPIIntegration(true)}
              onOpenMobile={() => setShowMobileGenerator(true)}
            />
          </div>
        </div>
      </div>

      {/* Design Tools Panel (Slide-in) */}
      {showDesignTools && activeTab === 'design' && (
        <div className="absolute left-0 top-14 bottom-0 w-80 bg-[#1a1a1a] border-r border-white/10 z-40 shadow-2xl">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Design Tools</h3>
            <button
              onClick={() => setShowDesignTools(false)}
              className="p-1.5 hover:bg-white/10 rounded transition-colors"
            >
              <X size={16} className="text-gray-400" />
            </button>
          </div>
          <div className="p-4 space-y-6 overflow-y-auto">
            {/* Fonts */}
            <div>
              <label className="text-xs font-medium text-gray-400 mb-2 block">Fonts</label>
              <div className="space-y-2">
                {['Inter', 'Roboto', 'Poppins', 'Montserrat', 'Open Sans'].map((font) => (
                  <button
                    key={font}
                    onClick={() => {
                      // TODO: Apply font to code
                      console.log('Font selected:', font);
                    }}
                    className="w-full px-3 py-2 text-left text-sm rounded-lg transition-colors bg-white/5 text-gray-300 hover:bg-white/10"
                    style={{ fontFamily: font }}
                  >
                    {font}
                  </button>
                ))}
              </div>
            </div>

            {/* Colors */}
            <div>
              <label className="text-xs font-medium text-gray-400 mb-2 block">Colors</label>
              <div className="grid grid-cols-5 gap-2">
                {['#7e22ce', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16', '#f97316'].map((color) => (
                  <button
                    key={color}
                    onClick={() => {
                      // TODO: Apply color to code
                      console.log('Color selected:', color);
                    }}
                    className="w-full aspect-square rounded-lg transition-all hover:scale-105"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className={cn(
        "flex-1 flex overflow-hidden relative bg-[#050505] transition-all",
        showDesignTools && activeTab === 'design' ? "ml-80" : "ml-0"
      )}>
        {activeTab === 'design' ? (
          <div className="flex-1 p-8 overflow-auto">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold mb-6">Design Settings</h2>
              <p className="text-gray-400 mb-4">Use the design tools in the toolbar to customize fonts, colors, and assets.</p>
              <div className="bg-[#1a1a1a] rounded-lg border border-white/10 p-6">
                <p className="text-sm text-gray-500">Design tools panel will appear when you click Fonts, Colors, or Assets buttons in the toolbar.</p>
              </div>
            </div>
          </div>
        ) : activeTab === 'code' ? (
          /* Code Editor Mode with FileTree */
          <div className="flex-1 flex h-full relative">
            {/* FileTree Sidebar - Responsive */}
            {fileManager.getAllFiles().length > 0 && (
              <div className={cn(
                "shrink-0 border-r border-white/5 bg-[#0a0a0a] transition-all duration-300 overflow-hidden",
                // Desktop: always visible
                !isMobile && !isTablet && "w-64",
                // Tablet: can be toggled
                isTablet && (fileTreeOpen ? "w-64 absolute inset-y-0 left-0 z-30 shadow-2xl" : "w-0"),
                // Mobile: can be toggled, full overlay
                isMobile && (fileTreeOpen ? "w-full absolute inset-0 z-30 shadow-2xl" : "w-0")
              )}>
                <div className="h-full flex flex-col">
                  {/* FileTree Header with Close Button (Mobile/Tablet) */}
                  {(isMobile || isTablet) && (
                    <div className="flex items-center justify-between p-3 border-b border-white/5">
                      <h3 className="text-sm font-semibold text-white">Files</h3>
                      <button
                        onClick={() => setFileTreeOpen(false)}
                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <X size={16} className="text-gray-400" />
                      </button>
                    </div>
                  )}
                  <div className="flex-1 overflow-y-auto">
                    <FileTree
                      files={fileManager.getAllFiles()}
                      selectedFile={selectedFile}
                      onSelectFile={(path) => {
                        setSelectedFile(path);
                        if (!openFiles.includes(path)) {
                          setOpenFiles(prev => [...prev, path]);
                        }
                        // Close file tree on mobile/tablet after selection
                        if (isMobile || isTablet) {
                          setFileTreeOpen(false);
                        }
                      }}
                      onNewFile={(parentPath) => {
                        const newPath = parentPath 
                          ? `${parentPath}/new-file.tsx`
                          : `src/components/new-file.tsx`;
                        fileManager.addFile(newPath, '', 'component');
                        setSelectedFile(newPath);
                        setOpenFiles(prev => [...prev, newPath]);
                        if (isMobile || isTablet) {
                          setFileTreeOpen(false);
                        }
                      }}
                      onDeleteFile={(path) => {
                        fileManager.deleteFile(path);
                        setOpenFiles(prev => prev.filter(p => p !== path));
                        if (selectedFile === path) {
                          const remaining = fileManager.getAllFiles();
                          setSelectedFile(remaining.length > 0 ? remaining[0].path : null);
                        }
                      }}
                      onRenameFile={(oldPath, newPath) => {
                        const file = fileManager.getFile(oldPath);
                        if (file) {
                          fileManager.deleteFile(oldPath);
                          fileManager.addFile(newPath, file.content, file.type);
                          setOpenFiles(prev => prev.map(p => p === oldPath ? newPath : p));
                          if (selectedFile === oldPath) {
                            setSelectedFile(newPath);
                          }
                        }
                      }}
                      entry={fileManager.getEntry()}
                    />
                  </div>
                </div>
              </div>
            )}
            {/* Overlay untuk mobile ketika file tree terbuka */}
            {(isMobile || isTablet) && fileTreeOpen && (
              <div 
                className="absolute inset-0 bg-black/50 z-20"
                onClick={() => setFileTreeOpen(false)}
              />
            )}

            {/* Code Editor Area */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* File Tabs */}
              {openFiles.length > 0 && (
                <div className={cn(
                  "flex items-center gap-1 bg-[#0e0e0e] border-b border-white/5 overflow-x-auto scrollbar-thin scrollbar-thumb-purple-500/20",
                  isMobile ? "px-1" : "px-2"
                )}>
                  {openFiles.map(path => {
                    const file = fileManager.getFile(path);
                    return (
                      <div
                        key={path}
                        className={clsx(
                          "flex items-center gap-1 md:gap-2 rounded-t-lg transition-colors whitespace-nowrap shrink-0",
                          isMobile ? "px-2 py-1.5 text-xs" : "px-3 py-2 text-sm",
                          selectedFile === path
                            ? "bg-[#0a0a0a] text-white border-t border-l border-r border-white/10"
                            : "text-gray-400 hover:text-white hover:bg-white/5"
                        )}
                      >
                          <button
                            onClick={() => setSelectedFile(path)}
                            className="flex items-center gap-1 md:gap-2 flex-1 min-w-0"
                          >
                            <FileCode size={isMobile ? 10 : 12} />
                            <span className={cn(
                              "truncate",
                              isMobile ? "max-w-[80px]" : "max-w-[120px]"
                            )}>{path.split('/').pop()}</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenFiles(prev => prev.filter(p => p !== path));
                              if (selectedFile === path) {
                                const remaining = openFiles.filter(p => p !== path);
                                setSelectedFile(remaining.length > 0 ? remaining[0] : null);
                              }
                            }}
                            className={cn(
                              "ml-1 hover:bg-white/10 rounded shrink-0",
                              isMobile ? "p-0.5" : "p-0.5"
                            )}
                            title="Close file"
                          >
                            <X size={isMobile ? 10 : 12} />
                          </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Code Quality Panel */}
              {(typescriptErrors.length > 0 || lintErrors.length > 0) && (
                <div className="border-t border-white/5 p-3">
                  <CodeQualityPanel
                    typescriptErrors={typescriptErrors}
                    lintErrors={lintErrors}
                    onFixAll={() => {
                      const file = fileManager.getFile(selectedFile);
                      if (file) {
                        const fixed = autoFix(file.content, lintErrors);
                        fileManager.addFile(selectedFile, fixed, file.type);
                        if (selectedFile === fileManager.getEntry()) {
                          setCurrentCode(fixed);
                        }
                        setLintErrors([]);
                      }
                    }}
                    onRefresh={() => {
                      const file = fileManager.getFile(selectedFile);
                      if (file) {
                        if (selectedFile.endsWith('.ts') || selectedFile.endsWith('.tsx')) {
                          setTypeScriptErrors(checkTypeScript(file.content));
                        }
                        setLintErrors(lintCode(file.content));
                      }
                    }}
                  />
                </div>
              )}

              {/* Code Editor */}
              {selectedFile ? (
                <CodeEditor
                  value={(() => {
                    const file = fileManager.getFile(selectedFile);
                    const content = file?.content;
                    // Ensure content is always a string
                    return typeof content === 'string' ? content : String(content || '');
                  })()}
                  onChange={(newContent) => {
                    const file = fileManager.getFile(selectedFile);
                    if (file) {
                      // Track undo/redo
                      undoRedoManager.mergeConsecutiveEdits(selectedFile, newContent);
                      
                      fileManager.addFile(selectedFile, newContent, file.type);
                      // Update currentCode if it's the entry file
                      if (selectedFile === fileManager.getEntry()) {
                        setCurrentCode(newContent);
                      }
                      
                      // Run code quality checks
                      if (selectedFile.endsWith('.ts') || selectedFile.endsWith('.tsx')) {
                        const tsErrors = checkTypeScript(newContent);
                        setTypeScriptErrors(tsErrors);
                      }
                      const lintErrs = lintCode(newContent);
                      setLintErrors(lintErrs);
                    }
                  }}
                  language={
                    selectedFile.endsWith('.tsx') ? 'tsx' :
                    selectedFile.endsWith('.jsx') ? 'jsx' :
                    selectedFile.endsWith('.css') ? 'css' :
                    selectedFile.endsWith('.html') ? 'html' :
                    selectedFile.endsWith('.json') ? 'json' :
                    'typescript'
                  }
                  filePath={selectedFile}
                  onSave={() => {
                    // Auto-format on save
                    const file = fileManager.getFile(selectedFile);
                    if (file) {
                      const formatted = formatCode(file.content, 
                        selectedFile.endsWith('.tsx') ? 'tsx' :
                        selectedFile.endsWith('.jsx') ? 'jsx' :
                        selectedFile.endsWith('.ts') ? 'typescript' :
                        selectedFile.endsWith('.css') ? 'css' :
                        'typescript'
                      );
                      fileManager.addFile(selectedFile, formatted, file.type);
                      if (selectedFile === fileManager.getEntry()) {
                        setCurrentCode(formatted);
                      }
                    }
                    setLogs(prev => [...prev, `> Saved ${selectedFile}`]);
                  }}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <FileCode size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No file selected</p>
                    <p className="text-sm mt-2">Select a file from the tree or generate code</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'visual' ? (
          <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-[#050505] min-h-0">
            <VisualEditor
              iframeRef={previewIframeRef}
              onUpdateCode={(updatedCode) => {
                const entry = fileManager.getEntry();
                if (entry) {
                  fileManager.addFile(entry, updatedCode, 'page');
                  setCurrentCode(updatedCode);
                  setRefreshKey(k => k + 1);
                }
              }}
              code={currentCode || fileManager.getFile(fileManager.getEntry())?.content || ''}
              isActive={activeTab === 'visual'}
            />
          </div>
        ) : activeTab === 'preview' ? (
          <div className={cn(
            "flex-1 flex flex-col h-full overflow-auto items-center justify-start relative bg-[#050505] min-h-0",
            isMobile ? "p-4" : "p-6"
          )}>
            {/* Address Bar - Clean Dark Style */}
             <div className={cn(
               "bg-white/5 border border-white/10 rounded-lg shadow-sm mb-4 transition-all shrink-0 z-10 text-xs text-gray-400 flex items-center gap-3",
               previewDevice === 'desktop' 
                 ? isMobile ? "w-full px-3 py-2" : "w-[600px] px-4 py-2.5"
                 : "w-full max-w-[calc(100%-2rem)] px-3 py-2"
             )}>
                <div className="flex gap-1.5 shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400/60"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/60"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400/60"></div>
                </div>
                <div className="flex-1 text-center font-mono text-gray-400 flex items-center justify-center gap-2 min-w-0">
                  <Globe size={12} className="shrink-0" />
                  <span className="truncate">localhost:3000</span>
                </div>
                 <button 
                   onClick={() => setRefreshKey(k => k + 1)} 
                   className="p-1.5 rounded hover:bg-white/10 text-gray-500 hover:text-gray-300 transition-all shrink-0"
                 >
                   <RefreshCw size={14} />
                 </button>
             </div>

            {/* Iframe Preview Container - iPhone 17 Pro Max Mockup */}
            <div 
              ref={previewContainerRef}
              className={cn(
                "relative z-0 transition-all duration-300 origin-center flex flex-col shrink-0 shadow-2xl overflow-visible",
                previewDevice === 'mobile' 
                  ? isMobile 
                    ? "w-full max-w-[430px] h-[932px] mx-auto" 
                    : "w-[430px] h-[932px]"
                  : previewDevice === 'tablet'
                    ? isMobile
                      ? "w-full max-w-[600px] h-[700px] mx-auto"
                      : "w-[768px] h-[1024px]"
                    : "w-full h-full max-w-full max-h-full rounded-lg border border-white/10 bg-[#1a1a1a]"
              )}
              style={
                previewDevice === 'mobile' || previewDevice === 'tablet' 
                  ? {
                      transform: `scale(${deviceScale * (canvasZoom / 100)})`,
                      transformOrigin: 'center',
                      margin: '0 auto'
                    }
                  : {
                      transform: `scale(${canvasZoom / 100})`,
                      transformOrigin: 'center',
                    }
              }>
              {/* iPhone 17 Pro Max Frame - Premium Design */}
              {previewDevice === 'mobile' && (
                <>
                  {/* Outer Frame - Premium Bezel with realistic depth */}
                  <div className="absolute inset-0 rounded-[3.5rem] bg-gradient-to-b from-[#2d2d2d] via-[#1a1a1a] to-[#2d2d2d] shadow-[0_0_0_6px_#1a1a1a,0_0_0_7px_#0a0a0a,0_0_0_8px_#050505,0_25px_70px_rgba(0,0,0,0.9)] pointer-events-none z-0" />
                  
                  {/* Inner Screen Border - No padding */}
                  <div className="absolute inset-0 rounded-[3.5rem] border-[2.5px] border-[#0a0a0a]/80 pointer-events-none z-10" />
                  <div className="absolute inset-0 rounded-[3.5rem] border border-white/5 pointer-events-none z-10" />
                  
                  {/* Dynamic Island - iPhone 17 Pro Max Style */}
                  <div className="absolute top-[8px] left-1/2 -translate-x-1/2 z-30 pointer-events-none">
                    <div className="w-[126px] h-[37px] bg-[#000000] rounded-full shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08),inset_0_1px_2px_rgba(0,0,0,0.8),0_2px_10px_rgba(0,0,0,0.7)] flex items-center justify-center relative">
                      {/* Dynamic Island Inner Glow */}
                      <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/[0.03] via-transparent to-black/50"></div>
                      
                      {/* Dynamic Island Content */}
                      <div className="flex items-center gap-2.5 z-10">
                        <div className="w-[5px] h-[5px] rounded-full bg-white/30 shadow-[0_0_2px_rgba(255,255,255,0.2)]"></div>
                        <div className="w-[3px] h-[3px] rounded-full bg-white/20"></div>
                      </div>
                      
                      {/* Camera cutout hint */}
                      <div className="absolute left-4 w-[6px] h-[6px] rounded-full bg-black/80 border border-white/10"></div>
                      <div className="absolute right-4 w-[8px] h-[8px] rounded-full bg-black/80 border border-white/10"></div>
                    </div>
                  </div>

                  {/* Status Bar Indicators - Left Side (Time) */}
                  <div className="absolute top-[20px] left-[50px] z-30 flex items-center pointer-events-none">
                    <span className="text-[14px] font-semibold text-white tracking-[-0.2px]">9:41</span>
                  </div>

                  {/* Status Bar Indicators - Right Side (Signal, Battery, etc) */}
                  <div className="absolute top-[20px] right-[50px] z-30 flex items-center gap-1.5 pointer-events-none">
                    {/* Signal Bars */}
                    <div className="flex items-end gap-[2.5px]">
                      <div className="w-[3px] h-[4px] bg-white rounded-t-[1px]"></div>
                      <div className="w-[3px] h-[5px] bg-white rounded-t-[1px]"></div>
                      <div className="w-[3px] h-[6px] bg-white rounded-t-[1px]"></div>
                      <div className="w-[3px] h-[7px] bg-white rounded-t-[1px]"></div>
                    </div>
                    
                    {/* WiFi */}
                    <div className="w-[16px] h-[12px] relative -mt-0.5">
                      <svg viewBox="0 0 16 12" className="w-full h-full" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round">
                        <path d="M8 2C10 2 12 3 13.5 4.5" />
                        <path d="M8 6.5C9 6.5 10 7 11 8" />
                        <circle cx="8" cy="10.5" r="1" fill="white"/>
                      </svg>
                    </div>
                    
                    {/* Battery */}
                    <div className="w-[26px] h-[13px] border border-white rounded-[2.5px] relative">
                      <div className="absolute left-[2.5px] top-[2.5px] w-[19px] h-[7px] bg-white rounded-[1px]"></div>
                      <div className="absolute right-[-3.5px] top-[3.5px] w-[2.5px] h-[6px] bg-white rounded-r-[1.5px]"></div>
                    </div>
                  </div>
                </>
              )}

              <div className={cn(
                "flex-1 bg-[#1a1a1a] relative overflow-hidden min-h-0 flex flex-col",
                previewDevice === 'mobile' 
                  ? "rounded-[3.5rem]" 
                  : previewDevice === 'tablet' 
                    ? "rounded-[1.5rem]" 
                    : "rounded-t-lg"
              )}>
                
                {!isSubscribed && hasExceeded && (
                  <div className="absolute inset-0 z-30 bg-[#0a0a0a]/95 backdrop-blur flex flex-col items-center justify-center text-center px-6">
                    <div className="text-lg font-semibold text-white mb-2">Quota reached</div>
                    <p className="text-sm text-gray-400 mb-4">Upgrade to continue generating previews.</p>
                  </div>
                )}

                {/* Show building animation when generating code */}
                {isBuildingCode ? (
                  <BuildingAnimation
                    isBuilding={isBuildingCode}
                    files={fileManager.getAllFiles().map(f => ({
                      path: f.path,
                      type: f.type
                    }))}
                    currentStep={isExploringCodebase ? 'Exploring codebase...' : 'Building web application...'}
                  />
                ) : (currentCode || fileManager.getEntry()) ? (
                  <>
                    {(() => {
                      // Get code for preview
                      const previewCode = currentCode || 
                        fileManager.getFile(fileManager.getEntry())?.content || 
                        '';
                      
                      // Validate code before rendering
                      // Check if code is empty or only contains whitespace/newlines
                      const trimmedCode = previewCode ? previewCode.trim() : '';
                      if (!trimmedCode || trimmedCode.length === 0 || /^[\s\n\r\t]+$/.test(trimmedCode)) {
                        return (
                          <div className="w-full h-full flex items-center justify-center bg-[#0a0a0a] text-gray-400">
                            <div className="text-center">
                              <p className="text-lg mb-2">No code to preview</p>
                              <p className="text-sm">Please generate code first by describing your app in the chat.</p>
                            </div>
                          </div>
                        );
                      }
                      
                      // Use getIframeSrc which handles React/TSX conversion automatically
                      const entryPath = fileManager.getEntry() || selectedFile || undefined;
                      
                      return (
                        <iframe
                          ref={previewIframeRef}
                          key={refreshKey}
                          src={getIframeSrc(previewCode, entryPath, currentFramework)}
                          className="w-full h-full border-none bg-[#1a1a1a] flex-1 min-h-0"
                          title="Preview"
                          sandbox="allow-scripts allow-modals allow-forms allow-popups allow-same-origin"
                          style={{
                            width: '100%',
                            height: '100%',
                            display: 'block',
                            flex: '1 1 0',
                            minHeight: 0
                          }}
                          onError={(e) => {
                            console.error('❌ Iframe error:', e);
                          }}
                          onLoad={() => {
                            console.log('✅ Preview iframe loaded successfully');
                          }}
                        />
                      );
                    })()}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-5 bg-[#0a0a0a] min-h-[200px] flex-1">
                    <div className="text-center">
                      <FileCode size={48} className="mx-auto mb-4 opacity-50" />
                      <p className="text-lg mb-2">No code to preview</p>
                      <p className="text-sm mb-4">Generate code by describing your app in the chat, then click "View Generated App"</p>
                      <button
                        onClick={() => {
                          // Try to get code from messages
                          const lastAiMessage = messages.filter(m => m.role === 'ai' && m.code).pop();
                          if (lastAiMessage?.code) {
                            setCurrentCode(lastAiMessage.code);
                            fileManager.clear();
                            fileManager.addFile('index.html', lastAiMessage.code, 'page');
                            fileManager.setEntry('index.html');
                            setSelectedFile('index.html');
                            setRefreshKey(k => k + 1);
                            console.log('✅ Restored code from message');
                          } else {
                            console.warn('⚠️ No code found in messages');
                          }
                        }}
                        className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-lg text-sm text-purple-300 transition-colors"
                      >
                        Try to Restore from Chat
                      </button>
                    </div>
                     <div className="relative">
                       <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 shadow-2xl flex items-center justify-center animate-pulse border border-purple-500/30">
                         <Layout size={40} className="text-purple-400/60" />
                       </div>
                       <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-purple-400/20 to-blue-400/20 blur-xl animate-pulse"></div>
                     </div>
                     <div className="text-center">
                       <p className="text-base font-semibold text-gray-300 mb-1">Ready to build</p>
                       <p className="text-sm text-gray-400">Your generated app will appear here</p>
                     </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            {/* File Explorer */}
            <div className="w-56 border-r border-white/5 bg-gradient-to-b from-[#0a0a0a] to-[#080808] flex flex-col">
              <div className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2.5 border-b border-white/5">
                <div className="w-5 h-5 rounded bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                  <Folder size={12} className="text-blue-400" />
                </div>
                <span>Explorer</span>
              </div>
              <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-purple-500/20 scrollbar-track-transparent">
                {files.map(file => <FileTreeItem key={file.name} node={file} />)}
              </div>
            </div>
            {/* Code Editor */}
            <div className="flex-1 bg-gradient-to-br from-[#0e0e0e] to-[#0a0a0a] overflow-hidden flex flex-col">
              <div className="h-11 bg-gradient-to-r from-[#0a0a0a] to-[#0c0c0c] border-b border-white/5 flex items-center px-5 gap-3">
                <div className="w-6 h-6 rounded bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                  <FileCode size={14} className="text-purple-400" />
                </div>
                <span className="text-xs font-semibold text-gray-300">App.tsx</span>
                <div className="flex-1" />
                <div className="flex items-center gap-2 text-[10px] text-gray-600">
                  <span>TypeScript</span>
                  <span>•</span>
                  <span>HTML</span>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-6 scrollbar-thin scrollbar-thumb-purple-500/20 scrollbar-track-transparent">
                <SyntaxHighlighter
                  language="typescript"
                  style={vscDarkPlus}
                  customStyle={{ margin: 0, padding: 0, background: 'transparent', fontSize: '13px', lineHeight: '1.6' }}
                  showLineNumbers={true}
                  wrapLines={true}
                >
                  {currentCode || '// No code generated yet\n// Start building your app by describing it in the chat!'}
                </SyntaxHighlighter>
              </div>
            </div>
          </div>
        )}

        {/* Terminal */}
        <div className={cn("border-t border-white/5 bg-gradient-to-t from-[#0a0a0a] to-[#0c0c0c] transition-all duration-300 flex flex-col absolute bottom-0 left-0 right-0 z-40 shadow-2xl backdrop-blur-xl", terminalOpen ? "h-72" : "h-10")}>
          <div
            className="h-10 flex items-center px-4 gap-3 cursor-pointer hover:bg-white/5 border-b border-white/5 bg-gradient-to-r from-[#111] to-[#0f0f0f] transition-colors"
            onClick={() => setTerminalOpen(!terminalOpen)}
          >
            <div className="w-5 h-5 rounded bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 flex items-center justify-center">
              <TerminalIcon size={12} className="text-purple-400" />
            </div>
            <span className="text-xs font-mono font-semibold text-gray-300">Terminal</span>
            <div className="flex-1" />
            <div className="flex items-center gap-2">
               {terminalOpen && (
                 <button 
                   onClick={(e) => { e.stopPropagation(); setLogs([]); }} 
                   className="text-[10px] font-medium text-gray-500 hover:text-white px-2 py-1 rounded-md hover:bg-white/5 transition-colors"
                 >
                   Clear
                 </button>
               )}
               <ChevronDown size={14} className={cn("text-gray-500 transition-transform duration-300", terminalOpen ? "" : "rotate-180")} />
            </div>
          </div>
          {terminalOpen && (
            <div className="flex-1 p-4 overflow-y-auto font-mono text-xs space-y-1.5 bg-[#0a0a0a] scrollbar-thin scrollbar-thumb-purple-500/20 scrollbar-track-transparent">
              {logs.length === 0 ? (
                <div className="text-gray-600 text-center py-8">No logs yet...</div>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="text-gray-400 border-b border-white/5 pb-1 mb-1 last:border-0 leading-relaxed">
                    <span className="text-purple-400/60">$</span> {log}
                  </div>
                ))
              )}
              <div className="flex items-center gap-2 text-gray-500 pt-3 mt-2 border-t border-white/5">
                <span className="text-green-400 font-bold">➜</span>
                <span className="text-blue-400">~</span>
                <span className="animate-pulse text-gray-400">_</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* DISABLED FOR TESTING - SubscriptionPopup modal */}
      {/* <SubscriptionPopup
        isOpen={showSubscriptionPopup}
        onClose={() => {
          setShowSubscriptionPopup(false);
          // Refresh limits after closing (in case user recharged)
          refreshLimit();
          refreshLimit();
        }}
        tokensUsed={tokensUsed}
        tokensLimit={FREE_TOKEN_LIMIT}
        onSelectFree={() => {
          setFreeFallback(true);
          setProvider('anthropic');
          setShowSubscriptionPopup(false);
          // Refresh limits
          refreshLimit();
          refreshLimit();
        }}
      /> */}
      <FeedbackPopup
        isOpen={showFeedbackPopup}
        onClose={() => setShowFeedbackPopup(false)}
      />
      {/* Voice Call Modal - Only for Tutor Mode */}
      {appMode === 'tutor' && (
        <VoiceCall
          isOpen={showVoiceCall}
          onClose={() => setShowVoiceCall(false)}
          provider={provider}
          sessionId={sessionId}
          onMessage={handleVoiceMessage}
        />
      )}
      {showSplash ? (
        <SplashScreen onComplete={() => setShowSplash(false)} />
      ) : (
        <div className="flex h-screen bg-[#050505] text-white overflow-hidden font-sans">
          {isMobile ? (
            /* MOBILE LAYOUT */
            <div className="flex flex-col h-full w-full relative">
              <div className="flex-1 relative overflow-hidden">
                {/* Chat Layer */}
                <div className={cn("absolute inset-0 w-full h-full transition-transform duration-300", mobileTab === 'chat' ? 'translate-x-0' : '-translate-x-full')}>
                  {chatContent}
                </div>

                {/* Workbench Layer */}
                {appMode === 'builder' && (
                  <div className={cn("absolute inset-0 w-full h-full transition-transform duration-300 bg-[#0e0e0e]", mobileTab === 'workbench' ? 'translate-x-0' : 'translate-x-full')}>
                    {workbenchContent}
                  </div>
                )}
              </div>

              {/* Mobile Nav */}
              {appMode === 'builder' && (
                <div className="h-16 bg-[#0a0a0a] border-t border-white/10 flex items-center justify-around shrink-0 z-20 pb-safe px-safe">
                  <button
                    onClick={() => setMobileTab('chat')}
                    className={cn("flex flex-col items-center gap-1 p-3 md:p-2 rounded-lg transition-colors min-w-[60px] min-h-[60px] md:min-w-0 md:min-h-0 flex-shrink-0", mobileTab === 'chat' ? "text-purple-400" : "text-gray-500")}
                  >
                    <MessageSquare size={22} />
                    <span className="text-[10px] font-medium">Chat</span>
                  </button>
                  <div className="w-[1px] h-8 bg-white/5"></div>
                  <button
                    onClick={() => setMobileTab('workbench')}
                    className={cn("flex flex-col items-center gap-1 p-3 md:p-2 rounded-lg transition-colors min-w-[60px] min-h-[60px] md:min-w-0 md:min-h-0 flex-shrink-0", mobileTab === 'workbench' ? "text-blue-400" : "text-gray-500")}
                  >
                    <Layout size={22} />
                    <span className="text-[10px] font-medium">Workbench</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* DESKTOP LAYOUT */
            <PanelGroup direction="horizontal" className="h-full">
              {/* Sidebar (Tutor Mode Only) */}
              {appMode === 'tutor' && isSidebarOpen && (
                <>
                  <Panel
                    defaultSize={isSidebarCollapsed ? 14 : 18}
                    minSize={12}
                    maxSize={22}
                    className="flex flex-col bg-[#171717]"
                  >
                    <Sidebar
                      activeSessionId={sessionId}
                      onNewChat={handleNewChat}
                      onSelectSession={handleSelectSession}
                      onOpenSettings={handleOpenSettings}
                      onCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                      isSubscribed={isSubscribed}
                    />
                  </Panel>
                  <PanelResizeHandle className="w-0 bg-transparent hover:w-1 hover:bg-blue-500/30 transition-all duration-200 cursor-col-resize z-50 relative group">
                    <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-0 bg-transparent group-hover:w-0.5 group-hover:bg-blue-500/50 transition-all" />
                  </PanelResizeHandle>
                </>
              )}
              
              {/* Panel 1: Chat - Increased default size for better UX */}
              <Panel
                defaultSize={
                  appMode === 'builder'
                    ? 45 // builder: buat chat lebih ramping
                    : appMode === 'tutor' && isSidebarOpen
                      ? 82
                      : 90
                }
                minSize={appMode === 'builder' ? 30 : 70}
                maxSize={appMode === 'builder' ? 60 : 90}
                className="flex flex-col bg-[#0a0a0a]"
              >
                {chatContent}
              </Panel>

              {/* Panel 2: Workbench */}
              {appMode === 'builder' && (
                <>
                  <PanelResizeHandle className="w-1 bg-white/5 hover:w-2 hover:bg-purple-500/50 transition-all duration-200 cursor-col-resize z-50 relative group">
                    <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 bg-purple-500/0 group-hover:bg-purple-500 transition-colors" />
                  </PanelResizeHandle>
                  <Panel defaultSize={65} minSize={50} className="flex flex-col bg-[#050505]">
                    {workbenchContent}
                  </Panel>
                </>
              )}
            </PanelGroup>
          )}
        </div>
      )}

      {/* Component Library Modal */}
      <ComponentLibrary
        isOpen={showComponentLibrary}
        onClose={() => setShowComponentLibrary(false)}
        onSelectComponent={(component) => {
          // Insert component code into current file
          if (selectedFile) {
            const file = fileManager.getFile(selectedFile);
            if (file) {
              const newContent = file.content + '\n\n' + component.code;
              fileManager.addFile(selectedFile, newContent, file.type);
              if (selectedFile === fileManager.getEntry()) {
                setCurrentCode(newContent);
              }
              setRefreshKey(k => k + 1);
            }
          } else {
            // If no file selected, create new component file
            const componentPath = `src/components/${component.name.replace(/\s+/g, '')}.tsx`;
            fileManager.addFile(componentPath, component.code, 'component');
            setSelectedFile(componentPath);
            setOpenFiles(prev => [...prev, componentPath]);
          }
        }}
      />

      {/* GitHub Integration Modal */}
      <GitHubIntegration
        isOpen={showGitHubIntegration}
        onClose={() => setShowGitHubIntegration(false)}
        files={fileManager.getAllFiles()}
        framework={fileManager.exportAsProject().framework}
        projectName={`nevra-${sessionId || Date.now()}`}
      />

      {/* Version History Modal */}
      <VersionHistory
        isOpen={showVersionHistory}
        onClose={() => setShowVersionHistory(false)}
        onRestore={(files) => {
          fileManager.clear();
          files.forEach(file => {
            fileManager.addFile(file.path, file.content, file.type);
          });
          if (files.length > 0) {
            fileManager.setEntry(files[0].path);
            setSelectedFile(files[0].path);
            setOpenFiles([files[0].path]);
            setCurrentCode(files[0].content);
          }
          setRefreshKey(k => k + 1);
        }}
      />

      {/* Code Sandbox Modal (Tutor Mode) */}
      {appMode === 'tutor' && showCodeSandbox && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-4xl h-[80vh] bg-[#0a0a0a] border border-white/10 rounded-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">Code Sandbox</h2>
              <button
                onClick={() => setShowCodeSandbox(false)}
                className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 p-4 overflow-hidden">
              <CodeSandbox language="python" />
            </div>
          </div>
        </div>
      )}

      {/* Document Viewer Modal (Tutor Mode) */}
      {appMode === 'tutor' && showDocumentViewer && uploadedDocument && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-4xl h-[80vh] bg-[#0a0a0a] border border-white/10 rounded-xl overflow-hidden">
            <DocumentViewer
              document={uploadedDocument}
              onClose={() => setShowDocumentViewer(false)}
            />
          </div>
        </div>
      )}

      {/* Search Results Panel (Tutor Mode) */}
      {appMode === 'tutor' && searchResults.length > 0 && (
        <div className="fixed right-4 bottom-20 w-96 max-h-96 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-40 backdrop-blur-xl">
          <div className="flex items-center justify-between p-3 border-b border-white/10">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Search size={16} className="text-blue-400" />
              Search Results
            </h3>
            <button
              onClick={() => setSearchResults([])}
              className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          </div>
          <div className="overflow-y-auto max-h-80">
            <SearchResults results={searchResults} />
          </div>
        </div>
      )}

      {/* Planner Panel (Builder Mode) */}
      {appMode === 'builder' && (showPlanner || isGeneratingPlan) && (
        <div className="fixed right-4 top-20 bottom-20 w-96 bg-[#0a0a0a] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-40 backdrop-blur-xl flex flex-col">
          <PlannerPanel
            plan={currentPlan}
            isLoading={isGeneratingPlan}
            onPlanUpdate={(updatedPlan) => {
              setCurrentPlan(updatedPlan);
            }}
            onStartGeneration={() => {
              setShowPlanner(false);
              // Proceed with code generation
              handleSend(input, 'builder');
            }}
            onClose={() => {
              setShowPlanner(false);
              setIsGeneratingPlan(false);
            }}
            className="flex-1"
          />
        </div>
      )}

      {/* Design System Manager (Builder Mode) */}
      {appMode === 'builder' && (
        <DesignSystemManager
          isOpen={showDesignSystem}
          onClose={() => setShowDesignSystem(false)}
          onApply={(system: DesignSystem) => {
            // Apply design system to current code
            const entry = fileManager.getEntry();
            if (entry) {
              const file = fileManager.getFile(entry);
              if (file) {
                const updatedCode = designSystemManager.applyToCode(file.content, system);
                fileManager.addFile(entry, updatedCode, file.type);
                setCurrentCode(updatedCode);
                setRefreshKey(k => k + 1);
              }
            }
          }}
        />
      )}

      {/* Database Panel (Builder Mode) */}
      {appMode === 'builder' && (
        <DatabasePanel
          isOpen={showDatabasePanel}
          onClose={() => setShowDatabasePanel(false)}
          onGenerateCode={(code) => {
            // Add generated code as new file
            const fileName = `lib/database.ts`;
            fileManager.addFile(fileName, code, 'other');
            setOpenFiles(prev => [...prev, fileName]);
            setSelectedFile(fileName);
          }}
        />
      )}

      {/* API Integration Wizard (Builder Mode) */}
      {appMode === 'builder' && (
        <APIIntegrationWizard
          isOpen={showAPIIntegration}
          onClose={() => setShowAPIIntegration(false)}
          onGenerateCode={(code) => {
            // Add generated code as new file
            const fileName = `lib/api.ts`;
            fileManager.addFile(fileName, code, 'other');
            setOpenFiles(prev => [...prev, fileName]);
            setSelectedFile(fileName);
          }}
        />
      )}

      {/* Mobile Generator Modal - Keep for quick access from Tools menu */}
      {appMode === 'builder' && (
        <MobileGenerator
          isOpen={showMobileGenerator}
          onClose={() => setShowMobileGenerator(false)}
          webCode={currentCode || fileManager.getFile(fileManager.getEntry())?.content || ''}
          onGenerateCode={(files) => {
            // Add all generated mobile files
            files.forEach(file => {
              fileManager.addFile(file.path, file.content, 'other');
              setOpenFiles(prev => [...prev, file.path]);
            });
            if (files.length > 0) {
              setSelectedFile(files[0].path);
              setActiveTab('code');
            }
          }}
        />
      )}
    </>
  );
};

export default ChatInterface;
