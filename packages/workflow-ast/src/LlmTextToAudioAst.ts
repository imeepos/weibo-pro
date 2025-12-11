/**
 * 通过文字合成语音
 */

import { Ast, Input, IS_BUFFER, IS_MULTI, Node, Output } from "@sker/workflow";
import { BehaviorSubject } from "rxjs";

@Node({
    title: '语音合成',
    type: 'llm',
    errorStrategy: 'retry',
    maxRetries: 5,
    retryDelay: 1000,
    retryBackoff: 2
})
export class LlmTextToAudioAst extends Ast {

    @Input({ title: '文本', mode: IS_BUFFER | IS_MULTI })
    text: string[] = [];

    @Output({ title: '音频' })
    audio: BehaviorSubject<string> = new BehaviorSubject<string>(``)

    type: `LlmTextToAudioAst` = `LlmTextToAudioAst`
}
