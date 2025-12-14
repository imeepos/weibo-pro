import { Injectable } from "@sker/core";
import { Handler, NodeEvent } from "@sker/workflow";
import { AudioAst } from "@sker/workflow-ast";
import { executeRemote } from "./execute-remote.js";
import { Observable } from 'rxjs'
@Injectable()
export class AudioBrowserVisitor {
    @Handler(AudioAst)
    handler(ast: AudioAst, ctx: any): Observable<NodeEvent> {
        return executeRemote(ast, ctx);
    }
}
