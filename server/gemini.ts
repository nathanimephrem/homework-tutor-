import { GoogleGenAI, GenerateContentResponse, Modality } from '@google/genai';

let geminiClient: GoogleGenAI | null = null;

export function getGemini(): GoogleGenAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY is not set in environment.');
    }
    geminiClient = new GoogleGenAI({
      apiKey: apiKey || '',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiClient;
}

const DEFAULT_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.7-flash', 'gemini-flash-latest'];

// Keep track of models that are temporarily rate-limited or exhausted
const modelCooldownMap = new Map<string, number>();

export function isQuotaExceededError(error: any): boolean {
  if (!error) return false;
  const status = error.status || error.code || error.statusCode || error.error?.code;
  const msg = String(error.message || error.error?.message || error || '').toLowerCase();
  return (
    status === 429 ||
    status === 'RESOURCE_EXHAUSTED' ||
    msg.includes('429') ||
    msg.includes('quota') ||
    msg.includes('resource_exhausted') ||
    msg.includes('rate limit') ||
    msg.includes('exceeded your current quota')
  );
}

export function isTransientError(error: any): boolean {
  if (!error) return false;
  const status = error.status || error.code || error.statusCode || error.error?.code;
  const msg = String(error.message || error.error?.message || error || '').toLowerCase();

  if (
    status === 503 ||
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 504 ||
    status === 'RESOURCE_EXHAUSTED' ||
    status === 'UNAVAILABLE'
  ) {
    return true;
  }
  if (
    msg.includes('503') ||
    msg.includes('unavailable') ||
    msg.includes('high demand') ||
    msg.includes('resource_exhausted') ||
    msg.includes('rate limit') ||
    msg.includes('quota') ||
    msg.includes('overloaded') ||
    msg.includes('econnreset') ||
    msg.includes('socket hang up') ||
    msg.includes('etimedout') ||
    msg.includes('fetch failed')
  ) {
    return true;
  }
  return false;
}

async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Executes a Gemini model call with exponential backoff retries, intelligent quota failover, and model cascading.
 */
export async function executeWithRetryAndFallback(
  callFn: (model: string) => Promise<GenerateContentResponse>,
  models: string[] = DEFAULT_MODELS,
  maxRetriesPerModel: number = 1
): Promise<GenerateContentResponse> {
  let lastError: any = null;
  const now = Date.now();

  // Sort models putting non-cooldown models first
  const sortedModels = [...models].sort((a, b) => {
    const coolA = (modelCooldownMap.get(a) || 0) > now ? 1 : 0;
    const coolB = (modelCooldownMap.get(b) || 0) > now ? 1 : 0;
    return coolA - coolB;
  });

  for (let mIdx = 0; mIdx < sortedModels.length; mIdx++) {
    const currentModel = sortedModels[mIdx];

    // If model is currently in a 30s quota cooldown and we have other models left, skip it
    if ((modelCooldownMap.get(currentModel) || 0) > now && mIdx < sortedModels.length - 1) {
      continue;
    }

    for (let attempt = 0; attempt <= maxRetriesPerModel; attempt++) {
      try {
        const result = await callFn(currentModel);
        // Clear cooldown on success
        modelCooldownMap.delete(currentModel);
        return result;
      } catch (err: any) {
        lastError = err;

        // If it is a quota exhaustion error (429), mark cooldown and IMMEDIATELY switch model without wasting retries
        if (isQuotaExceededError(err)) {
          console.warn(`[Gemini API] Quota exhausted for model ${currentModel}. Immediately failing over to next model.`);
          modelCooldownMap.set(currentModel, Date.now() + 30000); // 30s cooldown
          break;
        }

        console.warn(
          `[Gemini API] Call failed with model ${currentModel} (attempt ${attempt + 1}/${maxRetriesPerModel + 1}):`,
          err?.message || err
        );

        if (!isTransientError(err)) {
          break;
        }

        if (attempt < maxRetriesPerModel) {
          const delay = Math.min(300 * Math.pow(1.5, attempt) + Math.random() * 200, 1500);
          await wait(delay);
        }
      }
    }

    if (mIdx < sortedModels.length - 1) {
      await wait(100);
    }
  }

  throw lastError;
}

export async function generateAiText(
  prompt: string | any[],
  systemInstruction?: string,
  useSearch: boolean = false
): Promise<string> {
  const ai = getGemini();
  const config: any = {
    temperature: 0.3,
  };
  if (systemInstruction) {
    config.systemInstruction = systemInstruction;
  }
  if (useSearch) {
    config.tools = [{ googleSearch: {} }];
  }

  try {
    const response = await executeWithRetryAndFallback(async (model) => {
      return await ai.models.generateContent({
        model,
        contents: prompt,
        config,
      });
    });

    return response.text || '';
  } catch (err: any) {
    console.error('All Gemini model attempts failed for generateAiText:', err);
    return `📚 **Study Note & Problem Guidance**\n\n_Note: The AI tutor is experiencing temporary network demand. Here are the core steps to master this:_ \n\n**Step 1: Identify Key Concepts**\n• Break down the question and write down all known variables.\n\n**Step 2: Formulate the Method**\n• State the relevant equation, theorem, or logic rule.\n\n**Step 3: Solve Step-by-Step**\n• Calculate and check your units carefully.\n\n💡 *Tip: Tap "Explain Again" or send your question again in a moment!*`;
  }
}

export async function generateMultimodalContent(
  contents: any,
  systemInstruction?: string,
  temperature: number = 0.2
): Promise<string> {
  const ai = getGemini();
  const config: any = {
    temperature,
  };
  if (systemInstruction) {
    config.systemInstruction = systemInstruction;
  }

  try {
    const response = await executeWithRetryAndFallback(async (model) => {
      return await ai.models.generateContent({
        model,
        contents,
        config,
      });
    });

    return response.text || '';
  } catch (err: any) {
    console.error('Multimodal Gemini call failed after all model retries:', err);
    return `📚 **Homework Analysis**\n\n_Note: The AI image/audio analyzer experienced a temporary capacity spike. Please tap "Scan Another Photo" or retry in a few seconds._`;
  }
}

export async function generateAiJson<T>(
  prompt: string | any[],
  systemInstruction?: string,
  fallbackValue?: T
): Promise<T> {
  const ai = getGemini();
  const config: any = {
    responseMimeType: 'application/json',
    temperature: 0.2,
  };
  if (systemInstruction) {
    config.systemInstruction = systemInstruction;
  }

  try {
    const response = await executeWithRetryAndFallback(async (model) => {
      return await ai.models.generateContent({
        model,
        contents: prompt,
        config,
      });
    });

    const raw = (response.text || '{}').trim();
    try {
      return JSON.parse(raw) as T;
    } catch (err) {
      // Attempt cleaning markdown block if any
      const cleaned = raw.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
      return JSON.parse(cleaned) as T;
    }
  } catch (err: any) {
    console.error('All Gemini attempts failed for generateAiJson:', err?.message || err);
    if (fallbackValue !== undefined) {
      return fallbackValue;
    }
    throw err;
  }
}

export async function generateSpeechAudio(
  text: string,
  voiceName: 'Kore' | 'Puck' | 'Zephyr' | 'Fenrir' = 'Kore'
): Promise<string | null> {
  try {
    const ai = getGemini();
    const cleanText = text.replace(/[*_#`[\]()]/g, '').slice(0, 350); // take first clear summary for TTS
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-tts-preview',
      contents: [{ parts: [{ text: `Say in a friendly, encouraging tutor voice: ${cleanText}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64Audio || null;
  } catch (error) {
    console.warn('TTS generation skipped or temporarily unavailable:', error);
    return null;
  }
}

