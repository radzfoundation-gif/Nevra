import React, { useState, useRef } from 'react';
import { Play, Square, Copy, Check, AlertCircle, Loader2 } from 'lucide-react';
import { executeCode, formatExecutionResult, ExecutionResult } from '@/lib/codeExecutor';
import clsx from 'clsx';

interface CodeSandboxProps {
  initialCode?: string;
  language?: 'javascript' | 'python' | 'typescript';
  onCodeChange?: (code: string) => void;
  className?: string;
}

const CodeSandbox: React.FC<CodeSandboxProps> = ({
  initialCode = '',
  language = 'javascript',
  onCodeChange,
  className,
}) => {
  const [code, setCode] = useState(initialCode);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    onCodeChange?.(newCode);
  };

  const handleExecute = async () => {
    if (!code.trim() || isExecuting) return;

    setIsExecuting(true);
    setResult(null);

    try {
      const executionResult = await executeCode(code, language);
      setResult(executionResult);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Execution failed';
      setResult({
        output: '',
        error: errorMessage,
        executionTime: 0,
        language,
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleCopy = () => {
    if (result) {
      const text = result.error 
        ? `Error: ${result.error}` 
        : result.output;
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClear = () => {
    setCode('');
    setResult(null);
    onCodeChange?.('');
  };

  return (
    <div className={clsx("flex flex-col h-full bg-[#0a0a0a] border border-white/10 rounded-xl overflow-hidden", className)}>
      {/* Header - NEVRA style */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#1a1a1a]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
          </div>
          <span className="text-sm font-semibold text-white">
            {language === 'python' ? 'NEVRA Python' : language === 'javascript' ? 'NEVRA JavaScript' : 'NEVRA TypeScript'}
          </span>
          {language === 'python' && (
            <span className="text-xs text-gray-400">Compiler</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExecute}
            disabled={!code.trim() || isExecuting}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-600/20"
          >
            {isExecuting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play size={16} fill="currentColor" />
                Run
              </>
            )}
          </button>
          <button
            onClick={handleClear}
            className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
            title="Clear code"
          >
            <Square size={16} />
          </button>
        </div>
      </div>

      {/* Code Editor */}
      <div className="flex-1 flex flex-col min-h-0 relative">
        {/* Line numbers and code editor wrapper */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Line numbers */}
          <div className="flex-shrink-0 w-12 bg-[#1e1e1e] text-right pr-3 py-4 text-xs font-mono text-gray-600 select-none border-r border-white/5">
            {code.split('\n').map((_, i) => (
              <div key={i} className="leading-6">
                {i + 1}
              </div>
            ))}
          </div>
          
          {/* Code editor */}
          <div className="flex-1 relative overflow-auto bg-[#1e1e1e]">
            <textarea
              ref={textareaRef}
              value={code}
              onChange={(e) => handleCodeChange(e.target.value)}
              placeholder={language === 'python' 
                ? '# NEVRA Python Compiler\n# Write Python 3 code in this online editor and run it.\n\nprint("Hello, NEVRA!")'
                : `// Enter ${language} code here...\n\nconsole.log("Hello, World!");`}
              className="w-full h-full bg-transparent text-sm font-mono text-white p-4 resize-none focus:outline-none placeholder-gray-600"
              style={{
                fontFamily: 'Monaco, Menlo, "Ubuntu Mono", Consolas, "source-code-pro", monospace',
                fontSize: '14px',
                lineHeight: '1.5',
                tabSize: 4,
                minHeight: '100%',
              }}
              spellCheck={false}
            />
          </div>
        </div>
      </div>

      {/* Output Panel - NEVRA style */}
      <div className="border-t border-white/10 bg-[#0f0f0f] flex-shrink-0">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 bg-[#151515]">
          <span className="text-sm font-semibold text-white">
            {result?.error ? 'Error' : 'Output'}
          </span>
          {result && (
            <button
              onClick={handleCopy}
              className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
              title="Copy output"
            >
              {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
            </button>
          )}
        </div>
        <div className="p-4 max-h-64 overflow-y-auto min-h-[100px]">
          {result ? (
            <>
              {result.error ? (
                <div className="flex items-start gap-2 text-red-400">
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <pre className="text-sm font-mono whitespace-pre-wrap break-words leading-relaxed">
                    {result.error}
                  </pre>
                </div>
              ) : (
                <pre className="text-sm font-mono text-gray-200 whitespace-pre-wrap break-words leading-relaxed">
                  {result.output || 'No output'}
                </pre>
              )}
              {result.executionTime > 0 && (
                <div className="mt-3 text-xs text-gray-500">
                  Execution time: {result.executionTime.toFixed(2)}ms
                </div>
              )}
            </>
          ) : (
            <div className="text-sm text-gray-500 italic">
              Click "Run" to execute your code
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CodeSandbox;
