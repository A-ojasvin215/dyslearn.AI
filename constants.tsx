
import React from 'react';
import type { Language, Challenge, Achievement, UserData, SkillStats } from './types';

// Prefer a model that typically has usable free-tier quotas.
// You can override via Vite env var: VITE_GEMINI_TEXT_MODEL.
// PERFORMANCE OPTIMIZED: Prefer fastest models first for better response times
export const GEMINI_TEXT_MODEL =
  (import.meta as any).env?.VITE_GEMINI_TEXT_MODEL || 'gemini-2.5-flash';
export const GEMINI_TEXT_MODEL_FALLBACKS = [
  'gemini-2.5-flash',        // Primary fast model
  'gemini-2.5-flash-lite',   // Fast lite version
  'gemini-2.5-pro',          // More capable model
  'gemini-1.5-flash',        // Legacy fast model (stable)
  'gemini-1.5-pro',          // Legacy pro model (stable)
  'gemini-1.0-pro',          // Oldest stable model
];

// TRANSCRIPTION OPTIMIZED: Ultra-fast models for audio processing
export const GEMINI_TRANSCRIPTION_MODEL_FALLBACKS = [
  'gemini-2.5-flash',        // Best for transcription speed
  'gemini-1.5-flash',        // Stable legacy fast model
  'gemini-2.5-flash-lite',   // Lightweight for audio processing
  'gemini-1.5-pro',          // High accuracy fallback
  'gemini-1.0-pro',          // Most stable fallback
];

// You can override via Vite env var: VITE_GEMINI_IMAGE_MODEL.
export const GEMINI_IMAGE_MODEL =
  (import.meta as any).env?.VITE_GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';

export const IMAGE_PROVIDERS = [
  { id: 'gemini', label: 'Google Gemini (High Quality)' },
  { id: 'pollinations', label: 'Pollinations.ai (Fast & Creative)' },
];

export const GEMINI_IMAGE_MODELS = [
  { id: 'models/gemini-2.5-flash-image', label: 'Nano Banana (Gemini 2.5 Flash)' },
  { id: 'models/gemini-3-pro-image-preview', label: 'Nano Banana Pro (Gemini 3 Pro)' },
  { id: 'models/gemini-3.1-flash-image-preview', label: 'Nano Banana 2 (Gemini 3.1 Flash)' },
];

export const GEMINI_IMAGE_MODEL_FALLBACKS = [
  'gemini-2.5-flash-image',
  'gemini-3-pro-image-preview',
  'gemini-3.1-flash-image-preview',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
];
export const IMAGE_PROMPT_PREFIX = 'IMAGE_PROMPT::';
export const IMAGE_SUGGESTION = "Tip: You can ask for a specific image by typing '/image' followed by a description of what you want to visualize.";
export const DAILY_GOAL_LEVELS = [25, 50, 75, 100];
export const DAILY_GOAL = DAILY_GOAL_LEVELS[DAILY_GOAL_LEVELS.length - 1];
export const MESSAGE_POINTS = 5;
export const DAILY_GAME_TARGET = 5;
export const DAILY_MINUTES_TARGET = 20;

export const LANGUAGES: { code: Language; label: string }[] = [
    { code: 'en', label: 'English' },
    { code: 'es', label: 'Español (Spanish)' },
    { code: 'fr', label: 'Français (French)' },
    { code: 'de', label: 'Deutsch (German)' },
    { code: 'it', label: 'Italiano (Italian)' },
    { code: 'hi', label: 'हिन्दी (Hindi)' },
    { code: 'bn', label: 'বাংলা (Bengali)' },
    { code: 'ta', label: 'தமிழ் (Tamil)' },
];

export const SKILL_DESCRIPTIONS: Record<keyof SkillStats, string> = {
    vocabulary: "Knowledge of words and their meanings.",
    grammar: "Understanding how to build correct sentences.",
    spelling: "Ability to write words with correct lettering.",
    phonetics: "Understanding how words and letters sound.",
    creativity: "Using imagination to create new ideas or stories.",
    logic: "Ability to think clearly and solve puzzles.",
    math: "Working with numbers, patterns, and amounts."
};

export const UI_STRINGS: Record<Language, { welcome: string; placeholder: string }> = {
    en: {
      welcome: "Hello! I'm your AI Learning Assistant. You can paste text to simplify, ask me to explain a concept, or try a fun challenge from the sidebar. Open settings (top right) to personalize me!",
      placeholder: "Ask a question, or type /image followed by a description to generate a picture..."
    },
    es: {
      welcome: "¡Hola! Soy tu Asistente de Aprendizaje AI. Puedes pegar texto para simplificar, pedirme que explique un concepto o probar un desafío divertido en la barra lateral. ¡Abre la configuración (arriba a la derecha) para personalizarme!",
      placeholder: "Haz una pregunta o escribe /image seguido de una descripción para generar una imagen..."
    },
    fr: {
      welcome: "Bonjour ! Je suis votre Assistant d'Apprentissage IA. Vous pouvez coller du texte à simplifier, me demander d'expliquer un concept ou essayer un défi amusant dans la barre latérale. Ouvrez les paramètres (en haut à droite) pour me personnaliser !",
      placeholder: "Posez une question ou tapez /image suivi d'une description pour générer une image..."
    },
    de: {
      welcome: "Hallo! Ich bin Ihr KI-Lernassistent. Sie können Text zum Vereinfachen einfügen, mich bitten, ein Konzept zu erklären oder eine lustige Herausforderung in der Seitenleiste ausprobieren. Öffnen Sie die Einstellungen (oben rechts), um mich zu personalisieren!",
      placeholder: "Stellen Sie eine Frage oder geben Sie /image gefolgt von einer Beschreibung ein, um ein Bild zu erstellen..."
    },
    it: {
      welcome: "Ciao! Sono il tuo Assistente all'Apprendimento AI. Puoi incollare del testo da semplificare, chiedermi di spiegare un concetto o provare una sfida divertente nella barra laterale. Apri le impostazioni (in alto a destra) per personalizzarmi!",
      placeholder: "Fai una domanda o digita /image seguito da una descrizione per generare un'immagine..."
    },
    hi: {
        welcome: "नमस्ते! मैं आपका एआई लर्निंग असिस्टेंट हूँ। आप टेक्स्ट को सरल बनाने के लिए पेस्ट कर सकते हैं, मुझसे किसी अवधारणा को समझाने के लिए कह सकते हैं, या साइडबार से एक मजेदार चुनौती आजमा सकते हैं। मुझे वैयक्तिकृत करने के लिए सेटिंग्स (ऊपर दाएं) खोलें!",
        placeholder: "एक प्रश्न पूछें, या चित्र बनाने के लिए /image के बाद विवरण टाइप करें..."
    },
    bn: {
        welcome: "নমস্কার! আমি আপনার এআই লার্নিং অ্যাসিস্ট্যান্ট। আপনি পাঠ্য সহজ করার জন্য পেস্ট করতে পারেন, আমাকে একটি ধারণা ব্যাখ্যা করতে বলতে পারেন, বা সাইডবার থেকে একটি মজার চ্যালেঞ্জ চেষ্টা করতে পারেন। আমাকে ব্যক্তিগতকৃত করতে সেটিংস (উপরের ডানদিকে) খুলুন!",
        placeholder: "একটি প্রশ্ন জিজ্ঞাসা করুন, বা একটি ছবি তৈরি করতে /image এর পরে বর্ণনা টাইপ করুন..."
    },
    ta: {
        welcome: "வணக்கம்! நான் உங்கள் AI கற்றல் உதவியாளர். உரையை எளிதாக்க நீங்கள் ஒட்டலாம், ஒரு கருத்தை விளக்குமாறு என்னிடம் கேட்கலாம், அல்லது பக்கப்பட்டியில் இருந்து ஒரு வேடிக்கையான சவாலை முயற்சிக்கலாம். என்னைத் தனிப்பயனாக்க அமைப்புகளை (மேல் வலது) திறக்கவும்!",
        placeholder: "ஒரு கேள்வியைக் கேளுங்கள், அல்லது ஒரு படத்தை உருவாக்க /image ஐத் தொடர்ந்து விளக்கத்தைத் தட்டச்சு செய்யவும்..."
    },
};


export * from './components/icons';
export * from './data/challenges';
export * from './data/achievements';
