import { Injectable } from "@sker/core";
import { Handler } from "@sker/workflow";
import { TextAreaAst } from "@sker/workflow";
import { Observable } from "rxjs";

/**
 * 文本区域 Visitor - 处理 TextAreaAst 节点
 *
 * 功能：
 * - 正确处理对象/数组到字符串的转换
 * - 避免 [object Object] 问题
 */
@Injectable()
export class TextAreaVisitor {
    @Handler(TextAreaAst)
    handler(ast: TextAreaAst, ctx: any) {
        return new Observable(obs => {
            ast.state = 'running';
            obs.next({ ...ast });

            ast.state = 'emitting';

            // 将输入转换为字符串输出
            if (ast.input !== undefined && ast.input !== null) {
                // 如果是字符串，直接使用
                if (typeof ast.input === 'string') {
                    ast.output = ast.input;
                }
                // 如果是数组，使用 JSON.stringify 格式化
                else if (Array.isArray(ast.input)) {
                    ast.output = JSON.stringify(ast.input, null, 2);
                }
                // 如果是对象，使用 JSON.stringify 格式化
                else if (typeof ast.input === 'object') {
                    ast.output = JSON.stringify(ast.input, null, 2);
                }
                // 其他类型（数字、布尔等），转换为字符串
                else {
                    ast.output = String(ast.input);
                }
            } else {
                ast.output = '';
            }

            obs.next({ ...ast });

            ast.state = 'success';
            obs.next({ ...ast });
            obs.complete();
        });
    }
}
