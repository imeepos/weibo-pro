import { describe, it, expect, beforeEach } from 'vitest';
import { RecalculateStatisticsAst } from './RecalculateStatisticsAst';

describe('RecalculateStatisticsAst', () => {
  let ast: RecalculateStatisticsAst;

  beforeEach(() => {
    ast = new RecalculateStatisticsAst();
  });

  it('应该正确初始化默认值', () => {
    expect(ast.eventId).toBe('');
    expect(ast.startDate).toBeNull();
    expect(ast.endDate).toBeNull();
    expect(ast.clearExisting).toBe(true);
    expect(ast.batchSize).toBe(100);
    expect(ast.type).toBe('RecalculateStatisticsAst');
  });

  it('应该正确设置事件ID', () => {
    ast.eventId = 'test-event-123';
    expect(ast.eventId).toBe('test-event-123');
  });

  it('应该正确设置日期范围', () => {
    const startDate = new Date('2026-01-01');
    const endDate = new Date('2026-01-31');

    ast.startDate = startDate;
    ast.endDate = endDate;

    expect(ast.startDate).toBe(startDate);
    expect(ast.endDate).toBe(endDate);
  });

  it('应该正确设置批处理大小', () => {
    ast.batchSize = 200;
    expect(ast.batchSize).toBe(200);
  });

  it('应该正确初始化输出值', () => {
    expect(ast.outputEventId).toBe('');
    expect(ast.totalHours).toBe(0);
    expect(ast.processedHours).toBe(0);
    expect(ast.statistics).toBeNull();
    expect(ast.success).toBe(false);
  });

  it('应该正确初始化状态值', () => {
    expect(ast.currentStep).toBe('');
    expect(ast.totalSteps).toBe(7);
    expect(ast.completedSteps).toBe(0);
    expect(ast.progress).toBe(0);
    expect(ast.errors).toEqual([]);
  });
});
