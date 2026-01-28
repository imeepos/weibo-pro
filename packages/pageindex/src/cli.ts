#!/usr/bin/env node
/**
 * CLI 入口文件
 * 提供PDF和Markdown文档的索引生成命令
 */

import { Command } from 'commander';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { PDFConfig } from './types/config.types.js';

const program = new Command();

program
  .name('pageindex')
  .description('Process PDF or Markdown documents and generate structure')
  .version('1.0.0');

// PDF处理命令
program
  .command('pdf')
  .description('Process PDF document')
  .option('--pdf-path <path>', 'Path to the PDF file')
  .option('--model <model>', 'Model to use', 'gpt-4o-2024-11-20')
  .option('--toc-check-pages <num>', 'Number of pages to check for TOC', '20')
  .option('--max-pages-per-node <num>', 'Maximum pages per node', '10')
  .option('--max-tokens-per-node <num>', 'Maximum tokens per node', '20000')
  .option('--if-add-node-id <yes|no>', 'Add node ID', 'yes')
  .option('--if-add-node-summary <yes|no>', 'Add node summary', 'yes')
  .option('--if-add-doc-description <yes|no>', 'Add doc description', 'no')
  .option('--if-add-node-text <yes|no>', 'Add node text', 'no')
  .action(async (options) => {
    try {
      // 验证输入
      if (!options.pdfPath) {
        console.error('Error: --pdf-path is required');
        process.exit(1);
      }

      if (!existsSync(options.pdfPath)) {
        console.error(`Error: File not found: ${options.pdfPath}`);
        process.exit(1);
      }

      // 动态导入PDF处理模块
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let page_index_main: any;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pdfModule = await import('./pdf/page-index.js') as any;
        page_index_main = pdfModule.page_index_main;
      } catch (error) {
        console.error('Error: PDF processing module not yet implemented');
        console.error(error);
        process.exit(1);
      }

      // 构建配置
      const config: PDFConfig = {
        model: options.model,
        tocCheckPageNum: parseInt(options.tocCheckPages),
        maxPageNumEachNode: parseInt(options.maxPagesPerNode),
        maxTokenNumEachNode: parseInt(options.maxTokensPerNode),
        ifAddNodeId: options.ifAddNodeId,
        ifAddNodeSummary: options.ifAddNodeSummary,
        ifAddDocDescription: options.ifAddDocDescription,
        ifAddNodeText: options.ifAddNodeText,
      };

      console.log(`Processing PDF: ${options.pdfPath}`);
      const result = await page_index_main(options.pdfPath, config);

      // 保存结果
      const resultsDir = join(process.cwd(), 'results');
      if (!existsSync(resultsDir)) {
        mkdirSync(resultsDir, { recursive: true });
      }

      const outputFile = join(resultsDir, `${result.doc_name}_structure.json`);
      writeFileSync(outputFile, JSON.stringify(result, null, 2));

      console.log(`✓ Done! Output saved to: ${outputFile}`);
    } catch (error: unknown) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Markdown处理命令
program
  .command('md')
  .description('Process Markdown document')
  .option('--md-path <path>', 'Path to the Markdown file')
  .option('--model <model>', 'Model to use', 'gpt-4o-2024-11-20')
  .option('--if-thinning <yes|no>', 'Apply tree thinning', 'no')
  .option('--thinning-threshold <num>', 'Thinning threshold', '5000')
  .option('--summary-token-threshold <num>', 'Summary threshold', '200')
  .option('--if-add-node-id <yes|no>', 'Add node ID', 'yes')
  .option('--if-add-node-summary <yes|no>', 'Add node summary', 'yes')
  .option('--if-add-doc-description <yes|no>', 'Add doc description', 'no')
  .option('--if-add-node-text <yes|no>', 'Add node text', 'no')
  .action(async (options) => {
    try {
      // 验证输入
      if (!options.mdPath) {
        console.error('Error: --md-path is required');
        process.exit(1);
      }

      if (!existsSync(options.mdPath)) {
        console.error(`Error: File not found: ${options.mdPath}`);
        process.exit(1);
      }

      // 动态导入Markdown处理模块
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let md_to_tree: any;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mdModule = await import('./markdown/page-index-md.js') as any;
        md_to_tree = mdModule.md_to_tree;
      } catch (error) {
        console.error('Error: Markdown processing module not yet implemented');
        console.error(error);
        process.exit(1);
      }

      console.log(`Processing Markdown: ${options.mdPath}`);

      const result = await md_to_tree(
        options.mdPath,
        options.ifThinning === 'yes',
        parseInt(options.thinningThreshold),
        options.ifAddNodeSummary === 'yes',
        parseInt(options.summaryTokenThreshold),
        options.model,
        options.ifAddDocDescription === 'yes',
        options.ifAddNodeText === 'yes',
        options.ifAddNodeId === 'yes'
      );

      // 保存结果
      const resultsDir = join(process.cwd(), 'results');
      if (!existsSync(resultsDir)) {
        mkdirSync(resultsDir, { recursive: true });
      }

      const outputFile = join(resultsDir, `${result.doc_name}_structure.json`);
      writeFileSync(outputFile, JSON.stringify(result, null, 2));

      console.log(`✓ Done! Output saved to: ${outputFile}`);
    } catch (error: unknown) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// 导出program供测试使用
export { program };

// 只在直接运行时解析命令行参数
// 检查是否是主模块（被直接运行而非被导入）
const isMainModule = /\/cli\.js$|\\cli\.js$/.test(process.argv[1] || '');
if (isMainModule) {
  program.parse();
}
