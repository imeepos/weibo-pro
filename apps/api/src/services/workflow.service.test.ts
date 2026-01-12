import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorkflowService } from './workflow.service';
import { WorkflowEntity, WorkflowShareEntity, WorkflowStatus, useEntityManager } from '@sker/entities';
import { mockEntityManager } from '../test-setup';

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
        service = new WorkflowService();

        mockWorkflowRepo = {
            findOne: vi.fn(),
            create: vi.fn(),
            save: vi.fn(),
            find: vi.fn(),
            softDelete: vi.fn(),
        };

        mockShareRepo = {
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

        vi.clearAllMocks();
    });

    describe('saveWorkflow', () => {
        it('should create new workflow when not exists', async () => {
            const params = {
                name: 'test-workflow',
                nodes: [{ id: 'node-1' }],
                edges: [],
            };

            mockWorkflowRepo.findOne.mockResolvedValue(null);
            mockWorkflowRepo.create.mockReturnValue({ id: 'wf-1', ...params });
            mockWorkflowRepo.save.mockResolvedValue({ id: 'wf-1' });

            const result = await service.saveWorkflow(params);

            expect(mockWorkflowRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    code: 'test-workflow',
                    name: 'test-workflow',
                    status: WorkflowStatus.ACTIVE,
                })
            );
        });

        it('should update existing workflow when found', async () => {
            const existing = { id: 'wf-1', name: 'old-name', code: 'test-workflow' };
            const params = {
                name: 'test-workflow',
                nodes: [{ id: 'node-1' }],
                edges: [],
            };

            mockWorkflowRepo.findOne.mockResolvedValue(existing);
            mockWorkflowRepo.save.mockResolvedValue({ ...existing, ...params });

            await service.saveWorkflow(params);

            expect(mockWorkflowRepo.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'test-workflow',
                    nodes: params.nodes,
                })
            );
        });

        it('should clean orphaned entry node references', async () => {
            const params = {
                name: 'test-workflow',
                nodes: [{ id: 'node-1' }],
                edges: [],
                entryNodeIds: ['node-1', 'node-deleted'], // node-deleted not in nodes
            };

            mockWorkflowRepo.findOne.mockResolvedValue(null);
            mockWorkflowRepo.create.mockReturnValue({ id: 'wf-1' });
            mockWorkflowRepo.save.mockResolvedValue({ id: 'wf-1' });

            await service.saveWorkflow(params);

            expect(mockWorkflowRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    entryNodeIds: ['node-1'], // only existing node
                })
            );
        });

        it('should collect nested node IDs from groups', async () => {
            const params = {
                name: 'test-workflow',
                nodes: [
                    { id: 'node-1' },
                    {
                        id: 'group-1',
                        nodes: [
                            { id: 'node-2' },
                            { id: 'node-3' },
                        ],
                    },
                ],
                edges: [],
                endNodeIds: ['node-1', 'node-2', 'node-3', 'node-missing'],
            };

            mockWorkflowRepo.findOne.mockResolvedValue(null);
            mockWorkflowRepo.create.mockReturnValue({ id: 'wf-1' });
            mockWorkflowRepo.save.mockResolvedValue({ id: 'wf-1' });

            await service.saveWorkflow(params);

            expect(mockWorkflowRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    endNodeIds: ['node-1', 'node-2', 'node-3'], // node-missing filtered out
                })
            );
        });
    });

    describe('getWorkflowByName', () => {
        it('should return null when workflow not found', async () => {
            mockWorkflowRepo.findOne.mockResolvedValue(null);

            const result = await service.getWorkflowByName('non-existent');

            expect(result).toBeNull();
        });

        it('should return workflow graph when found', async () => {
            const workflow = {
                id: 'wf-1',
                name: 'test-workflow',
                code: 'test-workflow',
                nodes: [{ id: 'node-1' }],
                edges: [],
                entryNodeIds: [],
                endNodeIds: [],
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockWorkflowRepo.findOne.mockResolvedValue(workflow);

            const result = await service.getWorkflowByName('test-workflow');

            expect(result).toEqual({
                id: 'wf-1',
                name: 'test-workflow',
                nodes: [{ id: 'node-1' }],
                edges: [],
                entryNodeIds: [],
                endNodeIds: [],
            });
        });
    });

    describe('listWorkflows', () => {
        it('should return active workflows ordered by updatedAt', async () => {
            const workflows = [
                {
                    id: 'wf-2',
                    name: 'Workflow B',
                    tags: ['tag2'],
                    description: 'Description B',
                    createdAt: new Date('2024-01-02'),
                    updatedAt: new Date('2024-01-02'),
                },
                {
                    id: 'wf-1',
                    name: 'Workflow A',
                    tags: ['tag1'],
                    description: 'Description A',
                    createdAt: new Date('2024-01-01'),
                    updatedAt: new Date('2024-01-03'),
                },
            ];

            mockWorkflowRepo.find.mockResolvedValue(workflows);

            const result = await service.listWorkflows();

            expect(mockWorkflowRepo.find).toHaveBeenCalledWith({
                where: { status: WorkflowStatus.ACTIVE },
                order: { updatedAt: 'DESC' },
            });
            expect(result).toHaveLength(2);
        });
    });

    describe('deleteWorkflow', () => {
        it('should soft delete workflow', async () => {
            mockWorkflowRepo.softDelete.mockResolvedValue({ affected: 1 });

            const result = await service.deleteWorkflow('wf-1');

            expect(result).toBe(true);
            expect(mockWorkflowRepo.softDelete).toHaveBeenCalledWith('wf-1');
        });

        it('should return false when workflow not found', async () => {
            mockWorkflowRepo.softDelete.mockResolvedValue({ affected: 0 });

            const result = await service.deleteWorkflow('non-existent');

            expect(result).toBe(false);
        });
    });

    describe('createShare', () => {
        it('should create share with token', async () => {
            const workflow = { id: 'wf-1', name: 'Test Workflow' };
            mockWorkflowRepo.findOne.mockResolvedValue(workflow);
            mockShareRepo.create.mockReturnValue({ token: 'abc123' });
            mockShareRepo.save.mockResolvedValue({});

            const result = await service.createShare({
                workflowId: 'wf-1',
            });

            expect(result.shareToken).toBe('abc123');
            expect(result.shareUrl).toBe('/workflow/shared/abc123');
        });

        it('should find workflow by code if ID not found', async () => {
            const workflow = { id: 'wf-1', name: 'Test Workflow', code: 'test-workflow' };
            mockWorkflowRepo.findOne
                .mockResolvedValueOnce(null) // by ID
                .mockResolvedValueOnce(workflow); // by code
            mockShareRepo.create.mockReturnValue({ token: 'abc123' });
            mockShareRepo.save.mockResolvedValue({});

            const result = await service.createShare({
                workflowId: 'test-workflow',
            });

            expect(result.shareToken).toBeDefined();
            expect(mockWorkflowRepo.findOne).toHaveBeenCalledTimes(2);
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
            mockShareRepo.create.mockReturnValue({ token: 'abc123' });
            mockShareRepo.save.mockResolvedValue({});

            await service.createShare({
                workflowId: 'wf-1',
                expiresAt,
            });

            expect(mockShareRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    expiresAt: new Date(expiresAt),
                })
            );
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
