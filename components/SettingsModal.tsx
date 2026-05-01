
import React, { useState, useEffect } from 'react';
import type { Theme, CustomInstructions, Language, BackgroundStyle, DyslexiaSettings, ImageProvider } from '../types';
import { LANGUAGES, GoogleIcon, AppleIcon, FacebookIcon, MicrosoftIcon, IMAGE_PROVIDERS, GEMINI_IMAGE_MODELS } from '../constants';
import { getUsageStats, getUsagePercentage, getRemainingCalls, isInWarningZone } from '../services/apiUsageTracker';

// The parent component will need to provide handlers for these props.
interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  backgroundStyle: BackgroundStyle;
  onBackgroundStyleChange: (style: BackgroundStyle) => void;
  language: Language;
  onLanguageChange: (language: Language) => void;
  voiceURI: string | null;
  onVoiceChange: (uri: string) => void;
  availableVoices: SpeechSynthesisVoice[];
  dyslexiaSettings: DyslexiaSettings;
  onDyslexiaSettingsChange: (settings: DyslexiaSettings) => void;
  customInstructions: CustomInstructions;
  onCustomInstructionsChange: (instructions: CustomInstructions) => void;
  notificationsEnabled: boolean;
  onNotificationsChange: (enabled: boolean) => void;
  selectedImageProvider: ImageProvider;
  onImageProviderChange: (provider: ImageProvider) => void;
  selectedImageModel: string;
  onImageModelChange: (model: string) => void;
  enableImageGeneration: boolean;
  onEnableImageGenerationChange: (enabled: boolean) => void;
  enableDailyTimeLimit: boolean;
  onEnableDailyTimeLimitChange: (enabled: boolean) => void;
  onSave: () => void;
  onNewChat: () => void;
  userEmail: string | null;
  onLogin: (email: string, pass: string) => Promise<void>;
  onRegister: (email: string, pass: string) => Promise<void>;
  onLogout: () => void;
  onDeleteAccount: () => Promise<void>;
}

const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  theme,
  onThemeChange,
  backgroundStyle,
  onBackgroundStyleChange,
  language,
  onLanguageChange,
  voiceURI,
  onVoiceChange,
  availableVoices,
  dyslexiaSettings,
  onDyslexiaSettingsChange,
  customInstructions,
  onCustomInstructionsChange,
  notificationsEnabled,
  onNotificationsChange,
  selectedImageProvider,
  onImageProviderChange,
  selectedImageModel,
  onImageModelChange,
  enableImageGeneration,
  onEnableImageGenerationChange,
  enableDailyTimeLimit,
  onEnableDailyTimeLimitChange,
  onSave,
  onNewChat,
  userEmail,
  onLogin,
  onRegister,
  onLogout,
  onDeleteAccount
}) => {
  // Auth State
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // API Usage State
  const [apiUsage, setApiUsage] = useState(getUsageStats());
  const [usagePercent, setUsagePercent] = useState(getUsagePercentage());
  const [remainingCalls, setRemainingCalls] = useState(getRemainingCalls());

  // Update API usage stats when modal opens
  useEffect(() => {
    if (isOpen) {
      setApiUsage(getUsageStats());
      setUsagePercent(getUsagePercentage());
      setRemainingCalls(getRemainingCalls());
    }
  }, [isOpen]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsAuthLoading(true);
    try {
      if (authMode === 'login') {
        await onLogin(emailInput, passwordInput);
      } else {
        await onRegister(emailInput, passwordInput);
      }
      setEmailInput('');
      setPasswordInput('');
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed');
    } finally {
      setIsAuthLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }
  
  const handleInstructionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    onCustomInstructionsChange({
        ...customInstructions,
        [name]: value,
    });
  };

  const handleNewChatClick = () => {
    onNewChat();
    onClose(); // Close modal after starting new chat
  }
  
  const handleNotificationToggle = async () => {
      const newState = !notificationsEnabled;
      if (newState) {
          if (typeof Notification === 'undefined') {
              onNotificationsChange(false);
              return;
          }
          try {
              const result = await Notification.requestPermission();
              onNotificationsChange(result === 'granted');
          } catch (e) {
              console.error("Notification permission request failed:", e);
              onNotificationsChange(false);
          }
      } else {
          onNotificationsChange(false);
      }
  };

  const themes: { name: Theme; label: string }[] = [
    { name: 'light', label: 'Light' },
    { name: 'dark', label: 'Dark' },
    { name: 'sepia', label: 'Sepia' },
    { name: 'ocean', label: 'Ocean' },
    { name: 'forest', label: 'Forest' },
    { name: 'sunset', label: 'Sunset' },
    { name: 'lavender', label: 'Lavender' },
    { name: 'midnight', label: 'Midnight' },
    { name: 'cream', label: 'Cream' },
    { name: 'pixel', label: 'Pixel' },
  ];
  
  const backgroundStyles: { name: BackgroundStyle; label: string }[] = [
    { name: 'none', label: 'None' },
    { name: 'grid', label: 'Grid' },
    { name: 'dots', label: 'Dots' },
    { name: 'gradient', label: 'Gradient' },
    { name: 'cosmic', label: 'Cosmic' },
    { name: 'playful', label: 'Playful' },
    { name: 'pixelart', label: 'Pixel Art' },
  ];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in-fast"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div 
        className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-xl shadow-2xl w-full max-w-lg m-4 flex flex-col max-h-[90vh] animate-slide-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 className="text-xl font-semibold">Settings</h2>
          <button onClick={onClose} className="p-1 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" aria-label="Close settings">
            <CloseIcon />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          
          {/* Account Section */}
          <div className="bg-gradient-to-r from-teal-50 to-blue-50 dark:from-teal-900/20 dark:to-blue-900/20 p-4 rounded-lg border border-teal-100 dark:border-teal-800">
            <h3 className="text-md font-bold text-teal-800 dark:text-teal-200 mb-3 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Account
            </h3>
            {userEmail ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="flex flex-col">
                          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Logged in as</span>
                          <span className="text-sm font-bold text-gray-800 dark:text-gray-200 break-all">{userEmail}</span>
                      </div>
                      <button 
                          onClick={onLogout}
                          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-md transition-colors"
                      >
                          Log Out
                      </button>
                  </div>
                  
                  <div className="pt-2 border-t border-teal-100/50 dark:border-teal-800/50">
                    {!showDeleteConfirm ? (
                        <button 
                            onClick={() => setShowDeleteConfirm(true)}
                            className="w-full py-2 text-xs font-bold text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-all flex items-center justify-center gap-1"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete My Account
                        </button>
                    ) : (
                        <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-900/30">
                            <p className="text-[10px] font-bold text-red-600 dark:text-red-400 mb-1 text-center uppercase tracking-wider">Are you absolutely sure?</p>
                            <p className="text-[10px] text-red-500 dark:text-red-500/80 mb-3 text-center leading-tight">This will permanently delete your profile, all chats, and learning progress. This cannot be undone.</p>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="flex-1 py-1.5 text-[10px] font-bold bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={async () => {
                                        setIsDeletingAccount(true);
                                        try {
                                            await onDeleteAccount();
                                        } catch (err: any) {
                                            setAuthError(err.message || 'Deletion failed');
                                            setIsDeletingAccount(false);
                                            setShowDeleteConfirm(false);
                                        }
                                    }}
                                    disabled={isDeletingAccount}
                                    className="flex-1 py-1.5 text-[10px] font-bold bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors disabled:opacity-50"
                                >
                                    {isDeletingAccount ? "Deleting..." : "Delete All"}
                                </button>
                            </div>
                        </div>
                    )}
                  </div>
                </div>
            ) : (
                <form onSubmit={handleAuthSubmit} className="space-y-3 bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div>
                        <label htmlFor="auth-email" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Email</label>
                        <input 
                            id="auth-email"
                            name="email"
                            type="email" 
                            required
                            value={emailInput}
                            onChange={(e) => setEmailInput(e.target.value)}
                            className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-teal-500"
                            placeholder="you@example.com"
                        />
                    </div>
                    <div>
                        <label htmlFor="auth-password" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Password</label>
                        <input 
                            id="auth-password"
                            name="password"
                            type="password" 
                            required
                            value={passwordInput}
                            onChange={(e) => setPasswordInput(e.target.value)}
                            className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-teal-500"
                            placeholder="••••••••"
                        />
                    </div>
                    {authError && <p className="text-xs text-red-500 font-medium">{authError}</p>}
                    <div className="flex flex-col sm:flex-row gap-2 pt-2">
                        <button 
                            type="submit"
                            disabled={isAuthLoading}
                            className="flex-1 px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-bold rounded-md transition-colors"
                        >
                            {isAuthLoading ? '...' : (authMode === 'login' ? 'Log In' : 'Sign Up')}
                        </button>
                        <button 
                            type="button"
                            onClick={() => {
                                setAuthMode(authMode === 'login' ? 'register' : 'login');
                                setAuthError('');
                            }}
                            className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-semibold rounded-md transition-colors"
                        >
                            {authMode === 'login' ? 'Create Account' : 'Switch to Log In'}
                        </button>
                    </div>
                </form>
            )}
          </div>

          {/* API Usage Monitor */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-lg border border-purple-100 dark:border-purple-800">
            <h3 className="text-md font-bold text-purple-800 dark:text-purple-200 mb-3 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                API Usage Monitor
            </h3>
            
            <div className="space-y-3">
              {/* Usage Bar */}
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Daily Usage</span>
                  <span className={`text-sm font-bold ${isInWarningZone() ? 'text-orange-600 dark:text-orange-400' : 'text-teal-600 dark:text-teal-400'}`}>
                    {usagePercent.toFixed(1)}%
                  </span>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      usagePercent >= 90 ? 'bg-red-500' :
                      usagePercent >= 80 ? 'bg-orange-500' :
                      usagePercent >= 60 ? 'bg-yellow-500' :
                      'bg-teal-500'
                    }`}
                    style={{ width: `${Math.min(100, usagePercent)}%` }}
                  />
                </div>
                
                <div className="flex items-center justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
                  <span>{apiUsage.geminiCalls + apiUsage.openRouterCalls} calls made</span>
                  <span>~{remainingCalls} remaining</span>
                </div>
              </div>
              
              {/* Warning Message */}
              {isInWarningZone() && (
                <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg border border-orange-200 dark:border-orange-800 animate-fade-in-fast">
                  <div className="flex items-start gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <p className="text-sm font-bold text-orange-800 dark:text-orange-200">Approaching Daily Limit</p>
                      <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                        You've used {usagePercent.toFixed(0)}% of your estimated daily API quota. Consider taking a break or the app may switch to fallback providers.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Breakdown */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Gemini</span>
                  </div>
                  <p className="text-lg font-bold text-gray-800 dark:text-gray-200">{apiUsage.geminiCalls}</p>
                </div>
                
                <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">OpenRouter</span>
                  </div>
                  <p className="text-lg font-bold text-gray-800 dark:text-gray-200">{apiUsage.openRouterCalls}</p>
                </div>
              </div>
              
              {/* Info */}
              <div className="text-xs text-gray-500 dark:text-gray-400 italic">
                <p>Usage resets daily at midnight. Estimates are based on typical free-tier limits.</p>
              </div>
            </div>
          </div>

          {/* Accessibility - New Section */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
            <h3 className="text-md font-bold text-blue-800 dark:text-blue-200 mb-3 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Accessibility & Tools
            </h3>
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <span id="dyslexia-font-label" className="text-sm font-medium text-gray-700 dark:text-gray-300">Dyslexia Friendly Mode</span>
                    <button 
                        id="dyslexia-font"
                        aria-labelledby="dyslexia-font-label"
                        aria-pressed={dyslexiaSettings.enabled}
                        onClick={() => onDyslexiaSettingsChange({...dyslexiaSettings, enabled: !dyslexiaSettings.enabled})}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${dyslexiaSettings.enabled ? 'bg-teal-600' : 'bg-gray-200 dark:bg-gray-600'}`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition transition-transform ${dyslexiaSettings.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>

                {dyslexiaSettings.enabled && (
                    <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-teal-200 dark:border-teal-900 animate-fade-in-fast">
                        <p className="text-xs font-bold text-teal-600 uppercase tracking-wider mb-2">Real-time Preview</p>
                        <div 
                            className="text-gray-800 dark:text-gray-200 transition-all"
                            style={{ 
                                fontSize: `${dyslexiaSettings.fontSize}rem`,
                                lineHeight: dyslexiaSettings.lineSpacing,
                                letterSpacing: `${dyslexiaSettings.letterSpacing}em`,
                                wordSpacing: `${dyslexiaSettings.wordSpacing}em`,
                                fontFamily: "'Lexend', sans-serif"
                            }}
                        >
                            This is how your text will look. You can adjust the size and spacing below to find what works best for you!
                        </div>
                    </div>
                )}
                
                <div className="flex items-center justify-between pt-2">
                    <span id="reading-ruler-label" className="text-sm font-medium text-gray-700 dark:text-gray-300">Reading Ruler</span>
                    <button 
                        id="reading-ruler"
                        aria-labelledby="reading-ruler-label"
                        aria-pressed={dyslexiaSettings.rulerEnabled}
                        onClick={() => onDyslexiaSettingsChange({...dyslexiaSettings, rulerEnabled: !dyslexiaSettings.rulerEnabled})}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${dyslexiaSettings.rulerEnabled ? 'bg-teal-600' : 'bg-gray-200 dark:bg-gray-600'}`}
                    >
                         <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition transition-transform ${dyslexiaSettings.rulerEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>

                <div className="flex items-center justify-between pt-2">
                    <span id="hover-speech-label" className="text-sm font-medium text-gray-700 dark:text-gray-300">Hover to Speech</span>
                    <button 
                        id="hover-speech"
                        aria-labelledby="hover-speech-label"
                        aria-pressed={dyslexiaSettings.hoverSpeechEnabled}
                        onClick={() => onDyslexiaSettingsChange({...dyslexiaSettings, hoverSpeechEnabled: !dyslexiaSettings.hoverSpeechEnabled})}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${dyslexiaSettings.hoverSpeechEnabled ? 'bg-teal-600' : 'bg-gray-200 dark:bg-gray-600'}`}
                    >
                         <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition transition-transform ${dyslexiaSettings.hoverSpeechEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>

                <div className="space-y-1 pt-2 border-t border-gray-200 dark:border-gray-700 mt-2">
                    <div className="flex items-center justify-between">
                        <label htmlFor="font-scale" className="text-sm font-medium text-gray-700 dark:text-gray-300">Font Scaling</label>
                        <span className="text-xs font-bold text-teal-600">{Math.round(dyslexiaSettings.fontSize * 100)}%</span>
                    </div>
                    <input 
                        id="font-scale"
                        type="range"
                        min="0.8"
                        max="2.5"
                        step="0.1"
                        value={dyslexiaSettings.fontSize}
                        onChange={(e) => onDyslexiaSettingsChange({...dyslexiaSettings, fontSize: parseFloat(e.target.value)})}
                        className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-teal-600"
                    />
                </div>

                <div className="space-y-1 pt-2">
                    <div className="flex items-center justify-between">
                        <label htmlFor="line-spacing" className="text-sm font-medium text-gray-700 dark:text-gray-300">Line Spacing Adjustment</label>
                        <span className="text-xs font-bold text-teal-600">{dyslexiaSettings.lineSpacing}x</span>
                    </div>
                    <input 
                        id="line-spacing"
                        type="range"
                        min="1"
                        max="4"
                        step="0.1"
                        value={dyslexiaSettings.lineSpacing}
                        onChange={(e) => onDyslexiaSettingsChange({...dyslexiaSettings, lineSpacing: parseFloat(e.target.value)})}
                        className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-teal-600"
                    />
                </div>

                <div className="space-y-1 pt-2">
                    <div className="flex items-center justify-between">
                        <label htmlFor="letter-spacing" className="text-sm font-medium text-gray-700 dark:text-gray-300">Letter Spacing</label>
                        <span className="text-xs font-bold text-teal-600">{dyslexiaSettings.letterSpacing}em</span>
                    </div>
                    <input 
                        id="letter-spacing"
                        type="range"
                        min="0"
                        max="0.5"
                        step="0.01"
                        value={dyslexiaSettings.letterSpacing}
                        onChange={(e) => onDyslexiaSettingsChange({...dyslexiaSettings, letterSpacing: parseFloat(e.target.value)})}
                        className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-teal-600"
                    />
                </div>

                <div className="space-y-1 pt-2">
                    <div className="flex items-center justify-between">
                        <label htmlFor="word-spacing" className="text-sm font-medium text-gray-700 dark:text-gray-300">Word Spacing</label>
                        <span className="text-xs font-bold text-teal-600">{dyslexiaSettings.wordSpacing}em</span>
                    </div>
                    <input 
                        id="word-spacing"
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={dyslexiaSettings.wordSpacing}
                        onChange={(e) => onDyslexiaSettingsChange({...dyslexiaSettings, wordSpacing: parseFloat(e.target.value)})}
                        className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-teal-600"
                    />
                </div>

            </div>
          </div>
          
          {/* Notifications Section */}
          <div className="space-y-4">
            <h3 className="text-md font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                Notifications
            </h3>
            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                    <div>
                        <span id="daily-reminders-label" className="text-sm font-medium text-gray-700 dark:text-gray-300">Daily Goal Reminders</span>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Get notified to complete your daily games and practice.</p>
                    </div>
                    <button 
                        id="daily-reminders"
                        aria-labelledby="daily-reminders-label"
                        aria-pressed={notificationsEnabled}
                        onClick={handleNotificationToggle}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${notificationsEnabled ? 'bg-teal-600' : 'bg-gray-200 dark:bg-gray-600'}`}
                    >
                         <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition transition-transform ${notificationsEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>
                {typeof Notification !== 'undefined' && Notification.permission === 'denied' && (
                    <p className="text-[10px] text-red-500 mt-2">
                        Notifications are blocked by your browser. Please enable them in your site settings to use this feature.
                    </p>
                )}
            </div>
          </div>
          
          {/* Digital Wellbeing Section */}
          <div className="space-y-4">
            <h3 className="text-md font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Digital Wellbeing
            </h3>
            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                    <div>
                        <span id="daily-time-limit-label" className="text-sm font-medium text-gray-700 dark:text-gray-300">2-Hour Daily Limit</span>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Prompt you to take a break after using the app for 2 hours each day.</p>
                    </div>
                    <button 
                        id="daily-time-limit"
                        aria-labelledby="daily-time-limit-label"
                        aria-pressed={enableDailyTimeLimit}
                        onClick={() => onEnableDailyTimeLimitChange(!enableDailyTimeLimit)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${enableDailyTimeLimit ? 'bg-teal-600' : 'bg-gray-200 dark:bg-gray-600'}`}
                    >
                         <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition transition-transform ${enableDailyTimeLimit ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>
            </div>
          </div>
          
          {/* Theme Selector */}
          <div>
            <p className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Theme</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" role="group" aria-label="Theme selection">
              {themes.map(({ name, label }) => (
                <button
                  key={name}
                  onClick={() => onThemeChange(name)}
                  aria-pressed={theme === name}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 dark:focus:ring-offset-gray-800 ${
                    theme === name
                      ? 'bg-teal-600 border-teal-600 text-white'
                      : 'bg-transparent border-gray-300 dark:border-gray-600 hover:border-teal-500 dark:hover:border-teal-500'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Background Style Selector */}
          <div>
            <p className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Background Style</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2" role="group" aria-label="Background style selection">
              {backgroundStyles.map(({ name, label }) => (
                <button
                  key={name}
                  onClick={() => onBackgroundStyleChange(name)}
                  aria-pressed={backgroundStyle === name}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 dark:focus:ring-offset-gray-800 ${
                    backgroundStyle === name
                      ? 'bg-teal-600 border-teal-600 text-white'
                      : 'bg-transparent border-gray-300 dark:border-gray-600 hover:border-teal-500 dark:hover:border-teal-500'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Language Selector */}
           <div>
            <label htmlFor="language-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Language</label>
            <select
                id="language-select"
                value={language}
                onChange={(e) => onLanguageChange(e.target.value as Language)}
                className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            >
                {LANGUAGES.map(({ code, label }) => (
                    <option key={code} value={code}>{label}</option>
                ))}
            </select>
          </div>
          
          {/* Voice Selector */}
          <div>
            <label htmlFor="voice-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">AI Voice (for Read Aloud)</label>
            <select
                id="voice-select"
                value={voiceURI || ''}
                onChange={(e) => onVoiceChange(e.target.value)}
                disabled={availableVoices.length === 0}
                className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
                <option value="">Browser Default</option>
                {availableVoices.map((voice) => (
                    <option key={voice.voiceURI} value={voice.voiceURI}>
                        {`${voice.name} (${voice.lang})`}
                    </option>
                ))}
            </select>
          </div>

          {/* Speech Rate Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
                <label htmlFor="speech-rate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Reading Speed</label>
                <span className="text-xs font-bold text-teal-600">
                    {dyslexiaSettings.speechRate === 1 ? 'Default' : `${dyslexiaSettings.speechRate}x`}
                </span>
            </div>
            <input 
                id="speech-rate"
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={dyslexiaSettings.speechRate}
                onChange={(e) => onDyslexiaSettingsChange({...dyslexiaSettings, speechRate: parseFloat(e.target.value)})}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-teal-600"
            />
            <div className="flex justify-between mt-1">
                <span className="text-[10px] text-gray-500">Slower</span>
                <span className="text-[10px] text-gray-500">Normal</span>
                <span className="text-[10px] text-gray-500">Faster</span>
            </div>
          </div>

          {/* Image Generation Section */}
          <div className="space-y-4">
            <h3 className="text-md font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Image Generation
            </h3>
            
            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700">
                    <div>
                        <span id="enable-ai-images-label" className="text-sm font-medium text-gray-700 dark:text-gray-300">Enable AI Image Generation</span>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Allow AI to create custom visual aids when local assets aren't found.</p>
                    </div>
                    <button 
                        id="enable-ai-images"
                        aria-labelledby="enable-ai-images-label"
                        aria-pressed={enableImageGeneration}
                        onClick={() => onEnableImageGenerationChange(!enableImageGeneration)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${enableImageGeneration ? 'bg-teal-600' : 'bg-gray-200 dark:bg-gray-600'}`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition transition-transform ${enableImageGeneration ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>

                <div className={enableImageGeneration ? 'space-y-4' : 'opacity-40 pointer-events-none space-y-4'}>
                    <div>
                        <p className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Preferred Provider</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="group" aria-label="Image provider selection">
                            {IMAGE_PROVIDERS.map((provider) => (
                                <button
                                    key={provider.id}
                                    onClick={() => onImageProviderChange(provider.id as ImageProvider)}
                                    aria-pressed={selectedImageProvider === provider.id}
                                    className={`px-4 py-2 text-sm font-semibold rounded-lg border-2 transition-all ${
                                        selectedImageProvider === provider.id
                                            ? 'bg-teal-600 border-teal-600 text-white'
                                            : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-teal-500'
                                    }`}
                                >
                                    {provider.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {selectedImageProvider === 'gemini' && (
                        <div className="animate-fade-in-fast">
                            <label htmlFor="image-model" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Gemini Model</label>
                            <select
                                id="image-model"
                                value={selectedImageModel}
                                onChange={(e) => onImageModelChange(e.target.value)}
                                className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-teal-500"
                            >
                                {GEMINI_IMAGE_MODELS.map((model) => (
                                    <option key={model.id} value={model.id}>{model.label}</option>
                                ))}
                            </select>
                            <p className="mt-2 text-[10px] text-gray-500 italic">
                                Models marked "Experimental" or "Preview" may have higher quality but could be less stable.
                            </p>
                        </div>
                    )}

                    {selectedImageProvider === 'pollinations' && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800 animate-fade-in-fast text-xs text-blue-800 dark:text-blue-200">
                            Pollinations.ai is free and doesn't require an API key, making it a great fallback for fast image generation.
                        </div>
                    )}
                </div>
            </div>
          </div>

          {/* Custom Instructions */}
          <div className="space-y-4">
            <div>
                <label htmlFor="aboutUser" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    What would you like Dyslearn AI to know about you to provide better responses?
                </label>
                <textarea
                    id="aboutUser"
                    name="aboutUser"
                    value={customInstructions.aboutUser}
                    onChange={handleInstructionChange}
                    rows={4}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-y"
                    placeholder="e.g., I'm a 5th grader who loves space. I prefer simple explanations."
                />
            </div>
            <div>
                <label htmlFor="howToRespond" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    How would you like Dyslearn AI to respond?
                </label>
                <textarea
                    id="howToRespond"
                    name="howToRespond"
                    value={customInstructions.howToRespond}
                    onChange={handleInstructionChange}
                    rows={4}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-y"
                    placeholder="e.g., Use short sentences. Use bullet points for lists. Be encouraging."
                />
            </div>
          </div>
          
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-between items-center gap-3 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex-shrink-0">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Created by Ojasvin Anand
          </p>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button
                onClick={handleNewChatClick}
                className="w-full sm:w-auto px-6 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
            >
                Start New Chat
            </button>
            <button
              onClick={onSave}
              className="w-full sm:w-auto px-6 py-2 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
            >
              Save & Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
