import { Ast, Input, IS_MULTI, Node, Output } from '@sker/workflow'

/**
 * SmartAstV1 - 通用智能分发节点
 *
 * 支持：
 * 1. 动态输入端口：用户可自定义输入（如 title, description, content）
 * 2. 动态输出端口：用户可自定义输出（如 chapter, section）
 * 3. LLM 理解输入数据，按需分发到各个输出端口
 *
 * 使用场景：
 * - 书籍目录 -> 按章节分发
 * - 用户列表 -> 按类型分发
 * - 数据集 -> 按条件分发
 */
@Node({
    title: '智能分发器',
    type: 'control',
    errorStrategy: 'retry',
    maxRetries: 2,
    retryDelay: 1000,
    retryBackoff: 2,
    dynamicOutputs: true,
    dynamicInputs: true
})
export class SmartAstV1 extends Ast {
    @Input({
        title: 'LLM 模型',
        defaultValue: 'deepseek-ai/DeepSeek-V3.2',
        description: '用于分析和分发数据的大模型'
    })
    model: string = 'deepseek-ai/DeepSeek-V3.2'

    @Input({
        title: '温度参数',
        type: 'number',
        defaultValue: 0.3,
        description: 'LLM 生成的随机性，较低值使输出更确定'
    })
    temperature: number = 0.3

    @Output({
        title: '分发完成',
        type: 'boolean',
        defaultValue: false,
        isRouter: true,
        description: '所有项分发完成时触发'
    })
    dispatchComplete: boolean = false

    type: 'SmartAstV1' = 'SmartAstV1'
}
