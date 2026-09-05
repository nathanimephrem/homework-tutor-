import { TelegramMessage, UserProfile, PracticeSessionRecord } from '../../src/types';
import { generateAiJson } from '../gemini';
import { db } from '../db';

export interface PracticeQuestion {
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
  topic: string;
  subject: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export async function generatePracticeQuestion(
  subject: string,
  topic: string,
  difficulty: 'easy' | 'medium' | 'hard',
  user: UserProfile
): Promise<PracticeQuestion> {
  const prompt = `Generate a single multiple-choice practice question for a student.
Subject: ${subject}
Topic: ${topic}
Grade Level: ${user.grade}
Difficulty: ${difficulty} (easy = foundational concept, medium = standard exam calculation/application, hard = multi-step challenging problem).

Format response in JSON:
{
  "questionText": "Clear question text",
  "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
  "correctOptionIndex": 0,
  "explanation": "Clear step-by-step reason why the correct answer is right.",
  "topic": "${topic}",
  "subject": "${subject}",
  "difficulty": "${difficulty}"
}`;

  const fallbackQuestion: PracticeQuestion = {
    questionText: `Which of the following best describes the core concept in ${subject} (${topic})?`,
    options: [
      "A) Identifying fundamental definitions and applying appropriate formulas step-by-step",
      "B) Memorizing final answers without showing work",
      "C) Ignoring units and dimensional analysis",
      "D) Skipping the problem setup phase"
    ],
    correctOptionIndex: 0,
    explanation: `In ${subject}, breaking down the problem, stating definitions, and applying systematic step-by-step calculations leads to mastery.`,
    topic,
    subject,
    difficulty,
  };

  const result = await generateAiJson<PracticeQuestion>(
    prompt,
    "You are a specialized test & quiz question generator.",
    fallbackQuestion
  );
  return result;
}

export async function startPracticeSession(
  subject: string,
  topic: string,
  difficulty: 'easy' | 'medium' | 'hard',
  user: UserProfile
): Promise<TelegramMessage> {
  const q = await generatePracticeQuestion(subject, topic, difficulty, user);

  // Store in user session state
  db.updateUser(user.telegramId, {
    currentMode: 'practice',
    sessionState: {
      ...user.sessionState,
      currentSubject: subject,
      practiceTopic: topic,
      practiceDifficulty: difficulty,
      practiceQuestionIndex: 1,
      practiceScore: 0,
      practiceTotal: 3, // standard 3-question bite-sized drill
      tutorProblem: JSON.stringify(q),
    },
  });

  const diffEmoji = difficulty === 'easy' ? '🟢' : difficulty === 'medium' ? '🟡' : '🔴';

  const text = `📝 **Practice Mode: ${subject} — ${topic}**
Difficulty: ${diffEmoji} **${difficulty.toUpperCase()}** (Question 1/3)

${q.questionText}

${q.options.map((opt, i) => `**${String.fromCharCode(65 + i)}:** ${opt.replace(/^[A-D]\)\s*/, '')}`).join('\n')}`;

  const keyboard = [
    [
      { text: 'A', callback_data: `action_practice_answer:0` },
      { text: 'B', callback_data: `action_practice_answer:1` },
    ],
    [
      { text: 'C', callback_data: `action_practice_answer:2` },
      { text: 'D', callback_data: `action_practice_answer:3` },
    ],
    [
      { text: '🛑 End Practice', callback_data: 'cmd_progress' },
    ]
  ];

  return {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    sender: 'bot',
    text,
    agentUsed: 'practice',
    subject,
    topic,
    toolsUsed: ['Practice Generator', 'Question Bank Engine'],
    timestamp: Date.now(),
    inlineKeyboard: keyboard,
  };
}

export async function handlePracticeAnswer(
  selectedOptionIndex: number,
  user: UserProfile
): Promise<TelegramMessage> {
  let storedQuestion: PracticeQuestion;
  try {
    storedQuestion = JSON.parse(user.sessionState?.tutorProblem || '{}');
  } catch {
    return {
      id: `msg_${Date.now()}`,
      sender: 'bot',
      text: 'Session expired. Let\'s start a fresh practice!',
      timestamp: Date.now(),
      inlineKeyboard: [[{ text: '📝 Start Practice', callback_data: 'cmd_practice' }]],
    };
  }

  const isCorrect = selectedOptionIndex === storedQuestion.correctOptionIndex;
  const currentScore = (user.sessionState?.practiceScore || 0) + (isCorrect ? 1 : 0);
  const currentIndex = (user.sessionState?.practiceQuestionIndex || 1);
  const totalQuestions = user.sessionState?.practiceTotal || 3;
  const difficulty = (user.sessionState?.practiceDifficulty || 'medium') as 'easy' | 'medium' | 'hard';
  const subject = storedQuestion.subject || 'Mathematics';
  const topic = storedQuestion.topic || 'General Practice';

  if (currentIndex < totalQuestions) {
    // Next question
    const nextQ = await generatePracticeQuestion(subject, topic, difficulty, user);
    
    db.updateUser(user.telegramId, {
      sessionState: {
        ...user.sessionState,
        practiceQuestionIndex: currentIndex + 1,
        practiceScore: currentScore,
        tutorProblem: JSON.stringify(nextQ),
      },
    });

    const resultEmoji = isCorrect ? '✅ **Correct!**' : `❌ **Incorrect.** (Correct was ${String.fromCharCode(65 + storedQuestion.correctOptionIndex)})`;
    const diffEmoji = difficulty === 'easy' ? '🟢' : difficulty === 'medium' ? '🟡' : '🔴';

    const text = `${resultEmoji}
_${storedQuestion.explanation}_

---
📝 **Question ${currentIndex + 1}/${totalQuestions}** (${diffEmoji} ${difficulty.toUpperCase()})

${nextQ.questionText}

${nextQ.options.map((opt, i) => `**${String.fromCharCode(65 + i)}:** ${opt.replace(/^[A-D]\)\s*/, '')}`).join('\n')}`;

    return {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sender: 'bot',
      text,
      agentUsed: 'practice',
      subject,
      topic,
      toolsUsed: ['Answer Evaluator', 'Progress Tracker'],
      timestamp: Date.now(),
      inlineKeyboard: [
        [
          { text: 'A', callback_data: `action_practice_answer:0` },
          { text: 'B', callback_data: `action_practice_answer:1` },
        ],
        [
          { text: 'C', callback_data: `action_practice_answer:2` },
          { text: 'D', callback_data: `action_practice_answer:3` },
        ],
      ],
    };
  } else {
    // Practice completed! Log session
    const accuracy = Math.round((currentScore / totalQuestions) * 100);
    const sessionRecord: PracticeSessionRecord = {
      id: `prac_${Date.now()}`,
      telegramId: user.telegramId,
      subject,
      topic,
      difficulty,
      questionsCount: totalQuestions,
      correctCount: currentScore,
      scorePercentage: accuracy,
      timestamp: Date.now(),
    };
    db.addPracticeRecord(sessionRecord);

    db.updateUser(user.telegramId, {
      currentMode: 'idle',
      sessionState: {
        ...user.sessionState,
        practiceQuestionIndex: 1,
        practiceScore: 0,
        tutorProblem: undefined,
      },
    });

    const resultEmoji = isCorrect ? '✅ **Correct!**' : `❌ **Incorrect.** (Correct was ${String.fromCharCode(65 + storedQuestion.correctOptionIndex)})`;
    const scoreBadge = accuracy >= 80 ? '🌟 Outstanding Master!' : accuracy >= 60 ? '👍 Solid Effort!' : '💪 Keep practicing!';

    const text = `${resultEmoji}
_${storedQuestion.explanation}_

---
🎉 **Practice Complete!**
${scoreBadge}

📊 **Session Summary:**
• Subject: **${subject}**
• Topic: **${topic}**
• Difficulty: **${difficulty.toUpperCase()}**
• Score: **${currentScore} / ${totalQuestions} (${accuracy}%)**
• XP Earned: **+${currentScore * 25} XP**

Would you like to review your overall progress or try another topic?`;

    return {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sender: 'bot',
      text,
      agentUsed: 'practice',
      subject,
      topic,
      toolsUsed: ['Score Calculator', 'Database Persistence Engine'],
      timestamp: Date.now(),
      inlineKeyboard: [
        [
          { text: '📊 View Progress', callback_data: 'cmd_progress' },
          { text: '📝 Practice More', callback_data: 'cmd_practice' },
        ],
        [
          { text: '🧑🏫 Tutor Mode', callback_data: `action_tutor_topic:${encodeURIComponent(topic)}:${encodeURIComponent(subject)}` },
          { text: '🏠 Main Menu', callback_data: 'cmd_start' },
        ]
      ],
    };
  }
}
