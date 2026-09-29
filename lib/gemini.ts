import 'server-only';
import { GoogleGenAI, Type } from '@google/genai';
import { getRequiredEnv } from '@/lib/env';
import { logger } from '@/lib/logger';

let cached: GoogleGenAI | null = null;

export function getAiClient(): GoogleGenAI {
  if (cached) return cached;
  cached = new GoogleGenAI({ apiKey: getRequiredEnv('GEMINI_API_KEY') });
  return cached;
}

const ANALYSIS_MODEL = 'gemini-flash-latest';
const MAX_ATTEMPTS = 4;
const TRANSIENT_PATTERN =
  /\b(429|500|502|503|504)\b|UNAVAILABLE|overloaded|high demand|rate.?limit/i;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientModelError(err: unknown): boolean {
  if (err && typeof err === 'object') {
    const status = (err as { status?: unknown }).status;
    if (typeof status === 'number' && [429, 500, 502, 503, 504].includes(status)) {
      return true;
    }
  }
  const message = err instanceof Error ? err.message : String(err ?? '');
  return TRANSIENT_PATTERN.test(message);
}

/**
 * Calls Gemini with retry + backoff. Google's model backends periodically
 * return transient 503 "high demand" / UNAVAILABLE errors; a short retry
 * loop absorbs the blips instead of failing the whole analysis.
 */
export async function generateAnalysisText(params: {
  systemInstruction: string;
  userPrompt: string;
}): Promise<string> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await getAiClient().models.generateContent({
        model: ANALYSIS_MODEL,
        contents: params.userPrompt,
        config: {
          systemInstruction: params.systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: architectureResponseSchema,
          temperature: 0.2,
          maxOutputTokens: 8192,
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error('Empty operational payload returned from Gemini engine.');
      }
      return responseText;
    } catch (err) {
      lastError = err;
      const transient = isTransientModelError(err);
      logger.warn('gemini', {
        message: 'generateContent attempt failed',
        attempt,
        transient,
        error: err instanceof Error ? err.message : String(err),
      });
      if (!transient || attempt === MAX_ATTEMPTS) break;
      await delay(2000 * 2 ** (attempt - 1));
    }
  }

  throw lastError;
}

export const architectureResponseSchema = {
  type: Type.OBJECT,
  properties: {
    projectOverview: {
      type: Type.STRING,
      description:
        'A high-level explanation of what this application does, its main architecture pattern, and structural choices.',
    },
    entryPoints: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'List of filenames or route entry points where application execution begins.',
    },
    slides: {
      type: Type.ARRAY,
      description:
        'Step-by-step sequential breakdown cards explaining how the codebase functions.',
      items: {
        type: Type.OBJECT,
        properties: {
          title: {
            type: Type.STRING,
            description: 'Title of the architectural concept or module step.',
          },
          description: {
            type: Type.STRING,
            description: 'Clear, deeply contextual explanation of this component logic.',
          },
          targetFile: {
            type: Type.STRING,
            description:
              'The exact relative file path this slide step is explaining (e.g., lib/codeParser.ts). Must match a file in the tree.',
          },
          startLine: {
            type: Type.INTEGER,
            description: 'The specific line number where this module or block of interest starts.',
          },
          endLine: {
            type: Type.INTEGER,
            description: 'The specific line number where this module or block ends.',
          },
        },
        required: ['title', 'description', 'targetFile', 'startLine', 'endLine'],
      },
    },
    quizzes: {
      type: Type.ARRAY,
      description:
        'An array of concept-reinforcement multiple choice questions built entirely from the provided codebase logic.',
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING },
          options: { type: Type.ARRAY, items: { type: Type.STRING } },
          correctAnswerIndex: {
            type: Type.INTEGER,
            description: '0-indexed position of the right answer.',
          },
          explanation: {
            type: Type.STRING,
            description: 'Educational rationale behind why this specific option is correct.',
          },
        },
        required: ['question', 'options', 'correctAnswerIndex', 'explanation'],
      },
    },
  },
  required: ['projectOverview', 'entryPoints', 'slides', 'quizzes'],
};
