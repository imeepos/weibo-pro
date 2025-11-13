import { Ast, Input, Node, Output } from "@sker/workflow";

/**
 * 测试表单组件的节点
 *
 * 用于验证不同类型的输入字段：
 * - text: 文本输入
 * - number: 数字输入
 * - boolean: 复选框
 * - date: 日期选择器
 * - textarea: 多行文本
 */
@Node({ title: '表单测试' })
export class TestFormAst extends Ast {
    @Input({ title: '文本字段', type: 'text' })
    textField: string = '';

    @Input({ title: '数字字段', type: 'number' })
    numberField: number = 0;

    @Input({ title: '布尔字段', type: 'boolean' })
    booleanField: boolean = false;

    @Input({ title: '日期字段', type: 'date' })
    dateField: Date = new Date();

    @Input({ title: '文本区域', type: 'textarea' })
    textareaField: string = '';

    @Input({ title: '智能解析字段' })
    smartField: any = null;

    @Output({ title: '处理结果' })
    result: any = {};

    type: 'TestFormAst' = 'TestFormAst';
}