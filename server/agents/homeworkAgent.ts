import { TelegramMessage, UserProfile } from '../../src/types';
import { generateAiText } from '../gemini';

export interface HomeworkSolutionResult {
  message: TelegramMessage;
  subject: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export async function handleHomeworkQuestion(
  questionText: string,
  user: UserProfile,
  detectedSubject?: string,
  detectedTopic?: string,
  explainAgain: boolean = false
): Promise<HomeworkSolutionResult> {
  const systemInstruction = `You are a world-class AI Homework Tutor. 
Your role is to teach the student how to solve the problem, not merely dump a raw answer.
Follow these pedagogical principles:
1. Identify the subject and topic clearly.
2. Step 1: Identify given values, keywords, or background principles.
3. Step 2: State the formula, theorem, or logic rule.
4. Step 3: Show step-by-step arithmetic or logical progression with clear annotations.
5. Highlight the final concise answer clearly.
6. Adapt vocabulary and depth to the student's level (${user.grade}). 
7. If Amharic or French or another language is used in the prompt, provide answers in that language.
8. Use clean Telegram-compatible Markdown (bolding **, bullet points, clean line breaks).
${explainAgain ? 'Provide an even simpler, more intuitive explanation using a relatable real-life analogy.' : ''}`;

  const prompt = `Student Grade Level: ${user.grade}
Student Question:
"${questionText}"

Format your response following this standard structure:
📚 **[Subject] — [Topic]**

**Step 1:** Identify the given information / key concept
...

**Step 2:** Apply the formula or principle
...

**Step 3:** Step-by-step solution & calculation
...

🎯 **Final Answer:**
...

💡 **Key Takeaway:**
(One memorable tip for remembering this)`;

  const solutionText = await generateAiText(prompt, systemInstruction);

  // Extract subject and topic from response header or default
  const subjectMatch = solutionText.match(/📚\s*\*\*([^\—\-]+)[\—\-]([^\*]+)\*\*/i);
  const subject = subjectMatch ? subjectMatch[1].trim() : (detectedSubject || 'Mathematics');
  const topic = subjectMatch ? subjectMatch[2].trim() : (detectedTopic || 'General Problem');

  const responseMessage: TelegramMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    sender: 'bot',
    text: solutionText,
    agentUsed: 'homework',
    subject,
    topic,
    toolsUsed: ['Calculator', 'Pedagogical Formatter'],
    timestamp: Date.now(),
    inlineKeyboard: [
      [
        { text: '🧠 Explain Again', callback_data: `action_explain_again:${encodeURIComponent(topic)}` },
        { text: '📝 Give Me Practice', callback_data: `action_practice_topic:${encodeURIComponent(topic)}:${encodeURIComponent(subject)}` },
      ],
      [
        { text: '🧑🏫 Tutor Mode', callback_data: `action_tutor_topic:${encodeURIComponent(topic)}:${encodeURIComponent(subject)}` },
        { text: '➡️ Next Question', callback_data: 'cmd_ask' },
      ],
    ],
  };

  return {
    message: responseMessage,
    subject,
    topic,
    difficulty: 'medium',
  };
}
