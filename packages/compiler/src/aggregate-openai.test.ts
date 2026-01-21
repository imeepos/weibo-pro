import { describe, it, expect } from 'vitest'
import { Observable } from 'rxjs'
import { aggregateOpenAIStream, OpenAIMessageStartAst, OpenAIContentBlockStartAst, OpenAIContentBlockDeltaAst, OpenAIContentBlockStopAst, OpenAIMessageDeltaAst, OpenAIMessageStopAst, OpenAIMessage } from './aggregate-openai'
import { Ast } from './ast'

describe('aggregate-openai', () => {
  describe('aggregateOpenAIStream', () => {
    it('should aggregate text content from stream', async () => {
      const messageStart = new OpenAIMessageStartAst()
      messageStart.type = 'message_start'
      messageStart.message = {
        id: 'msg-1',
        role: 'assistant',
        content: [],
        usage: { output_tokens: 0 }
      }

      const blockStart = new OpenAIContentBlockStartAst()
      blockStart.type = 'content_block_start'
      blockStart.index = 0
      blockStart.content_block = { type: 'text', text: '' }

      const delta1 = new OpenAIContentBlockDeltaAst()
      delta1.type = 'content_block_delta'
      delta1.index = 0
      delta1.delta = { type: 'text', text: 'Hello' }

      const delta2 = new OpenAIContentBlockDeltaAst()
      delta2.type = 'content_block_delta'
      delta2.index = 0
      delta2.delta = { type: 'text', text: ' World' }

      const blockStop = new OpenAIContentBlockStopAst()
      blockStop.type = 'content_block_stop'
      blockStop.index = 0

      const msgDelta = new OpenAIMessageDeltaAst()
      msgDelta.type = 'message_delta'
      msgDelta.delta = {}
      msgDelta.usage = { output_tokens: 5 }

      const msgStop = new OpenAIMessageStopAst()
      msgStop.type = 'message_stop'

      const events: Ast[] = [messageStart as any, blockStart as any, delta1 as any, delta2 as any, blockStop as any, msgDelta as any, msgStop as any]

      const source = new Observable<Ast>(subscriber => {
        events.forEach(e => subscriber.next(e))
        subscriber.complete()
      })

      const result = await source.pipe(aggregateOpenAIStream()).toPromise()

      expect(result).toEqual({
        id: 'msg-1',
        role: 'assistant',
        content: [
          { type: 'text', text: 'Hello World' }
        ],
        usage: { output_tokens: 5 }
      })
    })

    it('should aggregate tool calls from stream', async () => {
      const messageStart = new OpenAIMessageStartAst()
      messageStart.type = 'message_start'
      messageStart.message = {
        id: 'msg-2',
        role: 'assistant',
        content: [],
        usage: { output_tokens: 0 }
      }

      const blockStart = new OpenAIContentBlockStartAst()
      blockStart.type = 'content_block_start'
      blockStart.index = 0
      blockStart.content_block = { type: 'tool_use', id: 'call-1', name: 'search' }

      const delta1 = new OpenAIContentBlockDeltaAst()
      delta1.type = 'content_block_delta'
      delta1.index = 0
      delta1.delta = { type: 'input_json_delta', partial_json: '{"q": "' }

      const delta2 = new OpenAIContentBlockDeltaAst()
      delta2.type = 'content_block_delta'
      delta2.index = 0
      delta2.delta = { type: 'input_json_delta', partial_json: 'test"}' }

      const blockStop = new OpenAIContentBlockStopAst()
      blockStop.type = 'content_block_stop'
      blockStop.index = 0

      const msgDelta = new OpenAIMessageDeltaAst()
      msgDelta.type = 'message_delta'
      msgDelta.delta = {}
      msgDelta.usage = { output_tokens: 10 }

      const msgStop = new OpenAIMessageStopAst()
      msgStop.type = 'message_stop'

      const events: Ast[] = [messageStart as any, blockStart as any, delta1 as any, delta2 as any, blockStop as any, msgDelta as any, msgStop as any]

      const source = new Observable<Ast>(subscriber => {
        events.forEach(e => subscriber.next(e))
        subscriber.complete()
      })

      const result = await source.pipe(aggregateOpenAIStream()).toPromise()

      expect(result).toEqual({
        id: 'msg-2',
        role: 'assistant',
        content: [
          {
            type: 'tool_use',
            id: 'call-1',
            name: 'search',
            input: { q: 'test' }
          }
        ],
        usage: { output_tokens: 10 }
      })
    })

    it('should handle mixed text and tool calls', async () => {
      const messageStart = new OpenAIMessageStartAst()
      messageStart.type = 'message_start'
      messageStart.message = {
        id: 'msg-3',
        role: 'assistant',
        content: [],
        usage: { output_tokens: 0 }
      }

      const textBlockStart = new OpenAIContentBlockStartAst()
      textBlockStart.type = 'content_block_start'
      textBlockStart.index = 0
      textBlockStart.content_block = { type: 'text', text: '' }

      const textDelta = new OpenAIContentBlockDeltaAst()
      textDelta.type = 'content_block_delta'
      textDelta.index = 0
      textDelta.delta = { type: 'text', text: 'Searching...' }

      const textBlockStop = new OpenAIContentBlockStopAst()
      textBlockStop.type = 'content_block_stop'
      textBlockStop.index = 0

      const toolBlockStart = new OpenAIContentBlockStartAst()
      toolBlockStart.type = 'content_block_start'
      toolBlockStart.index = 1
      toolBlockStart.content_block = { type: 'tool_use', id: 'call-2', name: 'search' }

      const toolDelta = new OpenAIContentBlockDeltaAst()
      toolDelta.type = 'content_block_delta'
      toolDelta.index = 1
      toolDelta.delta = { type: 'input_json_delta', partial_json: '{}' }

      const toolBlockStop = new OpenAIContentBlockStopAst()
      toolBlockStop.type = 'content_block_stop'
      toolBlockStop.index = 1

      const msgDelta = new OpenAIMessageDeltaAst()
      msgDelta.type = 'message_delta'
      msgDelta.delta = {}
      msgDelta.usage = { output_tokens: 15 }

      const msgStop = new OpenAIMessageStopAst()
      msgStop.type = 'message_stop'

      const events: Ast[] = [
        messageStart as any,
        textBlockStart as any,
        textDelta as any,
        textBlockStop as any,
        toolBlockStart as any,
        toolDelta as any,
        toolBlockStop as any,
        msgDelta as any,
        msgStop as any
      ]

      const source = new Observable<Ast>(subscriber => {
        events.forEach(e => subscriber.next(e))
        subscriber.complete()
      })

      const result = await source.pipe(aggregateOpenAIStream()).toPromise()

      expect(result).toEqual({
        id: 'msg-3',
        role: 'assistant',
        content: [
          { type: 'text', text: 'Searching...' },
          { type: 'tool_use', id: 'call-2', name: 'search', input: {} }
        ],
        usage: { output_tokens: 15 }
      })
    })

    it('should handle incomplete JSON gracefully', async () => {
      const messageStart = new OpenAIMessageStartAst()
      messageStart.type = 'message_start'
      messageStart.message = {
        id: 'msg-4',
        role: 'assistant',
        content: [],
        usage: { output_tokens: 0 }
      }

      const blockStart = new OpenAIContentBlockStartAst()
      blockStart.type = 'content_block_start'
      blockStart.index = 0
      blockStart.content_block = { type: 'tool_use', id: 'call-3', name: 'test' }

      const delta = new OpenAIContentBlockDeltaAst()
      delta.type = 'content_block_delta'
      delta.index = 0
      delta.delta = { type: 'input_json_delta', partial_json: 'incomplete' }

      const blockStop = new OpenAIContentBlockStopAst()
      blockStop.type = 'content_block_stop'
      blockStop.index = 0

      const msgDelta = new OpenAIMessageDeltaAst()
      msgDelta.type = 'message_delta'
      msgDelta.delta = {}
      msgDelta.usage = { output_tokens: 5 }

      const msgStop = new OpenAIMessageStopAst()
      msgStop.type = 'message_stop'

      const events: Ast[] = [messageStart as any, blockStart as any, delta as any, blockStop as any, msgDelta as any, msgStop as any]

      const source = new Observable<Ast>(subscriber => {
        events.forEach(e => subscriber.next(e))
        subscriber.complete()
      })

      const result = await source.pipe(aggregateOpenAIStream()).toPromise()

      expect(result?.content[0]).toEqual({
        type: 'tool_use',
        id: 'call-3',
        name: 'test',
        input: {}
      })
    })
  })
})
