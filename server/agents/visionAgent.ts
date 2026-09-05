import { TelegramMessage, UserProfile } from '../../src/types';
import { generateMultimodalContent } from '../gemini';

export interface VisionResult {
  message: TelegramMessage;
  detectedProblem: string;
  subject: string;
  topic: string;
}

export async function processHomeworkImage(
  imageBase64: string,
  mimeType: string = 'image/jpeg',
  user: UserProfile,
  caption?: string
): Promise<VisionResult> {
  const systemInstruction = `You are the Vision Agent for the AI Homework Tutor.
Your job:
1. Examine the image carefully. Read any handwritten or printed problem, equations, or diagrams.
2. Accurately transcribe what the homework problem asks.
3. Detect the Subject (e.g., Mathematics, Physics, Chemistry, Biology, Geography, History, English, etc.) and Topic.
4. Solve the problem step-by-step tailored for a student in ${user.grade}.
5. Never skip steps. Teach clearly. Use standard Telegram markdown.`;

  const promptText = `Please analyze this homework photo${caption ? ` (Student note: "${caption}")` : ''}.

Structure your response like this:
📚 **[Subject] — [Topic]**

📝 **Transcribed Problem:**
"[Exact problem read from image]"

**Step 1:** Identify the given values & concepts
...

**Step 2:** Choose and state the formula/method
...

**Step 3:** Step-by-step calculation & derivation
...

🎯 **Final Answer:**
...

💡 **Pro Tip:**
...`;

  const imagePart = {
    inlineData: {
      mimeType,
      data: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
    },
  };

  const solutionText = await generateMultimodalContent(
    { parts: [imagePart, { text: promptText }] },
    systemInstruction,
    0.2
  );

  const subjectMatch = solutionText.match(/📚\s*\*\*([^\—\-]+)[\—\-]([^\*]+)\*\*/i);
  const subject = subjectMatch ? subjectMatch[1].trim() : 'Mathematics';
  const topic = subjectMatch ? subjectMatch[2].trim() : 'Homework Scan';

  const responseMessage: TelegramMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    sender: 'bot',
    text: solutionText,
    agentUsed: 'vision',
    subject,
    topic,
    toolsUsed: ['Vision/OCR Engine', 'Formula Solver', 'Diagram Analyzer'],
    timestamp: Date.now(),
    inlineKeyboard: [
      [
        { text: '🧠 Explain Again', callback_data: `action_explain_again:${encodeURIComponent(topic)}` },
        { text: '📝 Give Me Practice', callback_data: `action_practice_topic:${encodeURIComponent(topic)}:${encodeURIComponent(subject)}` },
      ],
      [
        { text: '🧑🏫 Tutor Mode', callback_data: `action_tutor_topic:${encodeURIComponent(topic)}:${encodeURIComponent(subject)}` },
        { text: '📸 Scan Another Photo', callback_data: 'cmd_scan' },
      ],
    ],
  };

  return {
    message: responseMessage,
    detectedProblem: solutionText,
    subject,
    topic,
  };
}
