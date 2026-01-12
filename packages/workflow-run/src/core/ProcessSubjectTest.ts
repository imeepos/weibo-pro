import { ProcessSubject } from './ProcessSubject.js'
const args = ['--output-format', 'stream-json', '--verbose']
args.push('--permission-prompt-tool', 'stdio')
args.push('--dangerously-skip-permissions')
const process$ = new ProcessSubject(`claude`, args)
process$.next(`hello world`)
process$.subscribe(console.log)
export { process$ }
