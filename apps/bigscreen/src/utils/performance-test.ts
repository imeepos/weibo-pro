/**
 * 性能测试工具
 *
 * 用于验证优化效果和性能回归测试
 */

import type { UserRelationNetwork } from '@sker/sdk';

interface PerformanceTestResult {
  testName: string;
  nodeCount: number;
  edgeCount: number;
  dataProcessingTime: number;
  renderTime: number;
  totalTime: number;
  fps: number;
  memoryUsedMB: number;
  passed: boolean;
  issues: string[];
}

/**
 * 性能基准测试
 */
export class PerformanceTester {
  private results: PerformanceTestResult[] = [];

  /**
   * 测试数据处理性能
   */
  async testDataProcessing(network: UserRelationNetwork): Promise<number> {
    const startTime = performance.now();

    // 模拟数据处理（排序、映射）
    const _sorted = [...network.nodes].sort((a, b) => b.influence - a.influence);
    const connectionMap = new Map<string, number>();

    for (const edge of network.edges) {
      const sourceId = edge.source.toString();
      const targetId = edge.target.toString();
      connectionMap.set(sourceId, (connectionMap.get(sourceId) || 0) + 1);
      connectionMap.set(targetId, (connectionMap.get(targetId) || 0) + 1);
    }

    return performance.now() - startTime;
  }

  /**
   * 测试渲染性能
   */
  async testRendering(nodeCount: number): Promise<{ renderTime: number; fps: number }> {
    const startTime = performance.now();

    // 模拟渲染（创建 DOM 元素）
    const container = document.createElement('div');
    for (let i = 0; i < Math.min(nodeCount, 1000); i++) {
      const node = document.createElement('div');
      node.textContent = `Node ${i}`;
      container.appendChild(node);
    }

    const renderTime = performance.now() - startTime;

    // 估算 FPS（假设 60fps 基准，每帧 16.67ms）
    const estimatedFPS = Math.min(60, 1000 / (renderTime / nodeCount || 1));

    container.remove();

    return { renderTime, fps: estimatedFPS };
  }

  /**
   * 获取内存使用情况
   */
  getMemoryUsage(): number {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize / (1024 * 1024); // MB
    }
    return 0;
  }

  /**
   * 运行完整测试
   */
  async runTest(
    testName: string,
    network: UserRelationNetwork,
    thresholds: {
      maxDataProcessingTime: number;
      maxRenderTime: number;
      minFPS: number;
      maxMemoryMB: number;
    } = {
      maxDataProcessingTime: 500,
      maxRenderTime: 100,
      minFPS: 30,
      maxMemoryMB: 200,
    }
  ): Promise<PerformanceTestResult> {
    const issues: string[] = [];
    const startMemory = this.getMemoryUsage();

    // 1. 测试数据处理
    const dataProcessingTime = await this.testDataProcessing(network);
    if (dataProcessingTime > thresholds.maxDataProcessingTime) {
      issues.push(`数据处理超时: ${dataProcessingTime.toFixed(0)}ms > ${thresholds.maxDataProcessingTime}ms`);
    }

    // 2. 测试渲染
    const { renderTime, fps } = await this.testRendering(network.nodes.length);
    if (renderTime > thresholds.maxRenderTime) {
      issues.push(`渲染超时: ${renderTime.toFixed(0)}ms > ${thresholds.maxRenderTime}ms`);
    }
    if (fps < thresholds.minFPS) {
      issues.push(`FPS 过低: ${fps.toFixed(0)} < ${thresholds.minFPS}`);
    }

    // 3. 检查内存
    const endMemory = this.getMemoryUsage();
    const memoryUsed = endMemory - startMemory;
    if (memoryUsed > thresholds.maxMemoryMB) {
      issues.push(`内存使用过高: ${memoryUsed.toFixed(0)}MB > ${thresholds.maxMemoryMB}MB`);
    }

    const result: PerformanceTestResult = {
      testName,
      nodeCount: network.nodes.length,
      edgeCount: network.edges.length,
      dataProcessingTime,
      renderTime,
      totalTime: dataProcessingTime + renderTime,
      fps,
      memoryUsedMB: memoryUsed,
      passed: issues.length === 0,
      issues,
    };

    this.results.push(result);
    return result;
  }

  /**
   * 批量测试（不同数据规模）
   */
  async runBenchmark(
    generateNetwork: (nodeCount: number) => UserRelationNetwork
  ): Promise<void> {
    console.group('🧪 性能基准测试');

    const testCases = [
      { name: '小数据集', nodeCount: 100 },
      { name: '中数据集', nodeCount: 1000 },
      { name: '大数据集', nodeCount: 5000 },
    ];

    for (const testCase of testCases) {
      const network = generateNetwork(testCase.nodeCount);
      const result = await this.runTest(testCase.name, network);

      console.log(`\n${testCase.name} (${result.nodeCount} 节点):`);
      console.log(`  数据处理: ${result.dataProcessingTime.toFixed(1)}ms`);
      console.log(`  渲染时间: ${result.renderTime.toFixed(1)}ms`);
      console.log(`  总耗时: ${result.totalTime.toFixed(1)}ms`);
      console.log(`  FPS: ${result.fps.toFixed(0)}`);
      console.log(`  内存: ${result.memoryUsedMB.toFixed(1)}MB`);
      console.log(`  状态: ${result.passed ? '✅ 通过' : '❌ 失败'}`);

      if (!result.passed) {
        console.warn('  问题:', result.issues);
      }
    }

    console.groupEnd();
  }

  /**
   * 生成测试报告
   */
  generateReport(): string {
    const report: string[] = ['# 性能测试报告\n'];

    report.push('| 测试名称 | 节点数 | 边数 | 数据处理(ms) | 渲染(ms) | 总耗时(ms) | FPS | 内存(MB) | 状态 |');
    report.push('|---------|--------|------|-------------|---------|-----------|-----|---------|------|');

    for (const result of this.results) {
      report.push(
        `| ${result.testName} | ${result.nodeCount} | ${result.edgeCount} | ` +
        `${result.dataProcessingTime.toFixed(1)} | ${result.renderTime.toFixed(1)} | ` +
        `${result.totalTime.toFixed(1)} | ${result.fps.toFixed(0)} | ` +
        `${result.memoryUsedMB.toFixed(1)} | ${result.passed ? '✅' : '❌'} |`
      );
    }

    if (this.results.some(r => !r.passed)) {
      report.push('\n## 问题详情\n');
      for (const result of this.results) {
        if (!result.passed) {
          report.push(`### ${result.testName}\n`);
          result.issues.forEach(issue => {
            report.push(`- ${issue}`);
          });
          report.push('');
        }
      }
    }

    return report.join('\n');
  }

  /**
   * 清空测试结果
   */
  reset() {
    this.results = [];
  }
}

/**
 * 生成测试用网络数据
 */
export const generateTestNetwork = (nodeCount: number): UserRelationNetwork => {
  const nodes = Array.from({ length: nodeCount }, (_, i) => ({
    id: `user-${i}`,
    name: `User ${i}`,
    userType: ['official', 'media', 'kol', 'normal'][i % 4] as any,
    followers: Math.floor(Math.random() * 100000),
    postCount: Math.floor(Math.random() * 10000),
    influence: Math.floor(Math.random() * 100),
    verified: Math.random() > 0.7,
  }));

  // 生成边（每个节点平均 5 条边）
  const edgeCount = Math.floor(nodeCount * 5);
  const edges = Array.from({ length: edgeCount }, (_, i) => {
    const sourceIndex = Math.floor(Math.random() * nodeCount);
    const targetIndex = Math.floor(Math.random() * nodeCount);
    return {
      source: `user-${sourceIndex}`,
      target: `user-${targetIndex}`,
      weight: Math.floor(Math.random() * 100),
      type: ['like', 'comment', 'repost', 'comprehensive'][i % 4] as any,
      interactions: {
        likes: Math.floor(Math.random() * 100),
        comments: Math.floor(Math.random() * 50),
        reposts: Math.floor(Math.random() * 30),
      },
    };
  });

  return {
    nodes,
    edges,
    statistics: {
      totalUsers: nodeCount,
      totalRelations: edgeCount,
      avgDegree: (edgeCount * 2) / nodeCount,
      density: edgeCount / (nodeCount * (nodeCount - 1)),
      communities: Math.floor(Math.random() * 10) + 1,
    },
  };
};

/**
 * 快速性能检查（在开发环境中使用）
 */
export const quickPerformanceCheck = async () => {
  const tester = new PerformanceTester();

  console.group('⚡ 快速性能检查');

  // 测试当前配置
  const network = generateTestNetwork(2000);
  const result = await tester.runTest('当前配置', network);

  if (result.passed) {
    console.log('✅ 性能良好');
  } else {
    console.warn('⚠️ 发现性能问题:');
    result.issues.forEach(issue => console.warn(`  - ${issue}`));
  }

  console.groupEnd();

  return result;
};
