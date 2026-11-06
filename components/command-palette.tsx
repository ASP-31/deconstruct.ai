'use client';

import { useEffect, useState } from 'react';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { FileCode2, Layout, GraduationCap, Compass, Home } from 'lucide-react';
import type { ArchitectureSlide, ExtractedFile } from '@/types/analysis';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  files: ExtractedFile[];
  slides: ArchitectureSlide[];
  onSelectFile: (file: ExtractedFile) => void;
  onSelectSlide: (slide: ArchitectureSlide, index: number) => void;
  onSwitchTab: (tab: 'overview' | 'slides' | 'quizzes') => void;
}

export function CommandPalette({ open, onOpenChange, files, slides, onSelectFile, onSelectSlide, onSwitchTab }: CommandPaletteProps) {
  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Jump to file, slide, or tab…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Files">
          {files.map((f) => (
            <CommandItem key={f.path} value={f.path} onSelect={() => { onSelectFile(f); onOpenChange(false); }}>
              <FileCode2 className="h-4 w-4 text-muted-foreground" />
              <span className="truncate font-mono text-xs">{f.path}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Slides">
          {slides.map((s, i) => (
            <CommandItem key={`${s.targetFile}-${i}`} value={`${s.title}-${s.targetFile}-${i}`} onSelect={() => { onSelectSlide(s, i); onOpenChange(false); }}>
              <Layout className="h-4 w-4 text-muted-foreground" />
              <span className="truncate text-xs">Step {i + 1}: {s.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Panels">
          <CommandItem value="overview" onSelect={() => { onSwitchTab('overview'); onOpenChange(false); }}>
            <Compass className="h-4 w-4" /> Overview
          </CommandItem>
          <CommandItem value="slides-tab" onSelect={() => { onSwitchTab('slides'); onOpenChange(false); }}>
            <Layout className="h-4 w-4" /> Slides
          </CommandItem>
          <CommandItem value="quizzes-tab" onSelect={() => { onSwitchTab('quizzes'); onOpenChange(false); }}>
            <GraduationCap className="h-4 w-4" /> Quizzes
          </CommandItem>
          <CommandItem value="home" onSelect={() => { window.location.href = '/'; }}>
            <Home className="h-4 w-4" /> Back to home
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

export function useCommandPaletteShortcut(setOpen: (v: boolean) => void) {
  const [open, _setOpen] = useState(false);
  const setOpenFn = (v: boolean) => { _setOpen(v); setOpen(v); };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpenFn(!open);
      }
      if (e.key === 'Escape') setOpenFn(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  return { open, setOpen: setOpenFn };
}
