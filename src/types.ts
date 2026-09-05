export type AgentType = 
  | 'router'
  | 'homework'
  | 'vision'
  | 'tutor'
  | 'practice'
  | 'study_planner'
  | 'pdf'
  | 'voice'
  | 'progress';

export type UserMode = 
  | 'idle' 
  | 'tutor' 
  | 'practice' 
  | 'quiz' 
  | 'study_plan' 
  | 'photo_scan'
  | 'pdf_analysis';

export interface TelegramInlineButton {
  text: string;
  callback_data?: string;
  url?: string;
}

export interface TelegramMessage {
  id: string;
  sender: 'user' | 'bot' | 'system';
  text: string;
  mediaType?: 'text' | 'photo' | 'voice' | 'document';
  mediaUrl?: string;
  fileName?: string;
  inlineKeyboard?: TelegramInlineButton[][];
  agentUsed?: AgentType;
  toolsUsed?: string[];
  timestamp: number;
  subject?: string;
  topic?: string;
}

export interface UserProfile {
  telegramId: string;
  username: string;
  name: string;
  grade: string; // e.g. "Grade 9", "Grade 10", "College / University"
  subjects: string[];
  preferredLanguage: string;
  currentMode: UserMode;
  sessionState?: {
    tutorProblem?: string;
    tutorStep?: number;
    tutorHintsGiven?: number;
    currentSubject?: string;
    currentTopic?: string;
    practiceTopic?: string;
    practiceDifficulty?: 'easy' | 'medium' | 'hard';
    practiceQuestionIndex?: number;
    practiceScore?: number;
    practiceTotal?: number;
    pdfDocumentContext?: string;
    pdfFileName?: string;
  };
  streakDays: number;
  lastActiveDate: string;
  xp: number;
  createdAt: number;
}

export interface SubjectProgress {
  subject: string;
  masteryPercentage: number;
  questionsSolved: number;
  totalAttempts: number;
}

export interface TopicInsight {
  topic: string;
  subject: string;
  accuracy: number;
  status: 'strong' | 'weak' | 'moderate';
  recommendation?: string;
}

export interface StudyPlanDay {
  dayNumber: number;
  dateLabel: string;
  topics: string[];
  tasks: string[];
  completed: boolean;
}

export interface StudyPlan {
  id: string;
  telegramId: string;
  subject: string;
  targetExamDate?: string;
  title: string;
  description: string;
  totalDays: number;
  days: StudyPlanDay[];
  reminderTime?: string;
  createdAt: number;
}

export interface PracticeSessionRecord {
  id: string;
  telegramId: string;
  subject: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questionsCount: number;
  correctCount: number;
  scorePercentage: number;
  timestamp: number;
}

export interface BotStatus {
  hasToken: boolean;
  botUsername?: string;
  botFirstName?: string;
  isPolling: boolean;
  webhookUrl?: string;
  error?: string;
}

export interface AgentLog {
  id: string;
  timestamp: number;
  telegramId: string;
  userMessage: string;
  agent: AgentType;
  detectedSubject?: string;
  detectedTopic?: string;
  detectedGrade?: string;
  toolsUsed: string[];
  responseSummary: string;
}
