import { Injectable } from '@sker/core';
import { execa } from 'execa';

@Injectable({ providedIn: 'root' })
export class ClaudeCodeService {
  async execute(prompt: string, options?: {
    cwd?: string;
    files?: string[];
    dangerouslySkipPermissions?: boolean;
  }) {
    const args = [
      '--print',
      '--output-format', 'json',
      '-p', prompt
    ];

    if (options?.cwd) {
      args.push('--cwd', options.cwd);
    }

    if (options?.files) {
      options.files.forEach(f => args.push('--file', f));
    }

    if (options?.dangerouslySkipPermissions) {
      args.push('--dangerously-skip-permissions');
    }

    const { stdout } = await execa('claude', args, {
      cwd: options?.cwd,
      env: {
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      }
    });

    return JSON.parse(stdout);
  }

  async reviewCode(code: string, language?: string) {
    const prompt = `请审查以下${language || ''}代码，指出潜在问题和改进建议：\n\n\`\`\`\n${code}\n\`\`\``;
    return this.execute(prompt, { dangerouslySkipPermissions: true });
  }

  async refactorCode(code: string, language?: string) {
    const prompt = `请重构以下${language || ''}代码，提高可读性和性能：\n\n\`\`\`\n${code}\n\`\`\``;
    return this.execute(prompt, { dangerouslySkipPermissions: true });
  }

  async explainCode(code: string, language?: string) {
    const prompt = `请解释以下${language || ''}代码的功能和实现原理：\n\n\`\`\`\n${code}\n\`\`\``;
    return this.execute(prompt, { dangerouslySkipPermissions: true });
  }

  async analyzeFiles(files: string[], question: string, cwd?: string) {
    return this.execute(question, { files, cwd });
  }
}
