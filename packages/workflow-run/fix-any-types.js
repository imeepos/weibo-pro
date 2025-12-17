#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

/**
 * 批量修复 any 类型的脚本
 */

const srcDir = path.join(__dirname, 'src');

// 查找所有包含 any 的 TypeScript 文件
const files = glob.sync('**/*.ts', {
  cwd: srcDir,
  absolute: true,
  ignore: ['**/*.test.ts', '**/__tests__/**', '**/node_modules/**']
});

console.log(`Found ${files.length} TypeScript files`);

let totalFixed = 0;
let totalFiles = 0;

files.forEach(filePath => {
  const content = fs.readFileSync(filePath, 'utf-8');
  let newContent = content;
  let fileFixed = 0;

  // 修复常见的 any 类型模式
  const fixes = [
    // Observable<any> -> Observable<Record<string, unknown>>
    {
      pattern: /Observable<any>/g,
      replacement: 'Observable<Record<string, unknown>>'
    },
    // input$: Observable<any>, ctx: any -> input$: Observable<Record<string, unknown>>, ctx: Record<string, unknown>
    {
      pattern: /(\w+)\$: Observable<any>,\s*(\w+): any/g,
      replacement: '$1$: Observable<Record<string, unknown>>, $2: Record<string, unknown>'
    },
    // (ast as any)[key] -> (ast as Record<string, unknown>)[key]
    {
      pattern: /\(ast as any\)/g,
      replacement: '(ast as Record<string, unknown>)'
    },
    // (user as any) -> user
    {
      pattern: /\(user as any\)/g,
      replacement: 'user'
    },
    // (post as any) -> post
    {
      pattern: /\(post as any\)/g,
      replacement: 'post'
    },
    // (item as any) -> item
    {
      pattern: /\(item as any\)/g,
      replacement: 'item'
    },
    // (entity as any) -> entity
    {
      pattern: /\(entity as any\)/g,
      replacement: 'entity'
    },
    // users as any[] -> users
    {
      pattern: /(\w+) as any\[\]/g,
      replacement: '$1'
    },
    // : any[] -> : unknown[]
    {
      pattern: /: any\[\]/g,
      replacement: ': unknown[]'
    },
    // : any) -> : Record<string, unknown>)
    {
      pattern: /: any\)/g,
      replacement: ': Record<string, unknown>)'
    },
    // error: any -> error: unknown
    {
      pattern: /error: any/g,
      replacement: 'error: unknown'
    },
    // catch (error: any) -> catch (error: unknown)
    {
      pattern: /catch\s*\(\s*error:\s*any\s*\)/g,
      replacement: 'catch (error: unknown)'
    }
  ];

  fixes.forEach(({ pattern, replacement }) => {
    const matches = content.match(pattern);
    if (matches) {
      fileFixed += matches.length;
      newContent = newContent.replace(pattern, replacement);
    }
  });

  if (fileFixed > 0) {
    fs.writeFileSync(filePath, newContent, 'utf-8');
    console.log(`✓ ${path.relative(srcDir, filePath)}: fixed ${fileFixed} occurrences`);
    totalFixed += fileFixed;
    totalFiles++;
  }
});

console.log(`\nSummary: Fixed ${totalFixed} occurrences in ${totalFiles} files`);
