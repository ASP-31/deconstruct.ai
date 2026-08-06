export interface ExtractedFile {
  path: string;
  content: string;
}

export interface ArchitectureSlide {
  title: string;
  description: string;
  targetFile: string;
  startLine: number;
  endLine: number;
}

export interface ArchitectureQuiz {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface ArchitectureBlueprint {
  projectOverview: string;
  entryPoints: string[];
  slides: ArchitectureSlide[];
  quizzes: ArchitectureQuiz[];
}

export interface AnalysisResult {
  blueprint: ArchitectureBlueprint;
  extractedFiles: ExtractedFile[];
}

export interface AnalysisError {
  error: string;
  details?: string;
}
