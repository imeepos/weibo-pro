import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('项目结构验证', () => {
  it('package.json 应该存在且包含必要字段', () => {
    const pkgPath = resolve(__dirname, '../../package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    
    expect(pkg.name).toBe('@sker/pageindex');
    expect(pkg.dependencies).toBeDefined();
    expect(pkg.scripts?.build).toBeDefined();
    expect(pkg.scripts?.test).toBeDefined();
    expect(pkg.bin).toBeDefined();
    expect(pkg.bin.pageindex).toBe('./bin/pageindex.js');
  });

  it('config.yaml 应该存在且包含默认配置', () => {
    const configPath = resolve(__dirname, '../../src/config.yaml');
    const config = readFileSync(configPath, 'utf-8');
    
    expect(config).toContain('model:');
    expect(config).toContain('toc_check_page_num:');
    expect(config).toContain('max_page_num_each_node:');
    expect(config).toContain('max_token_num_each_node:');
  });

  it('tsconfig.json 应该存在且配置正确', () => {
    const tsconfigPath = resolve(__dirname, '../../tsconfig.json');
    const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf-8'));
    
    expect(tsconfig.extends).toBe('@sker/typescript-config/base.json');
    expect(tsconfig.compilerOptions?.declaration).toBe(true);
    expect(tsconfig.compilerOptions?.declarationMap).toBe(true);
    expect(tsconfig.compilerOptions?.outDir).toBe('./dist');
  });

  it('vitest.config.ts 应该存在', () => {
    const vitestConfigPath = resolve(__dirname, '../../vitest.config.ts');
    expect(() => readFileSync(vitestConfigPath, 'utf-8')).not.toThrow();
  });

  it('bin/pageindex.js 应该存在', () => {
    const binPath = resolve(__dirname, '../../bin/pageindex.js');
    const binContent = readFileSync(binPath, 'utf-8');
    
    expect(binContent).toContain('#!/usr/bin/env node');
    expect(binContent).toContain("../dist/cli.js'");
  });

  it('README.md 和 CLAUDE.md 应该存在', () => {
    const readmePath = resolve(__dirname, '../../README.md');
    const claudePath = resolve(__dirname, '../../CLAUDE.md');
    
    expect(() => readFileSync(readmePath, 'utf-8')).not.toThrow();
    expect(() => readFileSync(claudePath, 'utf-8')).not.toThrow();
  });

  it('所有必需目录应该存在', () => {
    const { existsSync } = require('fs');
    
    const dirs = [
      'src/types',
      'src/pdf',
      'src/markdown',
      'src/utils',
      'bin',
      'tests/unit',
      'tests/integration',
      'tests/fixtures'
    ];
    
    dirs.forEach(dir => {
      const dirPath = resolve(__dirname, '../../', dir);
      expect(existsSync(dirPath)).toBe(true);
    });
  });

  it('package.json 应该包含所有必需依赖', () => {
    const pkgPath = resolve(__dirname, '../../package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    
    const requiredDeps = [
      'openai',
      'gpt-tokenizer',
      'pdfjs-dist',
      'commander',
      'yaml',
      'dotenv',
      'zod'
    ];
    
    const requiredDevDeps = [
      '@sker/typescript-config',
      '@sker/eslint-config',
      'vitest',
      '@vitest/ui',
      '@vitest/coverage-v8',
      'tsx'
    ];
    
    requiredDeps.forEach(dep => {
      expect(pkg.dependencies?.[dep]).toBeDefined();
    });
    
    requiredDevDeps.forEach(dep => {
      expect(pkg.devDependencies?.[dep]).toBeDefined();
    });
  });
});
