import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorkflowRunService } from './workflow-run.service';
import { RunStatus } from '@sker/entities';
import { mockEntityManager } from '../test-setup';
import { setupWorkflowRunTest } from './workflow-run.service.test-helpers';

// Mock dependencies
vi.mock('@sker/entities', async () => {
    const actual = await vi.importActual('@sker/entities');
    return {
        ...actual,
        useEntityManager: vi.fn((fn: any) => fn(mockEntityManager)),
    };
});

vi.mock('@sker/workflow', () => ({
    generateId: vi.fn(() => `mock-run-${Date.now()}`),
}));

vi.mock('@sker/core', async () => {
    const actual = await vi.importActual('@sker/core');
    return {
        ...actual,
        logger: {
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            debug: vi.fn(),
        },
    };
});

describe('WorkflowRunService', () => {
    let service: WorkflowRunService;
    let mockWorkflowRepo: any;
    let mockRunRepo: any;

    beforeEach(() => {
        const harness = setupWorkflowRunTest();
        service = harness.service;
        mockWorkflowRepo = harness.mockWorkflowRepo;
        mockRunRepo = harness.mockRunRepo;
    });

    describe('createRun', () => {
        it('should create run with merged inputs', async () => {
            const workflow = {
                id: 'wf-1',
                name: 'Test Workflow',
                defaultInputs: { name: 'default', count: 10 },
            };

            mockWorkflowRepo.findOne.mockResolvedValue(workflow);
            mockRunRepo.create.mockReturnValue({ id: 'run-1' });
            mockRunRepo.save.mockResolvedValue({ id: 'run-1' });

            const _result = await service.createRun('wf-1', { count: 20 });

            expect(mockRunRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    inputs: { name: 'default', count: 20 },
                    status: RunStatus.PENDING,
                })
            );
        });

        it('should throw error when workflow not found', async () => {
            mockWorkflowRepo.findOne.mockResolvedValue(null);

            await expect(service.createRun('non-existent')).rejects.toThrow('工作流不存在');
        });
    });

    describe('getRun', () => {
        it('should return null when run not found', async () => {
            mockRunRepo.findOne.mockResolvedValue(null);
            const result = await service.getRun('non-existent');
            expect(result).toBeNull();
        });

        it('should return run when found', async () => {
            const run = { id: 'run-1', status: RunStatus.RUNNING };
            mockRunRepo.findOne.mockResolvedValue(run);
            const result = await service.getRun('run-1');
            expect(result).toEqual(run);
        });
    });

    describe('listRuns', () => {
        it('should return paginated runs', async () => {
            const runs = [
                { id: 'run-1', status: RunStatus.SUCCESS },
                { id: 'run-2', status: RunStatus.RUNNING },
            ];

            mockRunRepo.findAndCount.mockResolvedValue([runs, 2]);

            const result = await service.listRuns('wf-1', { page: 1, pageSize: 10 });

            expect(result.runs).toHaveLength(2);
            expect(result.total).toBe(2);
        });

        it('should filter by status', async () => {
            mockRunRepo.findAndCount.mockResolvedValue([[{ id: 'run-1' }], 1]);

            await service.listRuns('wf-1', { status: RunStatus.SUCCESS });

            expect(mockRunRepo.findAndCount).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        status: RunStatus.SUCCESS,
                    }),
                })
            );
        });
    });
});
