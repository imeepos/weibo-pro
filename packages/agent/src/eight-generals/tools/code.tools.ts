import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * 读取文件工具
 */
export const readFileTool = tool(
  async ({ filePath }) => {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');
      // 添加行号
      const numbered = lines.map((line, i) => `${i + 1}| ${line}`).join('\n');
      return numbered;
    } catch (error) {
      return `读取失败: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
  {
    name: 'read_file',
    description: '读取文件内容，返回带行号的文本',
    schema: z.object({
      filePath: z.string().describe('文件绝对路径'),
    }),
  }
);

/**
 * 写入文件工具
 */
export const writeFileTool = tool(
  async ({ filePath, content }) => {
    try {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, content, 'utf-8');
      return `已写入: ${filePath}`;
    } catch (error) {
      return `写入失败: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
  {
    name: 'write_file',
    description: '写入文件内容（自动创建目录）',
    schema: z.object({
      filePath: z.string().describe('文件绝对路径'),
      content: z.string().describe('文件内容'),
    }),
  }
);

/**
 * 编辑文件工具（字符串替换）
 */
export const editFileTool = tool(
  async ({ filePath, oldString, newString }) => {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      if (!content.includes(oldString)) {
        return `未找到要替换的内容`;
      }
      const newContent = content.replace(oldString, newString);
      await fs.writeFile(filePath, newContent, 'utf-8');
      return `已替换: ${filePath}`;
    } catch (error) {
      return `编辑失败: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
  {
    name: 'edit_file',
    description: '编辑文件，替换指定字符串',
    schema: z.object({
      filePath: z.string().describe('文件绝对路径'),
      oldString: z.string().describe('要替换的原字符串'),
      newString: z.string().describe('替换后的新字符串'),
    }),
  }
);

/**
 * 列出目录工具
 */
export const listDirTool = tool(
  async ({ dirPath, recursive }) => {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const result: string[] = [];

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          result.push(`📁 ${entry.name}/`);
          if (recursive) {
            const subEntries = await fs.readdir(fullPath);
            subEntries.forEach((sub) => result.push(`  - ${sub}`));
          }
        } else {
          result.push(`📄 ${entry.name}`);
        }
      }

      return result.join('\n');
    } catch (error) {
      return `列目录失败: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
  {
    name: 'list_dir',
    description: '列出目录内容',
    schema: z.object({
      dirPath: z.string().describe('目录绝对路径'),
      recursive: z.boolean().optional().default(false).describe('是否递归显示子目录'),
    }),
  }
);

/**
 * 搜索代码工具（使用 ripgrep）
 */
export const searchCodeTool = tool(
  async ({ pattern, directory, fileType }) => {
    const { execSync } = await import('child_process');
    const typeArg = fileType ? `--type ${fileType}` : '';
    const cmd = `rg "${pattern}" "${directory}" ${typeArg} --line-number --max-count 50`;

    try {
      const output = execSync(cmd, { encoding: 'utf-8', maxBuffer: 5 * 1024 * 1024 });
      return output || '无匹配结果';
    } catch (error: any) {
      if (error.status === 1) return '无匹配结果';
      return `搜索失败: ${error.message}`;
    }
  },
  {
    name: 'search_code',
    description: '在代码库中搜索模式（使用 ripgrep）',
    schema: z.object({
      pattern: z.string().describe('搜索模式（正则表达式）'),
      directory: z.string().describe('搜索目录'),
      fileType: z.string().optional().describe('文件类型（如 ts, js, py）'),
    }),
  }
);

/**
 * 查找文件工具（使用 glob）
 */
export const findFilesTool = tool(
  async ({ pattern, directory }) => {
    const { glob } = await import('glob');
    try {
      const files = await glob(pattern, { cwd: directory, absolute: true });
      return files.slice(0, 100).join('\n') || '无匹配文件';
    } catch (error) {
      return `查找失败: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
  {
    name: 'find_files',
    description: '使用 glob 模式查找文件',
    schema: z.object({
      pattern: z.string().describe('Glob 模式（如 **/*.ts）'),
      directory: z.string().describe('搜索根目录'),
    }),
  }
);

/** 导出所有代码工具 */
export const codeTools = [
  readFileTool,
  writeFileTool,
  editFileTool,
  listDirTool,
  searchCodeTool,
  findFilesTool,
];
