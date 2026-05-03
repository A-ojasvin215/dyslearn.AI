import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type ApiResponse<T> = { success: boolean; message?: string; data?: T };

type UserRecord = {
  userId: string;
  email?: string;
  passwordHash?: string;
  theme: string;
  background_style: string;
  language: string;
  voice_uri: string | null;
  custom_instructions_about_user: string;
  custom_instructions_how_to_respond: string;
  notifications_enabled: boolean;
  total_points: number;
  skill_vocabulary: number;
  skill_grammar: number;
  skill_spelling: number;
  skill_phonetics: number;
  skill_creativity: number;
  skill_logic: number;
  skill_math: number;
  enable_image_generation: boolean;
  enable_daily_time_limit: boolean;
  selected_image_provider: string;
  selected_image_model: string;
  dyslexia_enabled: boolean;
  dyslexia_ruler_enabled: boolean;
  dyslexia_hover_speech_enabled: boolean;
  dyslexia_font_size: number;
  dyslexia_line_spacing: number;
  dyslexia_letter_spacing: number;
  dyslexia_word_spacing: number;
  dyslexia_speech_rate: number;
  dino_highscore?: number;
  flappy_highscore?: number;
  tetris_highscore?: number;
};

type ChatRecord = {
  session_id: string;
  user_id: string;
  title: string;
  challenge_id: string | null;
  challenge_system_prompt?: string;
  created_at: number;
  messages: MessageRecord[];
};

type MessageRecord = {
  message_id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  image_url: string | null;
  base64_data: string | null;
  mime_type: string | null;
  attachment_name: string | null;
  attachment_type: string | null;
  is_loading: boolean;
};

type ProgressEntry = {
  date_str: string;
  points_earned: number;
  games_played: number;
  minutes_played: number;
};

// NOTE: In-memory store. Data resets on cold starts.
// For persistence, swap these Maps with a database (e.g. Vercel KV, Supabase, Neon).
const usersById = new Map<string, UserRecord>();
const userIdByEmail = new Map<string, string>();
const chatsBySessionId = new Map<string, ChatRecord>();
const progressByUserId = new Map<string, ProgressEntry[]>();

// --- PERSISTENCE LAYER ---
const DB_PATH = path.resolve(__dirname, '../data/db.json');

// Stub functions for database operations (not using Databricks in this version)
function isConnected(): boolean {
  return false; // Always use in-memory storage
}

async function runExec(_query: string, _params: any[]): Promise<void> {
  // Stub - not implemented
  return Promise.resolve();
}

function saveLocalData() {
  saveData(); // Use the existing saveData function
}

function saveData() {
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    const data = {
      users: Array.from(usersById.entries()),
      emails: Array.from(userIdByEmail.entries()),
      chats: Array.from(chatsBySessionId.entries()),
      progress: Array.from(progressByUserId.entries()),
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Failed to save database:", err);
  }
}

function loadData() {
  try {
    if (!fs.existsSync(DB_PATH)) return;
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    const data = JSON.parse(raw);
    
    if (data.users) data.users.forEach(([k, v]: [string, UserRecord]) => usersById.set(k, v));
    if (data.emails) data.emails.forEach(([k, v]: [string, string]) => userIdByEmail.set(k, v));
    if (data.chats) data.chats.forEach(([k, v]: [string, ChatRecord]) => chatsBySessionId.set(k, v));
    if (data.progress) data.progress.forEach(([k, v]: [string, ProgressEntry[]]) => progressByUserId.set(k, v));
    
    console.log(`✅ Loaded ${usersById.size} users and ${chatsBySessionId.size} chats from persistence.`);
  } catch (err) {
    console.error("Failed to load database:", err);
  }
}

loadData();
// --- END PERSISTENCE ---

function getDefaultUser(userId: string): UserRecord {
  return {
    userId,
    theme: 'light',
    background_style: 'none',
    language: 'en',
    voice_uri: null,
    custom_instructions_about_user: '',
    custom_instructions_how_to_respond: '',
    notifications_enabled: false,
    total_points: 0,
    skill_vocabulary: 0,
    skill_grammar: 0,
    skill_spelling: 0,
    skill_phonetics: 0,
    skill_creativity: 0,
    skill_logic: 0,
    skill_math: 0,
    enable_image_generation: true,
    enable_daily_time_limit: false,
    selected_image_provider: 'gemini',
    selected_image_model: 'models/gemini-2.0-flash-exp',
    dyslexia_enabled: false,
    dyslexia_ruler_enabled: false,
    dyslexia_hover_speech_enabled: false,
    dyslexia_font_size: 1,
    dyslexia_line_spacing: 1.5,
    dyslexia_letter_spacing: 0,
    dyslexia_word_spacing: 0,
    dyslexia_speech_rate: 1,
  };
}

function ensureUser(userId: string): UserRecord {
  const existing = usersById.get(userId);
  if (existing) return existing;
  const created = getDefaultUser(userId);
  usersById.set(userId, created);
  return created;
}

const ok = <T>(data: T): ApiResponse<T> => ({ success: true, data });
const fail = (message: string): ApiResponse<never> => ({ success: false, message });

const app = express();
export { app };
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve static files from the 'dist' directory
const distPath = path.resolve(__dirname, '../dist');
app.use(express.static(distPath));

// Health check
app.get('/api/test-databricks', (_req, res) => res.json(ok({ ok: true })));

// Auth
app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json(fail('Email and password are required.'));
  if (userIdByEmail.has(email)) return res.status(409).json(fail('Email already registered.'));
  const userId = randomUUID();
  const passwordHash = await bcrypt.hash(password, 10);
  const user = getDefaultUser(userId);
  user.email = email;
  user.passwordHash = passwordHash;
  usersById.set(userId, user);
  userIdByEmail.set(email, userId);
  saveData();
  res.json(ok({ userId, email }));
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json(fail('Email and password are required.'));
  const userId = userIdByEmail.get(email);
  if (!userId) return res.status(401).json(fail('Invalid email or password.'));
  const user = usersById.get(userId);
  if (!user?.passwordHash) return res.status(401).json(fail('Invalid email or password.'));
  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) return res.status(401).json(fail('Invalid email or password.'));
  res.json(ok({ userId, email }));
});

// User settings
app.get('/api/user/:userId', (req, res) => {
  res.json(ok(ensureUser(req.params.userId)));
});

app.post('/api/user/:userId', (req, res) => {
  const user = ensureUser(req.params.userId);
  const body = (req.body || {}) as Record<string, unknown>;
  const fields: (keyof UserRecord)[] = [
    'theme', 'background_style', 'language', 'voice_uri',
    'custom_instructions_about_user', 'custom_instructions_how_to_respond',
    'notifications_enabled', 'total_points', 'enable_image_generation',
    'enable_daily_time_limit', 'selected_image_provider', 'selected_image_model',
    'skill_vocabulary', 'skill_grammar', 'skill_spelling', 'skill_phonetics',
    'skill_creativity', 'skill_logic', 'skill_math',
    'dyslexia_enabled', 'dyslexia_ruler_enabled', 'dyslexia_hover_speech_enabled',
    'dyslexia_font_size', 'dyslexia_line_spacing', 'dyslexia_letter_spacing',
    'dyslexia_word_spacing', 'dyslexia_speech_rate',
    'dino_highscore', 'flappy_highscore', 'tetris_highscore',
  ];
  fields.forEach(k => { if (body[k] !== undefined) (user as any)[k] = body[k]; });
  saveData();
  res.json(ok({}));
});

app.delete('/api/user/:userId', (req, res) => {
  const { userId } = req.params;
  usersById.delete(userId);
  for (const [email, id] of userIdByEmail.entries()) {
    if (id === userId) userIdByEmail.delete(email);
  }
  for (const [sid, chat] of chatsBySessionId.entries()) {
    if (chat.user_id === userId) chatsBySessionId.delete(sid);
  }
  progressByUserId.delete(userId);
  saveData();
  res.json(ok({}));
});

// Progress
app.get('/api/progress/:userId', (req, res) => {
  const entries = (progressByUserId.get(req.params.userId) || [])
    .sort((a, b) => b.date_str.localeCompare(a.date_str));
  res.json(ok(entries));
});

app.post('/api/progress/:userId', (req, res) => {
  const { userId } = req.params;
  const body = req.body || {};
  if (!body.date_str) return res.status(400).json(fail('date_str is required.'));
  const arr = progressByUserId.get(userId) || [];
  const idx = arr.findIndex(e => e.date_str === body.date_str);
  const next: ProgressEntry = {
    date_str: body.date_str,
    points_earned: ((idx >= 0 ? arr[idx].points_earned : 0)) + Number(body.points || 0),
    games_played: ((idx >= 0 ? arr[idx].games_played : 0)) + Number(body.games || 0),
    minutes_played: ((idx >= 0 ? arr[idx].minutes_played : 0)) + Number(body.minutes || 0),
  };
  if (idx >= 0) arr[idx] = next; else arr.unshift(next);
  progressByUserId.set(userId, arr);
  saveData();
  res.json(ok({}));
});

// Achievements
app.get('/api/user/:userId/achievements', (_req, res) => res.json(ok([])));

// Clear all chats for a user (monthly cleanup)
app.delete('/api/user/:userId/chats/clear', async (req, res) => {
  const { userId } = req.params;
  if (isConnected()) {
    await runExec(`DELETE FROM dyslearn_messages WHERE user_id = ?`, [userId]);
    await runExec(`DELETE FROM dyslearn_chats WHERE user_id = ?`, [userId]);
  } else {
    for (const [sid, chat] of chatsBySessionId.entries()) {
      if (chat.user_id === userId) chatsBySessionId.delete(sid);
    }
    saveLocalData();
  }
  res.json(ok({ cleared: true }));
});

// Chats
app.get('/api/user/:userId/chats', (req, res) => {
  const chats = Array.from(chatsBySessionId.values())
    .filter(c => c.user_id === req.params.userId)
    .sort((a, b) => (b.created_at || 0) - (a.created_at || 0)) // newest first
    .map(c => ({
      session_id: c.session_id,
      title: c.title,
      challenge_system_prompt: c.challenge_system_prompt,
      challenge_id: c.challenge_id,
      created_at: c.created_at || 0,
    }));
  res.json(ok(chats));
});

app.post('/api/chats', (req, res) => {
  const body = req.body || {};
  if (!body.session_id || !body.user_id) return res.status(400).json(fail('session_id and user_id are required.'));
  ensureUser(body.user_id);
  const existing = chatsBySessionId.get(body.session_id);
  if (existing) {
    existing.title = body.title || existing.title;
    existing.challenge_id = body.challenge_id ?? existing.challenge_id;
    saveData();
    return res.json(ok(existing));
  }
  const chat: ChatRecord = {
    session_id: body.session_id,
    user_id: body.user_id,
    title: body.title || 'New Chat',
    challenge_id: body.challenge_id ?? null,
    created_at: body.created_at || Date.now(),
    messages: [],
  };
  chatsBySessionId.set(chat.session_id, chat);
  saveData();
  res.json(ok(chat));
});

app.get('/api/chats/:sessionId', (req, res) => {
  const chat = chatsBySessionId.get(req.params.sessionId);
  if (!chat) return res.json(ok([]));
  res.json(ok(chat.messages.map(m => ({
    message_id: m.message_id, role: m.role, content: m.content,
    image_url: m.image_url, base64_data: m.base64_data, mime_type: m.mime_type,
    attachment_name: m.attachment_name, attachment_type: m.attachment_type, is_loading: m.is_loading,
  }))));
});

app.post('/api/chats/:sessionId/messages', (req, res) => {
  const chat = chatsBySessionId.get(req.params.sessionId);
  if (!chat) return res.status(404).json(fail('Chat not found.'));
  const body = req.body || {};
  if (!body.message_id || !body.user_id || !body.role || body.content === undefined)
    return res.status(400).json(fail('message_id, user_id, role, content are required.'));
  const msg: MessageRecord = {
    message_id: body.message_id,
    user_id: body.user_id,
    role: body.role === 'user' ? 'user' : 'assistant',
    content: body.content,
    image_url: body.image_url ?? null,
    base64_data: body.base64_data ?? null,
    mime_type: body.mime_type ?? null,
    attachment_name: body.attachment_name ?? null,
    attachment_type: body.attachment_type ?? null,
    is_loading: !!body.is_loading,
  };
  const idx = chat.messages.findIndex(m => m.message_id === msg.message_id);
  if (idx >= 0) chat.messages[idx] = msg; else chat.messages.push(msg);
  saveData();
  res.json(ok({}));
});

// Catch-all route to serve index.html for SPA routing
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    res.sendFile(path.resolve(__dirname, '../dist/index.html'));
  } else {
    next();
  }
});

export default function handler(req: any, res: any) {
  return app(req, res);
}
