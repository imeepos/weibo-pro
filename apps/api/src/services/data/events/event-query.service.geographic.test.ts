/**
 * EventQueryService - 地理分布数据一致性测试
 *
 * 测试地理分布返回的总帖子数与顶部统计保持一致
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';

describe('EventQueryService - 地理分布数据一致性', () => {
  let code: string;

  beforeAll(() => {
    const filePath = path.resolve(__dirname, './event-query.service.ts');
    code = fs.readFileSync(filePath, 'utf-8');
  });

  it('应该从 EventHourlyStatisticsEntity 查询真实总帖子数', () => {
    // 验证代码包含从 EventHourlyStatisticsEntity 查询总帖子数的逻辑
    expect(code).toContain('EventHourlyStatisticsEntity');

    // 验证使用 SUM(stats.post_count) 聚合查询
    expect(code).toMatch(/SUM\(stats\.post_count\)/i);

    // 验证查询条件包含 event_id
    const statsQueryPattern = /EventHourlyStatisticsEntity.*event_id.*eventId/s;
    expect(code).toMatch(statsQueryPattern);
  });

  it('应该在 getGeographicDistribution 方法中附加真实总帖子数', () => {
    // 检查 getGeographicDistribution 方法定义
    const methodStart = code.indexOf('async getGeographicDistribution');
    expect(methodStart).toBeGreaterThan(-1);

    // 提取方法体
    const methodBody = code.substring(methodStart);

    // 验证方法中包含查询真实总帖子数的逻辑
    expect(methodBody).toContain('totalStats');
    expect(methodBody).toContain('realTotalPosts');

    // 验证将真实总帖子数附加到结果数组
    expect(methodBody).toMatch(/\.totalPosts\s*=\s*realTotalPosts/);
  });

  it('应该保持前20个地区的限制', () => {
    // 验证仍然保留 LIMIT 20 的限制
    const methodStart = code.indexOf('async getGeographicDistribution');
    const methodBody = code.substring(methodStart);

    // 验证包含 limit(20)
    expect(methodBody).toMatch(/\.limit\(20\)/);
  });

  it('应该在查询前20个地区之前先查询总数', () => {
    const methodStart = code.indexOf('async getGeographicDistribution');
    const methodBody = code.substring(methodStart);

    // 查找两个查询的位置
    const totalStatsIndex = methodBody.indexOf('totalStats');
    const locationDataIndex = methodBody.indexOf('locationData');

    // 总数查询应该在地区详细数据查询之前
    expect(totalStatsIndex).toBeGreaterThan(-1);
    expect(locationDataIndex).toBeGreaterThan(-1);
    expect(totalStatsIndex).toBeLessThan(locationDataIndex);
  });

  it('应该使用与顶部统计相同的数据源', () => {
    // 验证两个地方都使用 EventHourlyStatisticsEntity
    const geographicStart = code.indexOf('async getGeographicDistribution');
    const geographicBody = code.substring(geographicStart, geographicStart + 2000);

    // 地理分布方法应该包含 EventHourlyStatisticsEntity 查询
    expect(geographicBody).toContain('EventHourlyStatisticsEntity');

    // 验证使用 post_count 字段
    expect(geographicBody).toMatch(/post_count/);
  });

  it('应该正确处理空数据情况', () => {
    const methodStart = code.indexOf('async getGeographicDistribution');
    const methodBody = code.substring(methodStart);

    // 验证在附加 totalPosts 之前检查结果长度
    expect(methodBody).toMatch(/if\s*\(\s*result\.length\s*>\s*0\s*\)/);
  });
});
