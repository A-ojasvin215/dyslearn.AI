# Setup Guide for Evaluators

This guide helps professors and evaluators run the DysLearn AI project locally.

## ⚡ Quick Setup (5 minutes)

### Step 1: Get a Free Gemini API Key

1. Visit: https://aistudio.google.com/app/apikey
2. Sign in with any Google account
3. Click **"Create API Key"**
4. Copy the key (starts with `AIzaSy...`)

### Step 2: Configure the Project

1. Open the project folder in terminal/command prompt
2. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
   (On Windows: `copy .env.example .env`)

3. Open `.env` in any text editor
4. Replace `YOUR_GEMINI_API_KEY_HERE` with your actual key:
   ```
   API_KEY=AIzaSy... (paste your key here)
   GEMINI_API_KEY=AIzaSy... (same key)
   ```

### Step 3: Install and Run

```bash
# Install dependencies (one-time, takes 1-2 minutes)
npm install

# Start the development server
npm run dev
```

The app will open at: **http://localhost:3000**

## ✅ What to Test

### Core Features:
1. **Chat with AI** — Type a question and get a response
2. **Voice Input** — Click the microphone icon and speak
3. **Visual Aids** — Type "draw a cat" or click the sparkles icon
4. **Themes** — Click settings (gear icon) and try different themes
5. **Languages** — Change language in settings
6. **Offline Mode** — Try the "Offline Challenge" feature

### Expected Behavior:
- First response may take 3-5 seconds (AI processing)
- Voice input works best in Chrome/Edge
- Image generation takes 10-15 seconds
- All features work without internet after initial load (except AI chat)

## 🔧 Troubleshooting

### "API key not valid" error
- Double-check the key was copied correctly (no extra spaces)
- Make sure the key is in the `.env` file, not `.env.example`
- Restart the dev server after editing `.env`

### "npm: command not found"
- Install Node.js from: https://nodejs.org/
- Restart terminal after installation

### Port 3000 already in use
- Change port in `vite.config.ts`: `port: 3001`
- Or stop other apps using port 3000

### Voice input not working
- Grant microphone permission when browser asks
- Use Chrome or Edge (best support)
- Ensure HTTPS or localhost (required for microphone)

## 📊 API Usage Limits

The free Gemini API has these limits:
- **15 requests per minute**
- **1,500 requests per day**
- **1 million tokens per day**

This is more than enough for evaluation. If you hit limits, wait 1 minute or add a second API key to `.env` as `GEMINI_API_KEY_1`.

## 🎯 Evaluation Checklist

- [ ] Project runs without errors
- [ ] AI chat responds correctly
- [ ] Voice input transcribes speech
- [ ] Visual aids generate images
- [ ] Multiple themes work
- [ ] Language switching works
- [ ] Offline knowledge base accessible
- [ ] Code is well-structured and documented

## 📧 Support

If you encounter issues during evaluation, the students can be reached at:
[Add your DSU email here]

---

**Estimated Setup Time**: 5-10 minutes  
**Recommended Browser**: Chrome or Edge  
**Recommended OS**: Windows, macOS, or Linux (all supported)
