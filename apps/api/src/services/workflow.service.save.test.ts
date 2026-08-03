import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorkflowService } from './workflow.service';
import { WorkflowEntity, WorkflowStatus } from '@sker/entities';
import type { WorkflowGraphAst } from '@sker/workflow';
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

    beforeEach(() => {
        const harness = setupWorkflowServiceTest();
        service = harness.service;
        mockWorkflowRepo = harness.mockWorkflowRepo;
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

            const _result = await service.saveWorkflow(params as unknown as WorkflowGraphAst);

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

            await service.saveWorkflow(params as unknown as WorkflowGraphAst);

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

            await service.saveWorkflow(params as unknown as WorkflowGraphAst);

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

            await service.saveWorkflow(params as unknown as WorkflowGraphAst);

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
});
