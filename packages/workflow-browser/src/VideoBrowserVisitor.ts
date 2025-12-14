import { Injectable } from "@sker/core";
import { Handler, NodeEvent } from "@sker/workflow";
import { VideoAst } from "@sker/workflow-ast";
import { Observable } from "rxjs";

/**
 * 视频节点浏览器端 Visitor - 直接传递
 */
@Injectable()
export class VideoBrowserVisitor {
    @Handler(VideoAst)
    handler(ast: VideoAst, ctx: any): Observable<NodeEvent> {
        return new Observable(obs => {
            ast.state = 'running';
            obs.next({ type: 'node_runing', id: ast.id, data: ast });

            if (ast.uploadedVideo) {
                obs.next({ type: 'node_emit', id: ast.id, property: 'video', value: ast.uploadedVideo });
            }

            ast.state = 'success';
            obs.next({ type: 'node_success', id: ast.id, data: ast });
            obs.complete();
        });
    }
}
