'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
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
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileExplorer } from '@/components/file-explorer';
import { MonacoViewer } from '@/components/monaco-viewer';
import { SlideCard } from '@/components/slide-card';
import { QuizCard } from '@/components/quiz-card';
import { UploadZone } from '@/components/upload-zone';
import { buildFileTree, type FileNode } from '@/utils/file-tree';
import { detectLanguageFromPath } from '@/utils/language';
import { sanitizeMultiline, sanitizeFilePath } from '@/utils/sanitize';
import { cn } from '@/lib/utils';
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

  useEffect(() => {
    const raw = sessionStorage.getItem('deconstruct:analysis');
    if (!raw) return;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (isAnalysisResult(parsed)) {
        setData({
          blueprint: sanitizeBlueprint(parsed.blueprint),
          extractedFiles: parsed.extractedFiles,
        });
      }
    } catch (err) {
      console.error('Failed to parse stored analysis');
    } finally {
      sessionStorage.removeItem('deconstruct:analysis');
    }
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
      setActiveHighlight({ startLine: slide.startLine, endLine: slide.endLine });
    },
    [findFileForSlide]
  );

  if (!data) {
    return (
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-sky-400 to-indigo-500 text-white shadow-lg">
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
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="flex shrink-0 items-center justify-between border-b border-border/60 bg-background/80 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              Home
            </Link>
          </Button>
          <Separator orientation="vertical" className="h-5" />
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-md bg-gradient-to-br from-sky-400 to-indigo-500 text-white">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold">Deconstruct Workspace</p>
              <p className="text-xs text-muted-foreground">
                {extractedFiles.length} source files · {slides.length} slides · {blueprint.quizzes.length} quizzes
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-muted-foreground sm:inline">
            {blueprint.entryPoints.length} entry points
          </span>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)_minmax(340px,460px)]">
        <aside className="hidden border-r border-border/60 bg-card/30 lg:block">
          <div className="flex h-full min-h-0 flex-col">
            <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
          </div>
        </aside>

        <section className="flex min-h-0 flex-col">
          <div className="flex items-center justify-between border-b border-border/60 bg-card/30 px-4 py-2 text-xs">
            <div className="flex min-w-0 items-center gap-2">
              <FileCode2 className="h-3.5 w-3.5 shrink-0 text-sky-400" />
              <span className="truncate font-mono text-muted-foreground">
                {safeHeaderPath || 'Select a file to inspect'}
              </span>
            </div>
            {activeHighlight && (
              <span className="shrink-0 text-sky-400">
                Lines {activeHighlight.startLine}–{activeHighlight.endLine}
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
        </section>

        <aside className="flex min-h-0 flex-col border-l border-border/60 bg-card/30">
          <Tabs defaultValue="slides" className="flex h-full min-h-0 flex-col">
            <div className="border-b border-border/60 px-4 py-3">
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
                  <Card className="border-border/60 bg-card/60">
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
                  <Card className="border-border/60 bg-card/60">
                    <CardContent className="space-y-2 p-4">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-sky-400">
                        <Network className="h-3.5 w-3.5" />
                        Entry Points
                      </div>
                      <ul className="space-y-1.5 text-sm">
                        {blueprint.entryPoints.map((entry) => (
                          <li
                            key={entry}
                            className="flex items-center gap-2 rounded bg-background/40 px-2 py-1.5 font-mono text-xs"
                          >
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
                      resolved={Boolean(
                        activeFile && activeFile.path === findFileForSlide(slide)?.path
                      )}
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
        </aside>
      </div>

      {activeSlide && (
        <div
          className={cn(
            'pointer-events-none fixed bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-full border border-border/60 bg-background/80 px-4 py-1.5 text-xs text-muted-foreground shadow-lg backdrop-blur'
          )}
        >
          Step {activeSlideIndex + 1} / {slides.length} · {activeSlide.title}
        </div>
      )}
    </div>
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
