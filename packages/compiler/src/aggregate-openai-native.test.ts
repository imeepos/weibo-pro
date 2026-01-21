import { describe, it, expect } from 'vitest'
import { Observable } from 'rxjs'
import { aggregateOpenAIStreamNative, OpenAIResponseMessage } from './aggregate-openai-native'
import { OpenAiResponseAst, Ast } from './ast'

describe('aggregateOpenAIStreamNative', () => {
  it('should aggregate OpenAI native stream format with text content', async () => {
    const events = [
        createChunk('chatcmpl-123', [{ index: 0, delta: { role: 'assistant' }, finish_reason: null }]),
        createChunk('chatcmpl-123', [{ index: 0, delta: { content: 'Hello' }, finish_reason: null }]),
        createChunk('chatcmpl-123', [{ index: 0, delta: { content: ' World' }, finish_reason: null }]),
        createChunk('chatcmpl-123', [{ index: 0, delta: {}, finish_reason: 'stop' }])
    ]

    const source = new Observable<Ast>(subscriber => {
        events.forEach(e => subscriber.next(e))
        subscriber.complete()
    })

    const result = await source.pipe(aggregateOpenAIStreamNative()).toPromise()

    expect(result).toEqual({
        id: 'chatcmpl-123',
        role: 'assistant',
        content: 'Hello World',
        tool_calls: undefined,
        finish_reason: 'stop'
    })
  })

  it('should aggregate OpenAI native stream format with tool calls', async () => {
    const events = [
        createChunk('chatcmpl-123', [{
            index: 0,
            delta: {
                role: 'assistant',
                tool_calls: [{ index: 0, id: 'call_abc', type: 'function', function: { name: 'read_file', arguments: '' } }]
            },
            finish_reason: null
        }]),
        createChunk('chatcmpl-123', [{
            index: 0,
            delta: {
                tool_calls: [{ index: 0, function: { arguments: '{"path":' } }]
            },
            finish_reason: null
        }]),
        createChunk('chatcmpl-123', [{
            index: 0,
            delta: {
                tool_calls: [{ index: 0, function: { arguments: ' "1.log"}' } }]
            },
            finish_reason: null
        }]),
        createChunk('chatcmpl-123', [{ index: 0, delta: {}, finish_reason: 'tool_calls' }])
    ]

    const source = new Observable<Ast>(subscriber => {
        events.forEach(e => subscriber.next(e))
        subscriber.complete()
    })

    const result = await source.pipe(aggregateOpenAIStreamNative()).toPromise()

    expect(result).toEqual({
        id: 'chatcmpl-123',
        role: 'assistant',
        content: '',
        tool_calls: [{
            id: 'call_abc',
            type: 'function',
            function: {
                name: 'read_file',
                arguments: '{"path": "1.log"}'
            }
        }],
        finish_reason: 'tool_calls'
    })
  })

  it('should handle multiple tool calls', async () => {
    const events = [
        createChunk('chatcmpl-123', [{
            index: 0,
            delta: {
                role: 'assistant',
                tool_calls: [
                    { index: 0, id: 'call_1', type: 'function', function: { name: 'tool1', arguments: '' } },
                    { index: 1, id: 'call_2', type: 'function', function: { name: 'tool2', arguments: '' } }
                ]
            },
            finish_reason: null
        }]),
        createChunk('chatcmpl-123', [{
            index: 0,
            delta: {
                tool_calls: [
                    { index: 0, function: { arguments: '{"a":1}' } },
                    { index: 1, function: { arguments: '{"b":2}' } }
                ]
            },
            finish_reason: null
        }]),
        createChunk('chatcmpl-123', [{ index: 0, delta: {}, finish_reason: 'tool_calls' }])
    ]

    const source = new Observable<Ast>(subscriber => {
        events.forEach(e => subscriber.next(e))
        subscriber.complete()
    })

    const result = await source.pipe(aggregateOpenAIStreamNative()).toPromise()

    expect(result?.tool_calls).toHaveLength(2)
    expect(result?.tool_calls?.[0]).toEqual({
        id: 'call_1',
        type: 'function',
        function: { name: 'tool1', arguments: '{"a":1}' }
    })
    expect(result?.tool_calls?.[1]).toEqual({
        id: 'call_2',
        type: 'function',
        function: { name: 'tool2', arguments: '{"b":2}' }
    })
  })
})

function createChunk(id: string, choices: Array<{ index: number; delta: any; finish_reason: string | null }>): OpenAiResponseAst {
    const ast = new OpenAiResponseAst()
    ast.id = id
    ast.object = 'chat.completion.chunk'
    ast.created = Date.now()
    ast.model = 'gpt-4'
    ast.system_fingerprint = ''
    ast.usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
    ast.choices = choices
    return ast
}
