/**
 * Coding Service
 * 코딩 유스케이스 서비스 (vibe-coding-os 재활용)
 */

import type {
  CodingProject, CodingProjectRepository,
  CodeGeneration, CodeGenerationRepository,
  CodeReview, CodeReviewRepository,
} from '@aios/domain/coding';
import type { LLMClient, LLMMessage } from '@aios/infrastructure/llm';

export class CodingService {
  constructor(
    private projectRepo: CodingProjectRepository,
    private generationRepo: CodeGenerationRepository,
    private reviewRepo: CodeReviewRepository,
    private llm: LLMClient
  ) {}

  async getProjects(userId: string): Promise<CodingProject[]> {
    return this.projectRepo.findByUserId(userId);
  }

  async getProjectById(id: string): Promise<CodingProject | null> {
    return this.projectRepo.findById(id);
  }

  async createProject(data: Omit<CodingProject, 'id' | 'createdAt' | 'updatedAt'>): Promise<CodingProject> {
    const now = new Date().toISOString();
    const project: CodingProject = { ...data, id: `proj_${Date.now()}`, createdAt: now, updatedAt: now };
    await this.projectRepo.save(project);
    return project;
  }

  async generateCode(projectId: string, prompt: string): Promise<CodeGeneration> {
    const project = await this.projectRepo.findById(projectId);
    if (!project) throw new Error(`Project not found: ${projectId}`);

    const generation: CodeGeneration = {
      id: `gen_${Date.now()}`,
      projectId,
      prompt,
      generatedCode: '',
      language: project.language,
      status: 'generating',
      createdAt: new Date().toISOString(),
    };
    await this.generationRepo.save(generation);

    try {
      const messages: LLMMessage[] = [
        {
          role: 'system',
          content: `You are an expert ${project.language} developer. Generate clean, well-documented code. Output only the code, no explanations.`,
        },
        { role: 'user', content: prompt },
      ];

      const result = await this.llm.complete(messages, { temperature: 0.3 });
      const code = result.content.replace(/^```[\w]*\n?/gm, '').replace(/```$/gm, '').trim();

      await this.generationRepo.update(generation.id, {
        generatedCode: code,
        status: 'completed',
      });
    } catch (error) {
      await this.generationRepo.update(generation.id, {
        status: 'failed',
        error: String(error),
      });
    }

    return (await this.generationRepo.findById(generation.id))!;
  }

  async reviewCode(generationId: string): Promise<CodeReview> {
    const generation = await this.generationRepo.findById(generationId);
    if (!generation) throw new Error(`Generation not found: ${generationId}`);

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: `You are a code reviewer. Review the code and provide:
- score (0-100)
- issues array with severity (info/warning/error), message, optional line number
- suggestions array
- summary string
Respond in JSON format.`,
      },
      {
        role: 'user',
        content: `Language: ${generation.language}\nCode:\n${generation.generatedCode}`,
      },
    ];

    const result = await this.llm.complete(messages, { temperature: 0.3 });
    let reviewData: Partial<CodeReview>;
    try {
      reviewData = JSON.parse(result.content);
    } catch {
      reviewData = { score: 50, issues: [], suggestions: [], summary: result.content };
    }

    const review: CodeReview = {
      id: `review_${Date.now()}`,
      generationId,
      score: reviewData.score || 50,
      issues: reviewData.issues || [],
      suggestions: reviewData.suggestions || [],
      summary: reviewData.summary || '',
      createdAt: new Date().toISOString(),
    };
    await this.reviewRepo.save(review);
    return review;
  }

  async getGenerations(projectId: string): Promise<CodeGeneration[]> {
    return this.generationRepo.findByProjectId(projectId);
  }
}
