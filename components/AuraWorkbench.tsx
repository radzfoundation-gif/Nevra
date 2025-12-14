import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, Code, Palette, Type, Image as ImageIcon, 
  Monitor, Tablet, Smartphone, ZoomIn, ZoomOut, 
  Download, Globe, Undo2, Redo2, Save, 
  ChevronLeft, X, Copy, Eye
} from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

const cn = (...inputs: Parameters<typeof clsx>) => twMerge(clsx(inputs));

interface AuraWorkbenchProps {
  // Chat content
  chatContent: React.ReactNode;
  
  // Preview content
  previewCode: string;
  onPreviewCodeChange?: (code: string) => void;
  
  // Design tools
  onFontChange?: (font: string) => void;
  onColorChange?: (color: string) => void;
  
  // Canvas controls
  canvasZoom?: number;
  onZoomChange?: (zoom: number) => void;
  
  // Device preview
  previewDevice?: 'desktop' | 'tablet' | 'mobile';
  onDeviceChange?: (device: 'desktop' | 'tablet' | 'mobile') => void;
  
  // Actions
  onSave?: () => void;
  onExport?: () => void;
  onPublish?: () => void;
  onBack?: () => void;
  
  // Undo/Redo
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

const AuraWorkbench: React.FC<AuraWorkbenchProps> = ({
  chatContent,
  previewCode,
  onPreviewCodeChange,
  onFontChange,
  onColorChange,
  canvasZoom = 75,
  onZoomChange,
  previewDevice = 'mobile',
  onDeviceChange,
  onSave,
  onExport,
  onPublish,
  onBack,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'design' | 'code'>('preview');
  const [showDesignTools, setShowDesignTools] = useState(false);
  const [selectedFont, setSelectedFont] = useState('Inter');
  const [selectedColor, setSelectedColor] = useState('#7e22ce');
  const previewIframeRef = useRef<HTMLIFrameElement>(null);
  const [zoom, setZoom] = useState(canvasZoom);

  const getIframeSrc = (code: string) => {
    // Clean and validate code
    const cleanedCode = code ? code.trim() : '';
    
    // Check if code is empty or only contains whitespace/newlines
    if (!cleanedCode || cleanedCode.length === 0 || /^[\s\n\r\t]+$/.test(cleanedCode)) {
      console.warn('⚠️ getIframeSrc called with empty or whitespace-only code');
      return 'data:text/html;charset=utf-8,<!DOCTYPE html><html><body><p>No code to display</p></body></html>';
    }
    
    try {
      // Ensure code is valid HTML or wrap it
      let htmlCode = cleanedCode;
      
      // If not already HTML, wrap it
      if (!cleanedCode.includes('<!DOCTYPE') && !cleanedCode.includes('<html')) {
        htmlCode = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Generated App</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
${cleanedCode}
</body>
</html>`;
      }
      
      const encoded = encodeURIComponent(htmlCode);
      return `data:text/html;charset=utf-8,${encoded}`;
    } catch (error) {
      console.error('❌ Error encoding iframe src:', error);
      return 'data:text/html;charset=utf-8,<!DOCTYPE html><html><body><p>Error loading preview</p></body></html>';
    }
  };

  const handleZoomIn = () => {
    const newZoom = Math.min(zoom + 10, 200);
    setZoom(newZoom);
    onZoomChange?.(newZoom);
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(zoom - 10, 25);
    setZoom(newZoom);
    onZoomChange?.(newZoom);
  };

  const handleFontChange = (font: string) => {
    setSelectedFont(font);
    onFontChange?.(font);
  };

  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    onColorChange?.(color);
  };

  const deviceScale = previewDevice === 'mobile' ? 0.75 : previewDevice === 'tablet' ? 0.6 : 1;

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0a] text-white overflow-hidden">
      {/* Top Toolbar - Aura Style */}
      <div className="h-14 bg-[#0f0f0f] border-b border-white/10 flex items-center justify-between px-4 shrink-0 z-30">
        {/* Left: Navigation & Tabs */}
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              <ChevronLeft size={16} />
              <span>Back</span>
            </button>
          )}

          {/* Main Tabs */}
          <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('preview')}
              className={cn(
                "flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                activeTab === 'preview'
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-gray-400 hover:text-gray-300"
              )}
            >
              <Play size={14} />
              Preview
            </button>
            <button
              onClick={() => setActiveTab('design')}
              className={cn(
                "flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                activeTab === 'design'
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-gray-400 hover:text-gray-300"
              )}
            >
              <Palette size={14} />
              Design
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={cn(
                "flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                activeTab === 'code'
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-gray-400 hover:text-gray-300"
              )}
            >
              <Code size={14} />
              Code
            </button>
          </div>

          {/* Design Tools (when Design tab is active) */}
          {activeTab === 'design' && (
            <div className="flex items-center gap-2 ml-4 pl-4 border-l border-white/10">
              <button
                onClick={() => setShowDesignTools(!showDesignTools)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                <Type size={14} />
                Fonts
              </button>
              <button
                onClick={() => setShowDesignTools(!showDesignTools)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                <Palette size={14} />
                Colors
              </button>
              <button
                onClick={() => setShowDesignTools(!showDesignTools)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                <ImageIcon size={14} />
                Assets
              </button>
            </div>
          )}
        </div>

        {/* Center: Canvas Controls (when Preview tab is active) */}
        {activeTab === 'preview' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Canvas - {zoom}%</span>
            <button
              onClick={handleZoomOut}
              className="p-1.5 hover:bg-white/5 rounded transition-colors"
              disabled={zoom <= 25}
            >
              <ZoomOut size={14} className={zoom <= 25 ? "text-gray-600" : "text-gray-400"} />
            </button>
            <button
              onClick={handleZoomIn}
              className="p-1.5 hover:bg-white/5 rounded transition-colors"
              disabled={zoom >= 200}
            >
              <ZoomIn size={14} className={zoom >= 200 ? "text-gray-600" : "text-gray-400"} />
            </button>
          </div>
        )}

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Undo/Redo */}
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1.5 hover:bg-white/5 rounded transition-colors disabled:opacity-30"
            title="Undo"
          >
            <Undo2 size={16} className={canUndo ? "text-gray-400" : "text-gray-600"} />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1.5 hover:bg-white/5 rounded transition-colors disabled:opacity-30"
            title="Redo"
          >
            <Redo2 size={16} className={canRedo ? "text-gray-400" : "text-gray-600"} />
          </button>

          {/* Device Preview Toggles */}
          {activeTab === 'preview' && (
            <div className="flex items-center gap-1 mx-2 px-2 border-l border-r border-white/10">
              <button
                onClick={() => onDeviceChange?.('desktop')}
                className={cn(
                  "p-1.5 rounded transition-colors",
                  previewDevice === 'desktop' 
                    ? "bg-white/10 text-white" 
                    : "text-gray-400 hover:text-gray-300"
                )}
                title="Desktop"
              >
                <Monitor size={16} />
              </button>
              <button
                onClick={() => onDeviceChange?.('tablet')}
                className={cn(
                  "p-1.5 rounded transition-colors",
                  previewDevice === 'tablet' 
                    ? "bg-white/10 text-white" 
                    : "text-gray-400 hover:text-gray-300"
                )}
                title="Tablet"
              >
                <Tablet size={16} />
              </button>
              <button
                onClick={() => onDeviceChange?.('mobile')}
                className={cn(
                  "p-1.5 rounded transition-colors",
                  previewDevice === 'mobile' 
                    ? "bg-white/10 text-white" 
                    : "text-gray-400 hover:text-gray-300"
                )}
                title="Mobile"
              >
                <Smartphone size={16} />
              </button>
            </div>
          )}

          {/* Save */}
          {onSave && (
            <button
              onClick={onSave}
              className="px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              <Save size={14} className="inline mr-1.5" />
              Save
            </button>
          )}

          {/* Export */}
          {onExport && (
            <button
              onClick={onExport}
              className="px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              <Download size={14} className="inline mr-1.5" />
              Export
            </button>
          )}

          {/* Publish */}
          {onPublish && (
            <button
              onClick={onPublish}
              className="px-4 py-1.5 text-sm font-medium bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-400 hover:to-blue-400 text-white rounded-lg transition-all shadow-lg shadow-purple-500/20"
            >
              <Globe size={14} className="inline mr-1.5" />
              Publish
            </button>
          )}
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
          <div className="p-4 space-y-6">
            {/* Fonts */}
            <div>
              <label className="text-xs font-medium text-gray-400 mb-2 block">Fonts</label>
              <div className="space-y-2">
                {['Inter', 'Roboto', 'Poppins', 'Montserrat', 'Open Sans'].map((font) => (
                  <button
                    key={font}
                    onClick={() => handleFontChange(font)}
                    className={cn(
                      "w-full px-3 py-2 text-left text-sm rounded-lg transition-colors",
                      selectedFont === font
                        ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                        : "bg-white/5 text-gray-300 hover:bg-white/10"
                    )}
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
                    onClick={() => handleColorChange(color)}
                    className={cn(
                      "w-full aspect-square rounded-lg transition-all",
                      selectedColor === color
                        ? "ring-2 ring-white ring-offset-2 ring-offset-[#1a1a1a] scale-110"
                        : "hover:scale-105"
                    )}
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
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Panel: Chat */}
        <div className={cn(
          "flex flex-col border-r border-white/10 bg-[#0a0a0a] transition-all",
          showDesignTools && activeTab === 'design' ? "ml-80" : "ml-0"
        )}>
          {chatContent}
        </div>

        {/* Right Panel: Preview/Design/Code */}
        <div className="flex-1 flex flex-col bg-[#0e0e0e] overflow-hidden">
          {activeTab === 'preview' && (
            <div className="flex-1 flex items-center justify-center p-8 overflow-auto bg-[radial-gradient(#1a1a1a_1px,transparent_1px)] [background-size:16px_16px]">
              {/* Mobile Mockup */}
              <div
                className={cn(
                  "relative transition-all duration-300",
                  previewDevice === 'mobile' && "w-[375px] h-[812px] rounded-[3rem] border-[8px] border-[#1a1a1a] bg-black shadow-2xl",
                  previewDevice === 'tablet' && "w-[768px] h-[1024px] rounded-[2rem] border-[8px] border-[#1a1a1a] bg-black shadow-2xl",
                  previewDevice === 'desktop' && "w-full h-full max-w-6xl rounded-xl border border-white/10 bg-white shadow-2xl"
                )}
                style={{
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: 'center',
                }}
              >
                {/* Mobile Notch */}
                {previewDevice === 'mobile' && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 h-6 w-32 bg-[#1a1a1a] rounded-b-xl z-20 pointer-events-none" />
                )}

                {/* Status Bar */}
                {previewDevice === 'mobile' && (
                  <div className="h-10 w-full bg-white flex items-center justify-between px-6 text-[10px] font-bold text-black rounded-t-[2.5rem] z-10 shrink-0">
                    <span>9:41</span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-2.5 border border-black rounded-[2px] relative">
                        <div className="absolute inset-0.5 bg-black" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Preview Iframe */}
                <iframe
                  ref={previewIframeRef}
                  src={getIframeSrc(previewCode)}
                  className={cn(
                    "w-full border-none bg-white",
                    previewDevice === 'mobile' ? "h-[calc(100%-2.5rem)] rounded-b-[2.5rem]" :
                    previewDevice === 'tablet' ? "h-full rounded-[1.5rem]" :
                    "h-full rounded-xl"
                  )}
                  title="Preview"
                  sandbox="allow-scripts allow-modals allow-forms allow-popups allow-same-origin"
                />
              </div>
            </div>
          )}

          {activeTab === 'design' && (
            <div className="flex-1 p-8 overflow-auto">
              <div className="max-w-4xl mx-auto">
                <h2 className="text-2xl font-bold mb-6">Design Settings</h2>
                <p className="text-gray-400">Design tools panel coming soon...</p>
              </div>
            </div>
          )}

          {activeTab === 'code' && (
            <div className="flex-1 p-8 overflow-auto">
              <div className="max-w-4xl mx-auto">
                <div className="bg-[#1a1a1a] rounded-lg border border-white/10 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-white">Code Editor</h3>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(previewCode);
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-white/5 rounded transition-colors"
                    >
                      <Copy size={14} />
                      Copy
                    </button>
                  </div>
                  <pre className="text-xs text-gray-300 overflow-x-auto">
                    <code>{previewCode}</code>
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuraWorkbench;
