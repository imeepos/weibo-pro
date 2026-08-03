import { vi } from 'vitest';
import { WorkflowRunService } from './workflow-run.service';
import { WorkflowEntity } from '@sker/entities';
import { mockEntityManager } from '../test-setup';

export interface WorkflowRunTestHarness {
  service: WorkflowRunService;
  mockWorkflowRepo: any;
  mockRunRepo: any;
}

/**
 * 构造 WorkflowRunService 测试环境：
 * - 全新的 WorkflowRunService 实例
 * - mockWorkflowRepo（findOne）
 * - mockRunRepo（create/save/findOne/findAndCount/delete/createQueryBuilder）
 * - mockEntityManager.getRepository 按实体类型分发仓库
 *
 * 每次调用都会创建独立状态，供各测试文件的 beforeEach 复用。
 */
export function setupWorkflowRunTest(): WorkflowRunTestHarness {
  const service = new WorkflowRunService();

  const mockWorkflowRepo: any = {
    findOne: vi.fn(),
  };

  const mockRunRepo: any = {
    create: vi.fn(),
    save: vi.fn(),
    findOne: vi.fn(),
    findAndCount: vi.fn(),
    delete: vi.fn(),
    createQueryBuilder: vi.fn(),
  };

  mockEntityManager.getRepository = vi.fn((entity: any) => {
    if (entity === WorkflowEntity) return mockWorkflowRepo;
    return mockRunRepo;
  });

  vi.clearAllMocks();

  return { service, mockWorkflowRepo, mockRunRepo };
}
