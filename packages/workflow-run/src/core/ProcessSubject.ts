import { spawn } from 'child_process'
import { from, Subject, merge, fromEvent, throwError, EMPTY } from 'rxjs'
import { map, takeUntil, mergeMap, filter } from 'rxjs/operators'
import type { Subscriber, TeardownLogic } from 'rxjs'
import type { ChildProcessWithoutNullStreams, SpawnOptionsWithoutStdio } from 'child_process'
import { Observable } from '@sker/core'
import { writeFileSync } from 'fs'
export class ProcessSubject<T = string> extends Subject<string> {
    readonly output$: Observable<T>
    readonly signal: AbortSignal
    readonly child: ChildProcessWithoutNullStreams
    private readonly controller: AbortController

    constructor(
        cmd: string,
        args: string[],
    ) {
        super()
        this.controller = new AbortController()
        this.signal = this.controller.signal
        const env = process.env;
        const { DEV, ...otherEnv} = env;
        writeFileSync(`1.json`, JSON.stringify({
            cwd: process.cwd(),
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
                ...otherEnv
            },
            signal: this.signal,
            shell: process.platform === 'win32'
        }))

        this.child = spawn(cmd, args, {
            cwd: process.cwd(),
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
                ...otherEnv
            },
            signal: this.signal,
            shell: process.platform === 'win32'
        })
        const exit$ = merge(
            fromEvent(this.child, 'exit'),
            fromEvent(this.child, 'error')
        )
        const stdout$ = from(this.child.stdout).pipe(
            map(b => this.parseOutput<T>(b.toString()))
        )
        const stderr$ = from(this.child.stderr).pipe(
            map(b => this.parseOutput<T>(b.toString())),
            mergeMap(data => {
                if (data === null) return EMPTY
                return throwError(() => data instanceof Error ? data : new Error(String(data)))
            })
        )
        this.output$ = merge(stdout$, stderr$).pipe(
            filter((data): data is T => data !== null),
            takeUntil(exit$)
        ) as Observable<T>
    }

    private parseOutput<T>(data: string): T | null {
        const trimmed = data.trim()
        if (!trimmed) return null
        try {
            return JSON.parse(trimmed) as T
        } catch {
            return trimmed as unknown as T
        }
    }

    next(value: string): void {
        this.child.stdin.write(value + '\n')
        this.child.stdin.end()
    }

    error(err: any): void {
        this.controller.abort(err)
        super.error(err)
    }

    complete(): void {
        this.controller.abort()
        super.complete()
    }

    protected _subscribe(subscriber: Subscriber<T>): TeardownLogic {
        return this.output$.subscribe(subscriber)
    }
}
