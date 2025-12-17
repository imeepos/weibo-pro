import { Ast } from "./ast";
import { Input, Node, Output } from "./decorator";

@Node({ title: '音频', type: 'basic' })
export class AudioAst extends Ast {
    @Input({ title: '音频', type: 'audio', defaultValue: '' })
    uploadedAudio: string = '';
    
    @Output({ title: '音频', defaultValue: '' })
    audio = ``;

    type: 'AudioAst' = 'AudioAst';
}
