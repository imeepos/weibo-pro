import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorkflowRunService } from './workflow-run.service';
import { WorkflowEntity, WorkflowRunEntity, RunStatus, useEntityManager } from '@sker/entities';
import { mockEntityManager } from '../test-setup';

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
        service = new WorkflowRunService();

        // 创建 mock repository
        mockWorkflowRepo = {
            findOne: vi.fn(),
        };

        mockRunRepo = {
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

            const result = await service.createRun('wf-1', { count: 20 });

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

    describe('updateRunStatus', () => {
        it('should update status and outputs', async () => {
            const run = { id: 'run-1', status: RunStatus.RUNNING };
            mockRunRepo.findOne.mockResolvedValue(run);
            mockRunRepo.save.mockResolvedValue({});

            await service.updateRunStatus('run-1', {
                status: RunStatus.SUCCESS,
                outputs: { result: 'done' },
            });

            expect(mockRunRepo.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: RunStatus.SUCCESS,
                    outputs: { result: 'done' },
                })
            );
        });

        it('should calculate duration when startedAt and completedAt are set', async () => {
            const run = {
                id: 'run-1',
                startedAt: new Date('2024-01-01T10:00:00Z'),
            };
            mockRunRepo.findOne.mockResolvedValue(run);
            mockRunRepo.save.mockResolvedValue({});

            await service.updateRunStatus('run-1', {
                completedAt: new Date('2024-01-01T10:05:00Z'),
            });

            expect(mockRunRepo.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    durationMs: 5 * 60 * 1000,
                })
            );
        });

        it('should throw error when run not found', async () => {
            mockRunRepo.findOne.mockResolvedValue(null);

            await expect(
                service.updateRunStatus('non-existent', { status: RunStatus.SUCCESS })
            ).rejects.toThrow('运行实例不存在');
        });
    });

    describe('startRun', () => {
        it('should set status to RUNNING', async () => {
            const run = { id: 'run-1', status: RunStatus.PENDING };
            mockRunRepo.findOne.mockResolvedValue(run);
            mockRunRepo.save.mockResolvedValue({});

            await service.startRun('run-1');

            expect(mockRunRepo.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: RunStatus.RUNNING,
                    startedAt: expect.any(Date),
                })
            );
        });

        it('should be idempotent - not error if already running', async () => {
            const run = { id: 'run-1', status: RunStatus.RUNNING };
            mockRunRepo.findOne.mockResolvedValue(run);

            await expect(service.startRun('run-1')).resolves.not.toThrow();
        });
    });

    describe('completeRun', () => {
        it('should mark run as SUCCESS when result.success is true', async () => {
            const run = { id: 'run-1', status: RunStatus.RUNNING, startedAt: new Date() };
            mockRunRepo.findOne.mockResolvedValue(run);
            mockRunRepo.save.mockResolvedValue({});

            await service.completeRun('run-1', {
                success: true,
                outputs: { data: 'result' },
            });

            expect(mockRunRepo.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: RunStatus.SUCCESS,
                    outputs: { data: 'result' },
                })
            );
        });

        it('should mark run as FAILED when result.success is false', async () => {
            const run = { id: 'run-1', status: RunStatus.RUNNING, startedAt: new Date() };
            mockRunRepo.findOne.mockResolvedValue(run);
            mockRunRepo.save.mockResolvedValue({});

            await service.completeRun('run-1', {
                success: false,
                error: { message: 'Test error' },
            });

            expect(mockRunRepo.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: RunStatus.FAILED,
                    error: { message: 'Test error' },
                })
            );
        });
    });

    describe('cancelRun', () => {
        it('should cancel pending run', async () => {
            const run = { id: 'run-1', status: RunStatus.PENDING };
            mockRunRepo.findOne.mockResolvedValue(run);
            mockRunRepo.save.mockResolvedValue({});

            await service.cancelRun('run-1');

            expect(mockRunRepo.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: RunStatus.CANCELLED,
                })
            );
        });

        it('should cancel running run', async () => {
            const run = { id: 'run-1', status: RunStatus.RUNNING };
            mockRunRepo.findOne.mockResolvedValue(run);
            mockRunRepo.save.mockResolvedValue({});

            await service.cancelRun('run-1');

            expect(mockRunRepo.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: RunStatus.CANCELLED,
                })
            );
        });

        it('should throw error when trying to cancel completed run', async () => {
            const run = { id: 'run-1', status: RunStatus.SUCCESS };
            mockRunRepo.findOne.mockResolvedValue(run);

            await expect(service.cancelRun('run-1')).rejects.toThrow('无法取消已完成的运行');
        });
    });

    describe('deleteRuns', () => {
        it('should delete multiple runs', async () => {
            mockRunRepo.delete.mockResolvedValue({ affected: 3 });

            const count = await service.deleteRuns(['run-1', 'run-2', 'run-3']);

            expect(count).toBe(3);
        });

        it('should return zero when no runs deleted', async () => {
            mockRunRepo.delete.mockResolvedValue({ affected: 0 });

            const count = await service.deleteRuns(['non-existent']);

            expect(count).toBe(0);
        });
    });

    describe('cleanupOldRuns', () => {
        it('should delete old completed runs', async () => {
            const mockBuilder = {
                delete: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                andWhere: vi.fn().mockReturnThis(),
                execute: vi.fn().mockResolvedValue({ affected: 5 }),
            };
            mockRunRepo.createQueryBuilder.mockReturnValue(mockBuilder);

            const count = await service.cleanupOldRuns(30);

            expect(count).toBe(5);
            expect(mockBuilder.andWhere).toHaveBeenCalledWith(
                'status IN (:...statuses)',
                expect.objectContaining({
                    statuses: [RunStatus.SUCCESS, RunStatus.FAILED, RunStatus.CANCELLED],
                })
            );
        });
    });
});
