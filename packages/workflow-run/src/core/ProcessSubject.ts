import { spawn } from 'child_process'
import { from, Subject, fromEvent, Observable } from 'rxjs'
import { takeUntil, tap } from 'rxjs/operators'
import type { Subscriber, TeardownLogic } from 'rxjs'
import type { ChildProcessWithoutNullStreams } from 'child_process'
import { logger } from '@sker/core'

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
            shell: process.platform === 'win32',
            windowsHide: true
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

        // 创建增量解析的输出流
        this.output$ = new Observable<T>(subscriber => {
            const stdoutBuffer = new IncrementalJsonBuffer<T>('stdout', subscriber)
            const stderrBuffer = new IncrementalJsonBuffer<T>('stderr', subscriber)

            const stdoutHandler = (chunk: Buffer) => stdoutBuffer.append(chunk.toString())
            const stderrHandler = (chunk: Buffer) => stderrBuffer.append(chunk.toString())

            this.child.stdout.on('data', stdoutHandler)
            this.child.stderr.on('data', stderrHandler)

            const exitHandler = () => {
                stdoutBuffer.flush()
                stderrBuffer.flush()
                subscriber.complete()
            }

            this.child.once('exit', exitHandler)

            return () => {
                this.child.stdout.off('data', stdoutHandler)
                this.child.stderr.off('data', stderrHandler)
                this.child.off('exit', exitHandler)
            }
        }).pipe(takeUntil(exit$)) as Observable<T>
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
        const exitHandler = () => {
            setTimeout(() => {
                if (this.exitCode !== 0 && this.exitCode !== null) {
                    subscriber.error(new Error(`Process exited with code ${this.exitCode}`))
                } else {
                    subscriber.complete()
                }
            }, 0)
        }

        this.child.once('exit', exitHandler)

        const outputSubscription = this.output$.subscribe({
            next: (data: T) => subscriber.next(data),
            error: (err: unknown) => subscriber.error(err),
            complete: () => {}
        })

        return () => {
            this.child.off('exit', exitHandler)
            outputSubscription.unsubscribe()
        }
    }
}

/**
 * 增量 JSON 解析器
 *
 * 优雅设计：
 * - 累积未完成的 JSON 行
 * - 每次有新数据时尝试解析
 * - 只发出新解析的 JSON 对象
 * - stderr 只记录日志，不发出事件
 */
class IncrementalJsonBuffer<T> {
    private buffer = ''

    constructor(
        private readonly streamName: string,
        private readonly subscriber: Subscriber<any>
    ) {}

    append(chunk: string): void {
        this.buffer += chunk
        this.parse()
    }

    private parse(): void {
        const lines = this.buffer.split('\n')
        // 保留最后一个可能不完整的行
        this.buffer = lines.pop() || ''

        for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed) continue

            try {
                const parsed = JSON.parse(trimmed) as T
                // stdout 才发出事件，stderr 只记录日志
                if (this.streamName === 'stdout') {
                    this.subscriber.next(parsed)
                } else {
                    logger.warn(`[ProcessSubject] stderr JSON: ${JSON.stringify(parsed)}`)
                }
            } catch (err) {
                // JSON 解析失败时，发出原始文本
                this.subscriber.next(trimmed)
                // stderr 的非 JSON 输出记录为警告
                if (this.streamName === 'stderr') {
                    logger.warn(`[ProcessSubject] stderr: ${trimmed}`)
                } else {
                    logger.debug(`[ProcessSubject] stdout JSON 解析失败: ${trimmed}`)
                }
            }
        }
    }

    flush(): void {
        if (this.buffer.trim()) {
            this.parse()
            // 如果还有剩余的 buffer，尝试最后解析一次
            if (this.buffer.trim()) {
                try {
                    const parsed = JSON.parse(this.buffer.trim()) as T
                    if (this.streamName === 'stdout') {
                        this.subscriber.next(parsed)
                    }
                } catch (err) {
                    // JSON 解析失败时，发出原始文本
                    this.subscriber.next(this.buffer.trim())
                    if (this.streamName === 'stderr') {
                        logger.warn(`[ProcessSubject] stderr (剩余): ${this.buffer}`)
                    }
                }
            }
        }
    }
}
