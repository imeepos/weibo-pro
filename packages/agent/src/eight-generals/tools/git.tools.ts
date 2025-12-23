import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Git 状态工具
 */
export const gitStatusTool = tool(
  async ({ cwd }) => {
    try {
      const { stdout } = await execAsync('git status --porcelain', { cwd });
      return stdout || '工作区干净';
    } catch (error: any) {
      return `Git 错误: ${error.message}`;
    }
  },
  {
    name: 'git_status',
    description: '获取 Git 工作区状态',
    schema: z.object({
      cwd: z.string().describe('仓库目录'),
    }),
  }
);

/**
 * Git 差异工具
 */
export const gitDiffTool = tool(
  async ({ cwd, file, staged }) => {
    try {
      const stagedArg = staged ? '--staged' : '';
      const fileArg = file || '';
      const { stdout } = await execAsync(`git diff ${stagedArg} ${fileArg}`, { cwd });
      return stdout || '无差异';
    } catch (error: any) {
      return `Git 错误: ${error.message}`;
    }
  },
  {
    name: 'git_diff',
    description: '获取 Git 差异',
    schema: z.object({
      cwd: z.string().describe('仓库目录'),
      file: z.string().optional().describe('指定文件'),
      staged: z.boolean().optional().default(false).describe('是否查看暂存区'),
    }),
  }
);

/**
 * Git 日志工具
 */
export const gitLogTool = tool(
  async ({ cwd, count }) => {
    try {
      const { stdout } = await execAsync(
        `git log --oneline -n ${count || 10}`,
        { cwd }
      );
      return stdout || '无提交记录';
    } catch (error: any) {
      return `Git 错误: ${error.message}`;
    }
  },
  {
    name: 'git_log',
    description: '获取 Git 提交日志',
    schema: z.object({
      cwd: z.string().describe('仓库目录'),
      count: z.number().optional().default(10).describe('显示条数'),
    }),
  }
);

/**
 * Git 提交工具
 */
export const gitCommitTool = tool(
  async ({ cwd, message, files }) => {
    try {
      // 添加文件
      const addCmd = files?.length ? `git add ${files.join(' ')}` : 'git add -A';
      await execAsync(addCmd, { cwd });

      // 提交
      const { stdout } = await execAsync(`git commit -m "${message}"`, { cwd });
      return stdout;
    } catch (error: any) {
      return `Git 错误: ${error.message}`;
    }
  },
  {
    name: 'git_commit',
    description: '创建 Git 提交',
    schema: z.object({
      cwd: z.string().describe('仓库目录'),
      message: z.string().describe('提交信息'),
      files: z.array(z.string()).optional().describe('要提交的文件列表'),
    }),
  }
);

/** 导出所有 Git 工具 */
export const gitTools = [gitStatusTool, gitDiffTool, gitLogTool, gitCommitTool];
