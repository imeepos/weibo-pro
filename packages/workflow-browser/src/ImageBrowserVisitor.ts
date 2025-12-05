import { Injectable } from "@sker/core";
import { Handler } from "@sker/workflow";
import { ImageAst } from "@sker/workflow-ast";
import { Observable } from "rxjs";

/**
 * 图片节点浏览器端 Visitor - 使用浏览器 Canvas API 合成图片
 */
@Injectable()
export class ImageBrowserVisitor {
    @Handler(ImageAst)
    handler(ast: ImageAst, ctx: any) {
        return new Observable(obs => {
            // 如果有标注或裁剪，使用完整处理流程
            // 无编辑操作，直接传递
            ast.state = 'running';
            obs.next({ ...ast });

            ast.state = 'emitting';
            ast.image = ast.uploadedImage || '';
            obs.next({ ...ast });

            ast.state = 'success';
            obs.next({ ...ast });
            obs.complete();
        });
    }
}
