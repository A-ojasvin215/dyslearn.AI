
import React, { useState, useRef, useEffect } from 'react';

import { SendIcon, FileIcon, CameraIcon, CloseIcon, MicrophoneIcon, BrushIcon, SparklesIcon } from '../constants';
import { LoadingSpinner } from './LoadingSpinner';
import type { FileAttachment, Language } from '../types';
import { CameraModal } from './CameraModal';
import { DrawingModal } from './DrawingModal';
import { ErrorModal } from './ErrorModal';
import { transcribeAudio } from '../services/geminiService';




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
        // Fix: Extract 'str' property instead of 'text'
        textContent += text.items.map((item: any) => 'str' in item ? item.str : '').join(' ') + '\n';
    }
    return textContent;
};


export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, onGenerateImage, isLoading, placeholder, language, enableImageGeneration }) => {
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
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [useOfflineSTT, setUseOfflineSTT] = useState(true); // Try offline STT first, fallback to Gemini
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Setup Web Speech API for offline transcription with enhanced error handling
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        
        // Optimize for best performance
        recognition.continuous = true;           // Keep listening
        recognition.interimResults = true;       // Show results in real-time
        recognition.maxAlternatives = 1;         // Fastest processing
        recognition.lang = language;             // User's language
        
        let baseText = '';
        let finalTranscript = '';
        let isManualStop = false;
        
        recognition.onstart = () => {
          baseText = textareaRef.current?.value || '';
          finalTranscript = '';
          isManualStop = false;
          console.log('✅ Offline speech recognition started');
        };
        
        recognition.onresult = (event: any) => {
          let interimTranscript = '';
          
          // Process all results
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' ';
            } else {
              interimTranscript += transcript;
            }
          }
          
          // Update input with final + interim results
          const fullText = finalTranscript + interimTranscript;
          setInput(baseText ? baseText + ' ' + fullText : fullText);
        };
        
        recognition.onerror = (event: any) => {
          console.log('Speech recognition event:', event.error);
          
          // Handle errors silently without showing to user
          if (event.error === 'no-speech') {
            // User paused, just continue listening
            console.log('No speech detected, continuing...');
            return;
          }
          
          if (event.error === 'audio-capture') {
            // Microphone issue, switch to Gemini silently
            console.log('Audio capture issue, switching to Gemini mode');
            setUseOfflineSTT(false);
            setIsRecording(false);
            return;
          }
          
          if (event.error === 'not-allowed' || event.error === 'permission-denied') {
            // Permission denied, switch to Gemini silently
            console.log('Permission denied, switching to Gemini mode');
            setUseOfflineSTT(false);
            setIsRecording(false);
            return;
          }
          
          if (event.error === 'network') {
            // Network issue with speech service, switch to Gemini silently
            console.log('Network issue, switching to Gemini mode');
            setUseOfflineSTT(false);
            setIsRecording(false);
            return;
          }
          
          if (event.error === 'aborted') {
            // User stopped, this is normal
            console.log('Recognition aborted by user');
            return;
          }
          
          if (event.error === 'service-not-allowed') {
            // Service blocked, switch to Gemini silently
            console.log('Service not allowed, switching to Gemini mode');
            setUseOfflineSTT(false);
            setIsRecording(false);
            return;
          }
          
          // Any other error: switch to Gemini silently
          console.log(`Unhandled error (${event.error}), switching to Gemini mode`);
          setUseOfflineSTT(false);
          setIsRecording(false);
        };
        
        recognition.onend = () => {
          console.log('Speech recognition ended');
          
          // Only restart if not manually stopped and still in recording mode
          if (!isManualStop && isRecording) {
            try {
              // Auto-restart for continuous listening
              setTimeout(() => {
                if (isRecording && useOfflineSTT) {
                  recognition.start();
                  console.log('Auto-restarted recognition');
                }
              }, 100);
            } catch (e) {
              console.log('Could not restart recognition:', e);
              setIsRecording(false);
            }
          } else {
            setIsRecording(false);
          }
        };
        
        // Store manual stop flag
        recognition.manualStop = () => {
          isManualStop = true;
          recognition.stop();
        };
        
        recognitionRef.current = recognition;
        console.log('✅ Web Speech API initialized successfully');
      } catch (error) {
        console.log('Failed to initialize Web Speech API:', error);
        setUseOfflineSTT(false);
      }
    } else {
      console.log('Web Speech API not supported, using Gemini only');
      setUseOfflineSTT(false);
    }
    
    // Cleanup on unmount
    return () => {
        if (recognitionRef.current) {
            try {
                recognitionRef.current.manualStop ? recognitionRef.current.manualStop() : recognitionRef.current.stop();
            } catch (e) {
                console.log('Cleanup: Recognition already stopped');
            }
        }
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
        }
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
    }
  }, [language]);

  // Monitor audio levels while recording - Optimized for performance
  const monitorAudioLevel = (stream: MediaStream) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      // Optimize analyser settings for performance
      analyser.fftSize = 128;              // Smaller = faster (was 256)
      analyser.smoothingTimeConstant = 0.8; // Smooth out fluctuations
      microphone.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let lastUpdateTime = 0;
      const updateInterval = 50; // Update every 50ms (20 FPS) for smooth animation
      
      const updateLevel = (timestamp: number) => {
        if (!analyserRef.current) return;
        
        // Throttle updates for better performance
        if (timestamp - lastUpdateTime < updateInterval) {
          animationFrameRef.current = requestAnimationFrame(updateLevel);
          return;
        }
        
        lastUpdateTime = timestamp;
        analyser.getByteFrequencyData(dataArray);
        
        // Calculate RMS (Root Mean Square) for more accurate volume
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sum / dataArray.length);
        const normalizedLevel = Math.min(100, (rms / 128) * 100);
        
        setAudioLevel(normalizedLevel);
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };
      
      animationFrameRef.current = requestAnimationFrame(updateLevel);
    } catch (error) {
      console.log('Could not monitor audio level:', error);
      // Continue without audio monitoring - not critical
    }
  };

  // Start offline speech recognition (Web Speech API) - Optimized
  const startOfflineRecognition = async () => {
    if (!recognitionRef.current) {
      console.log('Web Speech API not available, using Gemini');
      setUseOfflineSTT(false);
      startRecording();
      return;
    }
    
    try {
      // Request microphone with optimized settings for speech recognition
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,        // Remove echo for clearer speech
          noiseSuppression: true,        // Filter background noise
          autoGainControl: true,         // Normalize volume
          sampleRate: 16000,             // Optimal for speech (lower = faster)
          channelCount: 1,               // Mono for speech
        } 
      });
      
      // Start audio level monitoring
      monitorAudioLevel(stream);
      
      // Start speech recognition
      try {
        recognitionRef.current.start();
        setIsRecording(true);
        console.log('✅ Started offline speech recognition');
      } catch (startError: any) {
        // Handle "already started" error silently
        if (startError.message && startError.message.includes('already started')) {
          console.log('Recognition already running, continuing...');
          setIsRecording(true);
        } else {
          throw startError;
        }
      }
      
    } catch (error: any) {
      console.log('Failed to start offline recognition:', error.name || error.message);
      
      // Switch to Gemini silently without showing error to user
      setUseOfflineSTT(false);
      
      // Try Gemini mode instead
      setTimeout(() => {
        startRecording();
      }, 100);
    }
  };

  // Stop offline speech recognition - Optimized
  const stopOfflineRecognition = () => {
    if (recognitionRef.current) {
      try {
        // Use manual stop if available to prevent auto-restart
        if (recognitionRef.current.manualStop) {
          recognitionRef.current.manualStop();
        } else {
          recognitionRef.current.stop();
        }
      } catch (e) {
        console.log('Recognition already stopped');
      }
    }
    
    setIsRecording(false);
    setAudioLevel(0);
    
    // Stop audio monitoring
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
        audioContextRef.current = null;
      } catch (e) {
        console.log('Audio context already closed');
      }
    }
  };

  const startRecording = async () => {
    try {
      // Request high-quality audio with specific constraints
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,        // Remove echo
          noiseSuppression: true,        // Remove background noise
          autoGainControl: true,         // Normalize volume
          sampleRate: 48000,             // High quality sample rate
          channelCount: 1,               // Mono audio (smaller file)
        } 
      });
      
      // Use higher bitrate for better quality
      const options = {
        mimeType: 'audio/webm;codecs=opus',  // Opus codec for better quality
        audioBitsPerSecond: 128000,           // 128 kbps for clear audio
      };
      
      // Fallback if opus not supported
      const mimeType = MediaRecorder.isTypeSupported(options.mimeType) 
        ? options.mimeType 
        : 'audio/webm';
      
      const mediaRecorder = new MediaRecorder(stream, 
        MediaRecorder.isTypeSupported(options.mimeType) ? options : { mimeType }
      );
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsTranscribing(true);
        
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          
          // Convert to base64
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64Audio = (reader.result as string).split(',')[1];
            
            try {
              // Transcribe using Gemini with enhanced prompt
              const transcription = await transcribeAudio(base64Audio, mimeType);
              
              // Add transcription to input
              const currentText = textareaRef.current?.value || '';
              setInput(currentText ? currentText + ' ' + transcription : transcription);
              
              setIsTranscribing(false);
            } catch (error: any) {
              console.error('Transcription error:', error);
              setIsTranscribing(false);
              setErrorModal({
                isOpen: true,
                title: 'Transcription Failed',
                message: 'Could not transcribe your audio recording.',
                suggestion: 'Please try again or type your message manually.'
              });
            }
          };
        } catch (error: any) {
          console.error('Audio processing error:', error);
          setIsTranscribing(false);
          setErrorModal({
            isOpen: true,
            title: 'Recording Error',
            message: 'Could not process your audio recording.',
            suggestion: 'Please try again.'
          });
        }

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      // Start recording with smaller time slices for faster processing
      mediaRecorder.start();
      setIsRecording(true);
      
      // Start monitoring audio levels
      monitorAudioLevel(stream);
    } catch (error: any) {
      console.error('Failed to start recording:', error);
      
      let errorMessage = 'Please allow microphone access to record audio.';
      let errorTitle = 'Microphone Access Required';
      
      if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorTitle = 'No Microphone Found';
        errorMessage = 'No microphone was detected on your device.';
      } else if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorTitle = 'Microphone Permission Denied';
        errorMessage = 'You need to allow microphone access to use voice input.';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorTitle = 'Microphone In Use';
        errorMessage = 'Your microphone is being used by another application.';
      }
      
      setErrorModal({
        isOpen: true,
        title: errorTitle,
        message: errorMessage,
        suggestion: 'Click "Allow" when your browser asks for microphone permission, or check your system settings.'
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setAudioLevel(0);
      
      // Stop audio monitoring
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    }
  };

  const handleMicClick = () => {
    if (isRecording) {
      // Stop recording based on current mode
      if (useOfflineSTT && recognitionRef.current) {
        stopOfflineRecognition();
      } else {
        stopRecording();
      }
    } else {
      // Start recording - try offline first, fallback to Gemini
      if (useOfflineSTT && recognitionRef.current) {
        startOfflineRecognition();
      } else {
        startRecording();
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

    // Guard against excessively large files
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
        let message = "We couldn't read your file correctly.";
        let suggestion = "Try refreshing the page or using a different file.";
        
        if (error.message?.includes('PDF')) {
            message = "There was a problem reading this PDF document.";
            suggestion = "The PDF might be password-protected or corrupted. Try converting it to a text file first.";
        }

        setErrorModal({
            isOpen: true,
            title: 'Upload Failed',
            message,
            suggestion
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
      
      // Add context to the input if it's empty
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
          <div className="flex flex-col items-center justify-center gap-2 mb-2 animate-fade-in-fast">
            <div className="flex items-center gap-2 text-sm text-red-500">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="font-semibold">
                {useOfflineSTT ? '🎤 Listening (Offline)' : '🎙️ Recording'} ... Click mic to stop
              </span>
            </div>
            {/* Audio Level Indicator */}
            <div className="w-full max-w-xs">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-100 ${
                      audioLevel > 60 ? 'bg-green-500' :
                      audioLevel > 30 ? 'bg-yellow-500' :
                      audioLevel > 10 ? 'bg-orange-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${audioLevel}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 w-8 text-right">{Math.round(audioLevel)}%</span>
              </div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 text-center mt-1">
                {audioLevel < 10 ? '🔇 Speak louder or move closer' : 
                 audioLevel < 30 ? '🔉 Good, keep speaking' : 
                 '🔊 Perfect volume!'}
              </p>
              {useOfflineSTT && (
                <p className="text-[10px] text-green-600 dark:text-green-400 text-center mt-1 font-semibold">
                  ⚡ Real-time transcription (No internet needed)
                </p>
              )}
            </div>
          </div>
        )}
        {isTranscribing && (
          <div className="flex items-center justify-center gap-2 text-sm text-blue-500 mb-2 animate-fade-in-fast">
            <LoadingSpinner />
            <span className="font-semibold">Transcribing your audio...</span>
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
                ) : attachment.type === 'audio' ? (
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 bg-purple-100 text-purple-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                    </div>
                ) : (
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${attachment.name.toLowerCase().endsWith('.pdf') ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                        <span className="text-[10px] font-black">{attachment.name.toLowerCase().endsWith('.pdf') ? 'PDF' : 'TXT'}</span>
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[var(--text-primary)] truncate">{attachment.name}</p>
                    <p className="text-[10px] text-[var(--text-secondary)] uppercase font-medium tracking-wider">
                        {attachment.type === 'image' ? 'Image Ready' : attachment.type === 'audio' ? 'Audio Recording' : 'Document Loaded'}
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
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              accept="image/png, image/jpeg, application/pdf, text/plain"
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
              disabled={isLoading || isProcessingFile || isTranscribing}
              className={`p-2 sm:p-2.5 disabled:opacity-50 transition-colors ${
                isRecording
                  ? 'text-red-500 animate-pulse-mic'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              aria-label={isRecording ? 'Stop recording' : 'Start recording'}
              title={isRecording ? 'Click to stop recording' : 
                     useOfflineSTT ? '🎤 Voice input (Offline real-time)' : 
                     '🎙️ Voice input (Gemini AI)'}
            >
              <MicrophoneIcon />
            </button>
          </div>
          <div className="relative flex-grow flex items-end">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="flex-grow bg-transparent pl-2 pr-12 py-2.5 text-base text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] resize-none border-none outline-none max-h-52 overflow-y-auto"
              rows={1}
              disabled={isLoading || isProcessingFile || isRecording}
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
    />
    </>
  );
};
