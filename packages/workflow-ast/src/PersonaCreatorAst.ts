import { Ast, Input, IS_MULTI, Node, Output, State } from "@sker/workflow";
import { BehaviorSubject } from "rxjs";
import type { PersonaMetadata, PersonaDestiny } from "@sker/entities";

@Node({
  title: '创建人物',
  type: 'llm',
  errorStrategy: 'retry',
  maxRetries: 3,
  retryDelay: 1000,
  retryBackoff: 2
})
export class PersonaCreatorAst extends Ast {

  @Input({ title: '角色描述', type: 'textarea', mode: IS_MULTI })
  descriptions: string[] = [];

  @Input({ title: '温度' })
  temperature: number = 0.7;

  @Input({ title: '模型' })
  model: string = 'deepseek-ai/DeepSeek-V3';

  @State({ title: '生成的角色名' })
  generatedName?: string;

  @State({ title: '生成的头像' })
  generatedAvatar?: string;

  @State({ title: '生成的描述' })
  generatedDescription?: string;

  @State({ title: '生成的背景' })
  generatedBackground?: string;

  @State({ title: '生成的性格' })
  generatedTraits?: string[];

  @State({ title: '生成的元数据' })
  generatedMetadata?: PersonaMetadata;

  @State({ title: '生成的命运' })
  generatedDestiny?: PersonaDestiny;

  @Output({ title: '角色ID' })
  personaId: BehaviorSubject<string> = new BehaviorSubject<string>('');

  @Output({ title: '角色名' })
  personaName: BehaviorSubject<string> = new BehaviorSubject<string>('');

  type: 'PersonaCreatorAst' = 'PersonaCreatorAst';
}
