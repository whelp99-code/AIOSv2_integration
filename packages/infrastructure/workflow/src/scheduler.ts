/**
 * Workflow Scheduler
 * 워크플로우 스케줄링
 */

export interface ScheduleConfig {
  cron?: string;
  intervalMs?: number;
  runOnce?: boolean;
}

export interface ScheduledWorkflow {
  id: string;
  workflowId: string;
  config: ScheduleConfig;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
}

export class WorkflowScheduler {
  private schedules: Map<string, ScheduledWorkflow> = new Map();
  private timers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  addSchedule(schedule: ScheduledWorkflow): void {
    this.schedules.set(schedule.id, schedule);
    if (schedule.enabled) {
      this.startSchedule(schedule);
    }
  }

  removeSchedule(scheduleId: string): void {
    const timer = this.timers.get(scheduleId);
    if (timer) clearTimeout(timer);
    this.timers.delete(scheduleId);
    this.schedules.delete(scheduleId);
  }

  enableSchedule(scheduleId: string): void {
    const schedule = this.schedules.get(scheduleId);
    if (schedule) {
      schedule.enabled = true;
      this.startSchedule(schedule);
    }
  }

  disableSchedule(scheduleId: string): void {
    const schedule = this.schedules.get(scheduleId);
    if (schedule) {
      schedule.enabled = false;
      const timer = this.timers.get(scheduleId);
      if (timer) clearTimeout(timer);
    }
  }

  getSchedules(): ScheduledWorkflow[] {
    return Array.from(this.schedules.values());
  }

  private startSchedule(schedule: ScheduledWorkflow): void {
    if (schedule.config.intervalMs) {
      const timer = setInterval(() => {
        schedule.lastRun = new Date();
        console.log(`Scheduled workflow ${schedule.workflowId} triggered`);
      }, schedule.config.intervalMs);
      this.timers.set(schedule.id, timer as unknown as ReturnType<typeof setTimeout>);
    }
  }
}
