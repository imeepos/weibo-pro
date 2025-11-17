import { Injectable } from '@sker/core';
import { Handler } from '@sker/workflow';
import { CodeExecutorAst, type ExecutionLog } from '@sker/workflow-ast';
import { spawn } from 'child_process';
import { createContext, runInContext } from 'vm';

interface ExecutionOptions {
  timeout: number;
  context: Record<string, any>;
}

interface ExecutionResult {
  result: any;
  logs: ExecutionLog[];
  executionTime: number;
}

/**
 * 代码执行器 - 在沙箱环境中安全执行 JavaScript 和 Python 代码
 *
 * 设计理念：
 * - JavaScript：使用 Node.js vm 模块创建隔离上下文
 * - Python：启动独立进程，通过 stdin/stdout 序列化通信
 * - 超时控制：防止恶意或错误代码长时间占用资源
 * - 日志捕获：console.log 重定向到输出日志
 */
@Injectable()
export class CodeExecutorVisitor {
  constructor() {}

  @Handler(CodeExecutorAst)
  async visit(ast: CodeExecutorAst, _ctx: any): Promise<CodeExecutorAst> {
    ast.state = 'running';
    ast.logs = [];
    ast.executionTime = 0;

    const startTime = Date.now();

    try {
      const result = await this.executeCode(ast.language || 'javascript', ast.code, {
        timeout: (ast.timeout || 30) * 1000,
        context: ast.context,
      });

      ast.result = result.result;
      ast.logs = result.logs;
      ast.executionTime = result.executionTime;
      ast.state = 'success';
    } catch (error) {
      ast.state = 'fail';
      ast.setError(error, process.env.NODE_ENV === 'development');

      ast.logs.push({
        level: 'error',
        message: ast.error?.message || '未知错误',
        timestamp: new Date(),
      });

      console.error(`[CodeExecutorVisitor] 代码执行失败`, {
        language: ast.language,
        error: ast.error?.message || '未知错误',
      });
    }

    console.log(`[CodeExecutorVisitor] 执行完成，耗时 ${ast.executionTime}ms`);

    return ast;
  }

  private async executeCode(
    language: string,
    code: string,
    options: ExecutionOptions
  ): Promise<ExecutionResult> {
    // 支持 JavaScript 和 TypeScript（实际都作为 JavaScript 执行）
    if (language === 'typescript' || language === 'javascript') {
      return this.executeJavaScript(code, options, language);
    } else if (language === 'python') {
      return this.executePython(code, options);
    } else {
      throw new Error(`不支持的编程语言: ${language}`);
    }
  }

  private async executeJavaScript(
    code: string,
    options: ExecutionOptions,
    language: string
  ): Promise<ExecutionResult> {
    const { timeout, context } = options;
    const logs: ExecutionLog[] = [];
    const startTime = Date.now();

    const sandbox = {
      console: {
        log: (...args: any[]) => {
          logs.push({
            level: 'info',
            message: args.map((arg) => this.formatLogArg(arg)).join(' '),
            timestamp: new Date(),
          });
        },
        warn: (...args: any[]) => {
          logs.push({
            level: 'warn',
            message: args.map((arg) => this.formatLogArg(arg)).join(' '),
            timestamp: new Date(),
          });
        },
        error: (...args: any[]) => {
          logs.push({
            level: 'error',
            message: args.map((arg) => this.formatLogArg(arg)).join(' '),
            timestamp: new Date(),
          });
        },
      },
      context,
      result: undefined,
    };

    const sandboxContext = createContext(sandbox);

    const finalCode = `
      (async function() {
        try {
          ${code}
        } catch (error) {
          throw error;
        }
      })();
    `;

    await Promise.race([
      runInContext(finalCode, sandboxContext),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`代码执行超时（${timeout}ms）`)), timeout)
      ),
    ]);

    const executionTime = Date.now() - startTime;

    return {
      result: sandbox.result,
      logs,
      executionTime,
    };
  }

  private async executePython(
    code: string,
    options: ExecutionOptions
  ): Promise<ExecutionResult> {
    const { timeout, context } = options;
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const logs: ExecutionLog[] = [];
      let stdout = '';
      let stderr = '';

      const pythonScript = this.createPythonScript(code, context);
      const pythonProcess = spawn('python3', ['-c', pythonScript], {
        env: { ...process.env },
        cwd: process.cwd(),
      });

      const timer = setTimeout(() => {
        pythonProcess.kill('SIGTERM');
        reject(new Error(`Python 代码执行超时（${timeout}ms）`));
      }, timeout);

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
        logs.push({
          level: 'error',
          message: data.toString().trim(),
          timestamp: new Date(),
        });
      });

      pythonProcess.on('close', (code) => {
        clearTimeout(timer);

        if (code !== 0) {
          reject(new Error(`Python 进程退出码: ${code}, stderr: ${stderr}`));
          return;
        }

        try {
          const lines = stdout.trim().split('\n');
          const jsonLine = lines.find((line) => line.startsWith('__RESULT__'));

          if (!jsonLine) {
            resolve({
              result: stdout,
              logs,
              executionTime: Date.now() - startTime,
            });
            return;
          }

          const result = JSON.parse(jsonLine.replace('__RESULT__', ''));
          const executionLogs = lines
            .filter((line) => line.startsWith('__LOG__'))
            .map((line) => JSON.parse(line.replace('__LOG__', '')));

          logs.push(...executionLogs);

          resolve({
            result: result.result,
            logs,
            executionTime: Date.now() - startTime,
          });
        } catch (error) {
          reject(new Error(`解析 Python 输出失败: ${error instanceof Error ? error.message : String(error)}`));
        }
      });

      pythonProcess.on('error', (error) => {
        clearTimeout(timer);
        reject(new Error(`启动 Python 进程失败: ${error.message}`));
      });
    });
  }

  private createPythonScript(code: string, context: Record<string, any>): string {
    const contextJson = JSON.stringify(context);

    return `
import json
import sys

context = json.loads('''${contextJson}''')
logs = []

class Logger:
    def log(self, level, *args):
        msg = ' '.join(str(arg) for arg in args)
        logs.append({
            'level': level,
            'message': msg,
            'timestamp': __import__('datetime').datetime.now().isoformat()
        })
        print(f'__LOG__{{"level": "{level}", "message": "{msg}", "timestamp": "{__import__("datetime").datetime.now().isoformat()}"}}')

    def info(self, *args):
        self.log('info', *args)

    def warn(self, *args):
        self.log('warn', *args)

    def error(self, *args):
        self.log('error', *args)

console = Logger()

try:
${code.split('\n').map((line) => '    ' + line).join('\n')}

    if 'result' in locals():
        print(f'__RESULT__{{json.dumps({"result": result}) }}')
    else:
        print(f'__RESULT__{{json.dumps({"result": None}) }}')

except Exception as e:
    print(f'__RESULT__{{json.dumps({"error": str(e)}) }}')
    sys.exit(1)
`;
  }

  private formatLogArg(arg: any): string {
    if (typeof arg === 'object') {
      try {
        return JSON.stringify(arg, null, 2);
      } catch {
        return String(arg);
      }
    }
    return String(arg);
  }
}
