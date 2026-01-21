import { spawn } from 'child_process'


const stream = spawn(`claude`, ['--output-format', 'stream-json', '--verbose', '--permission-prompt-tool', 'stdio', '--dangerously-skip-permissions'], {
    cwd: process.cwd(),
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true
})

stream.stdin.write(``)
stream.stdin.end()