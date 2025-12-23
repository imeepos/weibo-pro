import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * 运行测试工具
 */
export const runTestsTool = tool(
  async ({ cwd, testFile, watch }) => {
    try {
      const watchArg = watch ? '--watch' : '';
      const fileArg = testFile || '';
      const { stdout, stderr } = await execAsync(
        `pnpm test ${fileArg} ${watchArg}`,
        { cwd, timeout: 300000 }
      );
      return `stdout:\n${stdout}\nstderr:\n${stderr}`;
    } catch (error: any) {
      return `测试失败:\n${error.stdout || error.message}`;
    }
  },
  {
    name: 'run_tests',
    description: '运行测试',
    schema: z.object({
      cwd: z.string().describe('项目目录'),
      testFile: z.string().optional().describe('指定测试文件'),
      watch: z.boolean().optional().default(false).describe('是否监听模式'),
    }),
  }
);

/**
 * 运行 ESLint 工具
 */
export const runLintTool = tool(
  async ({ cwd, fix }) => {
    try {
      const fixArg = fix ? '--fix' : '';
      const { stdout, stderr } = await execAsync(
        `pnpm lint ${fixArg}`,
        { cwd, timeout: 120000 }
      );
      return stdout || stderr || 'Lint 检查通过';
    } catch (error: any) {
      return `Lint 错误:\n${error.stdout || error.message}`;
    }
  },
  {
    name: 'run_lint',
    description: '运行 ESLint 代码检查',
    schema: z.object({
      cwd: z.string().describe('项目目录'),
      fix: z.boolean().optional().default(false).describe('是否自动修复'),
    }),
  }
);

/**
 * 构建项目工具
 */
export const buildProjectTool = tool(
  async ({ cwd }) => {
    try {
      const { stdout, stderr } = await execAsync('pnpm build', {
        cwd,
        timeout: 300000,
      });
      return `stdout:\n${stdout}\nstderr:\n${stderr}`;
    } catch (error: any) {
      return `构建失败:\n${error.stdout || error.message}`;
    }
  },
  {
    name: 'build_project',
    description: '构建项目',
    schema: z.object({
      cwd: z.string().describe('项目目录'),
    }),
  }
);

/** 导出所有测试工具 */
export const testTools = [runTestsTool, runLintTool, buildProjectTool];
