import { Ast, Input, Node, Output } from "@sker/workflow";

@Node({ title: '音频', type: 'basic' })
export class AudioAst extends Ast {
    @Input({ title: '音频', type: 'audio', defaultValue: '' })
    uploadedAudio: string = '';

    @Output({ title: '音频', defaultValue: '' })
    audio = ``;

    type: 'AudioAst' = 'AudioAst';
}
