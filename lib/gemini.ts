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

// Lite first (faster, less saturated) with full flash as fallback.
// Env override: set GEMINI_MODEL=gemini-flash-latest to flip order.
function resolveModels(): string[] {
  const override = process.env.GEMINI_MODEL?.trim();
  const defaults = ['gemini-flash-lite-latest', 'gemini-flash-latest'];
  if (override && !defaults.includes(override)) return [override, ...defaults];
  if (override) return [override, ...defaults.filter((m) => m !== override)];
  return defaults;
}
export const ANALYSIS_MODELS = resolveModels();
const MAX_ATTEMPTS = 3;
const TRANSIENT_PATTERN =
  /\b(429|500|502|503|504)\b|UNAVAILABLE|overloaded|high demand|rate.?limit|fetch failed|network|timeout|timed out|deadline|ECONNRESET|ECONNABORTED|ETIMEDOUT|UND_ERR|EPIPE|ENOTFOUND|EAI_AGAIN/i;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientModelError(err: unknown): boolean {
  if (err && typeof err === 'object') {
    const status = (err as { status?: unknown }).status;
    if (typeof status === 'number' && [429, 500, 502, 503, 504].includes(status)) {
      return true;
    }
    // Abort / network blips (fetch failed, timeouts) are worth retrying.
    const cause = (err as { cause?: unknown }).cause;
    if (cause && typeof cause === 'object') {
      const code = (cause as { code?: unknown }).code;
      if (typeof code === 'string' && /ECONN|ETIMEDOUT|UND_ERR|EPIPE|ENOTFOUND|EAI_AGAIN/.test(code)) {
        return true;
      }
      const causeMessage = (cause as { message?: unknown }).message;
      if (typeof causeMessage === 'string' && TRANSIENT_PATTERN.test(causeMessage)) return true;
    }
  }
  const message = err instanceof Error ? err.message : String(err ?? '');
  // Daily quota exhaustion cannot be retried away within a request.
  if (/PerDay|quotaMetric|RESOURCE_EXHAUSTED|check your plan and billing/i.test(message)) {
    return false;
  }
  // Deterministic bad-request errors won't improve with retries.
  if (/MAX_TOKENS|truncated|Invalid|Schema|API key not valid/i.test(message) && !/fetch failed/i.test(message)) {
    return false;
  }
  return TRANSIENT_PATTERN.test(message) || /fetch failed|TypeError: fetch/i.test(message);
}

/**
 * Calls Gemini with retry + backoff, then falls back to the next model in
 * ANALYSIS_MODELS if the current one stays saturated. Google's model backends
 * periodically return transient 503 "high demand" / UNAVAILABLE errors; the
 * retry loop absorbs the blips and the fallback chain absorbs outages.
 */
export async function generateAnalysisText(params: {
  systemInstruction: string;
  userPrompt: string;
}): Promise<string> {
  let lastError: unknown;

  for (const model of ANALYSIS_MODELS) {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        const response = await getAiClient().models.generateContent({
          model,
          contents: params.userPrompt,
          config: {
            systemInstruction: params.systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: architectureResponseSchema,
            temperature: 0.2,
            maxOutputTokens: 4096,
          },
        });

        const responseText = response.text;
        if (!responseText) {
          throw new Error('Empty operational payload returned from Gemini engine.');
        }
        // A truncated response yields invalid JSON for the caller; retrying
        // within this request will not produce more tokens, so we surface a
        // distinct non-transient error instead of letting JSON.parse fail.
        const finishReason = response.candidates?.[0]?.finishReason;
        if (finishReason === 'MAX_TOKENS') {
          throw new Error(
            'Gemini output was truncated (MAX_TOKENS). The codebase snapshot is too large for a single response.'
          );
        }
        if (model !== ANALYSIS_MODELS[0]) {
          logger.warn('gemini', {
            message: 'Served by fallback model',
            model,
          });
        }
        return responseText;
      } catch (err) {
        lastError = err;
        const transient = isTransientModelError(err);
        logger.warn('gemini', {
          message: 'generateContent attempt failed',
          model,
          attempt,
          transient,
          error: err instanceof Error ? err.message : String(err),
        });
        if (!transient || attempt === MAX_ATTEMPTS) break;
        await delay(2000 * 2 ** (attempt - 1));
      }
    }
    // Non-transient failures (auth, bad request, quota exhaustion) will not
    // improve by switching models — surface them immediately.
    if (!isTransientModelError(lastError)) throw lastError;
    logger.warn('gemini', {
      message: 'Model exhausted after retries; falling back to next model',
      exhaustedModel: model,
    });
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
