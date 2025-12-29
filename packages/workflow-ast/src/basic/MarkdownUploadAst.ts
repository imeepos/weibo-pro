import { Ast, Input, Node, Output } from '@sker/workflow';

export interface MarkdownHeading {
  level: number;
  text: string;
  slug: string;
}

@Node({
  title: 'Markdown 上传',
  type: 'basic',
  errorStrategy: 'fail'
})
export class MarkdownUploadAst extends Ast {
  @Input({ title: '文件 URL', type: 'text', defaultValue: '' })
  fileUrl: string = '';

  @Output({ title: '原始内容', defaultValue: '' })
  rawContent: string = '';

  @Output({ title: 'HTML 内容', defaultValue: '' })
  htmlContent: string = '';

  @Output({ title: '纯文本', defaultValue: '' })
  plainText: string = '';

  @Output({ title: '标题列表', defaultValue: [] })
  headings: MarkdownHeading[] = [];

  type: 'MarkdownUploadAst' = 'MarkdownUploadAst';
}
