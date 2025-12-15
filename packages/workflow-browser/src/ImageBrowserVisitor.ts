import { Injectable } from "@sker/core";
import { Handler, NodeEvent } from "@sker/workflow";
import { ImageAst } from "@sker/workflow-ast";
import { Observable } from "rxjs";

/**
 * 图片节点浏览器端 Visitor - 使用浏览器 Canvas API 合成图片
 */
@Injectable()
export class ImageBrowserVisitor {
    @Handler(ImageAst)
    handler(ast: ImageAst, ctx: any): Observable<NodeEvent> {
        return new Observable(obs => {
            ast.state = 'running';
            obs.next({ type: 'node_runing', id: ast.id, data: ast });

            // 调试日志
            console.log('[ImageBrowserVisitor] ast.uploadedImage:', ast.uploadedImage);

            // 发射输出
            obs.next({ type: 'node_emit', id: ast.id, property: 'image', value: ast.uploadedImage });

            ast.state = 'success';
            obs.next({ type: 'node_success', id: ast.id, data: ast });
            obs.complete();
        });
    }
}
