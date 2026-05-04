
import React, { useState, useRef, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ChatFeed } from './components/ChatFeed';
import { GeminiChatInput } from './components/GeminiChatInput';
const SettingsModal = React.lazy(() => import('./components/SettingsModal').then(m => ({ default: m.SettingsModal })));
import { ReadingRuler } from './components/ReadingRuler';
import { IntroPage } from './components/IntroPage';
import './styles/IntroPage.css';
import './styles/themes.css';
import type { Message, Theme, CustomInstructions, Language, FileAttachment, ChatSession, ChatMetadata, Challenge, UserData, BackgroundStyle, DyslexiaSettings, SkillStats, Achievement } from './types';
import { createChat, generateImageForText, generateChatTitle, sendStreamWithFallback, fetchRealImage, baseSystemInstruction } from './services/geminiService';
import { IMAGE_PROMPT_PREFIX, IMAGE_SUGGESTION, UI_STRINGS, DAILY_GOAL, MESSAGE_POINTS, CHALLENGES, DAILY_GAME_TARGET, DAILY_MINUTES_TARGET, ACHIEVEMENTS, GEMINI_TEXT_MODEL_FALLBACKS } from './constants';
import { findEncyclopediaEntry } from './services/encyclopediaService';
import { findEducationalAsset } from './educationalLibrary';
import type { Chat } from '@google/genai';
import { getOfflineSystemPrompt } from './data/offlineQuestions';
import type { StudiesQuizSession } from './components/StudiesView';

// --- Error Boundary ---
interface ErrorBoundaryState { hasError: boolean; error: Error | null; }
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) { console.error("App ErrorBoundary caught:", error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-white dark:bg-gray-900 p-8 text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Something went wrong</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md">{this.state.error?.message || 'An unexpected error occurred.'}</p>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
            className="px-6 py-2 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors"
          >
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
// --- End Error Boundary ---

const getExternalImageLinks = (query: string, youtubeQuery?: string) => {
  const stripPrefixes = (s: string) => {
    let result = s.trim();
    const regex = /^(a|an|the|explain|show me|show|draw|illustrate|what is|what are|tell me about|describe)\s+|^(simple|clear|colorful|detailed|educational|beautiful|brief|visual)\s+|^(illustration|drawing|picture|diagram|image|sketch|graphic|visual|aid|video|lesson|explanation)\s+|^(of|for|showing|depicting|about)\s+/i;
    let matches;
    while ((matches = result.match(regex))) {
      result = result.substring(matches[0].length).trim();
    }
    return result;
  };
  
  const cleanQuery = stripPrefixes(query);
  const finalYoutubeQuery = youtubeQuery ? stripPrefixes(youtubeQuery) : cleanQuery;
  
  const encoded = encodeURIComponent(cleanQuery);
  const ytEncoded = encodeURIComponent(finalYoutubeQuery);
  
  return `\n\n[SOURCES::Google Images::https://www.google.com/search?tbm=isch&q=${encoded}::🔍||YouTube::https://www.youtube.com/results?search_query=${ytEncoded}::📺||Britannica::https://kids.britannica.com/kids/search/dictionary?query=${encoded}::📚||Wikimedia::https://commons.wikimedia.org/w/index.php?search=${encoded}::🖼️]`;
};

const PointAnimation: React.FC<{ points: number }> = ({ points }) => {
    return (
        <div className="absolute top-4 right-32 z-50 px-3 py-1 bg-green-500 text-white font-bold rounded-full animate-fade-up-out pointer-events-none">
            +{points}
        </div>
    );
};

const AchievementPopup: React.FC<{ achievement: Achievement | null, onClose: () => void }> = ({ achievement, onClose }) => {
    if (!achievement) return null;

    useEffect(() => {
        // Trigger confetti celebration
        confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#FFD700', '#FFA500', '#FF4500', '#00FF00', '#0000FF', '#FF00FF']
        });

        // Play a subtle achievement sound if possible (optional, but let's stick to visual for now)
        
        const timer = setTimeout(onClose, 5000);
        return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [achievement?.id]);

    return (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[60] animate-slide-in-up pointer-events-auto">
            <div className="bg-white dark:bg-gray-800 text-gray-800 dark:text-white px-6 py-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-2 border-yellow-400 flex items-center gap-5 min-w-[320px] max-w-[90vw]">
                <div className={`p-4 bg-yellow-100 dark:bg-yellow-900/30 rounded-2xl ${achievement.color} shadow-inner`}>
                    <achievement.icon className="h-10 w-10" />
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="flex h-2 w-2 rounded-full bg-yellow-400 animate-ping"></span>
                        <p className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.2em]">Achievement Unlocked!</p>
                    </div>
                    <h3 className="text-xl font-black tracking-tight leading-tight">{achievement.title}</h3>
                    <p className="text-xs font-medium opacity-70 mt-1">{achievement.description}</p>
                </div>
                <button 
                    onClick={onClose}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 opacity-40" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

function AppInner() {
  const [showIntro, setShowIntro] = useState<boolean>(() => {
    const hasSeenIntro = localStorage.getItem('dyslearn-has-seen-intro');
    return !hasSeenIntro;
  });
  const [chatHistory, setChatHistory] = useState<ChatMetadata[]>([]);
  const [activeMessages, setActiveMessages] = useState<Message[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(() => localStorage.getItem('dyslearn-user-email'));
  
  // Settings State
  const [theme, setTheme] = useState<Theme>('pixel');
  const [backgroundStyle, setBackgroundStyle] = useState<BackgroundStyle>('pixelart');
  const [language, setLanguage] = useState<Language>('en');
  const [customInstructions, setCustomInstructions] = useState<CustomInstructions>({ aboutUser: '', howToRespond: '' });
  const [voiceURI, setVoiceURI] = useState<string | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [dyslexiaSettings, setDyslexiaSettings] = useState<DyslexiaSettings>({ 
    enabled: false, 
    rulerEnabled: false, 
    hoverSpeechEnabled: false,
    fontSize: 1,
    lineSpacing: 1.5,
    letterSpacing: 0,
    wordSpacing: 0,
    speechRate: 1
  });
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // Gamification & Settings State
  const [userData, setUserData] = useState<UserData>({ 
      totalPoints: 0, 
      progressHistory: [],
      skillStats: {
          vocabulary: 0,
          grammar: 0,
          spelling: 0,
          phonetics: 0,
          creativity: 0,
          logic: 0,
          math: 0,
      },
      unlockedAchievements: [],
      selectedImageProvider: 'gemini',
      selectedImageModel: 'models/gemini-2.5-flash-image',
      enableImageGeneration: true,
      enableDailyTimeLimit: false
  });
  const [pointAnimation, setPointAnimation] = useState<{ key: number, points: number } | null>(null);
  const [achievementQueue, setAchievementQueue] = useState<Achievement[]>([]);
  const [timeSpentToday, setTimeSpentToday] = useState<number>(0);
  const offlineChallengeRef = useRef<any>(null);
  const studiesQuizRef = useRef<{ questions: any[]; index: number; score: number; sessionId: string } | null>(null);

  // Extract timestamp from chat ID like "chat-1234567890"
  const extractTimestampFromId = (id: string): number => {
    const match = id?.match(/(\d{10,})/);
    return match ? parseInt(match[1]) : 0;
  };

  const formatError = (e: unknown): string => {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === 'QUOTA_EXHAUSTED' || /quota|RESOURCE_EXHAUSTED|limit.*0/i.test(msg)) {
      return '⚠️ Daily API limit reached. All keys and backup models have been tried.\n\nThe quota resets daily at **1:30 PM IST**.\n\n💡 You can still use offline challenges (Games tab) and the Studies section — they work without any API key!';
    }
    if (/timed out/i.test(msg)) {
      return '⏱️ Request timed out. Please try again.';
    }
    return `Sorry, something went wrong. Please try again.`;
  };

  // --- FETCH WITH TIMEOUT (prevents hanging when backend is offline) ---
  const fetchWithTimeout = useCallback((url: string, options: RequestInit = {}, timeoutMs = 3000): Promise<Response> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
  }, []);

  // --- CHAT SYNCHRONIZATION HELPERS ---
  const syncSessionToDatabricks = async (session: ChatMetadata) => {
    try {
      const userId = localStorage.getItem('dyslearn-device-id') || 'demo_user';
      await fetchWithTimeout('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: session.id,
          user_id: userId,
          title: session.title || 'New Conversation',
          challenge_id: session.challengeId || null,
          created_at: session.createdAt || Date.now(),
        })
      });
    } catch (e) {
      // Silently fail - backend is optional
    }
  };

  const syncMessageToDatabricks = async (sessionId: string, message: Message) => {
    try {
      await fetchWithTimeout(`/api/chats/${sessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message_id: message.id,
          user_id: localStorage.getItem('dyslearn-device-id') || 'demo_user',
          role: message.role,
          content: message.content,
          image_url: message.imageUrl || null,
          base64_data: message.base64Data || null,
          mime_type: message.mimeType || null,
          attachment_name: message.attachmentName || null,
          attachment_type: message.attachmentType || null,
          is_loading: message.isLoading || false
        })
      });
    } catch (e) {
      // Silently fail - backend is optional
    }
  };

  // Load speech synthesis voices (async on most browsers)
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        setAvailableVoices(voices);
      }
    };

    loadVoices(); // Try immediately (works in Firefox)
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    // Some browsers fire voiceschanged only once, so also try after a short delay
    const timer = setTimeout(loadVoices, 500);

    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
      clearTimeout(timer);
    };
  }, []);

  // Daily Usage Time Tracking
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const stored = localStorage.getItem('dyslearn_daily_time');
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            if (parsed.date === today) {
                setTimeSpentToday(parsed.seconds || 0);
            } else {
                localStorage.setItem('dyslearn_daily_time', JSON.stringify({ date: today, seconds: 0 }));
            }
        } catch (e) {
            console.error(e);
        }
    } else {
        localStorage.setItem('dyslearn_daily_time', JSON.stringify({ date: today, seconds: 0 }));
    }

    const interval = setInterval(() => {
        if (!document.hidden) {
            setTimeSpentToday(prev => {
                const newVal = prev + 1;
                // Sync to localStorage every 5 seconds to reduce I/O while maintaining accuracy
                if (newVal % 5 === 0) {
                    localStorage.setItem('dyslearn_daily_time', JSON.stringify({ date: today, seconds: newVal }));
                }
                return newVal;
            });
        }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Speech Synthesis State
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [isSpeechPaused, setIsSpeechPaused] = useState(false);

  const chatRef = useRef<Chat | null>(null);

  const createNewSession = (lang: Language): ChatMetadata => {
    const id = `chat-${Date.now()}`;
    const now = Date.now();
    const initialMessages: Message[] = [{
      id: 'init',
      role: 'assistant',
      content: UI_STRINGS[lang]?.welcome || UI_STRINGS.en.welcome
    }];
    
    const meta: ChatMetadata = {
      id,
      title: 'New Chat',
      createdAt: now,
    };

    // Sync to DB
    syncSessionToDatabricks(meta).then(() => {
        syncMessageToDatabricks(id, initialMessages[0]);
    });

    return meta;
  };
  
  // Generic function to update daily stats (points, games, minutes)
  const updateDailyStats = (
      updates: { points?: number; games?: number; minutes?: number; skill?: keyof SkillStats }
  ) => {
    const todayStr = new Date().toISOString().split('T')[0];
    let unlockedInThisUpdate: Achievement[] = [];

    setUserData(prev => {
        const history = [...prev.progressHistory];
        let todayEntry = history.find(entry => entry.date === todayStr);

        const pointsToAdd = updates.points || 0;
        const gamesToAdd = updates.games || 0;
        const minutesToAdd = updates.minutes || 0;

        if (todayEntry) {
            const index = history.indexOf(todayEntry);
            history[index] = { 
                ...todayEntry,
                points: todayEntry.points + pointsToAdd, 
                gamesPlayed: todayEntry.gamesPlayed + gamesToAdd,
                minutesPlayed: todayEntry.minutesPlayed + minutesToAdd 
            };
        } else {
            history.unshift({ 
                date: todayStr, 
                points: pointsToAdd, 
                gamesPlayed: gamesToAdd, 
                minutesPlayed: minutesToAdd 
            });
        }
        
        const newTotalPoints = prev.totalPoints + pointsToAdd;
        
        // Update Skill Stats
        const newSkillStats = { ...prev.skillStats };
        if (updates.skill && pointsToAdd > 0) {
            newSkillStats[updates.skill] += pointsToAdd;
        } else if (pointsToAdd > 0) {
             // Distribute generic points
             newSkillStats.vocabulary += Math.ceil(pointsToAdd / 2);
        }
        
        // Construct tentative new state for checking achievements
        const newState: UserData = {
            totalPoints: newTotalPoints,
            progressHistory: history,
            skillStats: newSkillStats,
            unlockedAchievements: prev.unlockedAchievements,
            enableImageGeneration: prev.enableImageGeneration,
            enableDailyTimeLimit: prev.enableDailyTimeLimit,
            selectedImageProvider: prev.selectedImageProvider,
            selectedImageModel: prev.selectedImageModel
        };

        // Check for new achievements
        const newlyUnlockedIds: string[] = [];
        
        ACHIEVEMENTS.forEach(achievement => {
            if (!prev.unlockedAchievements.includes(achievement.id)) {
                if (achievement.check(newState)) {
                    newlyUnlockedIds.push(achievement.id);
                    unlockedInThisUpdate.push(achievement);
                }
            }
        });

        return {
            ...newState,
            unlockedAchievements: [...prev.unlockedAchievements, ...newlyUnlockedIds]
        };
    });

    // --- SYNCHRONIZE WITH DATABRICKS BACKEND ---
    const syncProgressToDatabricks = async () => {
      try {
        const userId = localStorage.getItem('dyslearn-device-id') || 'demo_user';
        if (!localStorage.getItem('dyslearn-device-id')) {
          localStorage.setItem('dyslearn-device-id', userId);
        }
        
        await fetchWithTimeout(`/api/progress/${userId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date_str: todayStr,
            points: updates.points || 0,
            games: updates.games || 0,
            minutes: updates.minutes || 0
          })
        });
      } catch (err) {
        // Silently fail - backend is optional
      }
    };
    
    // Execute asynchronously to not block the UI
    syncProgressToDatabricks();
    if (updates.points && updates.points > 0) {
        setPointAnimation({ key: Date.now(), points: updates.points });
    }

    // Trigger popup for all unlocked achievements in this batch
    if (unlockedInThisUpdate.length > 0) {
        setAchievementQueue(prev => [...prev, ...unlockedInThisUpdate]);
    }
  };

  // Use a ref so the timer always calls the latest updateDailyStats without re-creating the interval
  const updateDailyStatsRef = useRef(updateDailyStats);
  useEffect(() => { updateDailyStatsRef.current = updateDailyStats; }); // no deps = runs after every render, intentional ref sync

  // Timer for tracking minutes played
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        updateDailyStatsRef.current({ minutes: 1 });
      }
    }, 60000); 

    return () => clearInterval(interval);
  }, []);

  // Notification Logic
  useEffect(() => {
      if (!notificationsEnabled) return;

      const checkGoals = () => {
          const todayStr = new Date().toISOString().split('T')[0];
          const stored = localStorage.getItem(`dyslearn-progress-${todayStr}`);
          
          if (!stored && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
             new Notification("DysLearn Reminder", {
                 body: "Ready to learn? You haven't started your daily exercises yet!",
                 icon: '/vite.svg'
             });
          }
      };
      
      const interval = setInterval(checkGoals, 3600000);
      return () => clearInterval(interval);
  }, [notificationsEnabled]);

  // Speech Handlers
  
  // Helper function to get the best voice for current language
  const getVoiceForLanguage = (targetLanguage: Language): SpeechSynthesisVoice | null => {
    // Use pre-loaded voices (avoids empty array on first call)
    const voices = availableVoices.length > 0 
      ? availableVoices 
      : window.speechSynthesis.getVoices();
    
    // If user manually selected a voice, use it
    if (voiceURI) {
      const selectedVoice = voices.find(v => v.voiceURI === voiceURI);
      if (selectedVoice) return selectedVoice;
    }
    
    // Language priority map — most specific first
    const langMap: Record<string, string[]> = {
      'hi': ['hi-IN', 'hi'],
      'bn': ['bn-IN', 'bn-BD', 'bn'],
      'ta': ['ta-IN', 'ta'],
      'es': ['es-ES', 'es-MX', 'es-US', 'es'],
      'fr': ['fr-FR', 'fr-CA', 'fr'],
      'de': ['de-DE', 'de-AT', 'de'],
      'it': ['it-IT', 'it'],
      'en': ['en-IN', 'en-US', 'en-GB', 'en-AU', 'en'],
    };
    
    const targetLangs = langMap[targetLanguage] || ['en-US', 'en'];
    
    for (const targetLang of targetLangs) {
      const match = voices.find(v => v.lang === targetLang) 
                 || voices.find(v => v.lang.startsWith(targetLang));
      if (match) return match;
    }
    
    return null;
  };
  
  const handleSpeak = (text: string, messageId: string) => {
    window.speechSynthesis.cancel();
    // Stop any previous audio TTS
    if ((window as any).__ttsAudioEl) {
      (window as any).__ttsAudioEl.pause();
      (window as any).__ttsAudioEl = null;
    }

    // Strip markdown so TTS reads clean text
    const cleanText = text
      .replace(/\[SOURCES::[^\]]*\]/g, '')
      .replace(/Visual Aid:\s*\[.*?\]/gi, '')
      .replace(/IMAGE_PROMPT::[^\n]*/gi, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/#{1,6}\s/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/`[^`]*`/g, '')
      .replace(/\n+/g, ' ')
      .trim();

    if (!cleanText) return;

    const langCodeMap: Record<string, string> = {
      'hi': 'hi-IN', 'bn': 'bn-IN', 'ta': 'ta-IN',
      'es': 'es-ES', 'fr': 'fr-FR', 'de': 'de-DE',
      'it': 'it-IT', 'en': 'en-US',
    };
    const langCode = langCodeMap[language] || 'en-US';

    // Helper: speak via Web Speech API
    const speakWithBrowser = (txt: string, onDone?: () => void) => {
      const utt = new SpeechSynthesisUtterance(txt);
      utt.rate = dyslexiaSettings.speechRate;
      const voice = getVoiceForLanguage(language);
      if (voice) {
        utt.voice = voice;
        utt.lang = voice.lang;
      } else {
        utt.lang = langCode;
      }
      utt.onstart = () => { setSpeakingMessageId(messageId); setIsSpeechPaused(false); };
      utt.onend = () => { if (onDone) onDone(); else { setSpeakingMessageId(null); setIsSpeechPaused(false); } };
      utt.onerror = (e) => {
        if (e.error !== 'interrupted') console.warn('TTS error:', e.error);
        setSpeakingMessageId(null);
        setIsSpeechPaused(false);
      };
      window.speechSynthesis.speak(utt);
    };

    // For Indian languages, try multiple TTS approaches
    const indianLangs = ['hi', 'bn', 'ta'];
    if (indianLangs.includes(language)) {
      const voice = getVoiceForLanguage(language);

      // If browser has a native Indian voice, use it directly
      if (voice) {
        speakWithBrowser(cleanText);
        return;
      }

      // No native voice — use MyMemory TTS API (free, no CORS issues, supports Indian languages)
      setSpeakingMessageId(messageId);
      setIsSpeechPaused(false);

      // Split text into chunks ≤500 chars at sentence boundaries
      const chunks: string[] = [];
      const sentences = cleanText.match(/[^।.!?\n]+[।.!?\n]*/g) || [cleanText];
      let current = '';
      for (const s of sentences) {
        if ((current + s).length > 450) {
          if (current.trim()) chunks.push(current.trim());
          current = s;
        } else {
          current += s;
        }
      }
      if (current.trim()) chunks.push(current.trim());

      // MyMemory TTS: https://api.mymemory.translated.net/get?q=TEXT&langpair=hi|hi
      // Actually use the direct audio endpoint
      const ttsLang = language === 'hi' ? 'hi-IN' : language === 'bn' ? 'bn-IN' : 'ta-IN';
      let stopped = false;
      let chunkIndex = 0;

      const playChunk = async () => {
        if (stopped || chunkIndex >= chunks.length) {
          if (!stopped) { setSpeakingMessageId(null); setIsSpeechPaused(false); }
          return;
        }
        const chunk = chunks[chunkIndex++];

        // Try VoiceRSS free TTS (supports hi-in, bn-in, ta-in)
        // Fallback chain: VoiceRSS → browser speechSynthesis with lang set
        try {
          // Use the browser's built-in speech synthesis with explicit lang
          // This works on Android/Chrome which has Google TTS engine installed
          const utt = new SpeechSynthesisUtterance(chunk);
          utt.lang = ttsLang;
          utt.rate = dyslexiaSettings.speechRate;
          utt.onend = () => playChunk();
          utt.onerror = () => playChunk(); // skip failed chunk, continue
          window.speechSynthesis.speak(utt);
        } catch {
          playChunk();
        }
      };

      (window as any).__ttsAudioEl = { pause: () => { stopped = true; window.speechSynthesis.cancel(); } };
      playChunk();
      return;
    }

    // All other languages — standard Web Speech API
    speakWithBrowser(cleanText);
  };

  const handleStopSpeech = () => {
      window.speechSynthesis.cancel();
      if ((window as any).__ttsAudioEl) {
        (window as any).__ttsAudioEl.pause();
        (window as any).__ttsAudioEl = null;
      }
      setSpeakingMessageId(null);
      setIsSpeechPaused(false);
  };

  const ensureApiKey = async (): Promise<boolean> => {
    if (typeof window.aistudio === 'undefined') return true;
    
    const hasKey = await window.aistudio.hasSelectedApiKey();
    if (!hasKey) {
      await window.aistudio.openSelectKey();
      return true; 
    }
    return true;
  };

  const handlePauseSpeech = () => {
      window.speechSynthesis.pause();
      setIsSpeechPaused(true);
  };

  const handleResumeSpeech = () => {
      window.speechSynthesis.resume();
      setIsSpeechPaused(false);
  };

  // Hover to Speech Logic
  useEffect(() => {
    if (!dyslexiaSettings.hoverSpeechEnabled) return;

    let lastSpokenText = '';
    let speechTimeout: NodeJS.Timeout;

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      // Find the closest element that might have a label
      const interactiveElement = target.closest('button, a, [role="button"], [aria-label], [title]');
      if (!interactiveElement) return;

      // Skip the chat input area and the message bubbles themselves (to avoid double reading if hover-speech is on)
      if (interactiveElement.closest('textarea, .chat-input-container, .prose')) return;

      const textToSpeak = interactiveElement.getAttribute('aria-label') || 
                          interactiveElement.getAttribute('title') || 
                          (interactiveElement as HTMLElement).innerText || 
                          interactiveElement.textContent;

      if (textToSpeak && textToSpeak.trim() && textToSpeak.trim() !== lastSpokenText) {
        const cleanText = textToSpeak.trim().substring(0, 100); // Limit length
        lastSpokenText = cleanText;
        
        clearTimeout(speechTimeout);
        speechTimeout = setTimeout(() => {
          // Don't interrupt if we're currently reading a long message
          if (window.speechSynthesis.speaking && speakingMessageId) return;

          const utterance = new SpeechSynthesisUtterance(cleanText);
          utterance.rate = dyslexiaSettings.speechRate;
          
          // Use the same voice selection logic
          const voice = getVoiceForLanguage(language);
          if (voice) {
            utterance.voice = voice;
            utterance.lang = voice.lang;
          } else {
            const langMap: Record<string, string> = {
              'hi': 'hi-IN', 'bn': 'bn-IN', 'ta': 'ta-IN',
              'es': 'es-ES', 'fr': 'fr-FR', 'de': 'de-DE',
              'it': 'it-IT', 'en': 'en-US'
            };
            utterance.lang = langMap[language] || 'en-US';
          }
          
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(utterance);
        }, 300); // Slightly longer delay to be more intentional
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const interactiveElement = target.closest('button, a, [role="button"], [aria-label], [title]');
        if (interactiveElement) {
            lastSpokenText = ''; 
        }
    };

    window.addEventListener('mouseover', handleMouseOver);
    window.addEventListener('mouseout', handleMouseOut);
    return () => {
      window.removeEventListener('mouseover', handleMouseOver);
      window.removeEventListener('mouseout', handleMouseOut);
      clearTimeout(speechTimeout);
    };
  }, [dyslexiaSettings.hoverSpeechEnabled, dyslexiaSettings.speechRate, voiceURI, speakingMessageId]);

  // Load settings and chat history from Databricks API
  useEffect(() => {
    const initializeData = async () => {
      try {
        let userId = localStorage.getItem('dyslearn-device-id');
        if (!userId) {
          userId = crypto.randomUUID();
          localStorage.setItem('dyslearn-device-id', userId);
        }

        const [userRes, chatsRes] = await Promise.all([
          fetchWithTimeout(`/api/user/${userId}`).then(r => r.json()),
          fetchWithTimeout(`/api/user/${userId}/chats`).then(r => r.json())
        ]);

        if (userRes.success && userRes.data) {
          const d = userRes.data;
          // Set theme with pixel as default for new users
          setTheme((d.theme as Theme) || 'pixel');
          setBackgroundStyle((d.background_style as BackgroundStyle) || 'pixelart');
          if (d.language) setLanguage(d.language as Language);
          if (d.voice_uri) setVoiceURI(d.voice_uri);
          
          setCustomInstructions({
            aboutUser: d.custom_instructions_about_user || '',
            howToRespond: d.custom_instructions_how_to_respond || ''
          });

          setDyslexiaSettings({
            enabled: !!d.dyslexia_enabled,
            rulerEnabled: !!d.dyslexia_ruler_enabled,
            hoverSpeechEnabled: !!d.dyslexia_hover_speech_enabled,
            fontSize: d.dyslexia_font_size || 1,
            lineSpacing: d.dyslexia_line_spacing || 1.5,
            letterSpacing: d.dyslexia_letter_spacing || 0,
            wordSpacing: d.dyslexia_word_spacing || 0,
            speechRate: d.dyslexia_speech_rate || 1
          });

          setNotificationsEnabled(!!d.notifications_enabled);

          const achievementsRes = await fetchWithTimeout(`/api/user/${userId}/achievements`).then(r => r.json());
          const unlockedAchievements = achievementsRes.success ? achievementsRes.data.map((a: any) => a.achievement_id) : [];

          const progressRes = await fetchWithTimeout(`/api/progress/${userId}`).then(r => r.json());
          const progressHistory = progressRes.success ? progressRes.data.map((p: any) => ({
            date: p.date_str,
            points: p.points_earned,
            gamesPlayed: p.games_played,
            minutesPlayed: p.minutes_played
          })) : [];

          setUserData({
            totalPoints: d.total_points || 0,
            progressHistory,
            skillStats: {
              vocabulary: d.skill_vocabulary || 0,
              grammar: d.skill_grammar || 0,
              spelling: d.skill_spelling || 0,
              phonetics: d.skill_phonetics || 0,
              creativity: d.skill_creativity || 0,
              logic: d.skill_logic || 0,
              math: d.skill_math || 0,
            },
            unlockedAchievements,
            enableImageGeneration: d.enable_image_generation ?? true,
            enableDailyTimeLimit: d.enable_daily_time_limit ?? false,
            selectedImageProvider: d.selected_image_provider || 'gemini',
            selectedImageModel: d.selected_image_model || 'models/gemini-2.0-flash-exp'
          });
        }

        // Process Chats
        if (chatsRes.success && chatsRes.data.length > 0) {
           const mappedChats: ChatMetadata[] = chatsRes.data.map((c: any) => ({
              id: c.session_id,
              title: c.title,
              createdAt: c.created_at || extractTimestampFromId(c.session_id),
              challengeSystemPrompt: c.challenge_system_prompt || undefined,
              challengeId: c.challenge_id || undefined
           }));
           // Sort newest first
           mappedChats.sort((a, b) => b.createdAt - a.createdAt);

           // Auto-delete chats older than 15 days
           const FIFTEEN_DAYS = 15 * 24 * 60 * 60 * 1000;
           const cutoff = Date.now() - FIFTEEN_DAYS;
           const freshChats = mappedChats.filter(c => {
             const age = c.createdAt || 0;
             if (age < cutoff) {
               localStorage.removeItem(`dyslearn-chat-messages-${c.id}`);
               return false;
             }
             return true;
           });

           // Remove ALL empty "New Chat" entries (no user messages)
           const nonEmptyChats = freshChats.filter(c => {
             if (c.title !== 'New Chat') return true;
             const saved = localStorage.getItem(`dyslearn-chat-messages-${c.id}`);
             try {
               const msgs = saved ? JSON.parse(saved) : [];
               return msgs.some((m: any) => m.role === 'user');
             } catch { return false; }
           });

           // Deduplicate challenge chats — keep only the most recent per challengeId
           const seenChallengeIds = new Set<string>();
           const deduplicatedChats = nonEmptyChats.filter(c => {
             if (!c.challengeId) return true; // regular chats always kept
             if (seenChallengeIds.has(c.challengeId)) {
               // Remove old localStorage entry for this duplicate
               localStorage.removeItem(`dyslearn-chat-messages-${c.id}`);
               return false;
             }
             seenChallengeIds.add(c.challengeId);
             return true;
           });

           // Always create a fresh New Chat on app open
           const freshSession = createNewSession(language);
           const cleanedChats = [freshSession, ...deduplicatedChats];
           setChatHistory(cleanedChats);
           setActiveChatId(freshSession.id);
           setActiveMessages([{
             id: 'init',
             role: 'assistant',
             content: UI_STRINGS[language]?.welcome || UI_STRINGS['en'].welcome
           }]);

           // Fresh session always starts with welcome — no need to load messages
        } else {
           const newSession = createNewSession('en');
           setChatHistory([newSession]);
           setActiveChatId(newSession.id);
           setActiveMessages([{
             id: 'init',
             role: 'assistant',
             content: UI_STRINGS['en'].welcome
           }]);
        }
      } catch (e) {
        // Backend not available - use local storage only
        const newSession = createNewSession('en');
        setChatHistory([newSession]);
        setActiveChatId(newSession.id);
        setActiveMessages([{
             id: 'init',
             role: 'assistant',
             content: UI_STRINGS['en'].welcome
        }]);
      }
    };
    initializeData();

    // ── MONTHLY AUTO-CLEANUP ──────────────────────────────────────────────
    // Check if the month has changed since last cleanup and delete all history
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;
    const lastCleanupMonth = localStorage.getItem('dyslearn-last-cleanup-month');

    if (lastCleanupMonth && lastCleanupMonth !== currentMonthKey) {
      // New month — clear all chat history from localStorage
      const keysToDelete: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('dyslearn-chat-messages-')) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(k => localStorage.removeItem(k));
      localStorage.removeItem('dyslearn-activechat');

      // Also clear from backend if running
      const userId = localStorage.getItem('dyslearn-device-id');
      if (userId) {
        // Fire-and-forget — delete all chats for this user via API
        fetch(`/api/user/${userId}/chats/clear`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
        }).catch(() => {}); // ignore if backend offline
      }

      console.log(`[Monthly Cleanup] Chat history cleared for new month: ${currentMonthKey}`);
    }

    // Always update the cleanup month marker
    localStorage.setItem('dyslearn-last-cleanup-month', currentMonthKey);
    // ─────────────────────────────────────────────────────────────────────
  }, []);
  
  useEffect(() => {
    if (activeChatId) {
        localStorage.setItem('dyslearn-activechat', activeChatId);
    }
    
    const syncUserSettings = async () => {
      try {
        const userId = localStorage.getItem('dyslearn-device-id');
        if (!userId) return;
        
        await fetchWithTimeout(`/api/user/${userId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
             theme,
             background_style: backgroundStyle,
             language,
             voice_uri: voiceURI,
             custom_instructions_about_user: customInstructions.aboutUser,
             custom_instructions_how_to_respond: customInstructions.howToRespond,
             notifications_enabled: notificationsEnabled,
             
             // UserData
             total_points: userData.totalPoints,
             enable_image_generation: userData.enableImageGeneration,
             enable_daily_time_limit: userData.enableDailyTimeLimit,
             selected_image_provider: userData.selectedImageProvider,
             selected_image_model: userData.selectedImageModel,
             
             // Skills
             skill_vocabulary: userData.skillStats.vocabulary,
             skill_grammar: userData.skillStats.grammar,
             skill_spelling: userData.skillStats.spelling,
             skill_phonetics: userData.skillStats.phonetics,
             skill_creativity: userData.skillStats.creativity,
             skill_logic: userData.skillStats.logic,
             skill_math: userData.skillStats.math,

             // Dyslexia settings
             dyslexia_enabled: dyslexiaSettings.enabled,
             dyslexia_ruler_enabled: dyslexiaSettings.rulerEnabled,
             dyslexia_hover_speech_enabled: dyslexiaSettings.hoverSpeechEnabled,
             dyslexia_font_size: dyslexiaSettings.fontSize,
             dyslexia_line_spacing: dyslexiaSettings.lineSpacing,
             dyslexia_letter_spacing: dyslexiaSettings.letterSpacing,
             dyslexia_word_spacing: dyslexiaSettings.wordSpacing,
             dyslexia_speech_rate: dyslexiaSettings.speechRate
          })
        });
      } catch(e) { 
        // Silently fail - backend is optional
      }
    };

    const handler = setTimeout(() => {
        syncUserSettings();
    }, 1000);
    return () => clearTimeout(handler);
  }, [userData, backgroundStyle, dyslexiaSettings, notificationsEnabled, theme, language, voiceURI, customInstructions]);

  // Persist active messages to localStorage
  useEffect(() => {
    if (activeChatId && activeMessages.length > 0) {
      localStorage.setItem(`dyslearn-chat-messages-${activeChatId}`, JSON.stringify(activeMessages));
    }
  }, [activeMessages, activeChatId]);

  // Databricks Chat Syncing Hook
  useEffect(() => {
    if (isLoading || !activeChatId) return;
    
    const activeSession = chatHistory.find(c => c.id === activeChatId);
    if (activeSession) {
      syncSessionToDatabricks(activeSession);
    }
    
    if (activeMessages.length > 0) {
      const messagesToSync = activeMessages.slice(-2);
      messagesToSync.forEach(msg => {
        syncMessageToDatabricks(activeChatId, msg);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, activeChatId]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark', 'sepia', 'ocean', 'forest', 'sunset', 'lavender', 'midnight', 'cream', 'pixel');
    root.classList.add(theme);
    
    if (dyslexiaSettings.enabled) {
        root.classList.add('dyslexia-mode');
    } else {
        root.classList.remove('dyslexia-mode');
    }
  }, [theme, dyslexiaSettings.enabled]);
  
  const activeChatMetadata = chatHistory.find(c => c.id === activeChatId);
  const activeChat = activeChatMetadata ? { ...activeChatMetadata, messages: activeMessages } : null;
  
  const loadChatMessages = async (id: string) => {
    try {
        const msgRes = await fetchWithTimeout(`/api/chats/${id}`).then(r => r.json());
        if (msgRes.success && msgRes.data && msgRes.data.length > 0) {
            const mapped = msgRes.data.map((m: any) => ({
                id: m.message_id,
                role: m.role,
                content: m.content,
                imageUrl: m.image_url || undefined,
                base64Data: m.base64_data || undefined,
                mimeType: m.mime_type || undefined,
                attachmentName: m.attachment_name || undefined,
                attachmentType: m.attachment_type || undefined,
                isLoading: m.is_loading
            }));
            
            mapped.sort((a: any, b: any) => {
                if (a.id === 'init') return -1;
                if (b.id === 'init') return 1;
                const aId = parseInt(a.id.replace(/\D/g, ''));
                const bId = parseInt(b.id.replace(/\D/g, ''));
                if (!isNaN(aId) && !isNaN(bId) && aId !== bId) return aId - bId;
                if (a.role === 'user' && b.role === 'assistant') return -1;
                if (a.role === 'assistant' && b.role === 'user') return 1;
                return 0;
            });
            setActiveMessages(mapped);
            return;
        }
    } catch (e) {
        console.error("Failed to load chat from Databricks", e);
    }
    const savedMessages = localStorage.getItem(`dyslearn-chat-messages-${id}`);
    let parsed: Message[] = [];
    try {
        parsed = savedMessages ? JSON.parse(savedMessages) : [];
    } catch (e) {
        console.error("Failed to parse cached messages:", e);
    }
    if (parsed.length > 0) {
        setActiveMessages(parsed);
    } else {
        setActiveMessages([{
            id: 'init',
            role: 'assistant',
            content: UI_STRINGS[language]?.welcome || UI_STRINGS['en'].welcome
        }]);
    }
  };

  const handleNewChat = () => {
    handleStopSpeech();
    offlineChallengeRef.current = null; // clear any active offline challenge
    studiesQuizRef.current = null;
    const newSession = createNewSession(language);
    setChatHistory(prev => [newSession, ...prev]);
    setActiveChatId(newSession.id);
    setActiveMessages([{
        id: 'init',
        role: 'assistant',
        content: UI_STRINGS[language]?.welcome || UI_STRINGS['en'].welcome
    }]);
    setIsSidebarOpen(false); 
  };

  const handleSwitchChat = async (id: string) => {
    if (id !== activeChatId) {
      handleStopSpeech();
      offlineChallengeRef.current = null; // clear offline challenge when switching chats
      studiesQuizRef.current = null;

      // If the current chat is an empty "New Chat", remove it before switching
      if (activeChatId) {
        const currentChat = chatHistory.find(c => c.id === activeChatId);
        if (currentChat && currentChat.title === 'New Chat') {
          const hasUserMessages = activeMessages.some(m => m.role === 'user');
          if (!hasUserMessages) {
            setChatHistory(prev => prev.filter(c => c.id !== activeChatId));
            localStorage.removeItem(`dyslearn-chat-messages-${activeChatId}`);
          }
        }
      }

      setActiveChatId(id);
      setActiveMessages([]);
      setIsLoading(true); 
      try {
        await loadChatMessages(id);
      } finally {
        setIsLoading(false);
      }
    }
    setIsSidebarOpen(false); 
  };

  const handleDeleteChat = async (idToDelete: string) => {
    handleStopSpeech(); 
    const indexToDelete = chatHistory.findIndex(c => c.id === idToDelete);
    if (indexToDelete === -1) return; 

    // Sync deletion to databricks optionally if endpoint exists (ignoring for now to not break anything)
    
    const newHistory = chatHistory.filter(c => c.id !== idToDelete);
    setChatHistory(newHistory);
    
    // Delete messages from localStorage
    localStorage.removeItem(`dyslearn-chat-messages-${idToDelete}`);

    if (activeChatId === idToDelete) {
      if (newHistory.length > 0) {
        const newActiveIndex = Math.min(indexToDelete, newHistory.length - 1);
        const nextId = newHistory[newActiveIndex].id;
        setActiveChatId(nextId);
        setActiveMessages([]);
        setIsLoading(true);
        try {
          await loadChatMessages(nextId);
        } finally {
          setIsLoading(false);
        }
      } else {
        const newSession = createNewSession(language);
        setChatHistory([newSession]);
        setActiveChatId(newSession.id);
        setActiveMessages([{
            id: 'init',
            role: 'assistant',
            content: UI_STRINGS[language]?.welcome || UI_STRINGS['en'].welcome
        }]);
      }
    }
  };

  // Build OpenRouter context (system prompt + history) matching what createChat produces
  const buildOpenRouterContext = (
    historyMsgs: Message[],
    systemPromptOverride?: string
  ): { systemPrompt: string; history: Array<{role: string, content: string}> } => {
    let systemPrompt = systemPromptOverride || baseSystemInstruction;
    if (!systemPromptOverride) {
      if (customInstructions?.aboutUser || customInstructions?.howToRespond) {
        systemPrompt += '\n\n--- CUSTOM INSTRUCTIONS ---\n';
        if (customInstructions.aboutUser) systemPrompt += `ABOUT THE USER:\n${customInstructions.aboutUser}\n\n`;
        if (customInstructions.howToRespond) systemPrompt += `HOW TO RESPOND:\n${customInstructions.howToRespond}\n`;
        systemPrompt += '---------------------------\n';
      }
      const langLabel = (['Hindi','Bengali','Tamil','Spanish','French','German','Italian','English'].find(
        (_, i) => ['hi','bn','ta','es','fr','de','it','en'][i] === language
      )) || 'English';
      systemPrompt += `\n--- LANGUAGE RULE ---\nIMPORTANT: You MUST write all your responses exclusively in ${langLabel} (${language}). Do not switch languages.`;
    }
    const history = historyMsgs
      .filter(m => m.id !== 'init' && m.content)
      .slice(-6)
      .map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        // Strip base64 from history to avoid oversized requests
        content: m.attachmentName && m.role === 'user' && !m.content
          ? `[Image: ${m.attachmentName}]`
          : (m.content || '...')
      }));
    return { systemPrompt, history };
  };

  const initiateChallenge = async (session: ChatMetadata) => {
    if (!session.challengeSystemPrompt) return;
    setIsLoading(true);

    const userMessageId = `challenge-begin-${session.id}`;
    const userMessage: Message = { id: userMessageId, role: 'user', content: 'Let\'s start the challenge!' };
    const assistantMessageId = `challenge-start-${session.id}`;
    const assistantPlaceholder: Message = { id: assistantMessageId, role: 'assistant', content: '', isLoading: true };

    setActiveMessages([userMessage, assistantPlaceholder]);

    try {
      chatRef.current = createChat(customInstructions, language, [userMessage], session.challengeSystemPrompt);
      const stream = await sendStreamWithFallback(
        (model) => createChat(customInstructions, language, [userMessage], session.challengeSystemPrompt, model),
        () => "BEGIN CHALLENGE",
        GEMINI_TEXT_MODEL_FALLBACKS,
        buildOpenRouterContext([userMessage], session.challengeSystemPrompt)
      );

      let fullResponse = '';
      setActiveMessages(prev => prev.map(m => m.id === assistantMessageId ? {...m, isLoading: false} : m));
      
      for await (const chunk of stream) {
        fullResponse += (chunk.text || '');
        setActiveMessages(prev => prev.map(m => m.id === assistantMessageId ? {...m, content: fullResponse} : m));
      }

      if (fullResponse.includes(IMAGE_PROMPT_PREFIX)) {
        const parts = fullResponse.split(IMAGE_PROMPT_PREFIX);
        const textPart = parts[0].trim();
        const imagePrompt = parts[1].trim();

        setActiveMessages(prev => prev.map(m => m.id === assistantMessageId ? { ...m, content: textPart, isLoading: true } : m));
        await ensureApiKey();
        try {
          const imageUrl = await generateImageForText(
              imagePrompt, 
              userData.selectedImageProvider, 
              userData.selectedImageModel
          );
          const finalContentWithTip = textPart ? `${textPart}\n\n${IMAGE_SUGGESTION}` : IMAGE_SUGGESTION;
          setActiveMessages(prev => prev.map(m => m.id === assistantMessageId ? { ...m, imageUrl, isLoading: false, content: finalContentWithTip } : m));
        } catch (imageErr) {
          console.error("Concept explanation image failure:", imageErr);
          const finalContentWithQuotaError = `${textPart}\n\n[Display: Image creation failed due to quota or access. The explanation is above!]`;
          setActiveMessages(prev => prev.map(m => m.id === assistantMessageId ? { ...m, isLoading: false, content: finalContentWithQuotaError } : m));
        }
      }

    } catch (e) {
      console.error(e);
      const displayError = `Sorry, I ran into a problem starting the challenge: ${formatError(e)}`;
      setActiveMessages(prev => prev.map(m => m.id === assistantMessageId ? { ...m, content: displayError, isLoading: false } : m));
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartChallenge = (challenge: Challenge) => {
    handleStopSpeech(); 
    const id = `chat-${Date.now()}`;
    const newSession: ChatMetadata = {
        id,
        title: challenge.title,
        createdAt: Date.now(),
        challengeSystemPrompt: challenge.systemPrompt,
        challengeId: challenge.id, 
    };
    
    localStorage.setItem(`dyslearn-chat-messages-${id}`, JSON.stringify([]));
    // Replace existing chat for this challenge (dedup) instead of adding another
    setChatHistory(prev => {
      const filtered = prev.filter(c => c.challengeId !== challenge.id);
      return [newSession, ...filtered];
    });
    setActiveChatId(newSession.id);
    setActiveMessages([]);
    setIsSidebarOpen(false);

    offlineChallengeRef.current = null;
    initiateChallenge(newSession);
  };

  const buildStudiesQuizMessage = (q: any, num: number, total: number, grade: string, subject: string): string => {
    const emoji: Record<string, string> = { English: '📖', Math: '🔢', Science: '🔬', EVS: '🌿', 'Social Studies': '🗺️', Hindi: '🇮🇳', GK: '💡' };
    const header = num === 1 ? `${emoji[subject] || '📚'} **${grade} — ${subject} Quiz** — ${total} questions\n\n` : '';
    let msg = `${header}**Question ${num}/${total}**\n\n${q.question}`;
    if (q.options && q.options.length > 0) {
      const labels = ['A', 'B', 'C', 'D'];
      msg += '\n\n' + q.options.map((opt: string, i: number) => `**${labels[i]}.** ${opt}`).join('\n');
      msg += '\n\n*Type A, B, C, or D — or type the answer directly. Say **"read"** to hear the question aloud.*';
    } else {
      msg += '\n\n*Type your answer. Say **"read"** to hear the question aloud.*';
    }
    return msg;
  };

  const handleStartStudiesQuiz = (session: StudiesQuizSession) => {
    handleStopSpeech();
    offlineChallengeRef.current = null;
    studiesQuizRef.current = null;

    const id = `chat-${Date.now()}`;
    const title = `${session.grade} — ${session.subject} Quiz`;
    const newSession: ChatMetadata = { id, title, createdAt: Date.now() };

    // Shuffle and pick up to 10 questions
    const shuffled = [...session.questions].sort(() => Math.random() - 0.5).slice(0, 10);
    studiesQuizRef.current = { questions: shuffled, index: 0, score: 0, sessionId: id };

    const q = shuffled[0];
    const openingMsg = buildStudiesQuizMessage(q, 1, shuffled.length, session.grade, session.subject);
    const openingMessage: Message = { id: `sq-open-${Date.now()}`, role: 'assistant', content: openingMsg, isLoading: false };

    localStorage.setItem(`dyslearn-chat-messages-${id}`, JSON.stringify([openingMessage]));
    setChatHistory(prev => [newSession, ...prev]);
    setActiveChatId(id);
    setActiveMessages([openingMessage]);
    setIsSidebarOpen(false);

    // Auto-read first question after a short delay
    setTimeout(() => {
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(q.question);
      utt.rate = 0.9;
      
      // Use language-aware voice
      const voice = getVoiceForLanguage(language);
      if (voice) {
        utt.voice = voice;
        utt.lang = voice.lang;
      } else {
        const langMap: Record<string, string> = {
          'hi': 'hi-IN', 'bn': 'bn-IN', 'ta': 'ta-IN',
          'es': 'es-ES', 'fr': 'fr-FR', 'de': 'de-DE',
          'it': 'it-IT', 'en': 'en-US'
        };
        utt.lang = langMap[language] || 'en-US';
      }
      
      window.speechSynthesis.speak(utt);
    }, 800);
  };

  const handleExplainConcept = async (concept: string) => {
    handleStopSpeech();
    const systemPrompt = `You are a "Concept Explainer" specialized for students with dyslexia.
Your goal is to explain the concept: "${concept}".
Follow these rules:
1. **Simple Language**: Use short sentences and common words. Avoid jargon unless you explain it simply.
2. **Visual Analogies**: Relate the concept to everyday objects or experiences.
3. **Clear Structure**: Use bullet points and bold text for key terms.
4. **Visual Aid**: Always end your explanation with a visual aid request on its own line using exactly this format: ${IMAGE_PROMPT_PREFIX}A simple, clear, and educational illustration of [concept] in a clean, school-inspired style.
   Example: ${IMAGE_PROMPT_PREFIX}A simple, clear diagram showing the parts of a flower.
5. **Encouraging Tone**: Be supportive and patient.
6. **Language**: Respond in the user's selected language (${language}).`;

    const id = `chat-${Date.now()}`;
    const newSession: ChatMetadata = {
        id,
        title: `Explaining: ${concept}`,
        createdAt: Date.now(),
        challengeSystemPrompt: systemPrompt
    };

    // Initialize empty messages
    localStorage.setItem(`dyslearn-chat-messages-${id}`, JSON.stringify([]));

    setChatHistory(prev => [newSession, ...prev]);
    setActiveChatId(newSession.id);
    setActiveMessages([]);
    setIsSidebarOpen(false);

    setIsLoading(true);
    const assistantMessageId = `explain-${Date.now()}`;
    const assistantPlaceholder: Message = { id: assistantMessageId, role: 'assistant', content: '', isLoading: true };

    setActiveMessages([assistantPlaceholder]);

    try {
      chatRef.current = createChat(customInstructions, language, [], systemPrompt);
      const stream = await sendStreamWithFallback(
        (model) => createChat(customInstructions, language, [], systemPrompt, model),
        () => `Please explain "${concept}" for me.`,
        GEMINI_TEXT_MODEL_FALLBACKS,
        buildOpenRouterContext([], systemPrompt)
      );

      let fullResponse = '';
      setActiveMessages(prev => prev.map(m => m.id === assistantMessageId ? {...m, isLoading: false} : m));
      
      for await (const chunk of stream) {
        fullResponse += (chunk.text || '');
        setActiveMessages(prev => prev.map(m => m.id === assistantMessageId ? {...m, content: fullResponse} : m));
      }

      const imagePromptRegex = new RegExp(`${IMAGE_PROMPT_PREFIX}\\s*(.*)`, 'i');
      const imageMatch = fullResponse.match(imagePromptRegex);
      
      if (imageMatch) {
        const textPart = fullResponse.split(IMAGE_PROMPT_PREFIX)[0].trim();
        const imagePrompt = imageMatch[1].split('\n')[0].replace(/[`]/g, '').trim();
        const externalLinks = getExternalImageLinks(imagePrompt, concept);

        // Priority 1: Check for high-quality local educational assets based on the pure concept first, then the AI's prompt
        const localAssetPath = findEducationalAsset(concept) || findEducationalAsset(imagePrompt);

        if (localAssetPath) {
          const suggestion = userData.enableImageGeneration ? `\n\n${IMAGE_SUGGESTION}` : '';
          const finalDisplayContent = textPart ? `${textPart}${suggestion}${externalLinks}` : `Look at this for help:${suggestion}${externalLinks}`;
          setActiveMessages(prev => prev.map(m => m.id === assistantMessageId ? { 
              ...m, 
              content: finalDisplayContent, 
              imageUrl: localAssetPath, 
              isLoading: false 
          } : m));
        } else if (userData.enableImageGeneration) {
          setActiveMessages(prev => prev.map(m => m.id === assistantMessageId ? { ...m, content: textPart, isLoading: true } : m));
          await ensureApiKey();
          try {
            const imageUrl = await generateImageForText(
                imagePrompt, 
                userData.selectedImageProvider, 
                userData.selectedImageModel
            );
            const suggestion = userData.enableImageGeneration ? `\n\n${IMAGE_SUGGESTION}` : '';
            const finalDisplayContent = textPart ? `${textPart}${suggestion}${externalLinks}` : `Here is the requested visual:${suggestion}${externalLinks}`;
            setActiveMessages(prev => prev.map(m => m.id === assistantMessageId ? { ...m, imageUrl, isLoading: false, content: finalDisplayContent } : m));
          } catch (imageErr) {
            console.error("Concept explanation image generation failure:", imageErr);
            const finalDisplayContent = textPart ? 
                `${textPart}${externalLinks}` : 
                `I couldn't create the picture, but you can see examples here: ${externalLinks}`;
            setActiveMessages(prev => prev.map(m => m.id === assistantMessageId ? { ...m, isLoading: false, content: finalDisplayContent } : m));
          }
        } else {
          // No local asset and AI disabled: just show the links
          const finalDisplayContent = textPart ? `${textPart}${externalLinks}` : `The lesson is complete! See images here: ${externalLinks}`;
          setActiveMessages(prev => prev.map(m => m.id === assistantMessageId ? { ...m, content: finalDisplayContent, isLoading: false } : m));
        }
      }

    } catch (e) {
      console.error(e);
      setActiveMessages(prev => prev.map(m => m.id === assistantMessageId ? { ...m, content: formatError(e), isLoading: false } : m));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (userInput: string, attachment: FileAttachment | null) => {
    if (!activeChat || isLoading) return;
    if (!activeChatId) return;

    // ── CONTENT SAFETY FILTER ─────────────────────────────────────────────
    const dangerousPatterns = /\b(bomb|explosive|weapon|poison|kill|murder|suicide|drug|hack|illegal|terrorist|violence|harm|hurt someone|how to make a|how to build a|how to create a)\b/i;
    if (dangerousPatterns.test(userInput) && !attachment) {
      const safetyMsg: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: "⚠️ I'm sorry, I can't help with that. I'm a learning assistant designed to help students study safely. Let's talk about something educational instead! 😊",
        isLoading: false
      };
      const userMsg: Message = { id: (Date.now() - 1).toString(), role: 'user', content: userInput };
      setActiveMessages(prev => [...prev, userMsg, safetyMsg]);
      return;
    }
    // ─────────────────────────────────────────────────────────────────────

    // --- STUDIES QUIZ MODE ---
    if (studiesQuizRef.current && studiesQuizRef.current.sessionId === activeChatId && !attachment) {
      const quiz = studiesQuizRef.current;
      const q = quiz.questions[quiz.index];
      const userMsg: Message = { id: Date.now().toString(), role: 'user', content: userInput };

      // Read question aloud
      if (/^read$/i.test(userInput.trim())) {
        const textToRead = q.question + (q.options ? '. Options: ' + q.options.join(', ') : '');
        window.speechSynthesis.cancel();
        const utt = new SpeechSynthesisUtterance(textToRead);
        utt.rate = 0.9;
        
        // Use language-aware voice
        const voice = getVoiceForLanguage(language);
        if (voice) {
          utt.voice = voice;
          utt.lang = voice.lang;
        } else {
          const langMap: Record<string, string> = {
            'hi': 'hi-IN', 'bn': 'bn-IN', 'ta': 'ta-IN',
            'es': 'es-ES', 'fr': 'fr-FR', 'de': 'de-DE',
            'it': 'it-IT', 'en': 'en-US'
          };
          utt.lang = langMap[language] || 'en-US';
        }
        
        window.speechSynthesis.speak(utt);
        const readMsg: Message = { id: (Date.now()+1).toString(), role: 'assistant', content: `🔊 Reading the question aloud for you!`, isLoading: false };
        setActiveMessages(prev => [...prev, userMsg, readMsg]);
        return;
      }

      // Check answer
      const input = userInput.trim().toLowerCase();
      let isCorrect = false;
      const labels = ['a', 'b', 'c', 'd'];

      if (q.options && q.options.length > 0) {
        const labelIdx = labels.indexOf(input);
        if (labelIdx >= 0 && labelIdx < q.options.length) {
          isCorrect = q.options[labelIdx].toLowerCase() === q.answer.toLowerCase();
        } else {
          isCorrect = input === q.answer.toLowerCase() ||
            q.options.some((opt: string) => opt.toLowerCase() === input);
        }
      } else {
        isCorrect = input === q.answer.toLowerCase();
      }

      quiz.index += 1;
      if (isCorrect) { quiz.score += 1; updateDailyStats({ points: 10 }); }

      let assistantContent = '';
      if (isCorrect) {
        assistantContent = `✅ **Correct!** The answer is **${q.answer}**. Well done! 🎉`;
      } else {
        assistantContent = `❌ **Not quite.** The correct answer is **${q.answer}**.`;
        if (q.options) {
          const correct = q.options.find((o: string) => o.toLowerCase() === q.answer.toLowerCase());
          if (correct) assistantContent += `\n\n💡 *${correct}*`;
        }
      }

      if (quiz.index >= quiz.questions.length) {
        const pct = Math.round((quiz.score / quiz.questions.length) * 100);
        const emoji = pct >= 80 ? '🏆' : pct >= 60 ? '🌟' : '💪';
        assistantContent += `\n\n---\n\n${emoji} **Quiz Complete!**\nYou scored **${quiz.score}/${quiz.questions.length}** (${pct}%)\n\n${pct >= 80 ? 'Outstanding work! You really know this topic!' : pct >= 60 ? 'Great effort! Keep practicing to improve!' : 'Good try! Review the questions and try again!'}\n\n[CHALLENGE_COMPLETE:${quiz.score * 10}]`;
        studiesQuizRef.current = null;
      } else {
        const nextQ = quiz.questions[quiz.index];
        assistantContent += '\n\n---\n\n' + buildStudiesQuizMessage(nextQ, quiz.index + 1, quiz.questions.length, '', '');
      }

      const assistantMsg: Message = { id: (Date.now()+1).toString(), role: 'assistant', content: assistantContent, isLoading: false };
      setActiveMessages(prev => [...prev, userMsg, assistantMsg]);

      // Auto-read next question
      if (studiesQuizRef.current) {
        const nextQ = quiz.questions[quiz.index];
        setTimeout(() => {
          window.speechSynthesis.cancel();
          const utt = new SpeechSynthesisUtterance(nextQ.question);
          utt.rate = 0.9;
          
          // Use language-aware voice
          const voice = getVoiceForLanguage(language);
          if (voice) {
            utt.voice = voice;
            utt.lang = voice.lang;
          } else {
            const langMap: Record<string, string> = {
              'hi': 'hi-IN', 'bn': 'bn-IN', 'ta': 'ta-IN',
              'es': 'es-ES', 'fr': 'fr-FR', 'de': 'de-DE',
              'it': 'it-IT', 'en': 'en-US'
            };
            utt.lang = langMap[language] || 'en-US';
          }
          
          window.speechSynthesis.speak(utt);
        }, 1500);
      }
      return;
    }

    setIsLoading(true);
    updateDailyStats({ points: MESSAGE_POINTS });

    // 1. Check Encyclopedia first (Static Knowledge) — skip in challenge/game chats
    const entry = !attachment && !activeChat.challengeSystemPrompt ? findEncyclopediaEntry(userInput) : null;
    if (entry) {
        const entryId = Date.now().toString();
        const assistantId = (Date.now() + 1).toString();
        
        const userMsg: Message = { id: entryId, role: 'user', content: userInput };
        const externalLinks = getExternalImageLinks(entry.title, userInput);
        const assistantMsg: Message = { 
            id: assistantId, 
            role: 'assistant', 
            content: `### 📚 ${entry.title}\n\n${entry.explanation}\n\n${entry.funFact ? `> **Did you know?** ${entry.funFact}` : ''}${externalLinks}`,
            imageUrl: entry.imagePath,
            isLoading: false 
        };

        const updatedMessages = [...activeMessages, userMsg, assistantMsg];
        setActiveMessages(updatedMessages);
        
        const updatedHistory = chatHistory.map(chat => 
            chat.id === activeChatId ? { ...chat } : chat
        );
        setChatHistory(updatedHistory);
        setIsLoading(false);
        return;
    }

    // 2. Intelligent Image Request Routing — skip in challenge/game chats
    const imageRequestPatterns = /^(draw|show me|generate|create|make|illustrate)\s+(a|an|the|some)?\s*(image|picture|drawing|illustration|diagram|photo|sketch|graphic)?\s*(of|for)?\s+/i;
    if (!attachment && !activeChat.challengeSystemPrompt && imageRequestPatterns.test(userInput.trim())) {
        const promptForImage = userInput.trim().replace(imageRequestPatterns, '').trim();
        if (promptForImage) {
            await handleGenerateImage(promptForImage);
            return;
        }
    }

    // Store base64 data in the message object so createChat can reconstruct visual history
    const newUserMessage: Message = { 
        id: Date.now().toString(),
        role: 'user',
        content: userInput,
        attachmentName: attachment?.name,
        attachmentType: attachment?.type,
        base64Data: attachment?.type === 'image' ? attachment.content : undefined,
        mimeType: attachment?.type === 'image' ? attachment.mimeType : undefined,
        imageUrl: attachment?.type === 'image' ? `data:${attachment.mimeType};base64,${attachment.content}` : undefined,
    };
    
    const assistantMessageId = (Date.now() + 1).toString();
    const assistantPlaceholder: Message = { id: assistantMessageId, role: 'assistant', content: '', isLoading: true };
    
    const historyForApi = activeMessages;
    
    setActiveMessages(prev => [...prev, newUserMessage, assistantPlaceholder]);

    const isNewChat = historyForApi.filter(m => m.role === 'user').length === 0 && !activeChat.challengeSystemPrompt;

    try {
      chatRef.current = createChat(customInstructions, language, historyForApi, activeChat.challengeSystemPrompt);
      
      let stream;
      if (attachment?.type === 'image' && attachment.mimeType) {
        const imagePart = { inlineData: { mimeType: attachment.mimeType, data: attachment.content } };
        const textPart = { text: userInput || 'Analyze this drawing/image.' };
        stream = await sendStreamWithFallback(
          (model) => createChat(customInstructions, language, historyForApi, activeChat.challengeSystemPrompt, model),
          () => [textPart, imagePart],
          GEMINI_TEXT_MODEL_FALLBACKS,
          buildOpenRouterContext(historyForApi, activeChat.challengeSystemPrompt)
        );
      } else {
        let prompt = userInput;
        if (attachment?.type === 'text') {
            prompt = `Based on the content of the attached file "${attachment.name}", please answer the following:\n\n"${userInput}"\n\n--- FILE CONTENT ---\n${attachment.content}`;
        }
        stream = await sendStreamWithFallback(
          (model) => createChat(customInstructions, language, historyForApi, activeChat.challengeSystemPrompt, model),
          () => prompt,
          GEMINI_TEXT_MODEL_FALLBACKS,
          buildOpenRouterContext(historyForApi, activeChat.challengeSystemPrompt)
        );
      }

      let fullResponse = '';
      setActiveMessages(prev => prev.map(m => m.id === assistantMessageId ? {...m, isLoading: false} : m));
      
      for await (const chunk of stream) {
        fullResponse += (chunk.text || '');
        setActiveMessages(prev => prev.map(m => m.id === assistantMessageId ? {...m, content: fullResponse} : m));
      }

      let finalContent = fullResponse;
      const rewardRegex = /\[(CORRECT_ANSWER|CHALLENGE_COMPLETE):(\d+)\]/g;
      let match;
      while ((match = rewardRegex.exec(fullResponse)) !== null) {
          const type = match[1];
          const points = parseInt(match[2], 10);
          
          let skillToUpdate: keyof SkillStats | undefined;
          if (activeChat.challengeId) {
              const challenge = CHALLENGES.find(c => c.id === activeChat.challengeId);
              if (challenge) {
                  skillToUpdate = challenge.skill;
              }
          }
          
          updateDailyStats({ points, games: type === 'CHALLENGE_COMPLETE' ? 1 : 0, skill: skillToUpdate });
          finalContent = finalContent.replace(match[0], '').trim();
      }
      
      const imageMatch = finalContent.match(/IMAGE_PROMPT::\s*(.*)/i) || 
                         finalContent.match(/Visual Aid:\s*\[([^\]]+)\]/i) ||
                         finalContent.match(/Visual Aid:\s*([^\n\[]+)/i);
      
      if (imageMatch) {
        const fullMatchText = imageMatch[0];
        const imagePrompt = imageMatch[1].split('\n')[0].replace(/[\[\]`]/g, '').trim();
        const externalLinks = getExternalImageLinks(imagePrompt, userInput);
        const textPart = finalContent.split(fullMatchText)[0].trim();

        // Proactive image handling — uses statically imported fetchRealImage
        try {
            // Priority 1: Real Photo (Wikimedia)
            const realImageUrl = await fetchRealImage(imagePrompt);
            if (realImageUrl) {
                const finalDisplayContent = textPart ? `${textPart}${externalLinks}` : `Look at this for help:${externalLinks}`;
                setActiveMessages(prev => prev.map(m => m.id === assistantMessageId ? { 
                    ...m, 
                    imageUrl: realImageUrl, 
                    content: finalDisplayContent,
                    isLoading: false 
                } : m));
            } else {
                // Priority 2: Local Curated Asset
                const localAssetPath = findEducationalAsset(userInput) || findEducationalAsset(imagePrompt);
                if (localAssetPath) {
                    const finalDisplayContent = textPart ? `${textPart}${externalLinks}` : `Look at this for help:${externalLinks}`;
                    setActiveMessages(prev => prev.map(m => m.id === assistantMessageId ? { 
                        ...m, 
                        imageUrl: localAssetPath, 
                        content: finalDisplayContent, 
                        isLoading: false 
                    } : m));
                } else if (userData.enableImageGeneration) {
                    // Priority 3: AI Generation for all Visual Aid requests
                    setActiveMessages(prev => prev.map(m => m.id === assistantMessageId ? { ...m, content: textPart, isLoading: true } : m));
                    await ensureApiKey();
                    try {
                        const imageUrl = await generateImageForText(imagePrompt, userData.selectedImageProvider, userData.selectedImageModel);
                        const suggestion = `\n\n${IMAGE_SUGGESTION}`;
                        const finalDisplayContent = textPart ? `${textPart}${suggestion}${externalLinks}` : `Here is the requested visual:${suggestion}${externalLinks}`;
                        setActiveMessages(prev => prev.map(m => m.id === assistantMessageId ? { ...m, imageUrl, isLoading: false, content: finalDisplayContent } : m));
                    } catch (imageErr) {
                        console.error("Message image generation failure:", imageErr);
                        const finalDisplayContent = textPart ? `${textPart}\n\n[Visual aid creation failed. You can see examples here: ${externalLinks}]` : `Sorry, I couldn't create that picture. You can see examples here: ${externalLinks}`;
                        setActiveMessages(prev => prev.map(m => m.id === assistantMessageId ? { ...m, isLoading: false, content: finalDisplayContent } : m));
                    }
                } else {
                    // Fallback: Helpful links only
                    const finalDisplayContent = textPart ? `${textPart}${externalLinks}` : `I couldn't find a direct image for "${imagePrompt}", but you can see examples here: ${externalLinks}`;
                    setActiveMessages(prev => prev.map(m => m.id === assistantMessageId ? { ...m, content: finalDisplayContent, isLoading: false } : m));
                }
            }
        } catch (importErr) {
            console.error("Image service import/fetch failed:", importErr);
            const finalDisplayContent = textPart ? `${textPart}${externalLinks}` : `See examples here: ${externalLinks}`;
            setActiveMessages(prev => prev.map(m => m.id === assistantMessageId ? { ...m, content: finalDisplayContent, isLoading: false } : m));
        }
      } else {
          if (finalContent !== fullResponse) {
              setActiveMessages(prev => prev.map(m => m.id === assistantMessageId ? {...m, content: finalContent} : m));
          }
      }

      if (isNewChat && finalContent) {
          try {
              const titlePrompt = `User: ${userInput}\nAssistant: ${finalContent}`;
              const newTitle = await generateChatTitle(titlePrompt);
              setChatHistory(prev => prev.map(c => c.id === activeChatId ? { ...c, title: newTitle } : c));
          } catch (titleErr) {
              console.error("Title generation failed:", titleErr);
          }
      }

    } catch (e) {
      console.error(e);
      const displayError = formatError(e);
      setActiveMessages(prev => prev.map(m => m.id === assistantMessageId ? { ...m, content: displayError, isLoading: false } : m));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateImage = async (prompt: string) => {
    if (!activeChat || isLoading) return;
    
    if (!userData.enableImageGeneration) {
        setActiveMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'assistant',
            content: 'Image generation is currently disabled. You can enable it in Settings.',
            isLoading: false
        }]);
        return;
    }

    await ensureApiKey();
    
    setIsLoading(true);
    updateDailyStats({ points: MESSAGE_POINTS, skill: 'creativity' });
    
    const newUserMessage: Message = { 
        id: Date.now().toString(),
        role: 'user',
        content: `Generate a visual aid for: ${prompt}`,
    };
    
    const assistantMessageId = (Date.now() + 1).toString();
    const assistantPlaceholder: Message = { id: assistantMessageId, role: 'assistant', content: 'Generating your visual aid...', isLoading: true };
    
    setActiveMessages(prev => [...prev, newUserMessage, assistantPlaceholder]);

    try {
      // PROJECTION 1: Check if this is a known educational topic in our local 150+ image library
      const localAssetPath = findEducationalAsset(prompt);
      
      if (localAssetPath) {
          const externalLinks = getExternalImageLinks(prompt);
          const suggestion = userData.enableImageGeneration ? `\n\n${IMAGE_SUGGESTION}` : '';
          const finalContent = `I found a high-quality visual for "${prompt}" in our library!${suggestion}${externalLinks}`;
          setActiveMessages(prev => prev.map(m => m.id === assistantMessageId ? { 
              ...m, 
              content: finalContent, 
              imageUrl: localAssetPath, 
              isLoading: false 
          } : m));
          setIsLoading(false);
          return;
      }

      // PROJECTION 2: Fallback to AI generation if not found locally
      const imageUrl = await generateImageForText(
          prompt, 
          userData.selectedImageProvider, 
          userData.selectedImageModel
      );
      
      const externalLinks = getExternalImageLinks(prompt);
      const suggestion = userData.enableImageGeneration ? `\n\n${IMAGE_SUGGESTION}` : '';
      const finalContent = `Here is the visual aid for "${prompt}":${suggestion}${externalLinks}`;
      setActiveMessages(prev => prev.map(m => m.id === assistantMessageId ? { ...m, imageUrl, isLoading: false, content: finalContent } : m));
    } catch (e) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      const externalLinks = getExternalImageLinks(prompt);
      const displayError = `Sorry, I couldn't generate that image: ${errorMessage}\n\n${externalLinks}`;
      setActiveMessages(prev => prev.map(m => m.id === assistantMessageId ? { ...m, content: displayError, isLoading: false } : m));
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRegenerate = async () => {
    if (!activeChat || isLoading) return;

    const lastUserMessage = [...activeMessages].reverse().find(m => m.role === 'user');
    const lastAiMessageIndex = activeMessages.map(m => m.role).lastIndexOf('assistant');
    
    if (!lastUserMessage || lastAiMessageIndex === -1) return;

    setIsLoading(true);

    const historyForRegeneration = activeMessages.slice(0, lastAiMessageIndex);

    const assistantMessageId = (Date.now() + 1).toString();
    const assistantPlaceholder: Message = { id: assistantMessageId, role: 'assistant', content: '', isLoading: true };

    const updatedHistoryWithPlaceholder = historyForRegeneration.concat(assistantPlaceholder);
    
    setActiveMessages(updatedHistoryWithPlaceholder);

    try {
      const historyForApi = historyForRegeneration.slice(0, -1);
      chatRef.current = createChat(customInstructions, language, historyForApi, activeChat.challengeSystemPrompt);
      
      const stream = await sendStreamWithFallback(
        (model) => createChat(customInstructions, language, historyForApi, activeChat.challengeSystemPrompt, model),
        () => lastUserMessage.content,
        GEMINI_TEXT_MODEL_FALLBACKS,
        buildOpenRouterContext(historyForApi, activeChat.challengeSystemPrompt)
      );

      let fullResponse = '';
      setActiveMessages(prev => prev.map(m => m.id === assistantMessageId ? {...m, isLoading: false} : m));
      
      for await (const chunk of stream) {
        fullResponse += (chunk.text || '');
        setActiveMessages(prev => prev.map(m => m.id === assistantMessageId ? {...m, content: fullResponse} : m));
      }

      let finalContent = fullResponse;
      const imagePromptRegex = new RegExp(`${IMAGE_PROMPT_PREFIX}\\s*(.*)`, 'i');
      const imageMatch = finalContent.match(imagePromptRegex) ||
                         finalContent.match(/Visual Aid:\s*\[([^\]]+)\]/i) ||
                         finalContent.match(/Visual Aid:\s*([^\n\[]+)/i);
      
      if (imageMatch) {
        const fullMatchText = imageMatch[0];
        const textPart = finalContent.split(fullMatchText)[0].trim();
        const imagePrompt = imageMatch[1].split('\n')[0].replace(/[\[\]`]/g, '').trim();
        const externalLinks = getExternalImageLinks(imagePrompt, lastUserMessage.content);

        // Priority 1: Check for high-quality local educational assets based on original user input first, then AI's prompt
        const localAssetPath = findEducationalAsset(lastUserMessage.content) || findEducationalAsset(imagePrompt);

        if (localAssetPath) {
          const suggestion = userData.enableImageGeneration ? `\n\n${IMAGE_SUGGESTION}` : '';
          const finalDisplayContent = textPart ? `${textPart}${suggestion}${externalLinks}` : `Look at this for help:${suggestion}${externalLinks}`;
          setActiveMessages(prev => prev.map(m => m.id === assistantMessageId ? { 
              ...m, 
              content: finalDisplayContent, 
              imageUrl: localAssetPath, 
              isLoading: false 
          } : m));
        } else if (userData.enableImageGeneration) {
          setActiveMessages(prev => prev.map(m => m.id === assistantMessageId ? { ...m, content: textPart, isLoading: true } : m));
          await ensureApiKey();
          try {
            const imageUrl = await generateImageForText(
                imagePrompt, 
                userData.selectedImageProvider, 
                userData.selectedImageModel
            );
            const suggestion = userData.enableImageGeneration ? `\n\n${IMAGE_SUGGESTION}` : '';
            const finalDisplayContent = textPart ? `${textPart}${suggestion}${externalLinks}` : `Here is the requested visual:${suggestion}${externalLinks}`;
            setActiveMessages(prev => prev.map(m => m.id === assistantMessageId ? { ...m, imageUrl, isLoading: false, content: finalDisplayContent } : m));
          } catch (imageErr) {
            console.error("Regeneration image generation failure:", imageErr);
            const finalDisplayContent = textPart ? 
                `${textPart}${externalLinks}` : 
                `I couldn't create the picture, but you can see examples here: ${externalLinks}`;
            setActiveMessages(prev => prev.map(m => m.id === assistantMessageId ? { ...m, isLoading: false, content: finalDisplayContent } : m));
          }
        } else {
          // No local asset and AI disabled: just show the links
          const finalDisplayContent = textPart ? `${textPart}${externalLinks}` : `The response is ready! See images here: ${externalLinks}`;
          setActiveMessages(prev => prev.map(m => m.id === assistantMessageId ? { ...m, content: finalDisplayContent, isLoading: false } : m));
        }
      }
    } catch (e) {
      console.error("Error during regeneration:", e);
      const displayError = formatError(e);
      setActiveMessages(prev => prev.map(m => m.id === assistantMessageId ? { ...m, content: displayError, isLoading: false } : m));
    } finally {
      setIsLoading(false);
    }
  };

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('dyslearn-theme', newTheme);
  };
  
  const handleBackgroundStyleChange = (newStyle: BackgroundStyle) => {
    setBackgroundStyle(newStyle);
  };

  const handleLanguageChange = (newLanguage: Language) => {
    setLanguage(newLanguage);
    localStorage.setItem('dyslearn-language', newLanguage);
  };

  const handleVoiceChange = (newVoiceURI: string) => {
    setVoiceURI(newVoiceURI);
    localStorage.setItem('dyslearn-voice', newVoiceURI);
  };
  
  const handleDyslexiaSettingsChange = (newSettings: DyslexiaSettings) => {
      setDyslexiaSettings(newSettings);
  };

  const handleLogin = async (email: string, pass: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass })
    });
    const data = await res.json();
    if (data.success) {
      localStorage.setItem('dyslearn-device-id', data.data.userId);
      localStorage.setItem('dyslearn-user-email', data.data.email);
      window.location.reload();
    } else {
      throw new Error(data.message || 'Login failed');
    }
  };

  const handleRegister = async (email: string, pass: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass })
    });
    const data = await res.json();
    if (data.success) {
      localStorage.setItem('dyslearn-device-id', data.data.userId);
      localStorage.setItem('dyslearn-user-email', data.data.email);
      window.location.reload();
    } else {
      throw new Error(data.message || 'Registration failed');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('dyslearn-user-email');
    localStorage.removeItem('dyslearn-device-id');
    window.location.reload();
  };

  const handleDeleteAccount = async () => {
    const userId = localStorage.getItem('dyslearn-device-id');
    if (!userId) return;
    
    const res = await fetchWithTimeout(`/api/user/${userId}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    
    if (data.success) {
      handleLogout();
    } else {
      throw new Error(data.message || 'Deletion failed');
    }
  };

  const handleSaveSettings = () => {
    localStorage.setItem('dyslearn-instructions', JSON.stringify(customInstructions));
    setIsSettingsOpen(false);
    handleNewChat(); 
  };

  const bgClass = backgroundStyle !== 'none' ? `bg-${backgroundStyle}` : '';

  const isTimeLimitReached = userData.enableDailyTimeLimit && timeSpentToday >= 2 * 60 * 60; // 7200 seconds / 2 hours

  const handleEnterApp = () => {
    setShowIntro(false);
    localStorage.setItem('dyslearn-has-seen-intro', 'true');
  };

  if (showIntro) {
    return <IntroPage onEnter={handleEnterApp} />;
  }

  if (isTimeLimitReached) {
    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--bg-primary)] p-6 animate-fade-in-fast">
            <div className="bg-white dark:bg-gray-800 p-8 sm:p-12 rounded-3xl shadow-2xl max-w-lg w-full border border-gray-200 dark:border-gray-700 relative overflow-hidden text-center">
                <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-teal-400 to-blue-500"></div>
                <div className="w-24 h-24 mx-auto mb-6 bg-teal-100 dark:bg-teal-900/40 rounded-full flex items-center justify-center animate-bounce-subtle">
                    <span className="text-5xl">⏰</span>
                </div>
                <h1 className="text-3xl font-extrabold text-gray-800 dark:text-gray-100 mb-4 tracking-tight">Time's Up for Today!</h1>
                <p className="text-gray-600 dark:text-gray-300 text-lg mb-8 leading-relaxed font-medium">
                    Great job learning today! You've reached your <span className="text-teal-600 dark:text-teal-400 font-bold">2-hour</span> daily goal limit. It's incredibly important to rest your eyes and take a break from screens. 
                </p>
                <div className="inline-block bg-gray-100 dark:bg-gray-700 rounded-full px-6 py-3">
                    <span className="text-sm text-gray-500 dark:text-gray-400 font-bold tracking-widest uppercase">
                        See you tomorrow! 🌟
                    </span>
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex overflow-hidden">
      {dyslexiaSettings.rulerEnabled && <ReadingRuler />}
      <AchievementPopup 
        achievement={achievementQueue[0] || null} 
        onClose={() => setAchievementQueue(prev => prev.slice(1))} 
      />
      
      <Sidebar 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        chatHistory={chatHistory}
        activeChatId={activeChatId}
        onNewChat={handleNewChat}
        onSwitchChat={handleSwitchChat}
        onDeleteChat={handleDeleteChat}
        onStartChallenge={handleStartChallenge}
        onExplainConcept={handleExplainConcept}
        userData={userData}
        isLoading={isLoading}
        selectedImageProvider={userData.selectedImageProvider || 'gemini'}
        onImageProviderChange={(provider) => setUserData(prev => ({ ...prev, selectedImageProvider: provider }))}
        selectedImageModel={userData.selectedImageModel || 'models/gemini-2.5-flash-image'}
        onImageModelChange={(model) => setUserData(prev => ({ ...prev, selectedImageModel: model }))}
        onGamePlayed={() => updateDailyStats({ games: 1 })}
        onStartStudiesQuiz={handleStartStudiesQuiz}
      />
      <main className={`flex-1 flex flex-col h-full relative min-w-0 ${bgClass}`}>
        {backgroundStyle === 'cosmic' && (
            <div className="absolute inset-0 pointer-events-none z-0">
                <div className="stars"></div>
                <div className="stars2"></div>
                <div className="stars3"></div>
            </div>
        )}
        {pointAnimation && <PointAnimation points={pointAnimation.points} key={pointAnimation.key} />}
        <Header 
            onSettingsClick={() => setIsSettingsOpen(true)}
            onMenuClick={() => setIsSidebarOpen(true)}
            userData={userData}
        />
        <ChatFeed 
            messages={activeChat?.messages || []} 
            voiceURI={voiceURI} 
            onRegenerate={handleRegenerate}
            isLoading={isLoading}
            speakingMessageId={speakingMessageId}
            isSpeechPaused={isSpeechPaused}
            dyslexiaSettings={dyslexiaSettings}
            onSpeak={handleSpeak}
            onPause={handlePauseSpeech}
            onResume={handleResumeSpeech}
            onStop={handleStopSpeech}
        />
        <GeminiChatInput 
          onSendMessage={handleSendMessage} 
          onGenerateImage={handleGenerateImage}
          isLoading={isLoading} 
          placeholder={UI_STRINGS[language]?.placeholder || UI_STRINGS['en'].placeholder}
          language={language}
          enableImageGeneration={userData.enableImageGeneration}
        />
      </main>
      <React.Suspense fallback={null}>
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          theme={theme}
          onThemeChange={handleThemeChange}
          backgroundStyle={backgroundStyle}
          onBackgroundStyleChange={handleBackgroundStyleChange}
          language={language}
          onLanguageChange={handleLanguageChange}
          voiceURI={voiceURI}
          onVoiceChange={handleVoiceChange}
          availableVoices={availableVoices}
          dyslexiaSettings={dyslexiaSettings}
          onDyslexiaSettingsChange={handleDyslexiaSettingsChange}
          customInstructions={customInstructions}
          onCustomInstructionsChange={setCustomInstructions}
          notificationsEnabled={notificationsEnabled}
          onNotificationsChange={setNotificationsEnabled}
          selectedImageProvider={userData.selectedImageProvider || 'gemini'}
          onImageProviderChange={(provider) => setUserData(prev => ({ ...prev, selectedImageProvider: provider }))}
          selectedImageModel={userData.selectedImageModel || 'models/gemini-2.5-flash-image'}
          onImageModelChange={(model) => setUserData(prev => ({ ...prev, selectedImageModel: model }))}
          enableImageGeneration={userData.enableImageGeneration}
          onEnableImageGenerationChange={(enabled) => setUserData(prev => ({ ...prev, enableImageGeneration: enabled }))}
          enableDailyTimeLimit={userData.enableDailyTimeLimit}
          onEnableDailyTimeLimitChange={(enabled) => setUserData(prev => ({ ...prev, enableDailyTimeLimit: enabled }))}
          onSave={handleSaveSettings}
          onNewChat={() => {
              setIsSettingsOpen(false);
              handleNewChat();
          }}
          userEmail={userEmail}
          onLogin={handleLogin}
          onRegister={handleRegister}
          onLogout={handleLogout}
          onDeleteAccount={handleDeleteAccount}
        />
      </React.Suspense>
    </div>
  );
}

// Utility to check and clean localStorage if it's too large
function checkAndCleanLocalStorage() {
  try {
    // Calculate total localStorage size
    let totalSize = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        totalSize += localStorage[key].length + key.length;
      }
    }
    
    // If localStorage is > 4MB, clear old chat history
    const MAX_SIZE = 4 * 1024 * 1024; // 4MB
    if (totalSize > MAX_SIZE) {
      console.warn(`localStorage is ${(totalSize / 1024 / 1024).toFixed(2)}MB, cleaning up...`);
      
      // Keep only essential data, clear chat history
      const essentials = ['dyslearn-device-id', 'dyslearn-theme', 'dyslearn-language'];
      const toKeep: Record<string, string> = {};
      
      essentials.forEach(key => {
        const value = localStorage.getItem(key);
        if (value) toKeep[key] = value;
      });
      
      localStorage.clear();
      
      Object.entries(toKeep).forEach(([key, value]) => {
        localStorage.setItem(key, value);
      });
      
      console.log('✅ localStorage cleaned, kept essential data');
    }
  } catch (e) {
    console.error('Error checking localStorage:', e);
  }
}

export default function App() {
  // Clean localStorage on app start if needed
  useEffect(() => {
    checkAndCleanLocalStorage();
  }, []);
  
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  );
}
