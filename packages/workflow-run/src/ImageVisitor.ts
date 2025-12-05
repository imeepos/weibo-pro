import { Injectable } from "@sker/core";
import { Handler } from "@sker/workflow";
import { ImageAst } from "@sker/workflow-ast";
import { Observable } from "rxjs";

/**
 * 图片节点后端 Visitor - 简单传递
 *
 * 图片合成由前端 ImageBrowserVisitor 完成
 * 后端只负责将 uploadedImage 传递到 image 输出
 */
@Injectable()
export class ImageVisitor {
    @Handler(ImageAst)
    handler(ast: ImageAst, ctx: any) {
        return new Observable(obs => {
            ast.state = 'running';
            obs.next({ ...ast });

            ast.state = 'emitting';

            // 直接使用 uploadedImage（可能来自上游或用户上传）
            ast.image = ast.uploadedImage || '';

            obs.next({ ...ast });

            ast.state = 'success';
            obs.next({ ...ast });
            obs.complete();
        });
    }
}
