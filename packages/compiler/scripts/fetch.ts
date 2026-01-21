import { root } from '@sker/core'
import { ParserVisitor } from '../src'

async function main() {
    const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer sk-dffnwnzqutsirejrqkchbeszuabikgxzwrvicrbnwsnclzfp',
        },
        body: JSON.stringify({
            model: 'deepseek-ai/DeepSeek-V3.2',
            messages: [{ role: 'user', content: 'Hello World' }],
        }),
    })

    const visitor = root.get(ParserVisitor)
    const ast = await visitor.visitResponse(response)
    console.log({ ast })
}

main()
