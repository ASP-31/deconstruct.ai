import 'server-only';
import { GoogleGenAI, Type } from '@google/genai';
import { getRequiredEnv } from '@/lib/env';

let cached: GoogleGenAI | null = null;

export function getAiClient(): GoogleGenAI {
  if (cached) return cached;
  cached = new GoogleGenAI({ apiKey: getRequiredEnv('GEMINI_API_KEY') });
  return cached;
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
