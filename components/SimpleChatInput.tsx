import React, { useState, useRef, useEffect } from 'react';

import { SendIcon, FileIcon, CameraIcon, CloseIcon, MicrophoneIcon, BrushIcon, SparklesIcon } from '../constants';
import { LoadingSpinner } from './LoadingSpinner';
import type { FileAttachment, Language } from '../types';
import { CameraModal } from './CameraModal';
import { DrawingModal } from './DrawingModal';
import { ErrorModal } from './ErrorModal';

interface ChatInputProps {
  onSendMessage: (message: string, attachment: FileAttachment | null) => void;
  onGenerateImage: (prompt: string) => void;
  isLoading: boolean;
  placeholder: string;
  language: Language;
  enableImageGeneration: boolean;
}

const fileToB64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
    });
};

const fileToText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsText(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

const pdfToText = async (file: File): Promise<string> => {
    // @ts-ignore
    const pdfjsLib = await import('pdfjs-dist/build/pdf.mjs');
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.4.170/build/pdf.worker.min.mjs`;
    
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    let textContent = '';
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const text = await page.getTextContent();
        textContent += text.items.map((item: any) => 'str' in item ? item.str : '').join(' ') + '\n';
    }
    return textContent;
};

export const SimpleChatInput: React.FC<ChatInputProps> = ({ 
  onSendMessage, 
  onGenerateImage, 
  isLoading, 
  placeholder, 
  language, 
  enableImageGeneration 
}) => {
  const [input, setInput] = useState('');
  const [attachment, setAttachment] = useState<FileAttachment | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isDrawingOpen, setIsDrawingOpen] = useState(false);
  const [errorModal, setErrorModal] = useState<{ isOpen: boolean; title: string; message: string; suggestion?: string }>({
    isOpen: false,
    title: '',
    message: '',
  });
  
  // Speech recognition state
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [hasNetworkError, setHasNetworkError] = useState(false);
  const recognitionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Initialize Web Speech API (offline only)
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = language || 'en-US';
        
        let baseText = '';
        let finalTranscript = '';
        let networkErrorCount = 0;
        const MAX_NETWORK_ERRORS = 2; // Allow 2 network errors before disabling
        
        recognition.onstart = () => {
          baseText = textareaRef.current?.value || '';
          finalTranscript = '';
          console.log('🎤 Voice input started');
        };
        
        recognition.onresult = (event: any) => {
          let interimTranscript = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' ';
            } else {
              interimTranscript += transcript;
            }
          }
          
          const fullText = finalTranscript + interimTranscript;
          setInput(baseText ? baseText + ' ' + fullText : fullText);
        };
        
        recognition.onerror = (event: any) => {
          console.log('Speech error:', event.error);
          
          // Handle common errors silently
          if (event.error === 'no-speech') {
            // Just continue, no error - user paused speaking
            return;
          }
          
          if (event.error === 'aborted') {
            // User stopped, normal behavior
            return;
          }
          
          if (event.error === 'network') {
            networkErrorCount++;
            console.log(`Network error ${networkErrorCount}/${MAX_NETWORK_ERRORS}`);
            
            if (networkErrorCount >= MAX_NETWORK_ERRORS) {
              // After multiple network errors, disable and show message
              console.log('Multiple network errors detected, disabling speech recognition');
              setIsRecording(false);
              setSpeechSupported(false);
              setHasNetworkError(true);
              setErrorModal({
                isOpen: true,
                title: 'Voice Input Unavailable',
                message: 'Voice recognition service is currently unavailable due to network connectivity issues.',
                suggestion: 'Please check your internet connection, try refreshing the page, or type your message manually. You can also try using a VPN if the service is blocked in your region.'
              });
            } else {
              // First network error - just stop this session, allow retry
              setIsRecording(false);
            }
            return;
          }
          
          if (event.error === 'not-allowed' || event.error === 'permission-denied') {
            // Permission denied
            setIsRecording(false);
            setErrorModal({
              isOpen: true,
              title: 'Microphone Permission Required',
              message: 'Please allow microphone access to use voice input.',
              suggestion: 'Click "Allow" when your browser asks for permission, then try again. You may need to refresh the page after granting permission.'
            });
            return;
          }
          
          if (event.error === 'service-not-allowed') {
            // Service blocked
            setIsRecording(false);
            setSpeechSupported(false);
            setErrorModal({
              isOpen: true,
              title: 'Voice Service Blocked',
              message: 'Voice recognition service is blocked or unavailable in your region.',
              suggestion: 'Try using a VPN, refresh the page, or type your message manually.'
            });
            return;
          }
          
          // For any other error, stop recording and log it
          console.log(`Unhandled speech error: ${event.error}`);
          setIsRecording(false);
        };
        
        recognition.onend = () => {
          console.log('Speech recognition ended');
          setIsRecording(false);
          
          // Don't auto-restart if speech is not supported anymore (due to errors)
          if (!speechSupported) {
            return;
          }
        };
        
        recognitionRef.current = recognition;
        setSpeechSupported(true);
        console.log('✅ Voice input ready');
      } catch (error) {
        console.log('Voice input not available:', error);
        setSpeechSupported(false);
      }
    } else {
      console.log('Web Speech API not supported in this browser');
      setSpeechSupported(false);
    }
    
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, [language]);

  const resetVoiceInput = () => {
    setHasNetworkError(false);
    setSpeechSupported(true);
    setErrorModal({ isOpen: false, title: '', message: '' });
    
    // Reinitialize speech recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition && recognitionRef.current) {
      console.log('🔄 Resetting voice input...');
    }
  };

  const handleMicClick = () => {
    if (!speechSupported || !recognitionRef.current || hasNetworkError) {
      const message = hasNetworkError 
        ? 'Voice recognition service is currently unavailable due to network issues.'
        : 'Voice input is not supported in this browser or is currently unavailable.';
      
      const suggestion = hasNetworkError
        ? 'Please check your internet connection, try refreshing the page, or type your message manually. You can also try using a VPN if the service is blocked.'
        : 'Please use Chrome or Edge for voice input, check your internet connection, or type your message manually.';
        
      setErrorModal({
        isOpen: true,
        title: 'Voice Input Not Available',
        message,
        suggestion
      });
      return;
    }
    
    if (isRecording) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.log('Error stopping recognition:', e);
      }
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (e: any) {
        console.log('Error starting recognition:', e);
        
        if (e.message && e.message.includes('already started')) {
          // Already running, just set state
          setIsRecording(true);
        } else {
          // Other error - show user-friendly message
          setErrorModal({
            isOpen: true,
            title: 'Voice Input Error',
            message: 'Could not start voice recognition.',
            suggestion: 'Please check your microphone permissions and internet connection, or type your message manually.'
          });
        }
      }
    }
  };

  const handleSend = () => {
    const trimmedInput = input.trim();
    if (!trimmedInput && !attachment) return;

    if (trimmedInput.toLowerCase().startsWith('/image ')) {
        const prompt = trimmedInput.slice(7).trim();
        if (prompt) {
            onGenerateImage(prompt);
            setInput('');
            return;
        }
    } else if (trimmedInput.toLowerCase() === '/image') {
        handleGenerateVisualAid();
        return;
    }

    if (trimmedInput || attachment) {
      onSendMessage(trimmedInput, attachment);
      setInput('');
      setAttachment(null);
    }
  };

  const handleGenerateVisualAid = () => {
    if (input.trim() && !isLoading) {
        onGenerateImage(input.trim());
        setInput('');
    } else if (!isLoading) {
        setErrorModal({
            isOpen: true,
            title: 'No Description',
            message: "Please type what you'd like to see in the box first!",
            suggestion: "Example: 'A diagram of a flower' or 'A cute robot learning'."
        });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_SIZE_MB = 20;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setErrorModal({
            isOpen: true,
            title: 'File Too Large',
            message: `The file "${file.name}" is too large (${(file.size / 1024 / 1024).toFixed(1)} MB).`,
            suggestion: `Please use a file smaller than ${MAX_SIZE_MB} MB.`
        });
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
    }

    setIsProcessingFile(true);
    try {
        if (file.type.startsWith('image/')) {
            const content = await fileToB64(file);
            setAttachment({ name: file.name, type: 'image', content, mimeType: file.type });
        } else if (file.type === 'application/pdf') {
            const content = await pdfToText(file);
            setAttachment({ name: file.name, type: 'text', content });
        } else if (file.type === 'text/plain') {
            const content = await fileToText(file);
            setAttachment({ name: file.name, type: 'text', content });
        } else {
            setErrorModal({
                isOpen: true,
                title: 'Unsupported File',
                message: `The file "${file.name}" has a type (${file.type || 'unknown'}) that we don't support yet.`,
                suggestion: 'Please try uploading an image (PNG, JPG), a PDF, or a plain text file.'
            });
        }
    } catch (error: any) {
        console.error("Error processing file:", error);
        setErrorModal({
            isOpen: true,
            title: 'Upload Failed',
            message: "We couldn't read your file correctly.",
            suggestion: "Try refreshing the page or using a different file."
        });
    } finally {
        setIsProcessingFile(false);
        if(fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleCapture = (imageData: { data: string; mimeType: string }) => {
      setAttachment({
          name: `capture-${new Date().toISOString()}.jpg`,
          type: 'image',
          content: imageData.data,
          mimeType: imageData.mimeType,
      });
      setIsCameraOpen(false);

      if (!input.trim()) {
          setInput("Can you explain what's in this photo?");
          setTimeout(() => textareaRef.current?.focus(), 100);
      }
  };

  const handleDrawingSubmit = (imageData: { data: string; mimeType: string }, mode: 'alphabet' | 'object' | 'word' | 'number') => {
      setAttachment({
          name: `drawing-${mode}-${new Date().toISOString()}.jpg`,
          type: 'image',
          content: imageData.data,
          mimeType: imageData.mimeType,
      });
      
      if (!input.trim()) {
          let suggestion = "";
          if (mode === 'alphabet') {
              suggestion = "Did I write this letter correctly?";
          } else if (mode === 'number') {
              suggestion = "Is this number written correctly?";
          } else if (mode === 'word') {
              suggestion = "Did I spell this word right?";
          } else {
              suggestion = "Can you guess what I drew? Did I miss anything?";
          }
          setInput(suggestion);
          setTimeout(() => textareaRef.current?.focus(), 100);
      }
  };

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      textarea.style.height = `${scrollHeight}px`;
    }
  }, [input, attachment]);

  return (
    <>
    <div className="w-full bg-gradient-to-t from-[var(--bg-primary)] via-[var(--bg-primary)] to-transparent pt-4 pb-4 flex-shrink-0"> 
      <div className="w-full max-w-3xl mx-auto px-4 chat-input-container">
        {isRecording && (
          <div className="flex items-center justify-center gap-2 text-sm text-red-500 mb-2 animate-fade-in-fast">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="font-semibold">🎤 Listening... Click mic to stop</span>
          </div>
        )}
        {isProcessingFile && (
             <div className="flex items-center justify-center gap-2 text-sm text-[var(--text-secondary)] mb-2">
                <LoadingSpinner />
                <span>Processing file...</span>
            </div>
        )}
        {attachment && !isProcessingFile && (
            <div className="relative bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-2 mb-2 flex items-center gap-3 animate-fade-in-fast shadow-sm">
                {attachment.type === 'image' ? (
                    <div className="w-12 h-12 rounded-lg overflow-hidden border border-[var(--border-color)] bg-black/5 flex-shrink-0">
                        <img 
                            src={attachment.content} 
                            alt="Preview" 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                        />
                    </div>
                ) : (
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${attachment.name.toLowerCase().endsWith('.pdf') ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                        <span className="text-[10px] font-black">{attachment.name.toLowerCase().endsWith('.pdf') ? 'PDF' : 'TXT'}</span>
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[var(--text-primary)] truncate">{attachment.name}</p>
                    <p className="text-[10px] text-[var(--text-secondary)] uppercase font-medium tracking-wider">
                        {attachment.type === 'image' ? 'Image Ready' : 'Document Loaded'}
                    </p>
                </div>
                <button onClick={() => setAttachment(null)} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-secondary)] transition-colors" aria-label="Remove attachment">
                    <CloseIcon className="h-4 w-4" />
                </button>
            </div>
        )}
        <div className="relative flex flex-col sm:flex-row items-stretch sm:items-end bg-[var(--bg-input)] p-1 rounded-2xl shadow-lg border border-[var(--border-color)]">
          <div className="flex items-center flex-wrap sm:flex-nowrap">
            <input 
              id="simple-file-upload"
              name="file-upload"
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              accept="image/png, image/jpeg, application/pdf, text/plain"
              aria-label="Upload file"
            />
            <button onClick={() => fileInputRef.current?.click()} disabled={isLoading || isProcessingFile} className="p-2 sm:p-2.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50" title="Upload File">
              <FileIcon />
            </button>
            <button onClick={() => setIsCameraOpen(true)} disabled={isLoading || isProcessingFile} className="p-2 sm:p-2.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50" title="Take Photo">
              <CameraIcon />
            </button>
            <button onClick={() => setIsDrawingOpen(true)} disabled={isLoading || isProcessingFile} className="p-2 sm:p-2.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50" title="Draw">
              <BrushIcon />
            </button>
            <button onClick={handleGenerateVisualAid} disabled={isLoading || isProcessingFile} className="p-2 sm:p-2.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50" title="Generate Visual Aid">
              <SparklesIcon />
            </button>
            <button
              onClick={handleMicClick}
              disabled={isLoading || isProcessingFile}
              className={`p-2 sm:p-2.5 disabled:opacity-50 transition-colors relative ${
                isRecording
                  ? 'text-red-500 animate-pulse-mic'
                  : hasNetworkError
                    ? 'text-orange-500 hover:text-orange-600'
                  : (speechSupported && !hasNetworkError)
                    ? 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    : 'text-gray-300 dark:text-gray-600'
              }`}
              aria-label={isRecording ? 'Stop recording' : 'Start recording'}
              title={isRecording ? 'Click to stop recording' : 
                     hasNetworkError ? '⚠️ Voice input unavailable - Click to retry' :
                     speechSupported ? '🎤 Voice input (Offline)' : 
                     'Voice input not supported'}
            >
              <MicrophoneIcon />
              {hasNetworkError && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">!</span>
                </div>
              )}
            </button>
          </div>
          <div className="relative flex-grow flex items-end">
            <textarea
              id="simple-chat-input"
              name="chat-message"
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="flex-grow bg-transparent pl-2 pr-12 py-2.5 text-base text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] resize-none border-none outline-none max-h-52 overflow-y-auto"
              rows={1}
              disabled={isLoading || isProcessingFile}
              aria-label="Chat message input"
            />
              {enableImageGeneration && (
                <div className="absolute left-2 -top-8 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-md px-2 py-1 text-[10px] text-[var(--text-secondary)] shadow-sm animate-fade-in-fast whitespace-nowrap">
                  Tip: You can now just say "Draw a cat" or "Show me a diagram of a cell"!
                </div>
              )}
            <button
              onClick={handleSend}
              disabled={isLoading || isProcessingFile || (!input.trim() && !attachment)}
              className="absolute right-2 bottom-2 p-2 rounded-lg transition-colors duration-200 text-white bg-[var(--accent-color)] disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed hover:bg-[var(--accent-color-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]"
              aria-label="Send message"
            >
              {isLoading || isProcessingFile ? (
                <div className="w-5 h-5">
                  <LoadingSpinner />
                </div>
              ) : (
                <SendIcon />
              )}
            </button>
          </div>
        </div>
        <p className="text-center text-xs text-[var(--text-secondary)] pt-2">
          Dyslearn AI can make mistakes. Consider checking important information.
        </p>
      </div>
    </div>
    <CameraModal isOpen={isCameraOpen} onClose={() => setIsCameraOpen(false)} onCapture={handleCapture} />
    <DrawingModal isOpen={isDrawingOpen} onClose={() => setIsDrawingOpen(false)} onSend={handleDrawingSubmit} />
    <ErrorModal 
        isOpen={errorModal.isOpen} 
        onClose={() => setErrorModal(prev => ({ ...prev, isOpen: false }))}
        title={errorModal.title}
        message={errorModal.message}
        suggestion={errorModal.suggestion}
        onRetry={hasNetworkError ? resetVoiceInput : undefined}
        retryText={hasNetworkError ? 'Reset Voice Input' : undefined}
    />
    </>
  );
};