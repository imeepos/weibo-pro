import { vi } from 'vitest';
import { WorkflowService } from './workflow.service';
import { WorkflowEntity, WorkflowShareEntity } from '@sker/entities';
import { mockEntityManager } from '../test-setup';

export interface WorkflowServiceTestHarness {
  service: WorkflowService;
  mockWorkflowRepo: any;
  mockShareRepo: any;
}

/**
 * 构造 WorkflowService 测试环境：
 * - 全新 WorkflowService 实例
 * - mockWorkflowRepo / mockShareRepo 分别对应 WorkflowEntity / WorkflowShareEntity
 * - mockEntityManager.getRepository 按实体分发
 */
export function setupWorkflowServiceTest(): WorkflowServiceTestHarness {
  const service = new WorkflowService();

  const mockWorkflowRepo: any = {
    findOne: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
    find: vi.fn(),
    softDelete: vi.fn(),
  };

  const mockShareRepo: any = {
    create: vi.fn(),
    save: vi.fn(),
    findOne: vi.fn(),
    delete: vi.fn(),
  };

  mockEntityManager.getRepository = vi.fn((entity: any) => {
    if (entity === WorkflowEntity) return mockWorkflowRepo;
    if (entity === WorkflowShareEntity) return mockShareRepo;
    return mockWorkflowRepo;
  });

  return { service, mockWorkflowRepo, mockShareRepo };
}
