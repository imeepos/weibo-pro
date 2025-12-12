import { Ast, Input, IS_MULTI, Node, Output } from "@sker/workflow";
import { BehaviorSubject } from "rxjs";

@Node({
    title: '分类器',
    type: 'control',
    dynamicOutputs: true,
    errorStrategy: 'retry',
    maxRetries: 5,
    retryDelay: 1000,
    retryBackoff: 2
})
export class LlmCategoryAst extends Ast {
    @Input({ title: '待分类文本', mode: IS_MULTI })
    context: string[] = [];

    @Input({ title: '系统提示词', type: 'textarea' })
    system: string = '你是一个文本分类专家。根据用户提供的文本，判断其所属类别。';

    @Input({ title: '温度' })
    temperature: number = 0;

    @Input({ title: '模型' })
    model: string = 'deepseek-ai/DeepSeek-V3.2-Exp';

    @Output({ title: 'Default', isRouter: true })
    output_default: BehaviorSubject<any> = new BehaviorSubject<any>(undefined);

    type: 'LlmCategoryAst' = 'LlmCategoryAst';

    declare metadata: NonNullable<Ast['metadata']>;
}
