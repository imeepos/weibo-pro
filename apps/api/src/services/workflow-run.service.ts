import { Injectable } from '@sker/core';
import {
  WorkflowRunEntity,
  RunStatus,
} from '@sker/entities';
import {
  createWorkflowRun,
  startWorkflowRun,
  completeWorkflowRun,
  cancelWorkflowRun,
} from './workflow-run.lifecycle';
import {
  getWorkflowRun,
  listWorkflowRuns,
  updateWorkflowRunStatus,
  deleteWorkflowRuns,
  cleanupWorkflowRuns,
} from './workflow-run.management';

/**
 * 工作流运行实例服务
 *
 * - 管理工作流的运行实例生命周期
 * - 追踪每次运行的输入、输出和状态
 * - 支持多实例并发运行
 * - 提供运行历史追溯能力
 */
@Injectable({ providedIn: 'root' })
export class WorkflowRunService {
  /**
   * 创建运行实例
   */
  async createRun(
    workflowId: string,
    inputs?: Record<string, unknown>,
    scheduleId?: string,
  ): Promise<WorkflowRunEntity> {
    return createWorkflowRun(workflowId, inputs, scheduleId);
  }

  /**
   * 获取运行实例
   */
  async getRun(runId: string): Promise<WorkflowRunEntity | null> {
    return getWorkflowRun(runId);
  }

  /**
   * 列出运行历史
   */
  async listRuns(
    workflowId: string,
    options?: {
      page?: number;
      pageSize?: number;
      status?: RunStatus;
      startDate?: Date;
      endDate?: Date;
    },
  ): Promise<{ runs: WorkflowRunEntity[]; total: number }> {
    return listWorkflowRuns(workflowId, options);
  }

  /**
   * 更新运行状态
   */
  async updateRunStatus(
    runId: string,
    updates: {
      status?: RunStatus;
      nodeStates?: Record<string, unknown>;
      outputs?: Record<string, unknown>;
      error?: { message: string; stack?: string; nodeId?: string };
      startedAt?: Date;
      completedAt?: Date;
    },
  ): Promise<void> {
    return updateWorkflowRunStatus(runId, updates);
  }

  /**
   * 开始运行
   */
  async startRun(runId: string): Promise<void> {
    return startWorkflowRun(runId);
  }

  /**
   * 完成运行
   */
  async completeRun(
    runId: string,
    result: {
      success: boolean;
      outputs?: Record<string, unknown>;
      nodeStates?: Record<string, unknown>;
      error?: { message: string; stack?: string; nodeId?: string };
    },
  ): Promise<void> {
    return completeWorkflowRun(runId, result);
  }

  /**
   * 取消运行
   */
  async cancelRun(runId: string): Promise<void> {
    return cancelWorkflowRun(runId);
  }

  /**
   * 删除运行历史
   */
  async deleteRuns(runIds: string[]): Promise<number> {
    return deleteWorkflowRuns(runIds);
  }

  /**
   * 清理过期的运行记录
   */
  async cleanupOldRuns(daysToKeep: number = 30): Promise<number> {
    return cleanupWorkflowRuns(daysToKeep);
  }
}
