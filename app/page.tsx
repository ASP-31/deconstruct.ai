import Link from 'next/link';
import { UploadZone } from '@/components/upload-zone';
import { Button } from '@/components/ui/button';
import { Sparkles, GitBranch, FileCode2, Presentation, ListChecks } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function HomePage() {
  return (
    <TooltipProvider>
      <main className="bg-noise relative isolate min-h-screen overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-500/20 via-[#09090b] to-[#09090b]" />
        <div className="bg-grid pointer-events-none absolute inset-0 -z-10 opacity-60 [mask-image:radial-gradient(ellipse_at_top,black,transparent_75%)]" />

        <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-sky-400 to-indigo-500 text-white shadow-[0_0_24px_rgba(56,189,248,0.3)]">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold tracking-tight">Deconstruct.ai</span>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground sm:flex">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#workflow" className="hover:text-foreground">Workflow</a>
            <a href="#stack" className="hover:text-foreground">Tech Stack</a>
          </nav>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button asChild size="sm" className="rounded-full">
                <Link href="/workspace">Open Workspace</Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Jump back to your last analysis</TooltipContent>
          </Tooltip>
        </header>

        <section className="mx-auto max-w-4xl px-6 pt-16 text-center sm:pt-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-zinc-900/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-sky-400" />
            AI-powered reverse engineering
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-6xl">
            Understand any codebase{' '}
            <span className="bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
              visually, interactively, intelligently.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Upload a project ZIP and let Deconstruct.ai analyze, visualize, and explain
            the architecture — with synchronized code, slides, and quizzes.
          </p>

          <div className="mx-auto mt-10 max-w-xl">
            <UploadZone />
          </div>
        </section>

        <section id="features" className="mx-auto mt-24 grid max-w-6xl grid-cols-1 gap-4 px-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: FileCode2, title: 'Fast Ingestion', body: 'Drag-and-drop ZIP upload with smart filtering of build artifacts.' },
            { icon: GitBranch, title: 'AI Analysis', body: 'Gemini maps entry points, data flow, and module relationships.' },
            { icon: Presentation, title: 'Slides + Code', body: 'Interactive slides synchronized to Monaco editor line numbers.' },
            { icon: ListChecks, title: 'Smart Quizzes', body: 'Concept-reinforcement questions built from the source.' },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="group rounded-xl border border-white/10 bg-zinc-900/40 p-5 backdrop-blur-md transition-colors hover:border-sky-400/40 hover:bg-zinc-900/60">
              <Icon className="h-5 w-5 text-sky-400 transition-transform group-hover:scale-110" />
              <h3 className="mt-3 font-semibold tracking-tight">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </section>

        <section id="workflow" className="mx-auto mt-24 max-w-5xl px-6">
          <h2 className="text-2xl font-semibold tracking-tight">Project Workflow</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            From raw ZIP to a fully interactive learning session.
          </p>
          <pre className="mt-6 overflow-x-auto rounded-xl border border-white/10 bg-zinc-900/40 p-5 font-mono text-xs leading-6 text-muted-foreground backdrop-blur-md">
{`Project ZIP
     │
     ▼
ZIP Extraction
     │
     ▼
File Filtering
     │
     ▼
Codebase Parsing
     │
     ▼
Gemini Architecture Analysis
     │
     ▼
Structured JSON
     │
     ├─────────────┐
     ▼             ▼
Monaco Editor   Interactive Slides
     │             │
     └──────┬──────┘
            ▼
   Sync-to-Line Navigation
            │
            ▼
     Learning Quizzes`}
          </pre>
        </section>

        <section id="stack" className="mx-auto mt-24 max-w-5xl px-6 pb-24">
          <h2 className="text-2xl font-semibold tracking-tight">Tech Stack</h2>
          <ul className="mt-4 grid grid-cols-2 gap-3 text-sm text-muted-foreground sm:grid-cols-3">
            {[
              'Next.js 15 (App Router)',
              'React 19',
              'Tailwind CSS',
              'shadcn/ui',
              'Monaco Editor',
              'Google Gemini API',
              'adm-zip',
              'TypeScript',
            ].map((s) => (
              <li key={s} className="rounded-md border border-white/10 bg-zinc-900/40 px-3 py-2 backdrop-blur-md">
                {s}
              </li>
            ))}
          </ul>
        </section>
      </main>
    </TooltipProvider>
  );
}
