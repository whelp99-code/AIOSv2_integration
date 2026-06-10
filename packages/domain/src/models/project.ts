/**
 * Project Intake Domain Model
 * 프로젝트 수신 및 관리를 위한 도메인 모델
 */

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, unknown>;
}

export type ProjectStatus = 
  | 'intake'
  | 'planning'
  | 'in-progress'
  | 'review'
  | 'completed'
  | 'archived';

export interface ProjectIntakeRequest {
  name: string;
  description: string;
  requirements: string[];
  priority: Priority;
  requester: string;
}

export type Priority = 'low' | 'medium' | 'high' | 'critical';

export interface ProjectIntakeResult {
  project: Project;
  tasks: Task[];
  estimatedDuration: string;
}

// Re-export from task model
import type { Task } from './task';
