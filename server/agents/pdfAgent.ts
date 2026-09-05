import { TelegramMessage, UserProfile } from '../../src/types';
import { generateAiText, generateAiJson } from '../gemini';
import { db } from '../db';

export async function handlePdfDocument(
  docContent: string,
  fileName: string,
  user: UserProfile,
  task: 'summarize' | 'quiz' | 'flashcards' | 'qa' = 'summarize',
  userQuestion?: string
): Promise<TelegramMessage> {
  // Store context in user state for subsequent Q&A
  db.updateUser(user.telegramId, {
    sessionState: {
      ...user.sessionState,
      pdfDocumentContext: docContent.slice(0, 15000), // preserve document excerpt
      pdfFileName: fileName,
    },
  });

  if (task === 'summarize') {
    const prompt = `Please provide a clear, structured study summary of this document ("${fileName}") for a student in ${user.grade}.
Include:
1. 📄 **Document Overview** (2 sentences)
2. 🔑 **Key Concepts & Definitions** (bullet points)
3. 📐 **Important Formulas / Rules / Dates** (if applicable)
4. 💡 **Main Takeaways & Exam Tips**

Document content:
"""
${docContent.slice(0, 12000)}
"""`;

    const summary = await generateAiText(prompt, "You are an expert academic document analyzer.");

    return {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sender: 'bot',
      text: `📄 **Document Summary: ${fileName}**\n\n${summary}`,
      agentUsed: 'pdf',
      toolsUsed: ['PDF Parser', 'Text Summarizer'],
      timestamp: Date.now(),
      inlineKeyboard: [
        [
          { text: '📝 Generate Quiz (/quiz)', callback_data: `action_doc_quiz:${encodeURIComponent(fileName)}` },
          { text: '🃏 Make Flashcards (/flashcards)', callback_data: `action_doc_flashcards:${encodeURIComponent(fileName)}` },
        ],
        [
          { text: '💬 Ask Question on Doc', callback_data: `cmd_ask` },
          { text: '🏠 Main Menu', callback_data: 'cmd_start' },
        ],
      ],
    };
  }

  if (task === 'quiz') {
    const prompt = `Generate a 3-question multiple choice revision quiz based on this document ("${fileName}").
Document content:
"""
${docContent.slice(0, 12000)}
"""

Format each question with options and concise explanation.`;

    const quizText = await generateAiText(prompt, "You are a quiz author.");

    return {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sender: 'bot',
      text: `📝 **Revision Quiz from ${fileName}**\n\n${quizText}`,
      agentUsed: 'pdf',
      toolsUsed: ['PDF Parser', 'Quiz Generator'],
      timestamp: Date.now(),
      inlineKeyboard: [
        [
          { text: '🃏 Flashcards', callback_data: `action_doc_flashcards:${encodeURIComponent(fileName)}` },
          { text: '📄 Summary', callback_data: `action_doc_summarize:${encodeURIComponent(fileName)}` },
        ],
        [
          { text: '🏠 Main Menu', callback_data: 'cmd_start' },
        ]
      ],
    };
  }

  if (task === 'flashcards') {
    const prompt = `Generate 5 high-yield study flashcards from this document ("${fileName}").
Format as:
🎴 **Card 1**
**Front (Term/Question):** ...
**Back (Answer/Concept):** ...

Document content:
"""
${docContent.slice(0, 12000)}
"""`;

    const flashcardsText = await generateAiText(prompt, "You are an educator creating flashcards.");

    return {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sender: 'bot',
      text: `🃏 **Study Flashcards: ${fileName}**\n\n${flashcardsText}`,
      agentUsed: 'pdf',
      toolsUsed: ['Flashcard Engine', 'Document Extractor'],
      timestamp: Date.now(),
      inlineKeyboard: [
        [
          { text: '📝 Take Quiz', callback_data: `action_doc_quiz:${encodeURIComponent(fileName)}` },
          { text: '📄 View Summary', callback_data: `action_doc_summarize:${encodeURIComponent(fileName)}` },
        ],
      ],
    };
  }

  // Generic document Q&A
  const qaPrompt = `The student is asking a question about the document "${fileName}".
Student question: "${userQuestion}"

Document excerpt:
"""
${docContent.slice(0, 12000)}
"""

Answer accurately based on the text, highlighting exact sections where relevant.`;

  const answer = await generateAiText(qaPrompt, "You are an academic document tutor.");

  return {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    sender: 'bot',
    text: `📄 **Answer from ${fileName}:**\n\n${answer}`,
    agentUsed: 'pdf',
    toolsUsed: ['Document Semantic Search', 'Q&A Resolver'],
    timestamp: Date.now(),
    inlineKeyboard: [
      [
        { text: '📝 Generate Quiz', callback_data: `action_doc_quiz:${encodeURIComponent(fileName)}` },
        { text: '🃏 Flashcards', callback_data: `action_doc_flashcards:${encodeURIComponent(fileName)}` },
      ],
    ],
  };
}
