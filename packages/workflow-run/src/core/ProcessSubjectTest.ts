import { ProcessSubject } from './ProcessSubject.js'
const args = ['--output-format', 'stream-json', '--verbose', '--permission-prompt-tool', 'stdio', '--dangerously-skip-permissions']
const process$ = new ProcessSubject(`claude`, args)
process$.next(`hello world`)
process$.subscribe(console.log)
export { process$ }
