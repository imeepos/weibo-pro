import { root } from '@sker/core'
import { ParserVisitor } from '../src'
import { Observable } from 'rxjs'

async function main() {
    const response = await fetch('https://api.siliconflow.cn/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': 'sk-dffnwnzqutsirejrqkchbeszuabikgxzwrvicrbnwsnclzfp',
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model: 'Pro/zai-org/GLM-4.7',
            max_tokens: 1024,
            messages: [{ role: 'user', content: 'Hello World' }],
            stream: true
        }),
    })

    const visitor = root.get(ParserVisitor)
    const result = await visitor.visitResponse(response)

    if (result instanceof Observable) {
        result.subscribe({
            next: (ast) => console.log(JSON.stringify(ast, null, 2)),
            error: (err) => console.error('Error:', err),
            complete: () => console.log('Stream completed')
        })
    } else {
        console.log(JSON.stringify(result, null, 2))
    }
}

main()
