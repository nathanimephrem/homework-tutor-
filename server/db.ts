import fs from 'fs';
import path from 'path';
import { UserProfile, TelegramMessage, PracticeSessionRecord, StudyPlan, AgentLog } from '../src/types';

interface DatabaseSchema {
  users: Record<string, UserProfile>;
  messages: Record<string, TelegramMessage[]>;
  practiceSessions: Record<string, PracticeSessionRecord[]>;
  studyPlans: Record<string, StudyPlan[]>;
  agentLogs: AgentLog[];
}

const DB_FILE = path.join(process.cwd(), 'data_store.json');

class DatabaseStore {
  private data: DatabaseSchema = {
    users: {},
    messages: {},
    practiceSessions: {},
    studyPlans: {},
    agentLogs: [],
  };

  constructor() {
    this.load();
    this.seedDefaultUsers();
  }

  private load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Database load error, initializing fresh memory store:', e);
    }
  }

  private save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error saving data store:', e);
    }
  }

  private seedDefaultUsers() {
    const demoId = 'student_789';
    if (!this.data.users[demoId]) {
      const today = new Date().toISOString().split('T')[0];
      this.data.users[demoId] = {
        telegramId: demoId,
        username: 'AlexStudent',
        name: 'Alex Johnson',
        grade: 'Grade 10',
        subjects: ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'History', 'Geography'],
        preferredLanguage: 'English',
        currentMode: 'idle',
        streakDays: 6,
        lastActiveDate: today,
        xp: 340,
        createdAt: Date.now() - 7 * 24 * 3600 * 1000,
        sessionState: {},
      };

      this.data.practiceSessions[demoId] = [
        {
          id: 'p1',
          telegramId: demoId,
          subject: 'Mathematics',
          topic: 'Fractions',
          difficulty: 'medium',
          questionsCount: 10,
          correctCount: 9,
          scorePercentage: 90,
          timestamp: Date.now() - 3600 * 1000 * 24 * 2,
        },
        {
          id: 'p2',
          telegramId: demoId,
          subject: 'Mathematics',
          topic: 'Simple Interest',
          difficulty: 'medium',
          questionsCount: 8,
          correctCount: 5,
          scorePercentage: 62.5,
          timestamp: Date.now() - 3600 * 1000 * 24,
        },
        {
          id: 'p3',
          telegramId: demoId,
          subject: 'Physics',
          topic: 'Newtonian Mechanics & Forces',
          difficulty: 'hard',
          questionsCount: 6,
          correctCount: 5,
          scorePercentage: 83.3,
          timestamp: Date.now() - 3600 * 1000 * 12,
        },
        {
          id: 'p4',
          telegramId: demoId,
          subject: 'English',
          topic: 'Active and Passive Voice',
          difficulty: 'medium',
          questionsCount: 5,
          correctCount: 5,
          scorePercentage: 100,
          timestamp: Date.now() - 3600 * 1000 * 6,
        },
      ];

      this.data.studyPlans[demoId] = [
        {
          id: 'plan_math_exam',
          telegramId: demoId,
          subject: 'Mathematics',
          targetExamDate: 'Next Friday',
          title: '7-Day Comprehensive Math Plan',
          description: 'Personalized revision covering Simple Interest, Fractions, Geometry & Mixed Practice.',
          totalDays: 7,
          reminderTime: '18:00',
          createdAt: Date.now() - 3600 * 1000 * 24 * 2,
          days: [
            { dayNumber: 1, dateLabel: 'Day 1', topics: ['Fractions & Ratios'], tasks: ['Review fraction simplification', 'Solve 5 practice problems'], completed: true },
            { dayNumber: 2, dateLabel: 'Day 2', topics: ['Percentages & Decimals'], tasks: ['Practice conversion formulas', 'Solve 5 word problems'], completed: true },
            { dayNumber: 3, dateLabel: 'Day 3', topics: ['Simple Interest'], tasks: ['Master I = P*R*T / 100', 'Work on 6 multi-step interest questions'], completed: false },
            { dayNumber: 4, dateLabel: 'Day 4', topics: ['Profit & Loss'], tasks: ['Review cost price vs selling price', 'Calculate markup percentages'], completed: false },
            { dayNumber: 5, dateLabel: 'Day 5', topics: ['Geometry & Angles'], tasks: ['Angle theorems & triangles', 'Area calculation drills'], completed: false },
            { dayNumber: 6, dateLabel: 'Day 6', topics: ['Mixed Exam Practice'], tasks: ['Timed 20-question mixed quiz', 'Review all incorrect solutions'], completed: false },
            { dayNumber: 7, dateLabel: 'Day 7', topics: ['Final Revision & Formula Sheet'], tasks: ['Quick formula recap', 'Rest and mental preparation'], completed: false },
          ],
        },
      ];

      this.data.messages[demoId] = [
        {
          id: 'msg_welcome',
          sender: 'bot',
          text: `🎓 **Homework AI Tutor**\n\nHey Alex! I'm your AI homework tutor. Send me a question, photo, PDF, or voice message and I'll help you understand it.`,
          inlineKeyboard: [
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
          ],
          timestamp: Date.now() - 3600 * 1000 * 2,
        },
      ];
      this.save();
    }
  }

  public getUser(telegramId: string, name?: string, username?: string): UserProfile {
    if (!this.data.users[telegramId]) {
      const today = new Date().toISOString().split('T')[0];
      this.data.users[telegramId] = {
        telegramId,
        username: username || `user_${telegramId}`,
        name: name || `Student ${telegramId.slice(-4)}`,
        grade: 'Grade 10',
        subjects: ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'History', 'Geography', 'French', 'Amharic'],
        preferredLanguage: 'English',
        currentMode: 'idle',
        streakDays: 1,
        lastActiveDate: today,
        xp: 50,
        createdAt: Date.now(),
        sessionState: {},
      };
      this.save();
    }
    return this.data.users[telegramId];
  }

  public updateUser(telegramId: string, updates: Partial<UserProfile>): UserProfile {
    const user = this.getUser(telegramId);
    Object.assign(user, updates);
    this.save();
    return user;
  }

  public updateStreak(telegramId: string): void {
    const user = this.getUser(telegramId);
    const today = new Date().toISOString().split('T')[0];
    if (user.lastActiveDate !== today) {
      const lastDate = new Date(user.lastActiveDate);
      const currentDate = new Date(today);
      const diffTime = Math.abs(currentDate.getTime() - lastDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        user.streakDays += 1;
      } else if (diffDays > 1) {
        user.streakDays = 1;
      }
      user.lastActiveDate = today;
      this.save();
    }
  }

  public addMessage(telegramId: string, message: TelegramMessage): void {
    if (!this.data.messages[telegramId]) {
      this.data.messages[telegramId] = [];
    }
    this.data.messages[telegramId].push(message);
    if (this.data.messages[telegramId].length > 100) {
      this.data.messages[telegramId] = this.data.messages[telegramId].slice(-100);
    }
    this.updateStreak(telegramId);
    this.save();
  }

  public getMessages(telegramId: string): TelegramMessage[] {
    return this.data.messages[telegramId] || [];
  }

  public clearMessages(telegramId: string): void {
    this.data.messages[telegramId] = [];
    if (this.data.users[telegramId]) {
      this.data.users[telegramId].currentMode = 'idle';
      this.data.users[telegramId].sessionState = {};
    }
    this.save();
  }

  public addPracticeRecord(record: PracticeSessionRecord): void {
    const user = this.getUser(record.telegramId);
    if (!this.data.practiceSessions[record.telegramId]) {
      this.data.practiceSessions[record.telegramId] = [];
    }
    this.data.practiceSessions[record.telegramId].push(record);
    user.xp += Math.round(record.scorePercentage * (record.questionsCount / 2));
    this.save();
  }

  public getPracticeRecords(telegramId: string): PracticeSessionRecord[] {
    return this.data.practiceSessions[telegramId] || [];
  }

  public addStudyPlan(plan: StudyPlan): void {
    if (!this.data.studyPlans[plan.telegramId]) {
      this.data.studyPlans[plan.telegramId] = [];
    }
    this.data.studyPlans[plan.telegramId].unshift(plan);
    this.save();
  }

  public getStudyPlans(telegramId: string): StudyPlan[] {
    return this.data.studyPlans[telegramId] || [];
  }

  public toggleStudyTask(telegramId: string, planId: string, dayNumber: number, taskIndex: number): StudyPlan | null {
    const plans = this.data.studyPlans[telegramId] || [];
    const plan = plans.find(p => p.id === planId);
    if (!plan) return null;
    const day = plan.days.find(d => d.dayNumber === dayNumber);
    if (day) {
      day.completed = !day.completed;
      this.save();
    }
    return plan;
  }

  public logAgent(log: AgentLog): void {
    this.data.agentLogs.unshift(log);
    if (this.data.agentLogs.length > 50) {
      this.data.agentLogs = this.data.agentLogs.slice(0, 50);
    }
    this.save();
  }

  public getAgentLogs(): AgentLog[] {
    return this.data.agentLogs;
  }

  public findUserByQuery(query: string): UserProfile | null {
    const q = query.trim().toLowerCase().replace(/^@/, '');
    if (!q) return null;
    const all = Object.values(this.data.users);
    const found = all.find(
      (u) =>
        u.telegramId.toLowerCase() === q ||
        u.username.toLowerCase() === q ||
        u.name.toLowerCase() === q
    );
    return found || null;
  }

  public createUser(data: {
    name: string;
    username: string;
    grade: string;
    subjects: string[];
    preferredLanguage?: string;
  }): UserProfile {
    const cleanUsername = data.username.trim().replace(/^@/, '') || `student_${Date.now()}`;
    const id = `student_${cleanUsername.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`;
    const today = new Date().toISOString().split('T')[0];

    const newUser: UserProfile = {
      telegramId: id,
      username: cleanUsername,
      name: data.name.trim() || 'New Student',
      grade: data.grade || 'Grade 10',
      subjects: data.subjects && data.subjects.length > 0 ? data.subjects : ['Mathematics', 'Physics', 'English'],
      preferredLanguage: data.preferredLanguage || 'English',
      currentMode: 'idle',
      streakDays: 1,
      lastActiveDate: today,
      xp: 100,
      createdAt: Date.now(),
      sessionState: {},
    };

    this.data.users[id] = newUser;

    // Add initial welcome message from bot
    this.data.messages[id] = [
      {
        id: `msg_welcome_${Date.now()}`,
        sender: 'bot',
        text: `🎓 **Welcome to AI Homework Tutor, ${newUser.name}!**\n\nI'm your 24/7 personal tutor for **${newUser.grade}** (${newUser.subjects.slice(0, 3).join(', ')}). \n\nHow can I help you excel today?`,
        inlineKeyboard: [
          [
            { text: '📸 Scan Homework', callback_data: 'cmd_scan' },
            { text: '✏️ Ask Question', callback_data: 'cmd_ask' },
          ],
          [
            { text: '🧑‍🏫 Step-by-Step Tutor', callback_data: 'cmd_tutor' },
            { text: '📝 Practice Quiz', callback_data: 'cmd_practice' },
          ],
          [
            { text: '📅 7-Day Study Plan', callback_data: 'cmd_study' },
            { text: '📊 My Progress', callback_data: 'cmd_progress' },
          ],
        ],
        timestamp: Date.now(),
      },
    ];

    this.save();
    return newUser;
  }

  public getAllUsers(): UserProfile[] {
    return Object.values(this.data.users);
  }
}

export const db = new DatabaseStore();
