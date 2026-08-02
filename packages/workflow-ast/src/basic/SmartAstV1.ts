import { Ast, Input, Node, Output } from '@sker/workflow'

/**
 * SmartAstV1 - 通用智能分发节点
 *
 * 支持：
 * 1. 动态输入端口：用户可自定义输入（如 title, description, content）
 * 2. 动态输出端口：用户可自定义输出（如 chapter, section）
 * 3. LLM 理解输入数据，按需分发到各个输出端口
 * 4. 自定义 Prompt：提供额外的指令指导 LLM 行为
 *
 * 使用场景：
 * - 书籍目录 -> 按章节分发
 * - 用户列表 -> 按类型分发
 * - 数据集 -> 按条件分发
 * - 时间范围计算（事件采集场景）
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

    @Input({
        title: '分配规则',
        type: 'textarea',
        defaultValue: '',
        description: '自定义指令，指导 LLM 如何处理输入数据并生成输出。例如：计算时间范围、数据转换规则等。'
    })
    prompt: string = ''

    @Output({
        title: '分发完成',
        type: 'boolean',
        defaultValue: false,
        isRouter: true,
        description: '所有项分发完成时触发'
    })
    dispatchComplete: boolean = false

    type = 'SmartAstV1';}
