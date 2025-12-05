import { Injectable } from "@sker/core";
import { Handler } from "@sker/workflow";
import { ImageAst } from "@sker/workflow-ast";
import { Observable } from "rxjs";

/**
 * 图片节点后端 Visitor - 简单传递，不做处理
 *
 * 图片合成由前端 ImageBrowserVisitor 完成
 * 后端只负责选择图片源并传递
 */
@Injectable()
export class ImageVisitor {
    @Handler(ImageAst)
    handler(ast: ImageAst, ctx: any) {
        return new Observable(obs => {
            ast.state = 'running';
            obs.next({ ...ast });

            ast.state = 'emitting';

            // 选择图片：优先上传的图片，否则第一个输入
            let inputs = ast.imageInputs || [];
            if (Array.isArray(inputs) && inputs.length > 0 && Array.isArray(inputs[0])) {
                inputs = inputs.flat();
            }

            ast.image = ast.uploadedImage || inputs[0] || '';

            obs.next({ ...ast });

            ast.state = 'success';
            obs.next({ ...ast });
            obs.complete();
        });
    }
}
