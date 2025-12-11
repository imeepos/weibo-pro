
/**
 * 通过文字合成语音
 */

import { Ast, Input, IS_BUFFER, IS_MULTI, Node, Output } from "@sker/workflow";

@Node({ title: '语音合成', type: 'llm' })
export class LlmTextToAudioAst extends Ast {

    @Input({ title: '文本', mode: IS_BUFFER | IS_MULTI })
    text: string[] = [];

    @Output({ title: '音频' })
    audio: string = ``;

    type: `LlmTextToAudioAst` = `LlmTextToAudioAst`
}
