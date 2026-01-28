import { describe, it, expect, vi } from 'vitest';
import { program } from '../../src/cli.js';
import { Command } from 'commander';

// Mock主函数
vi.mock('../../src/pdf/page-index.js', () => ({
  page_index_main: vi.fn().mockResolvedValue({
    doc_name: 'test.pdf',
    structure: [],
  }),
}));

vi.mock('../../src/markdown/page-index-md.js', () => ({
  md_to_tree: vi.fn().mockResolvedValue({
    doc_name: 'test.md',
    structure: [],
  }),
}));

describe('CLI', () => {
  it('应该有pdf命令', () => {
    expect(program.commands.some(c => c.name() === 'pdf')).toBe(true);
  });

  it('应该有md命令', () => {
    expect(program.commands.some(c => c.name() === 'md')).toBe(true);
  });

  it('pdf命令应该存在', () => {
    const pdfCommand = program.commands.find(c => c.name() === 'pdf');
    expect(pdfCommand).toBeDefined();
  });

  it('md命令应该存在', () => {
    const mdCommand = program.commands.find(c => c.name() === 'md');
    expect(mdCommand).toBeDefined();
  });

  it('pdf命令应该有--pdf-path选项', () => {
    const pdfCommand = program.commands.find(c => c.name() === 'pdf');
    expect(pdfCommand).toBeDefined();
    if (pdfCommand) {
      const options = pdfCommand.options;
      expect(options.some(o => o.long === '--pdf-path')).toBe(true);
    }
  });

  it('pdf命令应该有--model选项', () => {
    const pdfCommand = program.commands.find(c => c.name() === 'pdf');
    expect(pdfCommand).toBeDefined();
    if (pdfCommand) {
      const options = pdfCommand.options;
      expect(options.some(o => o.long === '--model')).toBe(true);
    }
  });

  it('pdf命令应该有--toc-check-pages选项', () => {
    const pdfCommand = program.commands.find(c => c.name() === 'pdf');
    expect(pdfCommand).toBeDefined();
    if (pdfCommand) {
      const options = pdfCommand.options;
      expect(options.some(o => o.long === '--toc-check-pages')).toBe(true);
    }
  });

  it('md命令应该有--md-path选项', () => {
    const mdCommand = program.commands.find(c => c.name() === 'md');
    expect(mdCommand).toBeDefined();
    if (mdCommand) {
      const options = mdCommand.options;
      expect(options.some(o => o.long === '--md-path')).toBe(true);
    }
  });

  it('md命令应该有--model选项', () => {
    const mdCommand = program.commands.find(c => c.name() === 'md');
    expect(mdCommand).toBeDefined();
    if (mdCommand) {
      const options = mdCommand.options;
      expect(options.some(o => o.long === '--model')).toBe(true);
    }
  });

  it('md命令应该有--if-thinning选项', () => {
    const mdCommand = program.commands.find(c => c.name() === 'md');
    expect(mdCommand).toBeDefined();
    if (mdCommand) {
      const options = mdCommand.options;
      expect(options.some(o => o.long === '--if-thinning')).toBe(true);
    }
  });

  it('CLI应该有正确的名称和描述', () => {
    expect(program.name()).toBe('pageindex');
    expect(program.description()).toContain('Process PDF or Markdown documents');
  });
});
