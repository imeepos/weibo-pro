import { Injectable } from "@sker/core";
import { Handler, NodeEvent } from "@sker/workflow";
import { VideoAst } from "@sker/workflow-ast";
import { Observable } from "rxjs";

/**
 * 视频节点后端 Visitor - 简单传递
 *
 * 视频处理由前端完成
 * 后端只负责将 uploadedVideo 传递到 video 输出
 */
@Injectable()
export class VideoVisitor {
    @Handler(VideoAst)
    handler(ast: VideoAst, ctx: any): Observable<NodeEvent> {
        return new Observable<NodeEvent>(obs => {
            ast.state = 'running';
            obs.next({ ...ast });


            // 直接使用 uploadedVideo（可能来自上游或用户上传）
            ast.video.next(ast.uploadedVideo || '');

            obs.next({ ...ast });

            ast.state = 'success';
            obs.next({ ...ast });
            obs.complete();
        });
    }
}
