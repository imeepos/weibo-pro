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
    let mockRunRepo: any;

    beforeEach(() => {
        const harness = setupWorkflowRunTest();
        service = harness.service;
        mockRunRepo = harness.mockRunRepo;
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
});
