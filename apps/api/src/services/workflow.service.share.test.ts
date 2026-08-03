import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorkflowService } from './workflow.service';
import { mockEntityManager } from '../test-setup';
import { setupWorkflowServiceTest } from './workflow.service.test-helpers';

// Mock dependencies
vi.mock('@sker/entities', async () => {
    const actual = await vi.importActual('@sker/entities');
    return {
        ...actual,
        useEntityManager: vi.fn((fn: any) => fn(mockEntityManager)),
    };
});

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

vi.mock('@sker/sdk', () => ({
    WorkflowSummary: class WorkflowSummary {},
}));

describe('WorkflowService', () => {
    let service: WorkflowService;
    let mockWorkflowRepo: any;
    let mockShareRepo: any;

    beforeEach(() => {
        const harness = setupWorkflowServiceTest();
        service = harness.service;
        mockWorkflowRepo = harness.mockWorkflowRepo;
        mockShareRepo = harness.mockShareRepo;
        vi.clearAllMocks();
    });

    describe('createShare', () => {
        it('should create share with token', async () => {
            const workflow = { id: 'wf-1', name: 'Test Workflow' };
            mockWorkflowRepo.findOne.mockResolvedValue(workflow);
            mockShareRepo.create.mockReturnValue({});
            mockShareRepo.save.mockResolvedValue({});

            // Mock generateShareToken to return fixed value
            const generateTokenSpy = vi.spyOn(service as any, 'generateShareToken').mockReturnValue('abc123');

            const result = await service.createShare({
                workflowId: 'wf-1',
            });

            expect(result.shareToken).toBe('abc123');
            expect(result.shareUrl).toBe('/workflow/shared/abc123');

            generateTokenSpy.mockRestore();
        });

        it('should find workflow by code if ID not found', async () => {
            const workflow = { id: 'wf-1', name: 'Test Workflow', code: 'test-workflow' };
            mockWorkflowRepo.findOne
                .mockResolvedValueOnce(null) // by ID
                .mockResolvedValueOnce(workflow); // by code
            mockShareRepo.create.mockReturnValue({});
            mockShareRepo.save.mockResolvedValue({});

            const generateTokenSpy = vi.spyOn(service as any, 'generateShareToken').mockReturnValue('abc123');

            const result = await service.createShare({
                workflowId: 'test-workflow',
            });

            expect(result.shareToken).toBeDefined();
            expect(mockWorkflowRepo.findOne).toHaveBeenCalledTimes(2);

            generateTokenSpy.mockRestore();
        });

        it('should throw error when workflow not found', async () => {
            mockWorkflowRepo.findOne.mockResolvedValue(null);

            await expect(
                service.createShare({ workflowId: 'non-existent' })
            ).rejects.toThrow('工作流不存在');
        });

        it('should set expiration when provided', async () => {
            const workflow = { id: 'wf-1', name: 'Test Workflow' };
            const expiresAt = '2024-12-31T23:59:59Z';

            mockWorkflowRepo.findOne.mockResolvedValue(workflow);
            mockShareRepo.create.mockReturnValue({});
            mockShareRepo.save.mockResolvedValue({});

            const generateTokenSpy = vi.spyOn(service as any, 'generateShareToken').mockReturnValue('abc123');

            await service.createShare({
                workflowId: 'wf-1',
                expiresAt,
            });

            expect(mockShareRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    expiresAt: new Date(expiresAt),
                })
            );

            generateTokenSpy.mockRestore();
        });
    });

    describe('getSharedWorkflow', () => {
        it('should return null when share not found', async () => {
            mockShareRepo.findOne.mockResolvedValue(null);

            const result = await service.getSharedWorkflow('invalid-token');

            expect(result).toBeNull();
        });

        it('should return null when share expired', async () => {
            const expiredShare = {
                id: 'share-1',
                token: 'expired-token',
                workflowId: 'wf-1',
                expiresAt: new Date('2020-01-01'), // past date
            };

            mockShareRepo.findOne.mockResolvedValue(expiredShare);
            mockShareRepo.delete.mockResolvedValue({});

            const result = await service.getSharedWorkflow('expired-token');

            expect(result).toBeNull();
            expect(mockShareRepo.delete).toHaveBeenCalledWith('share-1');
        });

        it('should return null when workflow deleted', async () => {
            const share = {
                id: 'share-1',
                token: 'valid-token',
                workflowId: 'wf-1',
            };

            mockShareRepo.findOne.mockResolvedValue(share);
            mockWorkflowRepo.findOne.mockResolvedValue(null);

            const result = await service.getSharedWorkflow('valid-token');

            expect(result).toBeNull();
        });

        it('should return workflow data when valid', async () => {
            const share = {
                id: 'share-1',
                token: 'valid-token',
                workflowId: 'wf-1',
            };

            const workflow = {
                id: 'wf-1',
                name: 'Shared Workflow',
                nodes: [{ id: 'node-1' }],
                edges: [],
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-01-02'),
            };

            mockShareRepo.findOne.mockResolvedValue(share);
            mockWorkflowRepo.findOne.mockResolvedValue(workflow);

            const result = await service.getSharedWorkflow('valid-token');

            expect(result).toEqual({
                id: 'wf-1',
                name: 'Shared Workflow',
                data: {
                    nodes: [{ id: 'node-1' }],
                    edges: [],
                },
                createdAt: workflow.createdAt.toISOString(),
                updatedAt: workflow.updatedAt.toISOString(),
            });
        });
    });
});
