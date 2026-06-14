import { NextResponse } from 'next/server';
import { getAiosV1ActionService, type ActionContext } from './aios-v1-action-service';
import {
  CommandExecuteRequestSchema,
  type CommandExecuteRequest,
  type CommandsListResponse,
} from '../schemas/aios-v1.schema';

export interface CommandEntry {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  handler?: (params: Record<string, unknown>) => Promise<unknown>;
}

const BUILT_IN_COMMANDS: CommandEntry[] = [
  { id: 'analyze', name: 'Analyze', description: '프로젝트 구조 및 코드 분석', endpoint: '/api/analyze' },
  { id: 'plan', name: 'Plan', description: '개발 계획 수립', endpoint: '/api/plan' },
  { id: 'risk', name: 'Risk Assessment', description: '프로젝트 리스크 평가', endpoint: '/api/risk' },
  { id: 'customers', name: 'Customers', description: '고객 관리', endpoint: '/api/customers' },
  { id: 'partners', name: 'Partners', description: '파트너 관리', endpoint: '/api/partners' },
  { id: 'workflows', name: 'Workflows', description: '워크플로우 관리', endpoint: '/api/workflows' },
];

export class CommandRegistry {
  private commands = new Map<string, CommandEntry>();
  private readonly actionService = getAiosV1ActionService();

  constructor() {
    for (const cmd of BUILT_IN_COMMANDS) {
      this.commands.set(cmd.id, cmd);
    }
  }

  register(entry: CommandEntry): void {
    this.commands.set(entry.id, entry);
  }

  get(id: string): CommandEntry | undefined {
    return this.commands.get(id);
  }

  list(): CommandEntry[] {
    return Array.from(this.commands.values());
  }

  has(id: string): boolean {
    return this.commands.has(id);
  }

  async listCommands(): Promise<NextResponse> {
    return this.actionService.execute({
      path: '/api/commands',
      method: 'GET',
      fallback: () => {
        const response: CommandsListResponse = { commands: this.list() };
        return NextResponse.json(response);
      },
    });
  }

  async executeCommand(body: CommandExecuteRequest, ctx?: ActionContext): Promise<NextResponse> {
    return this.actionService.execute({
      path: '/api/commands',
      method: 'POST',
      body,
      schema: CommandExecuteRequestSchema,
      fallback: () => this.executeLocal(body),
      actionContext: ctx,
    });
  }

  private async executeLocal(body: CommandExecuteRequest): Promise<NextResponse> {
    const entry = this.commands.get(body.command);
    if (!entry) {
      return NextResponse.json(
        { error: `알 수 없는 명령어: ${body.command}` },
        { status: 404 },
      );
    }

    if (entry.handler) {
      try {
        const result = await entry.handler(body.params ?? {});
        return NextResponse.json({
          status: 'completed',
          message: `${body.command} 명령어가 실행되었습니다.`,
          result,
        });
      } catch (err) {
        return NextResponse.json(
          {
            status: 'failed',
            message: `${body.command} 실행 중 오류 발생`,
            error: err instanceof Error ? err.message : String(err),
          },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({
      status: 'queued',
      message: `${body.command} 명령어가 실행되었습니다.`,
    });
  }
}

let _instance: CommandRegistry | null = null;
export function getCommandRegistry(): CommandRegistry {
  if (!_instance) _instance = new CommandRegistry();
  return _instance;
}
export function resetCommandRegistry(): void {
  _instance = null;
}
