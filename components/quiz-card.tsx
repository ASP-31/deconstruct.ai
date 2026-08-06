'use client';

import { useState } from 'react';
import { CheckCircle2, XCircle, RefreshCcw, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sanitizeMultiline } from '@/utils/sanitize';
import type { ArchitectureQuiz } from '@/types/analysis';

interface QuizCardProps {
  quiz: ArchitectureQuiz;
  index: number;
}

export function QuizCard({ quiz, index }: QuizCardProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  const safeQuestion = sanitizeMultiline(quiz.question, 1000);
  const safeExplanation = sanitizeMultiline(quiz.explanation, 2000);
  const safeOptions = (Array.isArray(quiz.options) ? quiz.options : []).map((o) =>
    sanitizeMultiline(String(o ?? ''), 500)
  );
  const correctIndex =
    Number.isInteger(quiz.correctAnswerIndex) &&
    quiz.correctAnswerIndex >= 0 &&
    quiz.correctAnswerIndex < safeOptions.length
      ? quiz.correctAnswerIndex
      : 0;

  const isCorrect = selected === correctIndex;

  const reset = () => {
    setSelected(null);
    setRevealed(false);
  };

  return (
    <Card className="border-border/60 bg-card/60">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-sky-500/10 text-xs font-semibold text-sky-400">
            Q{index + 1}
          </span>
          <h3 className="text-sm font-semibold leading-snug">{safeQuestion}</h3>
        </div>
        <div className="grid gap-2">
          {safeOptions.map((option, optionIndex) => {
            const isSelected = selected === optionIndex;
            const showAsCorrect = revealed && optionIndex === correctIndex;
            const showAsWrong = revealed && isSelected && optionIndex !== correctIndex;
            return (
              <button
                key={`${index}-${optionIndex}`}
                type="button"
                disabled={revealed}
                onClick={() => setSelected(optionIndex)}
                className={cn(
                  'flex items-center gap-2 rounded-md border border-border/60 bg-background/40 px-3 py-2 text-left text-sm transition-colors hover:bg-accent/60 disabled:cursor-not-allowed',
                  isSelected && !revealed && 'border-sky-400/60 bg-sky-500/5',
                  showAsCorrect && 'border-emerald-500/60 bg-emerald-500/10',
                  showAsWrong && 'border-destructive/60 bg-destructive/10'
                )}
              >
                <span className="grid h-5 w-5 place-items-center rounded-full border border-border/80 text-[10px] font-semibold">
                  {String.fromCharCode(65 + optionIndex)}
                </span>
                <span className="flex-1 break-words">{option}</span>
                {showAsCorrect && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                {showAsWrong && <XCircle className="h-4 w-4 text-destructive" />}
              </button>
            );
          })}
        </div>
        {revealed && (
          <div
            className={cn(
              'rounded-md border p-3 text-sm',
              isCorrect
                ? 'border-emerald-500/40 bg-emerald-500/5 text-emerald-200'
                : 'border-destructive/40 bg-destructive/5 text-destructive-foreground/80'
            )}
          >
            <div className="flex items-center gap-2 font-medium">
              <Sparkles className="h-3.5 w-3.5" />
              {isCorrect ? 'Correct!' : 'Not quite — here is why:'}
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {safeExplanation}
            </p>
          </div>
        )}
        <div className="flex justify-end">
          {!revealed ? (
            <Button size="sm" onClick={() => setRevealed(true)} disabled={selected === null}>
              Check answer
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={reset}>
              <RefreshCcw className="h-3.5 w-3.5" />
              Try again
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
