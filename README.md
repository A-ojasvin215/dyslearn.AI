# DysLearn AI - Dyslexia-Friendly Learning Platform

An AI-powered educational platform designed specifically for students with dyslexia, featuring multi-modal learning, voice input, visual aids, and adaptive content delivery.

## 🎯 Project Overview

DysLearn AI is a comprehensive learning assistant that helps students with dyslexia through:
- **Voice-to-Text Input** — Offline speech recognition + Gemini AI transcription
- **Visual Learning Aids** — AI-generated images and diagrams
- **Dyslexia-Friendly UI** — 13 custom themes with optimized typography
- **Multi-Language Support** — Hindi, Bengali, Tamil, Spanish, French, German, Italian, English
- **Offline Knowledge Base** — Indian curriculum content (Classes Pre KG-6)
- **Interactive Games** — Tetris, Flappy Bird, Dino Game for engagement
- **Drawing & Camera Input** — Multi-modal learning support

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- A Gemini API key (free at https://aistudio.google.com/app/apikey)

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd dyslearn-ai
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure API Keys**
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and add your API keys
# Get free Gemini API key: https://aistudio.google.com/app/apikey
```

4. **Run the development server**
```bash
npm run dev
```

5. **Open in browser**
```
http://localhost:3000
```

## 🔑 API Keys Setup

This project requires API keys for AI features. All keys are **free** to obtain:

### Required:
- **Gemini API Key** — Get from https://aistudio.google.com/app/apikey
  - Add to `.env` as `API_KEY=your_key_here`

### Optional (for fallback):
- **OpenRouter API Key** — Get from https://openrouter.ai/keys (free tier available)
- **Databricks Token** — Only needed if using database features

See `.env.example` for the complete configuration template.

## 📁 Project Structure

```
dyslearn-ai/
├── components/          # React UI components
│   ├── ChatInput.tsx   # Voice + text input with STT
│   ├── MessageBubble.tsx
│   ├── SettingsModal.tsx
│   └── ...
├── services/           # API integrations
│   ├── geminiService.ts    # Gemini AI with key rotation
│   └── offlineChallengeEngine.ts
├── data/              # Educational content
│   ├── indianCurriculum_*.ts
│   ├── encyclopedia/
│   └── offlineKnowledge.ts
├── api/               # Backend API routes
├── .env.example       # Environment variables template
└── vite.config.ts     # Build configuration
```

## 🎨 Features

### 1. **AI-Powered Chat Assistant**
- Multi-turn conversations with context awareness
- Automatic fallback between Gemini and OpenRouter
- Tiered API key rotation for reliability

### 2. **Voice Input (STT)**
- **Offline Mode**: Web Speech API for real-time transcription (Chrome/Edge)
- **Online Mode**: Gemini AI transcription for all browsers
- Automatic fallback between modes

### 3. **Visual Learning**
- AI-generated images via Gemini Imagen
- Drawing canvas for handwriting practice
- Camera input for real-world object recognition

### 4. **Dyslexia-Friendly Design**
- 13 custom themes (Ocean, Forest, Sunset, Pixel, etc.)
- OpenDyslexic font option
- Bold text for improved readability
- High contrast modes

### 5. **Offline Knowledge Base**
- Complete Indian curriculum (NCERT Classes 1-12)
- Encyclopedia entries for common topics
- Works without internet after initial load

### 6. **Multi-Language Support**
- 8 languages supported
- Language-specific voice recognition
- Localized UI elements

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **AI/ML**: Google Gemini API, OpenRouter (fallback)
- **Build Tool**: Vite 6
- **Speech**: Web Speech API + Gemini STT
- **State Management**: React Hooks + localStorage
- **Styling**: Tailwind CSS 4 with custom themes

## 📊 Performance Optimizations

- **Request Caching** — 5-minute cache for repeated queries
- **Parallel API Requests** — Multiple keys used simultaneously
- **Model Fallbacks** — Automatic switching between Gemini models
- **Code Splitting** — Lazy loading for faster initial load
- **Tiered Key System** — Primary keys used first, secondary as fallback

## 🧪 Testing

Run TypeScript type checking:
```bash
npm run lint
```

Build for production:
```bash
npm run build
```

Preview production build:
```bash
npm run preview
```

## 📝 Configuration

### API Key Tiers
- **Tier 1**: `API_KEY`, `GEMINI_API_KEY`, `GEMINI_API_KEY_1`, `GEMINI_API_KEY_2`
- **Tier 2**: `GEMINI_API_KEY_3` through `GEMINI_API_KEY_10`

Tier 1 keys are used first for best performance. Tier 2 keys activate when Tier 1 is exhausted.

### Vite Configuration
- Port: 3000
- Max header size: 16KB (fixes large localStorage issues)
- HMR enabled for fast development

## 🐛 Troubleshooting

### "431 Request Header Fields Too Large"
- Clear browser localStorage: F12 → Application → Clear storage
- Restart dev server

### Voice input not working
- Ensure HTTPS or localhost (required for microphone access)
- Grant microphone permissions in browser
- Chrome/Edge recommended for best STT support

### API quota exceeded
- Add more API keys to `.env` (Tier 2 keys)
- Keys automatically rotate when quota is hit

## 📄 License

This project is for educational purposes as part of a college submission.

## 👥 Team

[Add your team member names and DSU email IDs here]

## 🔗 Links

- **GitHub Repository**: [Your repo URL]
- **Live Demo**: [If deployed, add URL here]
- **Documentation**: See `/docs` folder for detailed reports

## 📧 Contact

For questions or issues, contact: [Your DSU email]

---

**Note for Evaluators**: This project requires API keys to run. Please follow the setup instructions above to obtain free API keys. The `.env.example` file shows exactly what keys are needed.
