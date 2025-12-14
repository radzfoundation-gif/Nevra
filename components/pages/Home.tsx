import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Navbar from '../Navbar';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, ChevronDown, Paperclip, X, AlertTriangle, Image as ImageIcon, Camera, ImagePlus, Layout } from 'lucide-react';
import BentoGrid from '../BentoGrid';
import Integrations from '../Integrations';
import CTA from '../CTA';
import Footer from '../Footer';
import Background from '../ui/Background';
import ProviderSelector from '../ui/ProviderSelector';
import { FlipText } from '../ui/flip-text';
import { AIProvider } from '@/lib/ai';
import { useAuth, useUser } from '@clerk/clerk-react';
import SubscriptionPopup from '../SubscriptionPopup';
import TokenBadge from '../TokenBadge';
import { useTokenLimit } from '@/hooks/useTokenLimit';
import { FREE_TOKEN_LIMIT } from '@/lib/tokenLimit';

import Sidebar from '../Sidebar';
import SettingsModal from '../settings/SettingsModal';
import TemplateBrowser from '../TemplateBrowser';
import { Template } from '@/lib/templates';

import { User, ChevronLeft, Menu } from 'lucide-react';

const Home: React.FC = () => {
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const { hasExceeded, tokensUsed, tokensRemaining, isSubscribed, refreshLimit } = useTokenLimit();
  const [showSubscriptionPopup, setShowSubscriptionPopup] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false); // Added state for settings modal
  const [showTemplateBrowser, setShowTemplateBrowser] = useState(false);

  // Add effect to trigger animations for BentoGrid
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
        }
      });
    }, { threshold: 0.1 });

    // Small timeout to ensure DOM is ready
    setTimeout(() => {
      document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    }, 100);

    return () => observer.disconnect();
  }, []);

  // Restore prompt from localStorage if available
  useEffect(() => {
    const savedPrompt = localStorage.getItem('nevra_pending_prompt');
    if (savedPrompt) {
      setPrompt(savedPrompt);
      // Optional: Clear it after restoring, or keep it until successfully sent
      // localStorage.removeItem('nevra_pending_prompt'); 
    }
  }, []);

  const [prompt, setPrompt] = useState('');
  const [provider, setProvider] = useState<AIProvider>('deepseek'); // Default to Mistral Devstral (free)
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const MAX_IMAGES = 3;
  const MAX_SIZE_MB = 2;
  const [freeFallback, setFreeFallback] = useState(false);

  // Typewriter Effect State
  const [placeholderText, setPlaceholderText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [loopNum, setLoopNum] = useState(0);
  const [typingSpeed, setTypingSpeed] = useState(150);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [showImageMenu, setShowImageMenu] = useState(false);
  const imageMenuRef = useRef<HTMLDivElement>(null);
  // Refs for camera cleanup
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const cameraModalRef = useRef<HTMLElement | null>(null);
  const cameraEventListenersRef = useRef<Array<{ element: HTMLElement; event: string; handler: EventListener }>>([]);

  useEffect(() => {
    const toRotate = ["help you today?", "build your app?", "debug your code?", "teach you something new?"];
    const handleTyping = () => {
      const i = loopNum % toRotate.length;
      const fullText = toRotate[i];

      setPlaceholderText(isDeleting
        ? fullText.substring(0, placeholderText.length - 1)
        : fullText.substring(0, placeholderText.length + 1)
      );

      setTypingSpeed(isDeleting ? 30 : 150);

      if (!isDeleting && placeholderText === fullText) {
        setTimeout(() => setIsDeleting(true), 2000); // Pause at end
      } else if (isDeleting && placeholderText === '') {
        setIsDeleting(false);
        setLoopNum(loopNum + 1);
      }
    };

    const timer = setTimeout(handleTyping, typingSpeed);
    return () => clearTimeout(timer);
  }, [placeholderText, isDeleting, loopNum, typingSpeed]);

  const suggestedPrompts = [
    "Build a CRM dashboard with dark mode",
    "Create a landing page for a coffee shop",
    "Make a personal portfolio with 3D effects",
    "Design an e-commerce product card"
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    if (attachedImages.length >= MAX_IMAGES) {
      alert(`Maximum ${MAX_IMAGES} images per request.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    const files = Array.from(e.target.files);

    let accepted = 0;
    files.forEach(file => {
      if (attachedImages.length + accepted >= MAX_IMAGES) return;
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        alert(`File ${file.name} is too large (> ${MAX_SIZE_MB}MB).`);
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachedImages(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
      accepted += 1;
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
    setShowImageMenu(false);
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
          alert(`Maximum ${MAX_IMAGES} images per request.`);
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
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const removeImage = (index: number) => {
    setAttachedImages(prev => prev.filter((_, i) => i !== index));
  };

  // Detect mode from user prompt (same logic as ChatInterface)
  const detectMode = (text: string): 'builder' | 'tutor' => {
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
      // Indonesian question words
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

  const handleSearch = () => {
    if (!prompt.trim() && attachedImages.length === 0) return;

    // Auto-switch to OpenAI if images are attached - DISABLED FOR TESTING (all providers support images now)
    let effectiveProvider = provider;
    // DISABLED FOR TESTING - Allow images with any provider
    // if (attachedImages.length > 0 && provider !== 'openai' && provider !== 'grok' && provider !== 'groq') {
    //   if (!isSubscribed) {
    //     alert('Image analysis requires GPT-5.2 (OpenAI). Please subscribe to use this feature, or remove the images to use other providers.');
    //     return;
    //   }
    //   effectiveProvider = 'openai';
    //   console.log('🖼️ Images detected, switching to OpenAI for vision analysis');
    // }

    // Check if user is signed in
    if (!isSignedIn) {
      // Save prompt to localStorage before redirecting
      localStorage.setItem('nevra_pending_prompt', prompt);

      // Redirect to sign-in with current state
      navigate('/sign-in', {
        state: {
          from: '/',
          initialPrompt: prompt,
          initialProvider: effectiveProvider,
          initialImages: attachedImages
        }
      });
      return;
    }

    // Check token limit for non-subscribed users - DISABLED FOR TESTING
    // if (!isSubscribed && hasExceeded) {
    //   if (!freeFallback) {
    //     setShowSubscriptionPopup(true);
    //     return;
    //   }
    //   // Pakai fallback gratis: paksa ke Claude Opus 4.5
    //   if (attachedImages.length === 0) {
    //     effectiveProvider = 'groq';
    //   }
    // }

    // Clear saved prompt once successfully navigating to chat
    localStorage.removeItem('nevra_pending_prompt');

    // Detect mode from user prompt
    const detectedMode = detectMode(prompt);
    const isBuilderMode = detectedMode === 'builder';

    // Navigate to chat - only use codebase mode if builder mode is detected
    navigate('/chat', {
      state: {
        initialPrompt: prompt || (attachedImages.length > 0 ? 'Analyze this image' : ''),
        initialProvider: effectiveProvider,
        initialImages: attachedImages,
        // Only set codebase mode if user wants to build/create something
        ...(isBuilderMode ? {
          mode: 'codebase',
          targetFile: 'components/pages/Home.tsx',
          framework: 'react'
        } : {})
      }
    });
  };

  const handleTemplateSelect = (template: Template) => {
    setPrompt(template.prompt);
    // Auto navigate to chat with template prompt
    if (isSignedIn) {
      navigate('/chat', {
        state: {
          initialPrompt: template.prompt,
          initialProvider: provider,
          initialImages: [],
          templateId: template.id,
          templateName: template.name
        }
      });
    } else {
      // Save template to localStorage and redirect to sign-in
      localStorage.setItem('nevra_pending_prompt', template.prompt);
      localStorage.setItem('nevra_template_id', template.id);
      navigate('/sign-in', {
        state: {
          from: '/',
          initialPrompt: template.prompt,
          initialProvider: provider,
          initialImages: [],
          templateId: template.id,
          templateName: template.name
        }
      });
    }
  };

  return (
    <div className="min-h-screen bg-aura-black text-white selection:bg-purple-500/30 font-sans flex">
      <Background />
      <Navbar />

      {/* DISABLED FOR TESTING - SubscriptionPopup modal */}
      {/* <SubscriptionPopup
        isOpen={showSubscriptionPopup}
        onClose={() => setShowSubscriptionPopup(false)}
        tokensUsed={tokensUsed}
        tokensLimit={FREE_TOKEN_LIMIT}
        onSelectFree={() => {
          setFreeFallback(true);
          setProvider('anthropic');
          setShowSubscriptionPopup(false);
        }}
      /> */}

      {/* Settings Modal - Rendered at root level to avoid sidebar transform issues */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Sidebar - Collapsible */}
      {isSignedIn && (
        <>
          {/* Mobile Overlay */}
          <div
            className={`md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={() => setIsSidebarOpen(false)}
          />

          {/* Sidebar Container */}
          <div
            className={`
              fixed inset-y-0 left-0 z-50 bg-[#0a0a0a] border-r border-white/10 transition-all duration-300 ease-in-out flex flex-col h-full
              md:static md:h-screen md:shrink-0
              ${isSidebarOpen
                ? 'translate-x-0 w-[85vw] max-w-[320px] md:w-[280px]'
                : '-translate-x-full w-0 md:w-0 md:translate-x-0 overflow-hidden'
              }
            `}
          >
            <div className={`flex-1 overflow-hidden h-full flex flex-col ${!isSidebarOpen && 'invisible'}`}>
              <Sidebar
                onNewChat={() => {
                  setPrompt('');
                  setAttachedImages([]);
                  if (window.innerWidth < 768) setIsSidebarOpen(false);
                }}
                onSelectSession={(sessionId) => {
                  console.log('Select session:', sessionId);
                  navigate(`/chat/${sessionId}`);
                }}
                onOpenSettings={() => {
                  setIsSettingsOpen(true);
                  if (window.innerWidth < 768) setIsSidebarOpen(false);
                }}
              />
            </div>

            {/* Collapse Button inside Sidebar */}
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="absolute top-1/2 -right-3 w-6 h-12 bg-[#0a0a0a] border border-l-0 border-white/10 rounded-r-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              title="Collapse Sidebar"
            >
              <ChevronLeft size={14} />
            </button>
          </div>

          {/* Toggle Button (User Icon) - Visible when sidebar is closed */}
          <div
            className={`fixed bottom-4 left-4 z-40 transition-all duration-300 ${isSidebarOpen ? 'opacity-0 pointer-events-none translate-x-[-20px]' : 'opacity-100 translate-x-0'}`}
          >
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="group flex items-center justify-center w-10 h-10 rounded-full bg-[#1a1a1a] border border-white/10 text-white hover:bg-[#2a2a2a] hover:border-purple-500/50 transition-all shadow-lg overflow-hidden"
              title="Open Sidebar"
            >
              {user?.imageUrl ? (
                <img src={user.imageUrl} alt="User" className="w-full h-full object-cover opacity-80 group-hover:opacity-100" />
              ) : (
                <User size={20} className="text-gray-400 group-hover:text-white" />
              )}
            </button>
          </div>
        </>
      )}

      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isSidebarOpen ? 'md:ml-64' : ''}`}>

        {/* Hero Section */}
        <section className="relative flex-1 flex flex-col justify-center items-center min-h-[85vh] px-4 md:px-6 pt-32">
          <div className="max-w-3xl w-full relative z-10 flex flex-col items-center">
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8"
            >
              <Sparkles size={16} className="text-purple-400" />
              <span className="text-sm font-medium text-gray-300">New: AI-Powered Component Generation</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-5xl md:text-7xl font-display font-bold mb-6 text-white text-center tracking-tight leading-tight"
            >
              Build{' '}
              <FlipText
                words={['Faster', 'Better', 'Smarter', 'Stronger', 'Cleaner']}
                duration={2500}
                letterDelay={0.08}
                wordDelay={0.4}
                className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-fuchsia-400 to-blue-500"
              />{' '}
              with
              <br />
              NEVRA
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-xl text-gray-400 mb-10 text-center max-w-2xl leading-relaxed"
            >
              Nevra accelerates full-stack development with intelligent AI.
            </motion.p>

            {/* Search Bar - Removed overflow-hidden to fix dropdown */}
            <div className="relative w-full mb-4 animate-fade-in-up delay-100 group">
              <div className="relative bg-[#0a0a0a] border border-white/10 rounded-xl shadow-2xl transition-all duration-300 group-hover:border-white/20">
                
                {/* Attached Images Preview */}
                {attachedImages.length > 0 && (
                  <div className="p-3 border-b border-white/5 bg-white/[0.02] rounded-t-xl">
                    <div className="flex gap-2 overflow-x-auto scrollbar-none">
                      {attachedImages.map((img, idx) => (
                        <div key={idx} className="relative group/img shrink-0">
                          <img src={img} alt="Preview" className="w-12 h-12 object-cover rounded-lg border border-white/10" />
                          <button
                            onClick={() => removeImage(idx)}
                            className="absolute -top-1 -right-1 bg-black/50 hover:bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover/img:opacity-100 transition-all backdrop-blur-sm"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="relative flex items-start">
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSearch();
                      }
                    }}
                    placeholder={`How can Nevra ${placeholderText}`}
                    className={`w-full bg-transparent text-white text-base md:text-lg p-4 min-h-[60px] md:min-h-[80px] focus:outline-none resize-none placeholder-gray-500 font-sans ${attachedImages.length === 0 ? 'rounded-t-xl' : ''}`}
                    style={{ minHeight: '100px' }}
                  />
                  
                  <div className="absolute bottom-3 right-3">
                    <button
                      type="submit"
                      onClick={handleSearch}
                      disabled={!prompt.trim() && attachedImages.length === 0}
                      className="bg-white text-black hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg p-2 transition-colors"
                    >
                      <ArrowRight size={18} />
                    </button>
                  </div>
                </div>

                {/* Input Actions Bar */}
                <div className="flex items-center justify-between px-3 py-2 border-t border-white/5 bg-white/[0.02] rounded-b-xl">
                  <div className="flex items-center gap-1">
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      multiple
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileChange}
                    />
                    
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 text-xs font-medium text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
                    >
                      <Paperclip size={14} />
                      <span>Attach</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowImageMenu(!showImageMenu)}
                      className="flex items-center gap-2 text-xs font-medium text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5 relative"
                    >
                      <Camera size={14} />
                      <span>Camera</span>
                      {showImageMenu && (
                        <div className="absolute bottom-full left-0 mb-2 w-48 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl overflow-hidden z-50">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCameraCapture();
                            }}
                            className="w-full flex items-center gap-2 px-4 py-3 text-sm text-left text-gray-300 hover:bg-white/10 hover:text-white"
                          >
                            <Camera size={14} /> Capture Photo
                          </button>
                        </div>
                      )}
                    </button>

                    <div className="h-4 w-[1px] bg-white/10 mx-1"></div>

                    <ProviderSelector
                      value={provider}
                      onChange={(p) => {
                        // DISABLED FOR TESTING - Allow all provider selection
                        // if (p === 'grok' && isGrokLocked && !isSubscribed) {
                        //   alert('Gemini 3 Pro token limit has been reached.');
                        //   return;
                        // }
                        setProvider(p);
                      }}
                      isSubscribed={isSubscribed}
                    />
                  </div>
                  
                  {isSignedIn && (
                    <TokenBadge
                      tokensUsed={tokensUsed}
                      tokensLimit={FREE_TOKEN_LIMIT}
                      isSubscribed={isSubscribed}
                      compact={true}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions Buttons */}
            <div className="flex flex-wrap justify-center gap-3 mt-4 animate-fade-in-up delay-200">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] hover:bg-[#252525] border border-white/10 rounded-lg text-sm text-gray-400 hover:text-white transition-all"
              >
                <ImageIcon size={14} />
                <span>Clone a Screenshot</span>
              </button>
              <button 
                onClick={() => setPrompt("Create a landing page for ")}
                className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] hover:bg-[#252525] border border-white/10 rounded-lg text-sm text-gray-400 hover:text-white transition-all"
              >
                <Layout size={14} /> {/* Assuming Layout icon is imported, if not I'll use Sparkles */}
                <span>Landing Page</span>
              </button>
              <button 
                onClick={() => setShowTemplateBrowser(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] hover:bg-[#252525] border border-white/10 rounded-lg text-sm text-gray-400 hover:text-white transition-all"
              >
                <Sparkles size={14} />
                <span>Templates</span>
              </button>
            </div>

          </div>

          {/* DISABLED FOR TESTING - Token limit warning */}
          {/* {isSignedIn && !isSubscribed && hasExceeded && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-amber-400/80 flex items-center gap-2 bg-amber-900/20 px-3 py-1.5 rounded-full border border-amber-900/30">
              <AlertTriangle size={12} />
              Free quota reached. Upgrade to continue.
            </div>
          )} */}
        </section>

        {/* Community Section */}
        <div className="px-6 md:px-12 pb-12 w-full max-w-[1400px] mx-auto">
            <div className="flex justify-between items-end mb-8 border-b border-white/5 pb-4">
                <div>
                    <h2 className="text-xl font-semibold text-white mb-1">From the Community</h2>
                    <p className="text-sm text-gray-500">Explore what the community is building with Nevra.</p>
                </div>
                <button className="text-sm text-gray-500 hover:text-white transition-colors flex items-center gap-1">
                  Browse All <ArrowRight size={14} />
                </button>
            </div>
            <BentoGrid />
        </div>

        {/* Footer Sections - Reduced opacity to keep focus on top */}
        <div className="opacity-50 hover:opacity-100 transition-opacity duration-500">
          <Integrations />
          <CTA />
          <Footer />
        </div>
      </div>

      {/* Template Browser Modal */}
      <TemplateBrowser
        isOpen={showTemplateBrowser}
        onClose={() => setShowTemplateBrowser(false)}
        onSelectTemplate={handleTemplateSelect}
      />
    </div>
  );
};

export default Home;
