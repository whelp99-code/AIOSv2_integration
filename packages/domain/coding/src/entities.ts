/**
 * Coding Domain Entities
 * 코딩 도메인 엔티티 (vibe-coding-os 재활용)
 */

import { z } from 'zod';

export const ProjectLanguageSchema = z.enum(['typescript', 'python', 'javascript', 'rust', 'go', 'java']);
export type ProjectLanguage = z.infer<typeof ProjectLanguageSchema>;

export const CodingProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  language: ProjectLanguageSchema,
  repository: z.string().optional(),
  entryPoint: z.string().optional(),
  config: z.record(z.unknown()).optional(),
  userId: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type CodingProject = z.infer<typeof CodingProjectSchema>;

export const CodeGenerationSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  prompt: z.string(),
  generatedCode: z.string(),
  language: ProjectLanguageSchema,
  filePath: z.string().optional(),
  status: z.enum(['pending', 'generating', 'completed', 'failed']),
  error: z.string().optional(),
  createdAt: z.string().datetime(),
});
export type CodeGeneration = z.infer<typeof CodeGenerationSchema>;

export const CodeReviewSchema = z.object({
  id: z.string(),
  generationId: z.string(),
  score: z.number().min(0).max(100),
  issues: z.array(z.object({
    severity: z.enum(['info', 'warning', 'error']),
    message: z.string(),
    line: z.number().optional(),
  })),
  suggestions: z.array(z.string()),
  summary: z.string(),
  createdAt: z.string().datetime(),
});
export type CodeReview = z.infer<typeof CodeReviewSchema>;

export const TestResultSchema = z.object({
  id: z.string(),
  generationId: z.string(),
  passed: z.number(),
  failed: z.number(),
  total: z.number(),
  coverage: z.number().optional(),
  details: z.array(z.object({
    name: z.string(),
    status: z.enum(['passed', 'failed', 'skipped']),
    duration: z.number(),
    error: z.string().optional(),
  })),
  createdAt: z.string().datetime(),
});
export type TestResult = z.infer<typeof TestResultSchema>;
