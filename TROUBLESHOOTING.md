# Troubleshooting Guide

## Common Issues and Solutions

### 1. "431 Request Header Fields Too Large" Error

**Cause**: Your browser's localStorage has grown too large (usually from extensive chat history), causing HTTP headers to exceed the server's limit.

**Solutions** (try in order):

#### Option A: Automatic Cleanup (Recommended)
The app now automatically cleans localStorage on startup if it exceeds 4MB. Simply:
1. Refresh the page (F5 or Ctrl+R)
2. The app will detect and clean up automatically

#### Option B: Manual Clear via Browser
1. Open Developer Tools (F12)
2. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
3. Click **Local Storage** → `http://localhost:3000`
4. Click **Clear All** button
5. Refresh the page

#### Option C: Use Clear Storage Page
1. Visit: `http://localhost:3000/clear-storage.html`
2. Click "Clear Storage & Reload"
3. You'll be redirected to the app

#### Option D: Clear via Console
1. Open Developer Tools (F12)
2. Go to **Console** tab
3. Type: `localStorage.clear()` and press Enter
4. Refresh the page

**Prevention**: The app now limits localStorage size automatically, but you can manually clear old chats periodically via the sidebar.

---

### 2. Voice Input Not Working

**Cause**: Microphone permissions not granted or browser doesn't support Web Speech API.

**Solutions**:
- **Grant Permission**: Click "Allow" when browser asks for microphone access
- **Use Chrome/Edge**: These browsers have the best Web Speech API support
- **Check HTTPS**: Voice input requires HTTPS or localhost
- **Fallback**: The app automatically falls back to Gemini AI transcription if offline STT fails

---

### 3. API Quota Exceeded

**Cause**: You've hit the daily limit for your Gemini API key.

**Solutions**:
- **Wait**: Free tier resets daily (1,500 requests/day)
- **Add More Keys**: Add additional keys to `.env` as `GEMINI_API_KEY_2`, `GEMINI_API_KEY_3`, etc.
- **Use OpenRouter**: Add OpenRouter keys as fallback (see `.env.example`)

---

### 4. Images Not Generating

**Cause**: Image generation quota exceeded or model unavailable.

**Solutions**:
- **Check Quota**: Gemini Imagen has separate quotas from text generation
- **Try Pollinations**: Switch image provider in Settings → Image Provider → Pollinations
- **Wait and Retry**: Some models have rate limits, try again in a few minutes

---

### 5. "npm install" Fails

**Cause**: Node.js version incompatibility or network issues.

**Solutions**:
- **Update Node.js**: Requires Node.js 18+ (check with `node --version`)
- **Clear Cache**: Run `npm cache clean --force`
- **Delete node_modules**: Remove `node_modules` folder and `package-lock.json`, then run `npm install` again
- **Check Network**: Ensure you have internet connection

---

### 6. Port 3000 Already in Use

**Cause**: Another application is using port 3000.

**Solutions**:
- **Change Port**: Edit `vite.config.ts` and change `port: 3000` to `port: 3001`
- **Kill Process**: 
  - Windows: `netstat -ano | findstr :3000` then `taskkill /PID <PID> /F`
  - Mac/Linux: `lsof -ti:3000 | xargs kill -9`

---

### 7. TypeScript Errors

**Cause**: Type mismatches or missing dependencies.

**Solutions**:
- **Check Types**: Run `npm run lint` to see all TypeScript errors
- **Reinstall**: Delete `node_modules` and run `npm install`
- **Update**: Run `npm update` to update dependencies

---

### 8. Build Fails

**Cause**: Missing environment variables or build configuration issues.

**Solutions**:
- **Check .env**: Ensure `.env` file exists and has required keys
- **Clear Cache**: Delete `dist` folder and `.vite` cache
- **Rebuild**: Run `npm run build` again

---

## Getting Help

If none of these solutions work:

1. **Check Console**: Open Developer Tools (F12) → Console tab for error messages
2. **Check Network**: Developer Tools → Network tab to see failed requests
3. **Clear Everything**: Clear browser cache, localStorage, and cookies
4. **Fresh Start**: Delete `node_modules`, `.vite`, `dist`, run `npm install` and `npm run dev`

## Performance Tips

- **Clear Old Chats**: Delete old conversations from the sidebar to reduce localStorage size
- **Disable Extensions**: Some browser extensions can interfere with the app
- **Use Incognito**: Test in incognito/private mode to rule out extension issues
- **Update Browser**: Ensure you're using the latest version of Chrome/Edge

---

**Still having issues?** Check the [GitHub Issues](https://github.com/A-ojasvin215/dyslearn.AI/issues) or create a new issue with:
- Error message (from console)
- Browser and version
- Steps to reproduce
- Screenshots if applicable
