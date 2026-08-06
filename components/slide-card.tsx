'use client';

import { ArrowRight, FileCode2, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sanitizeMultiline, sanitizeFilePath } from '@/utils/sanitize';
import type { ArchitectureSlide } from '@/types/analysis';

interface SlideCardProps {
  slide: ArchitectureSlide;
  index: number;
  active: boolean;
  resolved: boolean;
  onJump: () => void;
}

export function SlideCard({ slide, index, active, resolved, onJump }: SlideCardProps) {
  const safeTitle = sanitizeMultiline(slide.title, 200);
  const safeDescription = sanitizeMultiline(slide.description, 4000);
  const safePath = sanitizeFilePath(slide.targetFile);

  return (
    <Card
      className={cn(
        'border-border/60 bg-card/60 transition-colors',
        active && 'border-sky-400/60 bg-sky-500/5',
        resolved && !active && 'opacity-90'
      )}
    >
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'grid h-6 w-6 place-items-center rounded-full text-xs font-semibold',
                active ? 'bg-sky-500 text-white' : 'bg-secondary text-secondary-foreground'
              )}
            >
              {index + 1}
            </span>
            <h3 className="font-semibold leading-tight">{safeTitle}</h3>
          </div>
          {active && <Sparkles className="h-4 w-4 text-sky-400" />}
        </div>
        <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
          {safeDescription}
        </p>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="outline" className="border-border/60 bg-background/40 font-mono">
            <FileCode2 className="mr-1 h-3 w-3" />
            {safePath}
          </Badge>
          <Badge variant="secondary">
            L{slide.startLine}–L{slide.endLine}
          </Badge>
        </div>
        <Button
          variant={active ? 'secondary' : 'default'}
          size="sm"
          className="w-full"
          onClick={onJump}
        >
          {active ? 'Focused in editor' : 'Jump to code'}
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </CardContent>
    </Card>
  );
}
