import { Ast, Input, Node, Output } from "@sker/workflow";
import { BehaviorSubject } from "rxjs";

@Node({ title: '音频', type: 'basic' })
export class AudioAst extends Ast {
    @Input({ title: '音频', type: 'audio' })
    uploadedAudio: string = '';

    @Output({ title: '音频' })
    audio: BehaviorSubject<string> = new BehaviorSubject<string>('');

    type: 'AudioAst' = 'AudioAst';
}
