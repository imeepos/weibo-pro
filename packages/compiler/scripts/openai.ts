import { tools } from '../src'
import { AgentRunner } from './agent-runner'
import { OpenAIProvider } from './openai-provider'

async function main() {
    const provider = new OpenAIProvider(
        'sk-dffnwnzqutsirejrqkchbeszuabikgxzwrvicrbnwsnclzfp',
        'Pro/zai-org/GLM-4.7'
    )

    const runner = new AgentRunner(provider)

    await runner.run(
        '查看1.log文件的内容。请使用 read_file 工具来读取文件。',
        [tools.ReadFile]
    )
}

main()
