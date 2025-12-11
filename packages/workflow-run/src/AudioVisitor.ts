import { Injectable } from "@sker/core";
import { Handler } from "@sker/workflow";
import { AudioAst } from "@sker/workflow-ast";
import { Observable } from "rxjs";

@Injectable()
export class AudioVisitor {
    @Handler(AudioAst)
    handler(ast: AudioAst, ctx: any) {
        return new Observable(obs => {
            ast.state = 'running';
            obs.next({ ...ast });
            ast.audio = ast.uploadedAudio || '';
            obs.next({ ...ast });

            ast.state = 'success';
            obs.next({ ...ast });
            obs.complete();
        });
    }
}
