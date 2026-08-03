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
