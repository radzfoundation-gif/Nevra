import React, { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, Loader2, GraduationCap, X, AlertTriangle } from 'lucide-react';
import { generateCode, AIProvider } from '@/lib/ai';

interface VoiceCallProps {
  isOpen: boolean;
  onClose: () => void;
  provider: AIProvider;
  sessionId?: string;
  onMessage?: (text: string, isAI?: boolean) => void; // Added isAI flag
}

const VoiceCall: React.FC<VoiceCallProps> = ({ 
  isOpen, 
  onClose, 
  provider,
  sessionId,
  onMessage 
}) => {
  const [isCalling, setIsCalling] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: 'user' | 'ai'; content: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);

  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const conversationHistoryRef = useRef<Array<{ role: 'user' | 'ai'; content: string }>>([]);

  // Reset error when modal opens
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setIsRequestingPermission(false);
    }
  }, [isOpen]);

  // Initialize Speech Recognition
  useEffect(() => {
    if (!isOpen) return;

    // Check browser support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition not supported in this browser. Please use Chrome or Edge.');
      onClose();
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      setTranscript(finalTranscript || interimTranscript);

      // If we have final transcript, send to AI
      if (finalTranscript.trim()) {
        handleUserSpeech(finalTranscript.trim());
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'no-speech') {
        // Restart recognition if no speech detected
        if (isCalling && !isMuted) {
          setTimeout(() => {
            try {
              recognition.start();
            } catch (e) {
              console.warn('Recognition restart failed:', e);
            }
          }, 1000);
        }
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      // Auto-restart if call is active and not muted
      if (isCalling && !isMuted) {
        setTimeout(() => {
          try {
            recognition.start();
          } catch (e) {
            console.warn('Recognition restart failed:', e);
          }
        }, 500);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore
        }
      }
    };
  }, [isOpen, isCalling, isMuted]);

  // Handle user speech
  const handleUserSpeech = async (text: string) => {
    if (!text.trim() || isMuted) return;

    // Add to conversation history
    const newHistory = [...conversationHistoryRef.current, { role: 'user' as const, content: text }];
    conversationHistoryRef.current = newHistory;
    setConversationHistory(newHistory);
    
    // Call onMessage callback if provided (user message)
    if (onMessage) {
      onMessage(text, false);
    }

    try {
      // Generate AI response
      const history = newHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));

      const response = await generateCode(text, history, 'tutor', provider, []);
      
      // Extract text from response (remove HTML tags and clean up)
      let responseText = response;
      
      // Remove HTML tags and comments
      responseText = responseText
        .replace(/<!--[\s\S]*?-->/g, '') // Remove HTML comments
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/```[\s\S]*?```/g, '') // Remove code blocks
        .replace(/`[^`]*`/g, '') // Remove inline code
        .trim();
      
      // Clean up extra whitespace and newlines
      responseText = responseText.replace(/\n\s*\n/g, ' ').replace(/\s+/g, ' ');
      
      // Limit length for voice (max 300 words for better UX in voice)
      const words = responseText.split(' ');
      if (words.length > 300) {
        responseText = words.slice(0, 300).join(' ') + '...';
      }
      
      // If response is empty or too short, use fallback
      if (!responseText || responseText.length < 10) {
        responseText = "I understand. Could you tell me more about that?";
      }
      
      // Add to conversation history
      const updatedHistory = [...conversationHistoryRef.current, { role: 'ai' as const, content: responseText }];
      conversationHistoryRef.current = updatedHistory;
      setConversationHistory(updatedHistory);
      setAiResponse(responseText);

      // Call onMessage callback if provided (AI response)
      if (onMessage) {
        onMessage(responseText, true);
      }

      // Clear transcript after processing
      setTranscript('');

      // Speak the response
      speakText(responseText);
    } catch (error) {
      console.error('Error generating AI response:', error);
      speakText("I'm sorry, I encountered an error. Please try again.");
    }
  };

  // Text to Speech
  const speakText = (text: string) => {
    if (!isSpeakerOn) return;

    // Stop any ongoing speech
    if (synthesisRef.current) {
      window.speechSynthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.lang = 'en-US';

    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      // Resume listening after speaking
      if (isCalling && !isMuted && recognitionRef.current) {
        setTimeout(() => {
          try {
            recognitionRef.current.start();
          } catch (e) {
            console.warn('Recognition restart after speech failed:', e);
          }
        }, 500);
      }
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      setIsSpeaking(false);
    };

    synthesisRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  // Start call
  const startCall = async () => {
    setError(null);
    setIsRequestingPermission(true);

    try {
      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia is not supported in this browser. Please use Chrome or Edge.');
      }

      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Stop the stream immediately after getting permission (we only need permission, not the stream)
      stream.getTracks().forEach(track => track.stop());
      
      setIsCalling(true);
      setIsMuted(false);
      setTranscript('');
      setAiResponse('');
      conversationHistoryRef.current = [];
      setConversationHistory([]);
      setIsRequestingPermission(false);

      // Start speech recognition
      if (recognitionRef.current) {
        recognitionRef.current.start();
      }

      // Initial greeting
      const greeting = "Hello! I'm Nevra Tutor. How can I help you learn today?";
      const initialHistory = [{ role: 'ai' as const, content: greeting }];
      conversationHistoryRef.current = initialHistory;
      setConversationHistory(initialHistory);
      speakText(greeting);
    } catch (error) {
      console.error('Error starting call:', error);
      setIsRequestingPermission(false);
      
      let errorMessage = 'Failed to access microphone. ';
      const errorName = error instanceof DOMException ? error.name : (error instanceof Error && 'name' in error ? (error as { name?: string }).name : '');
      
      if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
        errorMessage += 'Please allow microphone access in your browser settings.';
      } else if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError') {
        errorMessage += 'No microphone found. Please connect a microphone and try again.';
      } else if (errorName === 'NotReadableError' || errorName === 'TrackStartError') {
        errorMessage += 'Microphone is being used by another application. Please close other apps and try again.';
      } else if (errorName === 'OverconstrainedError' || errorName === 'ConstraintNotSatisfiedError') {
        errorMessage += 'Microphone constraints could not be satisfied.';
      } else if (error instanceof Error && error.message) {
        errorMessage += error.message;
      } else {
        errorMessage += 'Please check your browser permissions and try again.';
      }
      
      setError(errorMessage);
    }
  };

  // End call
  const endCall = () => {
    setIsCalling(false);
    setIsListening(false);
    setIsSpeaking(false);

    // Stop speech recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore
      }
    }

    // Stop speech synthesis
    window.speechSynthesis.cancel();

    // Reset state
    setTranscript('');
    setAiResponse('');
    conversationHistoryRef.current = [];
    setConversationHistory([]);
  };

  // Toggle mute
  const toggleMute = () => {
    setIsMuted(!isMuted);
    
    if (!isMuted) {
      // Muting - stop recognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore
        }
      }
    } else {
      // Unmuting - restart recognition
      if (isCalling && recognitionRef.current) {
        setTimeout(() => {
          try {
            recognitionRef.current.start();
          } catch (e) {
            console.warn('Recognition restart after unmute failed:', e);
          }
        }, 500);
      }
    }
  };

  // Toggle speaker
  const toggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
    if (!isSpeakerOn) {
      // If turning speaker off, stop current speech
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-2xl mx-4 bg-gradient-to-br from-[#0a0a0a] to-[#050505] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <GraduationCap className="text-white" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Voice Call with Nevra Tutor</h3>
              <p className="text-xs text-gray-400">
                {isCalling 
                  ? (isListening ? 'Listening...' : isSpeaking ? 'Speaking...' : 'Connected')
                  : 'Ready to start'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Call Status */}
        <div className="p-6 space-y-4">
          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
                <div className="flex-1">
                  <h4 className="text-red-400 font-semibold mb-2">Microphone Access Error</h4>
                  <p className="text-sm text-red-300/80 mb-3">{error}</p>
                  <div className="text-xs text-red-300/60 space-y-1">
                    <p className="font-medium mb-2">How to fix:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>Click the lock icon (🔒) in your browser's address bar</li>
                      <li>Find "Microphone" in the permissions list</li>
                      <li>Change it to "Allow"</li>
                      <li>Refresh the page and try again</li>
                    </ol>
                    <p className="mt-3 text-red-400/80">
                      <strong>Alternative:</strong> Go to browser Settings → Privacy → Site Settings → Microphone, and allow this site.
                    </p>
                  </div>
                  <button
                    onClick={() => setError(null)}
                    className="mt-3 text-xs text-red-400 hover:text-red-300 underline"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Transcript Display */}
          <div className="bg-white/5 rounded-xl p-4 border border-white/10 min-h-[200px] max-h-[300px] overflow-y-auto">
            <div className="space-y-3">
              {conversationHistory.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-8">
                  {isCalling 
                    ? 'Start speaking... I\'m listening!' 
                    : 'Click the call button to start a voice conversation'}
                </p>
              )}
              
              {conversationHistory.map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg ${
                    msg.role === 'user'
                      ? 'bg-purple-500/10 border border-purple-500/20 text-right'
                      : 'bg-blue-500/10 border border-blue-500/20'
                  }`}
                >
                  <p className="text-sm text-white">{msg.content}</p>
                </div>
              ))}

              {/* Current transcript (interim) */}
              {transcript && transcript.trim() && (
                <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-right">
                  <p className="text-sm text-gray-400 italic">{transcript}</p>
                </div>
              )}
            </div>
          </div>

          {/* Status Indicators */}
          <div className="flex items-center justify-center gap-4">
            {isListening && (
              <div className="flex items-center gap-2 text-green-400">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                <span className="text-xs font-medium">Listening</span>
              </div>
            )}
            {isSpeaking && (
              <div className="flex items-center gap-2 text-blue-400">
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
                <span className="text-xs font-medium">AI Speaking</span>
              </div>
            )}
            {isMuted && (
              <div className="flex items-center gap-2 text-amber-400">
                <MicOff size={14} />
                <span className="text-xs font-medium">Muted</span>
              </div>
            )}
          </div>
        </div>

        {/* Call Controls */}
        <div className="p-6 border-t border-white/10 bg-gradient-to-t from-[#0a0a0a] to-transparent">
          <div className="flex items-center justify-center gap-4">
            {/* Mute/Unmute */}
            <button
              onClick={toggleMute}
              disabled={!isCalling}
              className={`p-4 rounded-full transition-all ${
                isMuted
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
            </button>

            {/* Call/End Call */}
            {!isCalling ? (
              <button
                onClick={startCall}
                disabled={isRequestingPermission}
                className="p-5 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-400 hover:to-emerald-400 transition-all shadow-lg shadow-green-500/30 hover:shadow-green-500/50 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                title="Start Call"
              >
                {isRequestingPermission ? (
                  <Loader2 size={28} className="animate-spin" />
                ) : (
                  <Phone size={28} />
                )}
              </button>
            ) : (
              <button
                onClick={endCall}
                className="p-5 rounded-full bg-gradient-to-r from-red-500 to-rose-500 text-white hover:from-red-400 hover:to-rose-400 transition-all shadow-lg shadow-red-500/30 hover:shadow-red-500/50 hover:scale-105"
                title="End Call"
              >
                <PhoneOff size={28} />
              </button>
            )}

            {/* Speaker Toggle */}
            <button
              onClick={toggleSpeaker}
              disabled={!isCalling}
              className={`p-4 rounded-full transition-all ${
                isSpeakerOn
                  ? 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
                  : 'bg-white/5 text-gray-500 border border-white/10'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              title={isSpeakerOn ? 'Turn off speaker' : 'Turn on speaker'}
            >
              {isSpeakerOn ? <Volume2 size={24} /> : <VolumeX size={24} />}
            </button>
          </div>

          {/* Instructions */}
          <p className="text-xs text-gray-500 text-center mt-4">
            {isCalling
              ? 'Speak naturally. I\'ll listen and respond with voice.'
              : 'Click the green button to start a voice conversation with AI'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default VoiceCall;
