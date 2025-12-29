import { Ast, Input, Node, Output, State } from '@sker/workflow';

export type MediaType = 'image' | 'video' | 'audio';

@Node({
  title: '媒体生成',
  type: 'llm',
  errorStrategy: 'retry',
  maxRetries: 3,
  retryDelay: 2000,
  retryBackoff: 2
})
export class MediaGenerateAst extends Ast {
  @State({ title: '媒体类型' })
  mediaType: MediaType = 'image';

  @State({ title: '模型' })
  model = '';

  @Input({ title: '提示词', type: 'textarea', defaultValue: '' })
  prompt = '';

  @Input({ title: '参考图片', defaultValue: null })
  referenceImage: string | null = null;

  @Output({ title: '媒体URL', defaultValue: '' })
  mediaUrl = '';

  type: 'MediaGenerateAst' = 'MediaGenerateAst';
}
