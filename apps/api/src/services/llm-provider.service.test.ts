import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LlmProviderService } from './llm-provider.service';
import { root } from '@sker/core';
import { mockEntityManager } from '../test-setup';

// Mock useEntityManager
vi.mock('@sker/entities', async () => {
    const actual = await vi.importActual('@sker/entities');
    return {
        ...actual,
        useEntityManager: vi.fn((fn: any) => fn(mockEntityManager)),
    };
});

describe('LlmProviderService', () => {
    let service: LlmProviderService;

    beforeEach(() => {
        service = new LlmProviderService();
        // 清空 mock 数据
        mockEntityManager.getRepository = vi.fn((entityName: string) => mockEntityManager) as any;
    });

    describe('findAll', () => {
        it('should return empty array when no providers exist', async () => {
            mockEntityManager.find = vi.fn(() => Promise.resolve([]));
            const result = await service.findAll();
            expect(result).toEqual([]);
        });

        it('should return providers ordered by score desc', async () => {
            const providers = [
                { id: '1', name: 'Provider A', score: 80 },
                { id: '2', name: 'Provider B', score: 100 },
                { id: '3', name: 'Provider C', score: 90 },
            ];

            // Mock find to return the providers directly with proper entity name
            mockEntityManager.find = vi.fn((entity: any, options?: any) => {
                if (options?.order?.score === 'desc') {
                    return Promise.resolve([...providers].sort((a, b) => b.score - a.score));
                }
                return Promise.resolve(providers);
            });

            const result = await service.findAll();
            expect(result).toHaveLength(3);
            expect(result[0]!.score).toBeGreaterThanOrEqual(result[1]!.score);
        });
    });

    describe('findOne', () => {
        it('should return null when provider not found', async () => {
            mockEntityManager.findOne = vi.fn(() => Promise.resolve(null));
            const result = await service.findOne('non-existent');
            expect(result).toBeNull();
        });

        it('should return provider when found', async () => {
            const provider = { id: '1', name: 'Provider A', score: 100 };
            mockEntityManager.findOne = vi.fn(() => Promise.resolve(provider));

            const result = await service.findOne('1');
            expect(result).toEqual(provider);
        });
    });

    describe('create', () => {
        it('should create new provider', async () => {
            const createDto = { name: 'New Provider', score: 100 };
            const created = { id: 'mock-1', ...createDto };

            mockEntityManager.create = vi.fn(() => created);
            mockEntityManager.save = vi.fn(() => Promise.resolve(created));

            const result = await service.create(createDto);
            expect(result.name).toBe(createDto.name);
            expect(result.id).toBeDefined();
        });
    });

    describe('update', () => {
        it('should update provider', async () => {
            const existing = { id: '1', name: 'Old Name', score: 50 };
            const updates = { name: 'New Name', score: 100 };

            mockEntityManager.findOne = vi.fn(() => Promise.resolve({ ...existing, ...updates }));

            const result = await service.update('1', updates);
            expect(result.name).toBe(updates.name);
            expect(result.score).toBe(updates.score);
        });

        it('should throw error when provider not found', async () => {
            mockEntityManager.findOne = vi.fn(() => Promise.resolve(null));

            await expect(service.update('non-existent', { name: 'Test' }))
                .rejects.toThrow('LLM Provider with id non-existent not found');
        });
    });

    describe('remove', () => {
        it('should remove provider', async () => {
            mockEntityManager.delete = vi.fn(() => Promise.resolve()) as any;
            await expect(service.remove('1')).resolves.not.toThrow();
        });
    });

    describe('getBestProvider', () => {
        it('should return null when no best provider', async () => {
            mockEntityManager.findOne = vi.fn(() => Promise.resolve(null));
            const result = await service.getBestProvider();
            expect(result).toBeNull();
        });

        it('should return provider with score 10000', async () => {
            const provider = { id: '1', name: 'Best Provider', score: 10000 };
            mockEntityManager.findOne = vi.fn(() => Promise.resolve(provider));

            const result = await service.getBestProvider();
            expect(result?.score).toBe(10000);
        });
    });

    describe('updateScore', () => {
        it('should update provider score', async () => {
            mockEntityManager.update = vi.fn(() => Promise.resolve());

            await expect(service.updateScore('1', 95)).resolves.not.toThrow();
        });
    });
});
