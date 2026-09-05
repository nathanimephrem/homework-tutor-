import express from 'express';
import path from 'path';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db';
import { telegramBotService } from './server/telegramBot';
import { calculateProgress } from './server/agents/progressAgent';
import { generateSpeechAudio } from './server/gemini';

const upload = multer({
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
  storage: multer.memoryStorage(),
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // --- REST API ROUTES ---

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  // Bot Status & Info
  app.get('/api/bot/status', (req, res) => {
    const info = telegramBotService.getBotInfo();
    const token = telegramBotService.getToken();
    res.json({
      hasToken: Boolean(token),
      botUsername: info?.username,
      botFirstName: info?.first_name,
      isPolling: telegramBotService.isPolling(),
      webhookUrl: process.env.APP_URL ? `${process.env.APP_URL}/api/telegram/webhook` : undefined,
    });
  });

  // Bot Configuration (Set or test Token)
  app.post('/api/bot/configure', async (req, res) => {
    const { token } = req.body;
    if (typeof token === 'string') {
      telegramBotService.setToken(token);
      const result = await telegramBotService.initBot();
      return res.json(result);
    }
    res.status(400).json({ error: 'Token string required' });
  });

  // Live Telegram Webhook Endpoint
  app.post('/api/telegram/webhook', async (req, res) => {
    try {
      await telegramBotService.handleTelegramUpdate(req.body);
      res.json({ ok: true });
    } catch (e: any) {
      console.error('Webhook processing error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  // Web Simulator Message Endpoint (Text & Actions)
  app.post('/api/simulator/send', async (req, res) => {
    try {
      const { telegramId, text, callbackData, hasImage, imageBase64, hasAudio, audioBase64, hasDocument, docContent, fileName } = req.body;
      const userChatId = telegramId || 'student_789';

      const botReply = await telegramBotService.processPipeline({
        telegramId: userChatId,
        text: text || '',
        callbackData,
        hasImage: Boolean(hasImage || imageBase64),
        imageBase64,
        hasAudio: Boolean(hasAudio || audioBase64),
        audioBase64,
        hasDocument: Boolean(hasDocument || docContent),
        docContent,
        fileName,
      });

      res.json({
        success: true,
        message: botReply,
        user: db.getUser(userChatId),
      });
    } catch (error: any) {
      console.error('Simulator error:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal Agent error' });
    }
  });

  // Web Simulator File Upload (Photo / Audio / PDF)
  app.post('/api/simulator/upload', upload.single('file'), async (req, res) => {
    try {
      const { telegramId, fileType, text } = req.body;
      const userChatId = telegramId || 'student_789';
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const base64 = file.buffer.toString('base64');
      let botReply;

      if (fileType === 'photo' || file.mimetype.startsWith('image/')) {
        botReply = await telegramBotService.processPipeline({
          telegramId: userChatId,
          text: text || '',
          hasImage: true,
          imageBase64: base64,
          mimeType: file.mimetype,
          fileName: file.originalname,
        });
      } else if (fileType === 'voice' || file.mimetype.startsWith('audio/')) {
        botReply = await telegramBotService.processPipeline({
          telegramId: userChatId,
          text: '',
          hasAudio: true,
          audioBase64: base64,
          mimeType: file.mimetype,
          fileName: file.originalname,
        });
      } else {
        // Document / PDF text extraction or raw string
        const docText = file.mimetype === 'text/plain' 
          ? file.buffer.toString('utf-8')
          : `[Document: ${file.originalname} (${(file.size / 1024).toFixed(1)} KB)]\n` + file.buffer.toString('utf-8').replace(/[^\x20-\x7E\n\r\t]/g, ' ').slice(0, 10000);

        botReply = await telegramBotService.processPipeline({
          telegramId: userChatId,
          text: text || '/summarize',
          hasDocument: true,
          docContent: docText,
          fileName: file.originalname,
        });
      }

      res.json({
        success: true,
        message: botReply,
        user: db.getUser(userChatId),
      });
    } catch (err: any) {
      console.error('File upload agent error:', err);
      res.status(500).json({ error: err.message || 'File processing failed' });
    }
  });

  // --- AUTHENTICATION ROUTES ---
  
  // Log In
  app.post('/api/auth/login', (req, res) => {
    const { username, telegramId, query } = req.body;
    const search = query || username || telegramId;
    if (!search) {
      return res.status(400).json({ error: 'Username, Email, or Telegram ID is required.' });
    }
    const found = db.findUserByQuery(search);
    if (found) {
      return res.json({ success: true, user: found });
    }
    // If not found by query, fallback to get/create for telegramId or return not found
    if (search.startsWith('student_')) {
      const user = db.getUser(search);
      return res.json({ success: true, user });
    }
    return res.status(404).json({ error: `No student account found for "${search}". Please sign up first!` });
  });

  // Sign Up
  app.post('/api/auth/signup', (req, res) => {
    const { name, username, grade, subjects, preferredLanguage } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Student Name is required.' });
    }
    const cleanUsername = (username || name.toLowerCase().replace(/\s+/g, '_')).trim().replace(/^@/, '');
    
    // Check if user already exists
    const existing = db.findUserByQuery(cleanUsername);
    if (existing) {
      return res.json({ success: true, user: existing, isExisting: true });
    }

    const newUser = db.createUser({
      name: name.trim(),
      username: cleanUsername,
      grade: grade || 'Grade 10',
      subjects: Array.isArray(subjects) && subjects.length > 0 ? subjects : ['Mathematics', 'Physics', 'English'],
      preferredLanguage: preferredLanguage || 'English',
    });

    return res.json({ success: true, user: newUser });
  });

  // Get all registered student accounts (for demo & quick-switching)
  app.get('/api/auth/users', (req, res) => {
    const users = db.getAllUsers();
    res.json(users);
  });

  // Get User Profile
  app.get('/api/users/:telegramId', (req, res) => {
    const user = db.getUser(req.params.telegramId);
    res.json(user);
  });

  // Update User Profile
  app.post('/api/users/:telegramId/update', (req, res) => {
    const user = db.updateUser(req.params.telegramId, req.body);
    res.json(user);
  });

  // Get Messages History
  app.get('/api/users/:telegramId/messages', (req, res) => {
    const messages = db.getMessages(req.params.telegramId);
    res.json(messages);
  });

  // Reset Session History
  app.post('/api/users/:telegramId/reset', (req, res) => {
    db.clearMessages(req.params.telegramId);
    res.json({ success: true });
  });

  // Get User Progress & Analytics
  app.get('/api/users/:telegramId/progress', (req, res) => {
    const user = db.getUser(req.params.telegramId);
    const progress = calculateProgress(user);
    const practiceHistory = db.getPracticeRecords(req.params.telegramId);
    res.json({
      user,
      progress,
      practiceHistory,
    });
  });

  // Get User Study Plans
  app.get('/api/users/:telegramId/study-plans', (req, res) => {
    const plans = db.getStudyPlans(req.params.telegramId);
    res.json(plans);
  });

  // Toggle Study Plan Task
  app.post('/api/users/:telegramId/study-plans/:planId/toggle', (req, res) => {
    const { dayNumber, taskIndex } = req.body;
    const updated = db.toggleStudyTask(req.params.telegramId, req.params.planId, dayNumber, taskIndex || 0);
    res.json({ success: Boolean(updated), plan: updated });
  });

  // Get Multi-Agent Real-time Execution Logs
  app.get('/api/agents/logs', (req, res) => {
    const logs = db.getAgentLogs();
    res.json(logs);
  });

  // Generate TTS Speech
  app.post('/api/tts', async (req, res) => {
    try {
      const { text } = req.body;
      const audioBase64 = await generateSpeechAudio(text || '');
      res.json({ audioBase64 });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- VITE / STATIC SERVING ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AI Homework Tutor Telegram Bot running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
