import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { exec, } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * 执行终端命令工具
 */
export const executeCommandTool = tool(
  async ({ command, cwd, timeout }) => {
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd,
        timeout: timeout || 30000,
        maxBuffer: 10 * 1024 * 1024,
      });

      const result: string[] = [];
      if (stdout) result.push(`stdout:\n${stdout}`);
      if (stderr) result.push(`stderr:\n${stderr}`);
      return result.join('\n') || '命令执行完成（无输出）';
    } catch (error: any) {
      return `执行失败: ${error.message}\nstderr: ${error.stderr || ''}`;
    }
  },
  {
    name: 'execute_command',
    description: '执行终端命令（谨慎使用，避免危险操作）',
    schema: z.object({
      command: z.string().describe('要执行的命令'),
      cwd: z.string().optional().describe('工作目录'),
      timeout: z.number().optional().default(30000).describe('超时时间（毫秒）'),
    }),
  }
);

/**
 * 运行 npm 脚本工具
 */
export const npmRunTool = tool(
  async ({ script, cwd }) => {
    try {
      const { stdout, stderr } = await execAsync(`pnpm run ${script}`, {
        cwd,
        timeout: 120000,
        maxBuffer: 10 * 1024 * 1024,
      });
      return `stdout:\n${stdout}\nstderr:\n${stderr}`;
    } catch (error: any) {
      return `执行失败: ${error.message}`;
    }
  },
  {
    name: 'npm_run',
    description: '运行 pnpm 脚本',
    schema: z.object({
      script: z.string().describe('脚本名称（如 build, test, lint）'),
      cwd: z.string().describe('项目目录'),
    }),
  }
);

/**
 * TypeScript 类型检查工具
 */
export const typeCheckTool = tool(
  async ({ cwd }) => {
    try {
      const { stdout, stderr } = await execAsync('npx tsc --noEmit', {
        cwd,
        timeout: 120000,
      });
      return stdout || stderr || '类型检查通过';
    } catch (error: any) {
      return `类型错误:\n${error.stdout || error.message}`;
    }
  },
  {
    name: 'type_check',
    description: '运行 TypeScript 类型检查',
    schema: z.object({
      cwd: z.string().describe('项目目录'),
    }),
  }
);

/** 导出所有终端工具 */
export const terminalTools = [executeCommandTool, npmRunTool, typeCheckTool];
