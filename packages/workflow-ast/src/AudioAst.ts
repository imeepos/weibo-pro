import { Ast, Input, Node, Output } from "@sker/workflow";

@Node({ title: '音频', type: 'basic' })
export class AudioAst extends Ast {
    @Input({ title: '音频', type: 'audio' })
    uploadedAudio: string = '';

    @Output({ title: '音频' })
    audio: string = '';

    type: 'AudioAst' = 'AudioAst';
}
