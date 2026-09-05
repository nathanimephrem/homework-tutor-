import { AgentType, UserProfile } from '../../src/types';
import { generateAiJson } from '../gemini';

export interface RouteDecision {
  agent: AgentType;
  intent: string;
  detectedSubject?: string;
  detectedTopic?: string;
  detectedGrade?: string;
  isQuestion: boolean;
  needsWebSearch: boolean;
  actionPayload?: any;
}

export async function routeUserMessage(
  messageText: string,
  user: UserProfile,
  hasImage: boolean = false,
  hasAudio: boolean = false,
  hasDocument: boolean = false
): Promise<RouteDecision> {
  const trimmed = messageText.trim().toLowerCase();

  // 1. Direct command checks
  if (hasImage) {
    return {
      agent: 'vision',
      intent: 'scan_homework_image',
      isQuestion: true,
      needsWebSearch: false,
    };
  }

  if (hasAudio) {
    return {
      agent: 'voice',
      intent: 'voice_query',
      isQuestion: true,
      needsWebSearch: false,
    };
  }

  if (hasDocument || trimmed.startsWith('/summarize') || trimmed.startsWith('/quiz') || trimmed.startsWith('/flashcards')) {
    return {
      agent: 'pdf',
      intent: trimmed.startsWith('/quiz') ? 'quiz' : trimmed.startsWith('/flashcards') ? 'flashcards' : 'summarize',
      isQuestion: true,
      needsWebSearch: false,
    };
  }

  if (trimmed === '/start' || trimmed === 'start') {
    return {
      agent: 'router',
      intent: 'start_menu',
      isQuestion: false,
      needsWebSearch: false,
    };
  }

  if (trimmed === '/progress' || trimmed.includes('my progress') || trimmed === 'cmd_progress') {
    return {
      agent: 'progress',
      intent: 'view_progress',
      isQuestion: false,
      needsWebSearch: false,
    };
  }

  if (trimmed === '/study' || trimmed.startsWith('/study') || trimmed.includes('study plan') || trimmed === 'cmd_study') {
    return {
      agent: 'study_planner',
      intent: 'create_or_view_study_plan',
      isQuestion: false,
      needsWebSearch: false,
    };
  }

  if (trimmed.includes('exam next') || trimmed.includes('test on') || trimmed.includes('study schedule') || trimmed.includes('plan for')) {
    return {
      agent: 'study_planner',
      intent: 'create_study_plan',
      isQuestion: false,
      needsWebSearch: false,
    };
  }

  if (trimmed === '/tutor' || trimmed.startsWith('/tutor') || trimmed === 'cmd_tutor') {
    return {
      agent: 'tutor',
      intent: 'start_tutor_mode',
      isQuestion: false,
      needsWebSearch: false,
    };
  }

  if (trimmed === '/practice' || trimmed.startsWith('/practice') || trimmed === 'cmd_practice' || trimmed === 'easy' || trimmed === 'medium' || trimmed === 'hard') {
    return {
      agent: 'practice',
      intent: 'practice_flow',
      isQuestion: false,
      needsWebSearch: false,
    };
  }

  // If user is currently inside an active Tutor session
  if (user.currentMode === 'tutor' && user.sessionState?.tutorProblem) {
    return {
      agent: 'tutor',
      intent: 'tutor_step_response',
      isQuestion: true,
      needsWebSearch: false,
      detectedSubject: user.sessionState.currentSubject,
      detectedTopic: user.sessionState.currentTopic,
    };
  }

  // If user is currently in Practice mode
  if (user.currentMode === 'practice' && user.sessionState?.practiceTopic) {
    return {
      agent: 'practice',
      intent: 'evaluate_practice_answer',
      isQuestion: true,
      needsWebSearch: false,
      detectedSubject: user.sessionState.currentSubject,
      detectedTopic: user.sessionState.practiceTopic,
    };
  }

  // 2. Intelligent AI classification for unstructured natural queries
  try {
    const classificationPrompt = `Analyze the student's message and determine the optimal agent and educational metadata.
Student profile: Grade: ${user.grade}, Preferred subjects: ${user.subjects.join(', ')}.
Current active mode: ${user.currentMode}.

Student message: "${messageText}"

Possible Agents:
- "homework": Solving and explaining a specific math/science/humanities question step-by-step.
- "tutor": Student asking to be taught interactively, conceptually, or asking for Socratic guidance.
- "practice": Student wanting practice questions or quizzes.
- "study_planner": Student preparing for an exam, test, or schedule.
- "pdf": Document Q&A or reading.
- "progress": Asking about stats, grades, streaks, or weak areas.
- "router": General greeting, help, setting changes.

Respond with JSON format:
{
  "agent": "homework" | "tutor" | "practice" | "study_planner" | "pdf" | "progress" | "router",
  "intent": string,
  "detectedSubject": "Mathematics" | "Physics" | "Chemistry" | "Biology" | "English" | "History" | "Geography" | "French" | "Amharic" | string,
  "detectedTopic": string,
  "detectedGrade": string,
  "isQuestion": boolean,
  "needsWebSearch": boolean
}`;

    const parsed = await generateAiJson<RouteDecision>(classificationPrompt, "You are the Main Router Agent for an AI Homework Tutor Telegram bot.");
    return parsed;
  } catch (error) {
    console.warn('Router AI fallback to homework agent:', error);
    return {
      agent: 'homework',
      intent: 'solve_homework',
      isQuestion: true,
      needsWebSearch: false,
      detectedSubject: 'Mathematics',
    };
  }
}
