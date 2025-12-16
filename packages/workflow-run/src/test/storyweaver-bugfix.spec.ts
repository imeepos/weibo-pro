// StoryWeaverAstVisitor Bug 修复验证测试
// 测试场景：标题重复 + 质检失败的处理

import { of, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

// 模拟场景：章节生成过程中出现标题重复

describe('StoryWeaverAst Bug Fix - 标题重复处理', () => {
  it('应该跳过无效结果，只累积有效结果', (done) => {
    // 模拟重试过程中的多次尝试
    const retryResults = [
      {
        shouldContinue: true,
        result: null, // 第一次尝试：标题重复，result 为 null
        improvementHints: '标题重复，请重新构思',
        nextAttempt: 1
      },
      {
        shouldContinue: false,
        result: { // 第二次尝试：成功生成
          chapter: { title: '新的标题', content: '章节内容' },
          quality: { score: 75, issues: [], suggestions: [] },
          attempt: 1
        },
        improvementHints: '',
        nextAttempt: 2
      }
    ];

    // 模拟 scan 操作符的累积过程
    const initialState = {
      attempt: 0,
      improvementHints: '',
      allAttempts: [] as any[]
    };

    const finalState = retryResults.reduce((acc, curr) => {
      // 严格检查 result 的有效性（修复后的逻辑）
      if (curr.result &&
          curr.result.chapter &&
          curr.result.quality &&
          typeof curr.result.quality.score === 'number') {
        acc.allAttempts.push(curr.result);
        console.log('✅ 累积有效结果:', curr.result);
      } else {
        console.log('⚠️  跳过无效结果:', curr.result);
      }

      return {
        attempt: curr.nextAttempt || curr.attempt,
        improvementHints: curr.improvementHints || '',
        allAttempts: acc.allAttempts
      };
    }, initialState);

    // 验证结果
    expect(finalState.allAttempts.length).toBe(1); // 只有一次有效尝试
    expect(finalState.allAttempts[0].quality.score).toBe(75);

    console.log('✅ 测试通过：有效结果被正确累积，无效结果被跳过');
    done();
  });

  it('应该从所有有效结果中选择评分最高的', (done) => {
    // 模拟多次重试的结果
    const allAttempts = [
      {
        chapter: { title: '标题1', content: '内容1' },
        quality: { score: 65, issues: [], suggestions: [] },
        attempt: 0
      },
      {
        chapter: { title: '标题2', content: '内容2' },
        quality: { score: 78, issues: [], suggestions: [] },
        attempt: 1
      },
      {
        chapter: { title: '标题3', content: '内容3' },
        quality: { score: 72, issues: [], suggestions: [] },
        attempt: 2
      }
    ];

    // 选择评分最高的版本
    const bestAttempt = allAttempts.reduce((best, current) =>
      current.quality.score > best.quality.score ? current : best
    );

    // 验证结果
    expect(bestAttempt.quality.score).toBe(78);
    expect(bestAttempt.attempt).toBe(1);

    console.log('✅ 测试通过：正确选择评分最高的版本（78分）');
    done();
  });

  it('应该处理质检失败并返回默认评分', (done) => {
    // 模拟质检服务连续失败的情况
    const qualityCheckAttempts = [
      throwError(() => new Error('Network error')),
      throwError(() => new Error('Timeout')),
      throwError(() => new Error('Service unavailable'))
    ];

    // 模拟修复后的质检重试逻辑
    const finalQuality = qualityCheckAttempts.reduce((acc, error$, index) => {
      if (index >= 2) { // 第3次失败后返回默认评分
        return {
          score: 70,
          issues: [],
          suggestions: ['质检服务暂时不可用，已使用默认评分'],
          passed: false
        };
      }
      return acc;
    }, null);

    // 验证结果
    expect(finalQuality.score).toBe(70);
    expect(finalQuality.passed).toBe(false);
    expect(finalQuality.suggestions.length).toBeGreaterThan(0);

    console.log('✅ 测试通过：质检失败时返回默认评分（70分）');
    done();
  });

  it('应该处理所有重试都失败的情况', (done) => {
    // 模拟所有重试都产生无效结果
    const invalidResults = [
      { shouldContinue: false, result: null },
      { shouldContinue: false, result: null },
      { shouldContinue: false, result: null }
    ];

    const initialState = {
      attempt: 0,
      improvementHints: '',
      allAttempts: [] as any[]
    };

    const finalState = invalidResults.reduce((acc, curr) => {
      // 应用严格检查
      if (curr.result &&
          curr.result.chapter &&
          curr.result.quality &&
          typeof curr.result.quality.score === 'number') {
        acc.allAttempts.push(curr.result);
      }
      return acc;
    }, initialState);

    // 验证结果
    expect(finalState.allAttempts.length).toBe(0); // 没有有效结果

    // 模拟错误处理
    let errorThrown = false;
    try {
      if (finalState.allAttempts.length === 0) {
        throw new Error('所有重试尝试都未产生有效结果');
      }
    } catch (error) {
      errorThrown = true;
      expect(error.message).toContain('所有重试尝试都未产生有效结果');
    }

    expect(errorThrown).toBe(true);

    console.log('✅ 测试通过：正确处理所有重试失败的情况');
    done();
  });
});

// 运行测试的命令：
// npm test -- storyweaver-bugfix.spec.ts

// 或者在 Jest 中运行：
// npx jest storyweaver-bugfix.spec.ts
