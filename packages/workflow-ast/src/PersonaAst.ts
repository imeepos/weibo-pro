import { Ast, Input, IS_MULTI, Node, Output, State } from "@sker/workflow";
import { BehaviorSubject } from "rxjs";

/** 检索到的记忆 */
export interface RetrievedMemory {
  id: string;
  name: string;
  content: string;
  type: 'fact' | 'concept' | 'event' | 'person' | 'insight';
  depth: number;
}

@Node({
  title: '角色记忆',
  type: 'llm',
  errorStrategy: 'retry',
  maxRetries: 3,
  retryDelay: 1000,
  retryBackoff: 2
})
export class PersonaAst extends Ast {

  @State({ title: '角色ID' })
  personaId?: string;

  @State({ title: '角色名称' })
  personaName?: string;

  @State({ title: '角色头像' })
  personaAvatar?: string;

  @Input({ title: '刺激/线索', mode: IS_MULTI })
  stimuli: string[] = [];

  @Input({ title: '检索深度' })
  retrievalDepth: number = 3;

  @Input({ title: '检索超时(秒)' })
  retrievalTimeout: number = 10;

  @Input({ title: '温度' })
  temperature: number = 0.7;

  @Input({ title: '模型' })
  model: string = 'deepseek-ai/DeepSeek-V3';

  @State({ title: '检索到的记忆' })
  retrievedMemories: RetrievedMemory[] = [];

  @State({ title: '上下文' })
  context: string = '';

  @Output({ title: '回复' })
  response: BehaviorSubject<string> = new BehaviorSubject<string>('');

  @Output({ title: '新记忆ID' })
  newMemoryId: BehaviorSubject<string> = new BehaviorSubject<string>('');

  type: 'PersonaAst' = 'PersonaAst';
}
