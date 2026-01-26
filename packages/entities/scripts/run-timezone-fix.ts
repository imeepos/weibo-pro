import "reflect-metadata";
import 'dotenv/config';
import { resolve } from 'path';
import { fixTimezoneInStatistics, previewTimezoneFix } from './update';

// 导入所有实体以注册元数据
import '@sker/entities';
import { useDataSource } from "../src/utils";

// 加载 packages/entities/.env 文件
const envPath = resolve(__dirname, '../.env');
require('dotenv').config({ path: envPath });


/**
 * 运行时区修复预览
 *
 * 用法：
 *   npm run timezone-fix:preview
 *   或
 *   tsx scripts/run-timezone-fix.ts preview
 */
async function runPreview() {
  console.log('='.repeat(80));
  console.log('时区修复预览模式（不会修改数据）');
  console.log('只修复时间维度 year/month/day/hour，不修改其他统计值');
  console.log('='.repeat(80));
  const ds = await useDataSource()
  await previewTimezoneFix(ds);
}

/**
 * 运行时区修复
 *
 * ⚠️ 警告：此操作会修改数据库数据，建议先运行预览模式
 *
 * 用法：
 *   npm run timezone-fix
 *   或
 *   tsx scripts/run-timezone-fix.ts fix
 */
async function runFix() {
  console.log('='.repeat(80));
  console.log('时区修复执行模式');
  console.log('只修复时间维度 year/month/day/hour，不修改其他统计值');
  console.log('⚠️  此操作会修改数据库，请确保已运行预览模式');
  console.log('='.repeat(80));

  // 测试减法逻辑
  const { subtract8Hours } = require('./update');
  const test = subtract8Hours(2026, 1, 23, 16);
  console.log('\n测试: 2026-01-23 16:00 减去8小时 =', `${test.year}-${test.month}-${test.day} ${test.hour}:00`);
  console.log('期望: 2026-01-23 08:00');

  // 确认提示
  console.log('\n请在 5 秒内按 Ctrl+C 取消操作...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  const ds = await useDataSource()
  await fixTimezoneInStatistics(ds);

}

// 获取命令行参数
const mode = process.argv[2];

if (mode === 'preview') {
  runPreview().catch(console.error);
} else if (mode === 'fix') {
  runFix().catch(console.error);
} else {
  console.log('用法:');
  console.log('  预览模式（推荐先运行）: tsx scripts/run-timezone-fix.ts preview');
  console.log('  执行模式（实际修改）: tsx scripts/run-timezone-fix.ts fix');
  process.exit(1);
}
