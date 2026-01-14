import { spawn } from 'child_process'
import { from, Subject, merge, fromEvent } from 'rxjs'
import { map, takeUntil, filter } from 'rxjs/operators'
import type { Subscriber, TeardownLogic } from 'rxjs'
import type { ChildProcessWithoutNullStreams, SpawnOptionsWithoutStdio } from 'child_process'
import { Observable, logger } from '@sker/core'

export class ProcessSubject<T = string> extends Subject<string> {
    readonly output$: Observable<T>
    readonly signal: AbortSignal
    readonly child: ChildProcessWithoutNullStreams
    private readonly controller: AbortController
    private exitCode: number | null = null

    constructor(
        cmd: string,
        args: string[],
    ) {
        super()
        this.controller = new AbortController()
        this.signal = this.controller.signal
        const env = process.env
        const { DEV, ...otherEnv } = env

        logger.info(`[ProcessSubject] 启动子进程: ${cmd} ${args.join(' ')}`)

        this.child = spawn(cmd, args, {
            cwd: process.cwd(),
            stdio: ['pipe', 'pipe', 'pipe'],
            env: otherEnv,
            signal: this.signal,
            shell: process.platform === 'win32'
        })

        this.child.on('error', (err) => {
            logger.error(`[ProcessSubject] 子进程错误: ${cmd} ${args.join(' ')}`, err)
        })

        this.child.on('exit', (code, signal) => {
            this.exitCode = code
            if (code !== 0 && code !== null) {
                logger.error(`[ProcessSubject] 子进程异常退出: ${cmd} ${args.join(' ')}, code: ${code}, signal: ${signal}`)
                this.error(new Error(`Process exited with code ${code}`))
            } else {
                logger.info(`[ProcessSubject] 子进程退出: ${cmd} ${args.join(' ')}, code: ${code}, signal: ${signal}`)
                this.complete()
            }
        })

        // exit$ 用于在进程退出时停止输出流
        const exit$ = fromEvent(this.child, 'exit')
        const stdout$ = from(this.child.stdout).pipe(
            map(b => this.parseOutput<T>(b.toString()))
        )
        const stderr$ = from(this.child.stderr).pipe(
            map(b => {
                const parsed = this.parseOutput<T>(b.toString())
                if (parsed !== null) {
                    logger.warn(`[ProcessSubject] stderr: ${String(parsed)}`)
                }
                return parsed
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
        } catch (err) {
            logger.debug(`[ProcessSubject] JSON 解析失败，返回原始字符串: ${trimmed}`)
            return trimmed as unknown as T
        }
    }

    next(value: string): void {
        this.child.stdin.write(value + '\n')
        this.child.stdin.end()
    }

    error(err: any): void {
        logger.error(`[ProcessSubject] Subject error:`, err)
        this.controller.abort(err)
        super.error(err)
    }

    complete(): void {
        logger.debug(`[ProcessSubject] Subject complete`)
        this.controller.abort()
        super.complete()
    }

    protected _subscribe(subscriber: Subscriber<T>): TeardownLogic {
        // 监听 exit 事件，在进程退出后决定发送 error 还是 complete
        const exitHandler = () => {
            // 使用 setTimeout 确保 exitCode 已经被设置
            setTimeout(() => {
                if (this.exitCode !== 0 && this.exitCode !== null) {
                    subscriber.error(new Error(`Process exited with code ${this.exitCode}`))
                } else {
                    subscriber.complete()
                }
            }, 0)
        }

        this.child.once('exit', exitHandler)

        // 订阅输出流
        const outputSubscription = this.output$.subscribe({
            next: (data) => subscriber.next(data),
            error: (err) => subscriber.error(err),
            complete: () => {
                // output$ 完成时不做任何处理，等待 exit 事件处理
            }
        })

        return () => {
            this.child.off('exit', exitHandler)
            outputSubscription.unsubscribe()
        }
    }
}
