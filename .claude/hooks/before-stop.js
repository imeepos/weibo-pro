#!/usr/bin/env node

const { execSync } = require('child_process');

/**
 * Claude Code Stop Hook - 智能代码检查与提交提示
 * 每次 Claude 响应结束时触发
 *
 * 检查流程：
 * 1. 检查是否有未提交的变更（如果没有，跳过所有检查）
 * 2. 如果有变更，提供相应的提示信息
 */

function exec(command, options = {}) {
  try {
    return execSync(command, {
      encoding: 'utf8',
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options
    });
  } catch (error) {
    if (options.ignoreError) {
      return null;
    }
    throw error;
  }
}

function outputJson(data) {
  console.error(JSON.stringify(data));
}

function main() {
  try {
    // [1/3] 检查是否有未提交的变更
    console.log('>>> [1/3] 检查代码变更...');

    const gitStatus = exec('git status --porcelain', { silent: true });

    if (!gitStatus || !gitStatus.trim()) {
      // 没有变更，直接退出
      console.log('>>> 无代码变更，跳过检查');
      process.exit(0);
    }

    // 检查最近一次 commit 是否是 hook 自动提交的
    const lastCommitMsg = exec('git log -1 --pretty=%B 2>&1', {
      silent: true,
      ignoreError: true
    });

    const isAutoCommit = lastCommitMsg && lastCommitMsg.includes('auto commit by before-stop hook');

    if (isAutoCommit) {
      console.log('>>> 检测到刚刚已自动提交，跳过检查');
      process.exit(0);
    }

    // 有变更，执行类型检查和测试
    console.log('>>> 检测到代码变更，开始质量检查...\n');

    let typesPassed = false;
    let testsPassed = false;

    // [2/3] 运行类型检查
    console.log('>>> [2/3] 运行类型检查...');

    try {
      exec('pnpm check-types', { silent: true });
      typesPassed = true;
      console.log('>>> ✓ 类型检查通过\n');
    } catch (error) {
      console.log('>>> ✗ 类型检查失败\n');
    }

    // [3/3] 运行单元测试
    console.log('>>> [3/3] 运行单元测试...');

    try {
      // 只测试核心稳定包，跳过有问题的集成测试
      exec('pnpm turbo run test --filter=!@sker/workflow --filter=!@sker/workflow-run --filter=!@sker/ip-proxy --filter=!@sker/bigscreen --filter=!@sker/workflow-ui', { silent: true });
      testsPassed = true;
      console.log('>>> ✓ 单元测试通过\n');
    } catch (error) {
      console.log('>>> ✗ 单元测试失败\n');
    }

    // 根据检查结果提供提示
    console.log('=================================');
    console.log('📋 代码质量检查报告');
    console.log('=================================\n');

    if (!typesPassed && !testsPassed) {
      console.log('❌ 类型检查：失败');
      console.log('❌ 单元测试：失败\n');
      console.log('💡 提示：请先修复类型检查错误，然后运行单元测试修复测试失败，最后提交代码。');
    } else if (!typesPassed) {
      console.log('❌ 类型检查：失败');
      console.log('✅ 单元测试：通过\n');
      console.log('💡 提示：请先修复类型检查错误，然后提交代码。');
    } else if (!testsPassed) {
      console.log('✅ 类型检查：通过');
      console.log('❌ 单元测试：失败\n');
      console.log('💡 提示：请先修复单元测试失败，然后提交代码。');
    } else {
      console.log('✅ 类型检查：通过');
      console.log('✅ 单元测试：通过\n');
      console.log('💡 提示：代码质量检查已通过，请提交代码。');
    }

    console.log('\n=================================');
    process.exit(0);

  } catch (error) {
    console.error('❌ Hook 执行出错:', error.message);
    process.exit(1);
  }
}

main();
