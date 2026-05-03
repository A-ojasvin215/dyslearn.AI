
import React from 'react';
import type { ReactNode } from 'react';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
  base64Data?: string; // Raw base64 for history context
  mimeType?: string;   // Mime type for history context
  isLoading?: boolean;
  attachmentName?: string; // For displaying in the user's message bubble
  attachmentType?: 'image' | 'text' | 'audio'; // To distinguish between image, text/pdf, and audio
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  challengeSystemPrompt?: string; // To handle special prompts for challenges
  challengeId?: string; // To track which specific challenge this is (for adaptive learning)
}

export interface ChatMetadata {
  id: string;
  title: string;
  createdAt: number; // timestamp ms for ordering
  challengeSystemPrompt?: string;
  challengeId?: string;
}

export type Theme = 'light' | 'dark' | 'sepia' | 'ocean' | 'forest' | 'sunset' | 'lavender' | 'midnight' | 'cream' | 'pixel';

export type BackgroundStyle = 'none' | 'grid' | 'gradient' | 'cosmic' | 'playful' | 'dots' | 'pixelart';

export type Language = 'en' | 'es' | 'fr' | 'de' | 'it' | 'hi' | 'bn' | 'ta';

export interface CustomInstructions {
  aboutUser: string;
  howToRespond: string;
}

export interface DyslexiaSettings {
    enabled: boolean;
    rulerEnabled: boolean;
    hoverSpeechEnabled: boolean;
    fontSize: number; // 1 to 2 (multiplier)
    lineSpacing: number; // 1 to 3 (multiplier)
    letterSpacing: number; // 0 to 0.5 (em)
    wordSpacing: number; // 0 to 1 (em)
    speechRate: number; // 0.5 to 2 (multiplier)
}

// Represents a file attached by the user.
export interface FileAttachment {
  name: string;
  type: 'image' | 'text' | 'audio';
  content: string; // Base64 for images/audio, raw text for text/pdf
  mimeType?: string; // e.g., 'image/jpeg', 'image/png', 'audio/webm'
}

// Represents a single challenge
export interface Challenge {
    id: string;
    title: string;
    description: string;
    icon: React.FC<{ className?: string }>;
    systemPrompt: string;
    skill: keyof SkillStats; // Links challenge to a specific skill
    demoScript?: string;
    demoChat?: { role: 'user' | 'assistant'; content: string }[];
}

// Represents a single day's progress
export interface DailyProgress {
  date: string; // YYYY-MM-DD format
  points: number;
  gamesPlayed: number;
  minutesPlayed: number;
}

export interface SkillStats {
    vocabulary: number;
    grammar: number;
    spelling: number;
    phonetics: number;
    creativity: number;
    logic: number;
    math: number;
}

export interface Achievement {
    id: string;
    title: string;
    description: string;
    icon: React.FC<{ className?: string }>;
    color: string; // Tailswind text color class
    check: (data: UserData) => boolean;
}

export type ImageProvider = 'gemini' | 'pollinations';

// Represents the user's gamification data
export interface UserData {
  totalPoints: number;
  progressHistory: DailyProgress[];
  skillStats: SkillStats;
  unlockedAchievements: string[];
  selectedImageProvider?: ImageProvider;
  selectedImageModel?: string;
  enableImageGeneration: boolean;
  enableDailyTimeLimit: boolean;
}



declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}
