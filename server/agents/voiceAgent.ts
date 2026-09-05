import { TelegramMessage, UserProfile } from '../../src/types';
import { generateSpeechAudio, generateMultimodalContent } from '../gemini';

export interface VoiceResult {
  message: TelegramMessage;
  transcription: string;
  solutionText: string;
  audioBase64?: string | null;
}

export async function processVoiceMessage(
  audioBase64: string,
  mimeType: string = 'audio/webm',
  user: UserProfile
): Promise<VoiceResult> {
  const systemInstruction = `You are the Voice Agent for AI Homework Tutor.
1. Transcribe the student's spoken voice message accurately.
2. Answer the homework or academic question in a clear, friendly, and encouraging tone suitable for a student in ${user.grade}.
3. Provide step-by-step logic and clear final answers.
4. Support multilingual voices (English, French, Amharic, etc.).`;

  const audioPart = {
    inlineData: {
      mimeType,
      data: audioBase64.replace(/^data:audio\/\w+;base64,/, ''),
    },
  };

  const promptText = `Listen to this voice message from a student.
Structure your reply as follows:
🎤 **Transcription:**
"[What the student said]"

📚 **Tutor Explanation:**
[Step-by-step friendly explanation and solution]

🎯 **Summary Answer:**
[Short concise wrap-up]`;

  const fullText = await generateMultimodalContent(
    { parts: [audioPart, { text: promptText }] },
    systemInstruction,
    0.2
  );
  
  // Extract transcription
  const transMatch = fullText.match(/🎤\s*\*\*Transcription:\*\*\s*\n*"([^"]+)"/i) || fullText.match(/Transcription:\s*([^\n]+)/i);
  const transcription = transMatch ? transMatch[1].trim() : 'Voice input received';

  // Generate TTS audio snippet for spoken playback
  const audioOutputBase64 = await generateSpeechAudio(fullText.slice(0, 300));

  const message: TelegramMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    sender: 'bot',
    text: fullText,
    agentUsed: 'voice',
    toolsUsed: ['Speech-to-Text Transcriber', 'Multimodal Voice Analyzer', 'Gemini TTS Synthesizer'],
    timestamp: Date.now(),
    inlineKeyboard: [
      [
        { text: '🧠 Explain Again', callback_data: `action_explain_again:voice_topic` },
        { text: '📝 Give Me Practice', callback_data: `cmd_practice` },
      ],
      [
        { text: '🧑🏫 Tutor Mode', callback_data: `cmd_tutor` },
        { text: '🎤 Send Another Voice', callback_data: 'cmd_ask' },
      ],
    ],
  };

  return {
    message,
    transcription,
    solutionText: fullText,
    audioBase64: audioOutputBase64,
  };
}
