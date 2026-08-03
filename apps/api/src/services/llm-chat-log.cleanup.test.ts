import { describe, it, expect, beforeEach, vi } from 'vitest';
import { cleanupChatLogs } from './llm-chat-log.queries';
import { LlmChatLog } from '@sker/entities';
import { mockEntityManager } from '../test-setup';

// Mock useEntityManager，使查询直接作用于内存 mock
vi.mock('@sker/entities', async () => {
    const actual = await vi.importActual('@sker/entities');
    return {
        ...actual,
        useEntityManager: vi.fn((fn: any) => fn(mockEntityManager)),
    };
});

describe('cleanupChatLogs', () => {
    let mockRepo: any;
    let mockBuilder: any;
    let cutoffArg: Date;

    beforeEach(() => {
        mockBuilder = {
            delete: vi.fn().mockReturnThis(),
            where: vi.fn().mockImplementation((_sql: string, params: any) => {
                cutoffArg = params.cutoffDate;
                return mockBuilder;
            }),
            execute: vi.fn().mockResolvedValue({ affected: 5 }),
        };
        mockRepo = {
            createQueryBuilder: vi.fn().mockReturnValue(mockBuilder),
        };
        mockEntityManager.getRepository = vi.fn((entity: any) => {
            if (entity === LlmChatLog) return mockRepo;
            return undefined;
        });
        vi.clearAllMocks();
    });

    it('删除早于 cutoff 的日志并返回影响行数', async () => {
        const count = await cleanupChatLogs(30);

        expect(count).toBe(5);
        expect(mockBuilder.where).toHaveBeenCalledWith(
            'created_at < :cutoffDate',
            expect.objectContaining({ cutoffDate: expect.any(Date) })
        );
    });

    it('默认保留 30 天数据', async () => {
        await cleanupChatLogs();

        const diffDays = (Date.now() - cutoffArg.getTime()) / (24 * 60 * 60 * 1000);
        expect(diffDays).toBeGreaterThanOrEqual(29);
        expect(diffDays).toBeLessThanOrEqual(31);
    });

    it('按传入的天数计算 cutoff 日期', async () => {
        const fixedNow = Date.now();
        vi.spyOn(Date, 'now').mockReturnValue(fixedNow);

        await cleanupChatLogs(7);

        const expected = new Date(fixedNow);
        expected.setDate(expected.getDate() - 7);
        expect(cutoffArg.getTime()).toBeCloseTo(expected.getTime(), -1);

        vi.restoreAllMocks();
    });

    it('无日志可清理时返回 0', async () => {
        mockBuilder.execute.mockResolvedValue({ affected: 0 });

        const count = await cleanupChatLogs(30);

        expect(count).toBe(0);
    });
});
