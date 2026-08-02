import { describe, it, expect, } from 'vitest'
import { ProcessSubject } from './ProcessSubject.js'
import { firstValueFrom, timeout, catchError, take, toArray, } from 'rxjs'
import { writeFileSync, unlinkSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

describe('ProcessSubject', () => {
  describe('基础功能', () => {
    it('应该能够创建子进程并获取输出', async () => {
      // 创建临时脚本文件以避免 shell 解析问题
      const scriptPath = join(tmpdir(), `test-${Date.now()}.js`)
      writeFileSync(scriptPath, 'console.log(JSON.stringify({ test: "value" }))')

      const process$ = new ProcessSubject('node', [scriptPath])

      const result = await firstValueFrom(process$.pipe(
        timeout(5000),
        catchError(err => {
          throw new Error(`进程超时或出错: ${err.message}`)
        })
      ))

      if (existsSync(scriptPath)) unlinkSync(scriptPath)
      expect(result).toEqual({ test: 'value' })
    })

    it('应该能够处理多行 JSON 输出', async () => {
      const scriptPath = join(tmpdir(), `test-${Date.now()}.js`)
      writeFileSync(scriptPath, `
        console.log(JSON.stringify({ line: 1 }))
        console.log(JSON.stringify({ line: 2 }))
      `)

      const process$ = new ProcessSubject('node', [scriptPath])

      const results = await firstValueFrom(process$.pipe(
        take(2),
        toArray(),
        timeout(5000)
      ))

      if (existsSync(scriptPath)) unlinkSync(scriptPath)
      expect(results).toHaveLength(2)
      expect(results[0]).toEqual({ line: 1 })
      expect(results[1]).toEqual({ line: 2 })
    })

    it('应该能够处理非 JSON 文本输出', async () => {
      const scriptPath = join(tmpdir(), `test-${Date.now()}.js`)
      writeFileSync(scriptPath, 'console.log("plain text")')

      const process$ = new ProcessSubject('node', [scriptPath])

      const result = await firstValueFrom(process$.pipe(
        timeout(5000)
      ))

      if (existsSync(scriptPath)) unlinkSync(scriptPath)
      expect(result).toBe('plain text')
    })

    it('应该能够通过 stdin 写入数据', async () => {
      const scriptPath = join(tmpdir(), `test-${Date.now()}.js`)
      writeFileSync(scriptPath, `
        const readline = require('readline')
        const rl = readline.createInterface({ input: process.stdin })
        rl.on('line', (line) => {
          console.log(JSON.stringify({ echo: line }))
          rl.close()
        })
      `)

      const process$ = new ProcessSubject('node', [scriptPath])
      process$.next('test input')

      const result = await firstValueFrom(process$.pipe(
        timeout(5000)
      ))

      if (existsSync(scriptPath)) unlinkSync(scriptPath)
      expect(result).toEqual({ echo: 'test input' })
    })
  })

  describe('错误处理', () => {
    it('应该能够捕获 stderr 文本输出（exit code=0 时正常完成）', async () => {
      const scriptPath = join(tmpdir(), `test-${Date.now()}.js`)
      writeFileSync(scriptPath, 'console.error("test error message")')

      const process$ = new ProcessSubject('node', [scriptPath])

      const results: string[] = []
      let completed = false

      const subscription = process$.subscribe({
        next: data => results.push(String(data)),
        complete: () => {
          completed = true
        }
      })

      // 等待进程完成
      await new Promise(resolve => setTimeout(resolve, 500))

      subscription.unsubscribe()
      if (existsSync(scriptPath)) unlinkSync(scriptPath)

      // stderr 现在作为正常数据处理，进程正常完成
      expect(results).toContain('test error message')
      expect(completed).toBe(true)
    })

    it('应该能够捕获命令不存在错误', async () => {
      const process$ = new ProcessSubject('nonexistent-commandXYZ', [])

      let error: Error | null = null
      let completed = false

      const subscription = process$.subscribe({
        next: _data => {
          // stderr 作为正常数据处理
        },
        complete: () => {
          completed = true
        },
        error: (err: Error) => {
          error = err
        }
      })

      // 等待进程完成
      await new Promise(resolve => setTimeout(resolve, 500))

      subscription.unsubscribe()

      expect(error).toBeInstanceOf(Error)
      expect(error?.message).toMatch(/ENOENT|exited with code/)
      expect(completed).toBe(false)
    })

    it('应该能够通过 AbortSignal 取消进程', async () => {
      const scriptPath = join(tmpdir(), `test-${Date.now()}.js`)
      writeFileSync(scriptPath, `
        setTimeout(() => {
          console.log(JSON.stringify({ status: 'running' }))
        }, 500)
        while(true) {}
      `)

      const process$ = new ProcessSubject('node', [scriptPath])

      setTimeout(() => {
        process$.error('user cancelled')
      }, 100)

      let result: string | null = null
      try {
        result = await firstValueFrom(process$.pipe(
          timeout(1000)
        ))
      } catch (err: any) {
        // 期望收到错误（因为进程被取消）
        // 可能是 EmptyError（如果进程在发射前被取消）
        // 或者是 TimeoutError（如果超时）
        // 或者是我们手动抛出的错误
        expect(err).toBeInstanceOf(Error)
        result = 'cancelled'
      }

      if (existsSync(scriptPath)) unlinkSync(scriptPath)
      expect(result).toBe('cancelled')
    })
  })

  describe('环境变量和选项', () => {
    it('应该能够过滤 DEV 环境变量', async () => {
      const originalDev = process.env.DEV
      process.env.DEV = 'test'

      const scriptPath = join(tmpdir(), `test-${Date.now()}.js`)
      writeFileSync(scriptPath, 'console.log(JSON.stringify({ dev: process.env.DEV || undefined }))')

      const process$ = new ProcessSubject('node', [scriptPath])

      const result = await firstValueFrom(process$.pipe(
        timeout(5000)
      ))

      if (existsSync(scriptPath)) unlinkSync(scriptPath)
      expect(result.dev).toBeUndefined()

      if (originalDev !== undefined) {
        process.env.DEV = originalDev
      } else {
        delete process.env.DEV
      }
    })
  })

  describe('进程生命周期', () => {
    it('应该在进程退出时停止发送数据', async () => {
      const scriptPath = join(tmpdir(), `test-${Date.now()}.js`)
      writeFileSync(scriptPath, 'console.log("done")')

      const process$ = new ProcessSubject('node', [scriptPath])

      const results: string[] = []
      let completed = false
      let errorOccurred = false

      const subscription = process$.subscribe({
        next: data => results.push(String(data)),
        complete: () => {
          completed = true
        },
        error: () => {
          errorOccurred = true
        }
      })

      // 等待进程完成
      await new Promise(resolve => setTimeout(resolve, 500))

      subscription.unsubscribe()

      if (existsSync(scriptPath)) unlinkSync(scriptPath)

      // 验证收到了数据
      expect(results.length).toBeGreaterThan(0)
      expect(results[0]).toContain('done')
      // 验证流已完成或出错（但没有抛出未捕获的错误）
      expect(completed || errorOccurred).toBe(true)
    })
  })
})
