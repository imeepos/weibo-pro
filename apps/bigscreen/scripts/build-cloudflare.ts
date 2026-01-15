#!/usr/bin/env node
/**
 * Cloudflare Pages 构建脚本
 * 解决 monorepo 依赖问题
 */

import { execSync } from 'child_process';
import { existsSync, rmSync } from 'fs';
import { resolve, join } from 'path';

const ROOT = resolve(__dirname, '../..');
const DIST = resolve(__dirname, '../dist');

console.log('🔨 Cloudflare Pages 构建开始');
console.log('ROOT:', ROOT);
console.log('DIST:', DIST);

// 清理旧构建
if (existsSync(DIST)) {
  console.log('🧹 清理旧构建...');
  rmSync(DIST, { recursive: true, force: true });
}

// 构建依赖包
console.log('📦 构建依赖包...');
execSync('pnpm build:deps', {
  cwd: ROOT,
  stdio: 'inherit',
  shell: true
});

// 构建当前项目
console.log('🏗️ 构建 bigscreen...');
execSync('pnpm exec vite build', {
  cwd: resolve(__dirname, '..'),
  stdio: 'inherit',
  shell: true
});

console.log('✅ 构建完成！');
console.log('📂 输出目录:', DIST);
