import { Injectable } from "@sker/core";
import { Handler } from "@sker/workflow";
import { VideoAst } from "@sker/workflow-ast";
import { Observable } from "rxjs";

/**
 * 视频节点浏览器端 Visitor - 直接传递
 */
@Injectable()
export class VideoBrowserVisitor {
    @Handler(VideoAst)
    handler(ast: VideoAst, ctx: any) {
        return new Observable(obs => {
            ast.state = 'running';
            obs.next({ ...ast });
            ast.video = ast.uploadedVideo || '';
            obs.next({ ...ast });

            ast.state = 'success';
            obs.next({ ...ast });
            obs.complete();
        });
    }
}
