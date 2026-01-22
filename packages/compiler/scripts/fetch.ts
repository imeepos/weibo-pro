import { tools } from '../src'
import { AgentRunner } from './agent-runner'
import { GoogleProvider } from './google-provider'

async function main() {
    const provider = new GoogleProvider('google/gemini-3-flash-preview')
    const runner = new AgentRunner(provider)

    await runner.run(
        '查看1.log文件的内容。请使用 read_file 工具来读取文件。',
        [tools.ReadFile]
    )
}

main()
