'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
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

export const SlideCard = memo(function SlideCard({ slide, index, active, resolved, onJump }: SlideCardProps) {
  const safeTitle = sanitizeMultiline(slide.title, 200);
  const safeDescription = sanitizeMultiline(slide.description, 4000);
  const safePath = sanitizeFilePath(slide.targetFile);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      whileHover={{ scale: 1.005 }}
    >
      <Card
        className={cn(
          'border-white/10 bg-zinc-900/40 backdrop-blur-md transition-colors',
          active && 'border-sky-400/60 bg-sky-500/5 shadow-[0_0_24px_rgba(56,189,248,0.12)]',
          resolved && !active && 'opacity-90'
        )}
      >
        <CardContent className="space-y-3 p-4">
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
              <h3 className="font-semibold leading-tight tracking-tight">{safeTitle}</h3>
            </div>
            {active && <Sparkles className="h-4 w-4 text-sky-400" />}
          </div>
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">
            {safeDescription}
          </p>
          <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs">
            <Badge variant="outline" className="min-w-0 max-w-full border-white/10 bg-background/40 font-mono">
              <FileCode2 className="mr-1 h-3 w-3 shrink-0" />
              <span className="truncate">{safePath}</span>
            </Badge>
            <Badge variant="secondary" className="shrink-0">
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
    </motion.div>
  );
});
