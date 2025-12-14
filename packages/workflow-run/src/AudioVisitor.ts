import { Injectable } from "@sker/core";
import { Handler, NodeEvent, WorkflowGraphAst } from "@sker/workflow";
import { AudioAst } from "@sker/workflow-ast";
import { Observable } from "rxjs";

@Injectable()
export class AudioVisitor {
    @Handler(AudioAst)
    handler(ast: AudioAst, ctx: WorkflowGraphAst) {
        return new Observable<NodeEvent>(obs => {
            ast.state = 'running';
            obs.next({ type: 'node_runing', id: ast.id, data: ast });
            if (ast.audio) obs.next({ type: 'node_emit', id: ast.id, property: 'audio', value: ast.audio });
            else if (ast.uploadedAudio) obs.next({ type: 'node_emit', id: ast.id, property: 'audio', value: ast.uploadedAudio });
            ast.state = 'success';
            obs.next({ type: 'node_success', id: ast.id, data: ast });
            obs.complete();
        });
    }
}
