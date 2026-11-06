'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Compass,
  FileCode2,
  GraduationCap,
  Layout,
  Loader2,
  Network,
  Search,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FileExplorer } from '@/components/file-explorer';
import { MonacoViewer } from '@/components/monaco-viewer';
import { SlideCard } from '@/components/slide-card';
import { QuizCard } from '@/components/quiz-card';
import { UploadZone } from '@/components/upload-zone';
import { CommandPalette } from '@/components/command-palette';
import { buildFileTree, type FileNode } from '@/utils/file-tree';
import { detectLanguageFromPath } from '@/utils/language';
import { sanitizeMultiline, sanitizeFilePath } from '@/utils/sanitize';
import { cn } from '@/lib/utils';
import { loadAnalysis, clearAnalysis } from '@/lib/analysis-cache';
import type {
  AnalysisResult,
  ArchitectureBlueprint,
  ArchitectureQuiz,
  ArchitectureSlide,
  ExtractedFile,
} from '@/types/analysis';

interface ResolvedFile extends ExtractedFile {
  language: string;
}

function isAnalysisResult(value: unknown): value is AnalysisResult {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  const blueprint = candidate.blueprint as ArchitectureBlueprint | undefined;
  const files = candidate.extractedFiles;
  if (!blueprint) return false;
  if (typeof blueprint.projectOverview !== 'string') return false;
  if (!Array.isArray(blueprint.entryPoints)) return false;
  if (!Array.isArray(blueprint.slides)) return false;
  if (!Array.isArray(blueprint.quizzes)) return false;
  if (!Array.isArray(files)) return false;
  return files.every(
    (file) =>
      file &&
      typeof file === 'object' &&
      typeof (file as ExtractedFile).path === 'string' &&
      typeof (file as ExtractedFile).content === 'string'
  );
}

function sanitizeBlueprint(blueprint: ArchitectureBlueprint): ArchitectureBlueprint {
  return {
    projectOverview: sanitizeMultiline(blueprint.projectOverview, 12_000),
    entryPoints: blueprint.entryPoints
      .filter((entry): entry is string => typeof entry === 'string')
      .map((entry) => sanitizeFilePath(entry, 256))
      .filter(Boolean),
    slides: blueprint.slides
      .filter((slide): slide is ArchitectureSlide => !!slide && typeof slide === 'object')
      .map((slide) => ({
        title: sanitizeMultiline(slide.title ?? '', 200),
        description: sanitizeMultiline(slide.description ?? '', 4000),
        targetFile: sanitizeFilePath(slide.targetFile ?? ''),
        startLine: Math.max(1, Math.min(Number(slide.startLine) || 1, 1_000_000)),
        endLine: Math.max(1, Math.min(Number(slide.endLine) || 1, 1_000_000)),
      })),
    quizzes: blueprint.quizzes
      .filter((quiz): quiz is ArchitectureQuiz => !!quiz && typeof quiz === 'object')
      .map((quiz) => ({
        question: sanitizeMultiline(quiz.question ?? '', 1000),
        options: (Array.isArray(quiz.options) ? quiz.options : [])
          .map((option) => sanitizeMultiline(String(option ?? ''), 500))
          .filter(Boolean),
        correctAnswerIndex: Math.max(0, Math.floor(Number(quiz.correctAnswerIndex) || 0)),
        explanation: sanitizeMultiline(quiz.explanation ?? '', 2000),
      })),
  };
}

export function Workspace() {
  const [data, setData] = useState<AnalysisResult | null>(null);
  const [activeFile, setActiveFile] = useState<ResolvedFile | null>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [activeHighlight, setActiveHighlight] = useState<{
    startLine: number;
    endLine: number;
  } | null>(null);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'slides' | 'quizzes'>('slides');
  const [showExplorer, setShowExplorer] = useState(true);
  const [showRight, setShowRight] = useState(true);

  useEffect(() => {
    const stored = loadAnalysis();
    if (!stored || !isAnalysisResult(stored)) {
      clearAnalysis();
      return;
    }
    setData({
      blueprint: sanitizeBlueprint(stored.blueprint),
      extractedFiles: stored.extractedFiles,
    });
    const first =
      stored.extractedFiles.find(
        (file) => file.path === stored.blueprint.slides[0]?.targetFile
      ) ?? stored.extractedFiles[0];
    if (first) {
      setActiveFile({ ...first, language: detectLanguageFromPath(first.path) });
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const tree = useMemo(() => {
    if (!data) return null;
    return buildFileTree(data.extractedFiles);
  }, [data]);

  const resolvedFiles = useMemo<ResolvedFile[] | null>(() => {
    if (!data) return null;
    return data.extractedFiles.map((file) => ({
      ...file,
      language: detectLanguageFromPath(file.path),
    }));
  }, [data]);

  const fileByPath = useMemo(() => {
    const map = new Map<string, ResolvedFile>();
    resolvedFiles?.forEach((file) => map.set(file.path, file));
    return map;
  }, [resolvedFiles]);

  const findFileForSlide = useCallback(
    (slide: ArchitectureSlide): ResolvedFile | null => {
      if (!resolvedFiles) return null;
      const exact = fileByPath.get(slide.targetFile);
      if (exact) return exact;
      const lowered = slide.targetFile.toLowerCase();
      return (
        resolvedFiles.find((file) => file.path.toLowerCase() === lowered) ??
        resolvedFiles.find((file) =>
          file.path.toLowerCase().endsWith(lowered.split('/').pop() ?? '')
        ) ??
        null
      );
    },
    [fileByPath, resolvedFiles]
  );

  const handleSelectNode = useCallback((node: FileNode) => {
    if (node.isDirectory || !node.file) return;
    const resolved: ResolvedFile = {
      ...node.file,
      language: detectLanguageFromPath(node.file.path),
    };
    setActiveFile(resolved);
    setActiveHighlight(null);
  }, []);

  const handleJumpToSlide = useCallback(
    (slide: ArchitectureSlide, index: number) => {
      const file = findFileForSlide(slide);
      if (file) setActiveFile(file);
      setActiveSlideIndex(index);
      setActiveHighlight(file ? { startLine: slide.startLine, endLine: slide.endLine } : null);
    },
    [findFileForSlide]
  );

  if (!data) {
    return (
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-sky-400 to-indigo-500 text-white shadow-[0_0_32px_rgba(56,189,248,0.3)]">
          <Sparkles className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">No analysis loaded</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Upload a project ZIP to generate a structured learning session.
          </p>
        </div>
        <UploadZone />
        <Button asChild variant="ghost" size="sm">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </Button>
      </div>
    );
  }

  const { blueprint, extractedFiles } = data;
  const slides = blueprint.slides;
  const activeSlide = slides[activeSlideIndex];
  const safeHeaderPath = activeFile ? sanitizeFilePath(activeFile.path) : '';

  return (
    <TooltipProvider>
      <div className="flex h-screen flex-col bg-[#09090b] text-foreground">
        <header className="flex shrink-0 items-center justify-between border-b border-white/10 bg-zinc-900/40 px-4 py-3 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm">
              <Link href="/">
                <ArrowLeft className="h-4 w-4" />
                Home
              </Link>
            </Button>
            <Separator orientation="vertical" className="h-5" />
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-md bg-gradient-to-br from-sky-400 to-indigo-500 text-white shadow-[0_0_16px_rgba(56,189,248,0.25)]">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="leading-tight">
                <p className="text-sm font-semibold tracking-tight">Deconstruct Workspace</p>
                <p className="font-mono text-[11px] text-muted-foreground">
                  {extractedFiles.length} files · {slides.length} slides · {blueprint.quizzes.length} quizzes
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="hidden sm:inline-flex" onClick={() => setCmdOpen(true)}>
                  <Search className="h-4 w-4" />
                  <span className="text-muted-foreground">Search</span>
                  <kbd className="ml-2 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">⌘K</kbd>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Command palette — jump to file/slide</TooltipContent>
            </Tooltip>
            <Button variant="ghost" size="sm" onClick={() => setShowExplorer((v) => !v)} className="hidden md:inline-flex">
              Explorer
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowRight((v) => !v)} className="hidden md:inline-flex">
              Panel
            </Button>
            <span className="hidden text-xs text-muted-foreground lg:inline">
              {blueprint.entryPoints.length} entry points
            </span>
          </div>
        </header>

        <ResizablePanelGroup orientation="horizontal" className="min-h-0 flex-1">
          <AnimatePresence initial={false}>
            {showExplorer && (
              <ResizablePanel defaultSize={20} minSize={12} maxSize={35}>
                <motion.aside
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.2 }}
                  className="flex h-full min-h-0 flex-col border-r border-white/10 bg-zinc-900/30 backdrop-blur-md"
                >
                  <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <FileCode2 className="h-3.5 w-3.5" />
                    File Explorer
                  </div>
                  <div className="min-h-0 flex-1">
                    {tree && (
                      <FileExplorer
                        tree={tree}
                        activePath={activeFile?.path ?? null}
                        onSelect={handleSelectNode}
                      />
                    )}
                  </div>
                </motion.aside>
              </ResizablePanel>
            )}
          </AnimatePresence>
          <ResizableHandle withHandle={showExplorer && showRight} />

          <ResizablePanel defaultSize={showRight ? 55 : 80} minSize={30}>
            <section className="flex h-full min-h-0 min-w-0 flex-col bg-zinc-950/60">
              <div className="flex items-center justify-between border-b border-white/10 bg-zinc-900/30 px-4 py-2 text-xs backdrop-blur-md">
                <div className="flex min-w-0 items-center gap-2">
                  <FileCode2 className="h-3.5 w-3.5 shrink-0 text-sky-400" />
                  <span className="truncate font-mono text-muted-foreground">
                    {safeHeaderPath || 'Select a file to inspect'}
                  </span>
                </div>
                {activeHighlight && (
                  <span className="shrink-0 font-mono text-sky-400">
                    L{activeHighlight.startLine}–L{activeHighlight.endLine}
                  </span>
                )}
              </div>
              <div className="min-h-0 flex-1">
                {activeFile ? (
                  <MonacoViewer
                    value={activeFile.content}
                    language={activeFile.language}
                    path={activeFile.path}
                    highlightLines={activeHighlight}
                  />
                ) : (
                  <EmptyEditor
                    onPickFirstFile={() => {
                      if (resolvedFiles && resolvedFiles.length > 0) {
                        setActiveFile(resolvedFiles[0]);
                      }
                    }}
                    hasFiles={Boolean(resolvedFiles && resolvedFiles.length > 0)}
                  />
                )}
              </div>
              {/* Mobile file picker (horizontal layout) */}
              <div className="flex gap-2 overflow-x-auto border-t border-white/10 bg-zinc-900/30 p-2 lg:hidden">
                {resolvedFiles?.slice(0, 40).map((f) => (
                  <button
                    key={f.path}
                    type="button"
                    onClick={() => { setActiveFile(f); setActiveHighlight(null); }}
                    className={cn('shrink-0 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[11px]', activeFile?.path === f.path && 'border-sky-400/60 bg-sky-500/10 text-sky-300')}
                  >
                    {f.path.split('/').pop()}
                  </button>
                ))}
              </div>
            </section>
          </ResizablePanel>

          <AnimatePresence initial={false}>
            {showRight && (
              <>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={28} minSize={20} maxSize={45}>
                  <motion.aside
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ duration: 0.2 }}
                    className="flex h-full min-h-0 min-w-0 flex-col border-l border-white/10 bg-zinc-900/30 backdrop-blur-md"
                  >
                    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex h-full min-h-0 flex-col">
                      <div className="border-b border-white/10 px-4 py-3">
                        <TabsList className="w-full">
                          <TabsTrigger value="overview" className="flex-1">
                            <Compass className="h-3.5 w-3.5" />
                            Overview
                          </TabsTrigger>
                          <TabsTrigger value="slides" className="flex-1">
                            <Layout className="h-3.5 w-3.5" />
                            Slides
                          </TabsTrigger>
                          <TabsTrigger value="quizzes" className="flex-1">
                            <GraduationCap className="h-3.5 w-3.5" />
                            Quizzes
                          </TabsTrigger>
                        </TabsList>
                      </div>

                      <TabsContent value="overview" className="m-0 min-h-0 flex-1">
                        <ScrollArea className="h-full">
                          <div className="space-y-4 p-4">
                            <Card className="border-white/10 bg-zinc-900/40 backdrop-blur-md">
                              <CardContent className="space-y-3 p-4">
                                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-sky-400">
                                  <BookOpen className="h-3.5 w-3.5" />
                                  Project Overview
                                </div>
                                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/90">
                                  {blueprint.projectOverview}
                                </p>
                              </CardContent>
                            </Card>
                            <Card className="border-white/10 bg-zinc-900/40 backdrop-blur-md">
                              <CardContent className="space-y-2 p-4">
                                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-sky-400">
                                  <Network className="h-3.5 w-3.5" />
                                  Entry Points
                                </div>
                                <ul className="space-y-1.5 text-sm">
                                  {blueprint.entryPoints.map((entry) => (
                                    <li key={entry} className="flex items-center gap-2 rounded bg-white/5 px-2 py-1.5 font-mono text-xs">
                                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                                      {entry}
                                    </li>
                                  ))}
                                </ul>
                              </CardContent>
                            </Card>
                          </div>
                        </ScrollArea>
                      </TabsContent>

                      <TabsContent value="slides" className="m-0 min-h-0 flex-1">
                        <ScrollArea className="h-full">
                          <div className="space-y-3 p-4">
                            {slides.map((slide, index) => (
                              <SlideCard
                                key={`${slide.targetFile}-${index}`}
                                slide={slide}
                                index={index}
                                active={index === activeSlideIndex}
                                resolved={Boolean(findFileForSlide(slide))}
                                onJump={() => handleJumpToSlide(slide, index)}
                              />
                            ))}
                          </div>
                        </ScrollArea>
                      </TabsContent>

                      <TabsContent value="quizzes" className="m-0 min-h-0 flex-1">
                        <ScrollArea className="h-full">
                          <div className="space-y-3 p-4">
                            {blueprint.quizzes.map((quiz, index) => (
                              <QuizCard key={`quiz-${index}`} quiz={quiz} index={index} />
                            ))}
                          </div>
                        </ScrollArea>
                      </TabsContent>
                    </Tabs>
                  </motion.aside>
                </ResizablePanel>
              </>
            )}
          </AnimatePresence>
        </ResizablePanelGroup>

        {activeSlide && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="pointer-events-none fixed bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-full border border-white/10 bg-zinc-900/80 px-4 py-1.5 font-mono text-xs text-muted-foreground shadow-2xl backdrop-blur-md"
          >
            Step {activeSlideIndex + 1} / {slides.length} · {activeSlide.title}
          </motion.div>
        )}

        <CommandPalette
          open={cmdOpen}
          onOpenChange={setCmdOpen}
          files={extractedFiles}
          slides={slides}
          onSelectFile={(f) => {
            const resolved = { ...f, language: detectLanguageFromPath(f.path) };
            setActiveFile(resolved);
            setActiveHighlight(null);
          }}
          onSelectSlide={(s, i) => handleJumpToSlide(s, i)}
          onSwitchTab={(t) => setActiveTab(t)}
        />
      </div>
    </TooltipProvider>
  );
}

function EmptyEditor({
  onPickFirstFile,
  hasFiles,
}: {
  onPickFirstFile: () => void;
  hasFiles: boolean;
}) {
  return (
    <div className="grid h-full place-items-center text-center">
      <div className="space-y-3">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Select a file from the explorer.</p>
        {hasFiles && (
          <Button size="sm" variant="outline" onClick={onPickFirstFile}>
            Open the first file
          </Button>
        )}
      </div>
    </div>
  );
}
