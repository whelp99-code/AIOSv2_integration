import type { CodingProject, CodeGeneration, CodeReview, TestResult } from './entities';

export interface CodingProjectRepository {
  findById(id: string): Promise<CodingProject | null>;
  findByUserId(userId: string): Promise<CodingProject[]>;
  save(project: CodingProject): Promise<void>;
  update(id: string, updates: Partial<CodingProject>): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface CodeGenerationRepository {
  findById(id: string): Promise<CodeGeneration | null>;
  findByProjectId(projectId: string): Promise<CodeGeneration[]>;
  save(generation: CodeGeneration): Promise<void>;
  update(id: string, updates: Partial<CodeGeneration>): Promise<void>;
}

export interface CodeReviewRepository {
  findByGenerationId(generationId: string): Promise<CodeReview | null>;
  save(review: CodeReview): Promise<void>;
}

export interface TestResultRepository {
  findByGenerationId(generationId: string): Promise<TestResult | null>;
  save(result: TestResult): Promise<void>;
}
