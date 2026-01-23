/**
 * EventQueryService - 地理分布数据一致性测试
 *
 * 测试地理分布返回的总帖子数与顶部统计保持一致
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';

describe('EventQueryService - 地理分布数据一致性', () => {
  let queryServiceCode: string;
  let analyticsServiceCode: string;

  beforeAll(() => {
    const queryFilePath = path.resolve(__dirname, './event-query.service.ts');
    const analyticsFilePath = path.resolve(__dirname, './event-analytics.service.ts');
    queryServiceCode = fs.readFileSync(queryFilePath, 'utf-8');
    analyticsServiceCode = fs.readFileSync(analyticsFilePath, 'utf-8');
  });

  it('应该从 WeiboPostEntity 查询真实总帖子数', () => {
    // 验证地理分布查询使用 WeiboPostEntity
    expect(queryServiceCode).toContain('WeiboPostEntity');

    // 验证使用 COUNT(post.id) 查询
    expect(queryServiceCode).toMatch(/COUNT\(post\.id\)/i);

    // 验证查询条件包含 event_id 和 deleted_at
    expect(queryServiceCode).toMatch(/nlp\.event_id.*eventId/s);
    expect(queryServiceCode).toMatch(/post\.deleted_at IS NULL/i);
  });

  it('应该在 getGeographicDistribution 方法中附加真实总帖子数', () => {
    // 检查 getGeographicDistribution 方法定义
    const methodStart = queryServiceCode.indexOf('async getGeographicDistribution');
    expect(methodStart).toBeGreaterThan(-1);

    // 提取方法体
    const methodBody = queryServiceCode.substring(methodStart);

    // 验证方法中包含查询真实总帖子数的逻辑
    expect(methodBody).toContain('totalStats');
    expect(methodBody).toContain('realTotalPosts');

    // 验证将真实总帖子数附加到结果数组
    expect(methodBody).toMatch(/\.totalPosts\s*=\s*realTotalPosts/);
  });

  it('应该保持前20个地区的限制', () => {
    // 验证仍然保留 LIMIT 20 的限制
    const methodStart = queryServiceCode.indexOf('async getGeographicDistribution');
    const methodBody = queryServiceCode.substring(methodStart);

    // 验证包含 limit(20)
    expect(methodBody).toMatch(/\.limit\(20\)/);
  });

  it('应该在查询前20个地区之前先查询总数', () => {
    const methodStart = queryServiceCode.indexOf('async getGeographicDistribution');
    const methodBody = queryServiceCode.substring(methodStart);

    // 查找两个查询的位置
    const totalStatsIndex = methodBody.indexOf('totalStats');
    const locationDataIndex = methodBody.indexOf('locationData');

    // 总数查询应该在地区详细数据查询之前
    expect(totalStatsIndex).toBeGreaterThan(-1);
    expect(locationDataIndex).toBeGreaterThan(-1);
    expect(totalStatsIndex).toBeLessThan(locationDataIndex);
  });

  it('顶部统计应该使用相同的数据源（WeiboPostEntity）', () => {
    // 验证 getEventTrends 方法中也查询真实总帖子数
    const methodStart = analyticsServiceCode.indexOf('async getEventTrends');
    expect(methodStart).toBeGreaterThan(-1);

    const methodBody = analyticsServiceCode.substring(methodStart);

    // 验证包含查询真实总帖子数的逻辑
    expect(methodBody).toContain('totalPostsResult');
    expect(methodBody).toContain('totalPosts');

    // 验证使用 PostNLPResultEntity 和 WeiboPostEntity
    expect(methodBody).toMatch(/PostNLPResultEntity|WeiboPostEntity/);

    // 验证使用 COUNT 查询
    expect(methodBody).toMatch(/COUNT\(.*post\.id\)/i);
  });

  it('应该在 TrendAnalysis 返回值中包含 totalPosts', () => {
    const methodStart = analyticsServiceCode.indexOf('async getEventTrends');
    const methodBody = analyticsServiceCode.substring(methodStart);

    // 验证返回对象包含 totalPosts
    expect(methodBody).toMatch(/return\s*\{[\s\S]*totalPosts[\s\S]*\}/);
  });

  it('应该正确处理空数据情况', () => {
    const methodStart = queryServiceCode.indexOf('async getGeographicDistribution');
    const methodBody = queryServiceCode.substring(methodStart);

    // 验证在附加 totalPosts 之前检查结果长度
    expect(methodBody).toMatch(/if\s*\(\s*result\.length\s*>\s*0\s*\)/);
  });

  it('两个查询应该使用相同的查询条件', () => {
    // 地理分布查询条件
    const geoMethodStart = queryServiceCode.indexOf('async getGeographicDistribution');
    const geoMethodBody = queryServiceCode.substring(geoMethodStart, geoMethodStart + 2000);

    // 顶部统计查询条件
    const trendMethodStart = analyticsServiceCode.indexOf('async getEventTrends');
    const trendMethodBody = analyticsServiceCode.substring(trendMethodStart, trendMethodStart + 3000);

    // 两个查询都应该包含 event_id 条件
    expect(geoMethodBody).toMatch(/event_id.*eventId/);
    expect(trendMethodBody).toMatch(/event_id.*eventId/);

    // 两个查询都应该包含 deleted_at IS NULL 条件
    expect(geoMethodBody).toMatch(/deleted_at IS NULL/i);
    expect(trendMethodBody).toMatch(/deleted_at IS NULL/i);
  });
});
