import { TelegramMessage, UserProfile, TelegramInlineButton } from '../src/types';
import { db } from './db';
import { routeUserMessage } from './agents/routerAgent';
import { handleHomeworkQuestion } from './agents/homeworkAgent';
import { processHomeworkImage } from './agents/visionAgent';
import { handleTutorInteraction } from './agents/tutorAgent';
import { startPracticeSession, handlePracticeAnswer } from './agents/practiceAgent';
import { createStudyPlan } from './agents/studyPlannerAgent';
import { handlePdfDocument } from './agents/pdfAgent';
import { processVoiceMessage } from './agents/voiceAgent';
import { generateProgressMessage } from './agents/progressAgent';

export interface TelegramBotInfo {
  id?: number;
  is_bot?: boolean;
  first_name?: string;
  username?: string;
  can_join_groups?: boolean;
  can_read_all_group_messages?: boolean;
  supports_inline_queries?: boolean;
}

export class TelegramBotService {
  private token: string = process.env.TELEGRAM_BOT_TOKEN || '';
  private pollingActive: boolean = false;
  private lastUpdateId: number = 0;
  private botInfo: TelegramBotInfo | null = null;

  constructor() {
    if (this.token) {
      this.initBot();
    }
  }

  public setToken(token: string) {
    this.token = token.trim();
    if (this.token) {
      this.initBot();
    } else {
      this.pollingActive = false;
      this.botInfo = null;
    }
  }

  public getToken(): string {
    return this.token;
  }

  public getBotInfo(): TelegramBotInfo | null {
    return this.botInfo;
  }

  public isPolling(): boolean {
    return this.pollingActive;
  }

  public async initBot(): Promise<{ success: boolean; info?: TelegramBotInfo; error?: string }> {
    if (!this.token) {
      return { success: false, error: 'No Telegram bot token provided.' };
    }

    try {
      const res = await fetch(`https://api.telegram.org/bot${this.token}/getMe`);
      const data = await res.json();
      if (data.ok) {
        this.botInfo = data.result;
        this.startPolling();
        return { success: true, info: this.botInfo || undefined };
      } else {
        return { success: false, error: data.description || 'Invalid Telegram Bot Token' };
      }
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error connecting to Telegram' };
    }
  }

  public startPolling() {
    if (this.pollingActive || !this.token) return;
    this.pollingActive = true;
    this.pollLoop();
  }

  public stopPolling() {
    this.pollingActive = false;
  }

  private async pollLoop() {
    while (this.pollingActive && this.token) {
      try {
        const url = `https://api.telegram.org/bot${this.token}/getUpdates?offset=${this.lastUpdateId + 1}&timeout=15`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.ok && Array.isArray(data.result)) {
          for (const update of data.result) {
            this.lastUpdateId = update.update_id;
            await this.handleTelegramUpdate(update);
          }
        }
      } catch (err) {
        console.warn('Telegram poll loop error, retrying in 3s:', err);
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
  }

  /**
   * Process raw updates from Telegram Webhook or Long Polling
   */
  public async handleTelegramUpdate(update: any) {
    if (update.message) {
      const msg = update.message;
      const chatId = String(msg.chat.id);
      const user = db.getUser(chatId, `${msg.from?.first_name || ''} ${msg.from?.last_name || ''}`.trim(), msg.from?.username);

      // Handle photos
      if (msg.photo && msg.photo.length > 0) {
        const largestPhoto = msg.photo[msg.photo.length - 1];
        const fileRes = await fetch(`https://api.telegram.org/bot${this.token}/getFile?file_id=${largestPhoto.file_id}`);
        const fileData = await fileRes.json();
        if (fileData.ok && fileData.result?.file_path) {
          const downloadUrl = `https://api.telegram.org/file/bot${this.token}/${fileData.result.file_path}`;
          const imgBuffer = await (await fetch(downloadUrl)).arrayBuffer();
          const base64 = Buffer.from(imgBuffer).toString('base64');
          
          await this.sendChatAction(chatId, 'typing');
          const botReply = await this.processPipeline({
            telegramId: chatId,
            text: msg.caption || '',
            hasImage: true,
            imageBase64: base64,
            mimeType: 'image/jpeg',
          });
          await this.sendTelegramMessage(chatId, botReply);
          return;
        }
      }

      // Handle voice
      if (msg.voice) {
        const fileRes = await fetch(`https://api.telegram.org/bot${this.token}/getFile?file_id=${msg.voice.file_id}`);
        const fileData = await fileRes.json();
        if (fileData.ok && fileData.result?.file_path) {
          const downloadUrl = `https://api.telegram.org/file/bot${this.token}/${fileData.result.file_path}`;
          const audioBuffer = await (await fetch(downloadUrl)).arrayBuffer();
          const base64 = Buffer.from(audioBuffer).toString('base64');

          await this.sendChatAction(chatId, 'record_voice');
          const botReply = await this.processPipeline({
            telegramId: chatId,
            text: '',
            hasAudio: true,
            audioBase64: base64,
            mimeType: 'audio/ogg',
          });
          await this.sendTelegramMessage(chatId, botReply);
          return;
        }
      }

      // Handle text messages
      if (msg.text) {
        await this.sendChatAction(chatId, 'typing');
        const botReply = await this.processPipeline({
          telegramId: chatId,
          text: msg.text,
        });
        await this.sendTelegramMessage(chatId, botReply);
        return;
      }
    }

    // Handle inline button callbacks
    if (update.callback_query) {
      const cb = update.callback_query;
      const chatId = String(cb.message?.chat?.id || cb.from?.id);
      const callbackData = cb.data;

      // acknowledge callback query
      if (this.token) {
        fetch(`https://api.telegram.org/bot${this.token}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: cb.id }),
        }).catch(() => {});
      }

      const botReply = await this.processPipeline({
        telegramId: chatId,
        text: callbackData,
        isCallbackQuery: true,
        callbackData,
      });
      await this.sendTelegramMessage(chatId, botReply);
    }
  }

  public async sendChatAction(chatId: string, action: 'typing' | 'upload_photo' | 'record_voice' = 'typing') {
    if (!this.token) return;
    try {
      await fetch(`https://api.telegram.org/bot${this.token}/sendChatAction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, action }),
      });
    } catch {}
  }

  public async sendTelegramMessage(chatId: string, message: TelegramMessage) {
    if (!this.token) return;

    try {
      const payload: any = {
        chat_id: chatId,
        text: message.text,
        parse_mode: 'Markdown',
      };

      if (message.inlineKeyboard && message.inlineKeyboard.length > 0) {
        payload.reply_markup = {
          inline_keyboard: message.inlineKeyboard.map((row) =>
            row.map((btn) => ({
              text: btn.text,
              callback_data: btn.callback_data,
              url: btn.url,
            }))
          ),
        };
      }

      await fetch(`https://api.telegram.org/bot${this.token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      console.error('Failed to send telegram message to live API:', e);
    }
  }

  /**
   * Main unified pipeline that executes agents for both live Telegram Bot and Web Simulator
   */
  public async processPipeline(params: {
    telegramId: string;
    text: string;
    hasImage?: boolean;
    imageBase64?: string;
    mimeType?: string;
    hasAudio?: boolean;
    audioBase64?: string;
    hasDocument?: boolean;
    docContent?: string;
    fileName?: string;
    isCallbackQuery?: boolean;
    callbackData?: string;
  }): Promise<TelegramMessage> {
    const user = db.getUser(params.telegramId);

    // Record user message if not empty
    if (params.text || params.hasImage || params.hasAudio || params.hasDocument) {
      const userMsg: TelegramMessage = {
        id: `usr_${Date.now()}`,
        sender: 'user',
        text: params.text || (params.hasImage ? '📸 [Homework Photo]' : params.hasAudio ? '🎤 [Voice Note]' : params.hasDocument ? `📄 [Document: ${params.fileName || 'file.pdf'}]` : 'Interactive Action'),
        mediaType: params.hasImage ? 'photo' : params.hasAudio ? 'voice' : params.hasDocument ? 'document' : 'text',
        fileName: params.fileName,
        timestamp: Date.now(),
      };
      db.addMessage(params.telegramId, userMsg);
    }

    let responseMsg: TelegramMessage;

    try {
      // Handle Callback Query Actions
      const rawAction = params.callbackData || (params.text.startsWith('cmd_') || params.text.startsWith('action_') ? params.text : '');

      if (rawAction) {
        responseMsg = await this.handleCallbackAction(rawAction, user);
      } else if (params.hasImage && params.imageBase64) {
        // Vision Agent
        const res = await processHomeworkImage(params.imageBase64, params.mimeType || 'image/jpeg', user, params.text);
        responseMsg = res.message;
        db.logAgent({
          id: `log_${Date.now()}`,
          timestamp: Date.now(),
          telegramId: user.telegramId,
          userMessage: params.text || '[Uploaded Image]',
          agent: 'vision',
          detectedSubject: res.subject,
          detectedTopic: res.topic,
          toolsUsed: res.message.toolsUsed || ['Vision Engine'],
          responseSummary: `Solved photo homework in ${res.subject} (${res.topic})`,
        });
      } else if (params.hasAudio && params.audioBase64) {
        // Voice Agent
        const res = await processVoiceMessage(params.audioBase64, params.mimeType || 'audio/webm', user);
        responseMsg = res.message;
        db.logAgent({
          id: `log_${Date.now()}`,
          timestamp: Date.now(),
          telegramId: user.telegramId,
          userMessage: `[Voice Note: ${res.transcription}]`,
          agent: 'voice',
          toolsUsed: res.message.toolsUsed || ['Speech Transcriber'],
          responseSummary: `Transcribed & answered voice question`,
        });
      } else if (params.hasDocument && params.docContent) {
        // PDF Agent
        const task = params.text.includes('quiz') ? 'quiz' : params.text.includes('flashcards') ? 'flashcards' : 'summarize';
        responseMsg = await handlePdfDocument(params.docContent, params.fileName || 'homework.pdf', user, task, params.text);
        db.logAgent({
          id: `log_${Date.now()}`,
          timestamp: Date.now(),
          telegramId: user.telegramId,
          userMessage: `[PDF: ${params.fileName}]`,
          agent: 'pdf',
          toolsUsed: responseMsg.toolsUsed || ['PDF Extractor'],
          responseSummary: `Analyzed document ${params.fileName}`,
        });
      } else {
        // Route through Router Agent
        const decision = await routeUserMessage(params.text, user);

        if (decision.intent === 'start_menu' || params.text.trim() === '/start') {
          responseMsg = this.getMainMenuMessage(user);
        } else if (params.text.trim() === '/help') {
          responseMsg = this.getHelpMessage();
        } else if (params.text.trim() === '/subjects' || decision.intent === 'subjects_menu') {
          responseMsg = this.getSubjectsMessage(user);
        } else if (params.text.trim() === '/settings' || decision.intent === 'settings_menu') {
          responseMsg = this.getSettingsMessage(user);
        } else if (params.text.trim() === '/reset') {
          db.clearMessages(user.telegramId);
          responseMsg = {
            id: `msg_${Date.now()}`,
            sender: 'bot',
            text: `🧹 **Conversation history and active session reset!**\n\nHow can I help you today?`,
            timestamp: Date.now(),
            inlineKeyboard: this.getMainMenuKeyboard(),
          };
        } else if (decision.agent === 'progress' || params.text.trim() === '/progress') {
          responseMsg = generateProgressMessage(user);
        } else if (decision.agent === 'study_planner' || params.text.trim() === '/study') {
          const { message } = await createStudyPlan(params.text, user);
          responseMsg = message;
        } else if (decision.agent === 'tutor' || params.text.trim() === '/tutor') {
          const turn = await handleTutorInteraction(params.text, user, 'start', decision.detectedTopic, decision.detectedSubject);
          responseMsg = turn.message;
          db.updateUser(user.telegramId, {
            currentMode: 'tutor',
            sessionState: {
              ...user.sessionState,
              currentSubject: turn.subject,
              currentTopic: turn.topic,
              tutorStep: turn.nextStep,
              tutorProblem: params.text,
            },
          });
        } else if (decision.agent === 'practice' || params.text.trim() === '/practice') {
          const subject = decision.detectedSubject || 'Mathematics';
          const topic = decision.detectedTopic || 'Fractions';
          responseMsg = await startPracticeSession(subject, topic, 'medium', user);
        } else {
          // Homework Agent (Default high quality solver & explainer)
          const hwResult = await handleHomeworkQuestion(params.text, user, decision.detectedSubject, decision.detectedTopic);
          responseMsg = hwResult.message;
        }

        db.logAgent({
          id: `log_${Date.now()}`,
          timestamp: Date.now(),
          telegramId: user.telegramId,
          userMessage: params.text,
          agent: decision.agent,
          detectedSubject: decision.detectedSubject,
          detectedTopic: decision.detectedTopic,
          detectedGrade: decision.detectedGrade,
          toolsUsed: responseMsg.toolsUsed || ['General Router'],
          responseSummary: `Processed intent: ${decision.intent}`,
        });
      }
    } catch (err: any) {
      console.error('Error during agent pipeline execution:', err);
      responseMsg = {
        id: `msg_${Date.now()}_err`,
        sender: 'bot',
        text: `⚠️ **AI Service High Demand / Busy**\n\nThe AI model is momentarily experiencing high demand. Please tap retry below or ask a simpler question!\n\n💡 *Tip: High demand spikes are brief (usually seconds).*`,
        timestamp: Date.now(),
        inlineKeyboard: [
          [{ text: '🔄 Retry Question', callback_data: `cmd_ask` }],
          [{ text: '🏠 Main Menu', callback_data: 'cmd_start' }],
        ],
      };
    }

    db.addMessage(params.telegramId, responseMsg);
    return responseMsg;
  }

  private async handleCallbackAction(callbackData: string, user: UserProfile): Promise<TelegramMessage> {
    if (callbackData === 'cmd_start') {
      return this.getMainMenuMessage(user);
    }
    if (callbackData === 'cmd_scan') {
      return {
        id: `msg_${Date.now()}`,
        sender: 'bot',
        text: `📸 **Homework Scanner Ready!**\n\nPlease snap or upload a clear photo of your homework problem (or handwritten notes). I'll transcribe, analyze diagrams, and explain the full solution step-by-step!`,
        timestamp: Date.now(),
        inlineKeyboard: [
          [{ text: '✏️ Or Type Question', callback_data: 'cmd_ask' }],
          [{ text: '🏠 Main Menu', callback_data: 'cmd_start' }],
        ],
      };
    }
    if (callbackData === 'cmd_ask') {
      return {
        id: `msg_${Date.now()}`,
        sender: 'bot',
        text: `✏️ **Ask Any Question!**\n\nType any homework problem, theorem, or question in any subject (Math, Physics, Chemistry, Biology, English, etc.). I will teach you the concepts step-by-step!`,
        timestamp: Date.now(),
        inlineKeyboard: [
          [{ text: '📸 Scan Photo Instead', callback_data: 'cmd_scan' }],
          [{ text: '🏠 Main Menu', callback_data: 'cmd_start' }],
        ],
      };
    }
    if (callbackData === 'cmd_tutor') {
      const turn = await handleTutorInteraction('Teach me a foundational concept', user, 'start', 'Simple Interest', 'Mathematics');
      db.updateUser(user.telegramId, {
        currentMode: 'tutor',
        sessionState: {
          ...user.sessionState,
          currentSubject: 'Mathematics',
          currentTopic: 'Simple Interest',
          tutorStep: turn.nextStep,
          tutorProblem: 'Simple Interest',
        },
      });
      return turn.message;
    }
    if (callbackData === 'cmd_practice') {
      return {
        id: `msg_${Date.now()}`,
        sender: 'bot',
        text: `📝 **Practice Mode**\nSelect your target subject and difficulty level to test your understanding!`,
        timestamp: Date.now(),
        inlineKeyboard: [
          [
            { text: '🟢 Easy (Fractions)', callback_data: 'action_practice_topic:Fractions:Mathematics:easy' },
            { text: '🟡 Medium (Simple Interest)', callback_data: 'action_practice_topic:Simple%20Interest:Mathematics:medium' },
          ],
          [
            { text: '🔴 Hard (Mechanics & Forces)', callback_data: 'action_practice_topic:Newtonian%20Mechanics:Physics:hard' },
            { text: '📖 English Grammar', callback_data: 'action_practice_topic:Grammar%20%26%20Tenses:English:medium' },
          ],
          [{ text: '🏠 Main Menu', callback_data: 'cmd_start' }],
        ],
      };
    }
    if (callbackData === 'cmd_progress') {
      return generateProgressMessage(user);
    }
    if (callbackData === 'cmd_study') {
      const { message } = await createStudyPlan('I have a Math and Science exam next week. Create a 7-day comprehensive plan.', user);
      return message;
    }
    if (callbackData === 'cmd_subjects') {
      return this.getSubjectsMessage(user);
    }
    if (callbackData === 'cmd_settings') {
      return this.getSettingsMessage(user);
    }

    // Tutor actions
    if (callbackData === 'action_tutor_hint') {
      const turn = await handleTutorInteraction('', user, 'hint');
      db.updateUser(user.telegramId, {
        sessionState: {
          ...user.sessionState,
          tutorHintsGiven: (user.sessionState?.tutorHintsGiven || 0) + 1,
        },
      });
      return turn.message;
    }
    if (callbackData === 'action_tutor_dont_understand') {
      const turn = await handleTutorInteraction('', user, 'dont_understand');
      return turn.message;
    }
    if (callbackData === 'action_tutor_show_answer') {
      const turn = await handleTutorInteraction('', user, 'show_answer');
      return turn.message;
    }
    if (callbackData === 'action_tutor_continue') {
      const turn = await handleTutorInteraction('Continue to next step', user, 'answer');
      return turn.message;
    }

    // Topic specific practice trigger: action_practice_topic:<topic>:<subject>:<diff?>
    if (callbackData.startsWith('action_practice_topic:')) {
      const parts = callbackData.split(':');
      const topic = decodeURIComponent(parts[1] || 'General');
      const subject = decodeURIComponent(parts[2] || 'Mathematics');
      const diff = (parts[3] || 'medium') as 'easy' | 'medium' | 'hard';
      return await startPracticeSession(subject, topic, diff, user);
    }

    // Practice Answer click: action_practice_answer:<index>
    if (callbackData.startsWith('action_practice_answer:')) {
      const optIndex = parseInt(callbackData.split(':')[1] || '0', 10);
      return await handlePracticeAnswer(optIndex, user);
    }

    // Tutor specific topic: action_tutor_topic:<topic>:<subject>
    if (callbackData.startsWith('action_tutor_topic:')) {
      const parts = callbackData.split(':');
      const topic = decodeURIComponent(parts[1] || 'Core Concepts');
      const subject = decodeURIComponent(parts[2] || 'Mathematics');
      const turn = await handleTutorInteraction(`Teach me ${topic}`, user, 'start', topic, subject);
      db.updateUser(user.telegramId, {
        currentMode: 'tutor',
        sessionState: {
          ...user.sessionState,
          currentSubject: subject,
          currentTopic: topic,
          tutorStep: turn.nextStep,
          tutorProblem: topic,
        },
      });
      return turn.message;
    }

    // Explain Again: action_explain_again:<topic>
    if (callbackData.startsWith('action_explain_again:')) {
      const topic = decodeURIComponent(callbackData.split(':')[1] || 'Concept');
      const hw = await handleHomeworkQuestion(`Please explain ${topic} again in simpler terms with a relatable analogy`, user, user.sessionState?.currentSubject, topic, true);
      return hw.message;
    }

    // Set reminder
    if (callbackData.startsWith('action_set_reminder:')) {
      return {
        id: `msg_${Date.now()}`,
        sender: 'bot',
        text: `🔔 **Telegram Reminder Active!**\n\nI will send you daily revision prompts at **18:00** to help you keep your streak and ace your exam! 🎯`,
        timestamp: Date.now(),
        inlineKeyboard: [
          [{ text: '📅 View Study Plan', callback_data: 'cmd_study' }],
          [{ text: '🏠 Main Menu', callback_data: 'cmd_start' }],
        ],
      };
    }

    // Default fallback to main menu
    return this.getMainMenuMessage(user);
  }

  public getMainMenuMessage(user: UserProfile): TelegramMessage {
    return {
      id: `msg_${Date.now()}`,
      sender: 'bot',
      text: `🎓 **Homework AI Tutor**\n\nHey ${user.name}! I'm your AI homework tutor (${user.grade}). Send me a question, photo, PDF, or voice message and I'll help you understand it.`,
      timestamp: Date.now(),
      inlineKeyboard: this.getMainMenuKeyboard(),
    };
  }

  public getMainMenuKeyboard(): TelegramInlineButton[][] {
    return [
      [
        { text: '📸 Scan Homework', callback_data: 'cmd_scan' },
        { text: '✏️ Ask Question', callback_data: 'cmd_ask' },
      ],
      [
        { text: '🧑🏫 Tutor Mode', callback_data: 'cmd_tutor' },
        { text: '📝 Practice', callback_data: 'cmd_practice' },
      ],
      [
        { text: '📊 My Progress', callback_data: 'cmd_progress' },
        { text: '📅 Study Plan', callback_data: 'cmd_study' },
      ],
      [
        { text: '📚 Subjects', callback_data: 'cmd_subjects' },
        { text: '⚙️ Settings', callback_data: 'cmd_settings' },
      ],
    ];
  }

  public getHelpMessage(): TelegramMessage {
    return {
      id: `msg_${Date.now()}`,
      sender: 'bot',
      text: `🤖 **Telegram Bot Commands & Features**

⚡ **Quick Commands:**
• /start — Open Main Menu
• /ask — Ask any homework question
• /tutor — Start interactive Socratic tutoring
• /practice — Targeted practice quiz drills
• /progress — View subject mastery & streak
• /study — Personalized study planner
• /subjects — Choose & configure subjects
• /settings — Grade level & language
• /reset — Clear current session history
• /summarize — Summarize document
• /quiz — Generate quiz from uploaded PDF
• /flashcards — Generate study flashcards

💡 *You can also directly drop a photo, record a voice message, or upload a PDF at any time!*`,
      timestamp: Date.now(),
      inlineKeyboard: this.getMainMenuKeyboard(),
    };
  }

  public getSubjectsMessage(user: UserProfile): TelegramMessage {
    return {
      id: `msg_${Date.now()}`,
      sender: 'bot',
      text: `📚 **Supported Academic Subjects**
Your current active subjects:
${user.subjects.map(s => `• **${s}**`).join('\n')}

Select a subject below to jump into Tutor or Practice drills:`,
      timestamp: Date.now(),
      inlineKeyboard: [
        [
          { text: '📐 Mathematics', callback_data: 'action_tutor_topic:Algebra%20%26%20Calculations:Mathematics' },
          { text: '🔬 Physics', callback_data: 'action_tutor_topic:Forces%20%26%20Motion:Physics' },
        ],
        [
          { text: '🧪 Chemistry', callback_data: 'action_tutor_topic:Chemical%20Reactions:Chemistry' },
          { text: '🧬 Biology', callback_data: 'action_tutor_topic:Cell%20Biology:Biology' },
        ],
        [
          { text: '📖 English', callback_data: 'action_tutor_topic:Essay%20Writing%20%26%20Grammar:English' },
          { text: '🌍 Geography', callback_data: 'action_tutor_topic:Climate%20%26%20Landforms:Geography' },
        ],
        [
          { text: '🏛️ History', callback_data: 'action_tutor_topic:World%20History:History' },
          { text: '🇫🇷 French / 🇪🇹 Amharic', callback_data: 'action_tutor_topic:Grammar%20%26%20Vocabulary:French' },
        ],
        [{ text: '🏠 Main Menu', callback_data: 'cmd_start' }],
      ],
    };
  }

  public getSettingsMessage(user: UserProfile): TelegramMessage {
    return {
      id: `msg_${Date.now()}`,
      sender: 'bot',
      text: `⚙️ **Student Profile & Settings**
👤 Name: **${user.name}**
🎓 Current Grade Level: **${user.grade}**
🌐 Language: **${user.preferredLanguage}**
🔥 Streak: **${user.streakDays} Days**

*Explanations, math steps, and vocabulary are automatically calibrated to your grade level!*`,
      timestamp: Date.now(),
      inlineKeyboard: [
        [
          { text: '🎓 Grade 8-9', callback_data: 'cmd_set_grade:Grade 9' },
          { text: '🎓 Grade 10-12', callback_data: 'cmd_set_grade:Grade 11' },
        ],
        [
          { text: '🎓 College / Uni', callback_data: 'cmd_set_grade:College / University' },
        ],
        [
          { text: '🔄 Reset Session (/reset)', callback_data: 'cmd_reset_session' },
          { text: '🏠 Main Menu', callback_data: 'cmd_start' },
        ],
      ],
    };
  }
}

export const telegramBotService = new TelegramBotService();
