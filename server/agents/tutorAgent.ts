import { TelegramMessage, UserProfile } from '../../src/types';
import { generateAiJson, generateAiText } from '../gemini';

export interface TutorTurnResult {
  message: TelegramMessage;
  nextStep: number;
  isComplete: boolean;
  topic: string;
  subject: string;
}

export async function handleTutorInteraction(
  studentInput: string,
  user: UserProfile,
  actionType?: 'start' | 'hint' | 'dont_understand' | 'show_answer' | 'continue' | 'answer',
  topicOverride?: string,
  subjectOverride?: string
): Promise<TutorTurnResult> {
  const currentSubject = subjectOverride || user.sessionState?.currentSubject || 'Mathematics';
  const currentTopic = topicOverride || user.sessionState?.currentTopic || user.sessionState?.tutorProblem || 'Simple Interest';
  const currentStep = user.sessionState?.tutorStep || 1;
  const hintsCount = user.sessionState?.tutorHintsGiven || 0;

  // 1. If Action is "Show Answer"
  if (actionType === 'show_answer') {
    const prompt = `Student Grade: ${user.grade}.
Topic: ${currentTopic} (${currentSubject}).
The student requested to see the full worked answer and concept explanation.
Explain it clearly with step-by-step logic, highlighting the key rules and a small practice test.`;

    const answerText = await generateAiText(prompt, `You are a supportive, encouraging tutor.`);
    
    const message: TelegramMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sender: 'bot',
      text: `🧑🏫 **Tutor Mode: Full Solution & Concept**\n\n${answerText}`,
      agentUsed: 'tutor',
      subject: currentSubject,
      topic: currentTopic,
      toolsUsed: ['Socratic Engine', 'Concept Explainer'],
      timestamp: Date.now(),
      inlineKeyboard: [
        [
          { text: '📝 Practice This Topic', callback_data: `action_practice_topic:${encodeURIComponent(currentTopic)}:${encodeURIComponent(currentSubject)}` },
          { text: '🧑🏫 Teach New Topic', callback_data: 'cmd_tutor' },
        ],
        [
          { text: '🏠 Main Menu', callback_data: 'cmd_start' },
        ]
      ],
    };

    return {
      message,
      nextStep: 1,
      isComplete: true,
      topic: currentTopic,
      subject: currentSubject,
    };
  }

  // 2. If Action is "Hint"
  if (actionType === 'hint') {
    const prompt = `The student is working on ${currentTopic} in ${currentSubject} (Grade: ${user.grade}).
Current question: "${user.sessionState?.tutorProblem || currentTopic}".
Give a gentle, intuitive hint without giving away the final number or answer. Guide their thinking.`;

    const hintText = await generateAiText(prompt, `You are a helpful Socratic tutor. Keep hints concise (2-3 sentences).`);

    const message: TelegramMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sender: 'bot',
      text: `💡 **Tutor Hint #${hintsCount + 1}:**\n\n${hintText}\n\n*What do you think the next step or answer should be?*`,
      agentUsed: 'tutor',
      subject: currentSubject,
      topic: currentTopic,
      toolsUsed: ['Socratic Hint Generator'],
      timestamp: Date.now(),
      inlineKeyboard: [
        [
          { text: '💡 Another Hint', callback_data: 'action_tutor_hint' },
          { text: '🤔 I Don\'t Understand', callback_data: 'action_tutor_dont_understand' },
        ],
        [
          { text: '✅ Show Answer', callback_data: 'action_tutor_show_answer' },
          { text: '➡️ Continue', callback_data: 'action_tutor_continue' },
        ],
      ],
    };

    return {
      message,
      nextStep: currentStep,
      isComplete: false,
      topic: currentTopic,
      subject: currentSubject,
    };
  }

  // 3. If Action is "Don't Understand"
  if (actionType === 'dont_understand') {
    const prompt = `The student didn't understand the previous explanation for ${currentTopic} in ${currentSubject}.
Explain the core intuition using a vivid, everyday real-world metaphor (like pizza slices, pocket money, or sports) suitable for ${user.grade}.
Then ask a very simple check-in question.`;

    const simpleText = await generateAiText(prompt, `You are an empathetic, super-clear educator.`);

    const message: TelegramMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sender: 'bot',
      text: `🤔 **Let's Simplify It Step-by-Step!**\n\n${simpleText}`,
      agentUsed: 'tutor',
      subject: currentSubject,
      topic: currentTopic,
      toolsUsed: ['Metaphor Engine', 'Socratic Visualizer'],
      timestamp: Date.now(),
      inlineKeyboard: [
        [
          { text: '💡 Hint', callback_data: 'action_tutor_hint' },
          { text: '✅ Show Answer', callback_data: 'action_tutor_show_answer' },
        ],
        [
          { text: '➡️ Continue', callback_data: 'action_tutor_continue' },
        ],
      ],
    };

    return {
      message,
      nextStep: currentStep,
      isComplete: false,
      topic: currentTopic,
      subject: currentSubject,
    };
  }

  // 4. Initial start of Tutor Mode (Step 1 & 2: Concept + Example + Question)
  if (actionType === 'start' || currentStep === 1 || !user.sessionState?.tutorProblem) {
    const systemPrompt = `You are an interactive Socratic AI Tutor.
Structure:
1. 💡 **Concept Explanation**: Briefly explain the concept in 2-3 accessible sentences.
2. 📌 **Quick Example**: Walk through a tiny 1-step illustrative example.
3. 🎯 **Your Turn Question**: Pose a direct, single question for the student to solve and reply to.

Subject: ${currentSubject}
Topic: ${currentTopic}
Grade Level: ${user.grade}
Student prompt: "${studentInput}"`;

    const tutorStart = await generateAiText(
      `Please start Tutor Mode for topic "${currentTopic}" (${currentSubject}). Include: 1) Core Concept, 2) Mini Example, 3) Interactive question for the student to answer.`,
      systemPrompt
    );

    const message: TelegramMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sender: 'bot',
      text: `🧑🏫 **Tutor Mode: ${currentTopic}**\n\n${tutorStart}\n\n*Type your answer below, or use the buttons if you need help!*`,
      agentUsed: 'tutor',
      subject: currentSubject,
      topic: currentTopic,
      toolsUsed: ['Interactive Pedagogical Socratic Engine'],
      timestamp: Date.now(),
      inlineKeyboard: [
        [
          { text: '💡 Hint', callback_data: 'action_tutor_hint' },
          { text: '🤔 I Don\'t Understand', callback_data: 'action_tutor_dont_understand' },
        ],
        [
          { text: '✅ Show Answer', callback_data: 'action_tutor_show_answer' },
          { text: '➡️ Continue', callback_data: 'action_tutor_continue' },
        ],
      ],
    };

    return {
      message,
      nextStep: 2,
      isComplete: false,
      topic: currentTopic,
      subject: currentSubject,
    };
  }

  // 5. Check student's response (Check answer, explain mistake, or progress)
  const evalPrompt = `You are evaluating a student's answer in Tutor Mode.
Subject: ${currentSubject}
Topic: ${currentTopic}
Student Grade: ${user.grade}
Previous Question/Context: "${user.sessionState?.tutorProblem || currentTopic}"
Student's Answer: "${studentInput}"

Evaluate:
1. Is the student's answer correct, partially correct, or incorrect?
2. If correct: Celebrate enthusiastically, reinforce why it worked, and ask the next level-up question.
3. If incorrect: Gently explain the exact misconception/mistake, give an encouraging nudge, and guide them to retry.

Respond in structured JSON:
{
  "isCorrect": boolean,
  "feedbackText": string,
  "followUpQuestion": string,
  "isConceptMastered": boolean
}`;

  try {
    const evaluation = await generateAiJson<{
      isCorrect: boolean;
      feedbackText: string;
      followUpQuestion: string;
      isConceptMastered: boolean;
    }>(evalPrompt, "You are a gentle, supportive Socratic tutor.");

    let formattedText = '';
    if (evaluation.isCorrect) {
      formattedText = `🎉 **Awesome job! That's correct!**\n\n${evaluation.feedbackText}\n\n${evaluation.isConceptMastered ? `🏆 **You've mastered this concept!** Ready to test your skills in Practice Mode?` : `🎯 **Next Challenge:**\n${evaluation.followUpQuestion}`}`;
    } else {
      formattedText = `🧐 **Good try! Let's examine this together:**\n\n${evaluation.feedbackText}\n\n🎯 **Try again or take another look:**\n${evaluation.followUpQuestion || 'What would you get if you recheck the formula?'}`;
    }

    const keyboard = evaluation.isConceptMastered ? [
      [
        { text: '📝 Start Practice Quiz', callback_data: `action_practice_topic:${encodeURIComponent(currentTopic)}:${encodeURIComponent(currentSubject)}` },
        { text: '🧑🏫 Next Topic', callback_data: 'cmd_tutor' },
      ],
      [
        { text: '🏠 Main Menu', callback_data: 'cmd_start' },
      ]
    ] : [
      [
        { text: '💡 Hint', callback_data: 'action_tutor_hint' },
        { text: '🤔 I Don\'t Understand', callback_data: 'action_tutor_dont_understand' },
      ],
      [
        { text: '✅ Show Answer', callback_data: 'action_tutor_show_answer' },
        { text: '➡️ Continue', callback_data: 'action_tutor_continue' },
      ],
    ];

    const message: TelegramMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sender: 'bot',
      text: formattedText,
      agentUsed: 'tutor',
      subject: currentSubject,
      topic: currentTopic,
      toolsUsed: ['Answer Validator', 'Misconception Diagnostic'],
      timestamp: Date.now(),
      inlineKeyboard: keyboard,
    };

    return {
      message,
      nextStep: evaluation.isConceptMastered ? 1 : currentStep + 1,
      isComplete: evaluation.isConceptMastered,
      topic: currentTopic,
      subject: currentSubject,
    };
  } catch (err) {
    const message: TelegramMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sender: 'bot',
      text: `🧑🏫 **Tutor Feedback:**\n\nGreat effort! Let's keep exploring ${currentTopic}. Tell me what part you'd like to dive into next!`,
      agentUsed: 'tutor',
      subject: currentSubject,
      topic: currentTopic,
      timestamp: Date.now(),
      inlineKeyboard: [
        [
          { text: '💡 Hint', callback_data: 'action_tutor_hint' },
          { text: '✅ Show Answer', callback_data: 'action_tutor_show_answer' },
        ]
      ]
    };
    return {
      message,
      nextStep: currentStep + 1,
      isComplete: false,
      topic: currentTopic,
      subject: currentSubject,
    };
  }
}
