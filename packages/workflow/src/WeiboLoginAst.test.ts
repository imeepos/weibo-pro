import { describe, it, expect, beforeEach } from 'vitest'
import { root, Injectable, NoRetryError } from '@sker/core'
import { WeiboLoginAst } from '../ast'
import { Handler } from '../decorator'
import { Observable, of } from 'rxjs'
import { lastValueFrom } from 'rxjs'
import { type INode } from '../types'
import { Compiler } from '../compiler'

/**
 * WeiboLoginAstVisitor - 微博登录节点的访问器实现
 * 用于测试 WeiboLoginAst 节点的行为
 */
@Injectable()
class WeiboLoginAstVisitor {
    @Handler(WeiboLoginAst)
    visit(ast: WeiboLoginAst): Observable<INode> {
        return new Observable(obs => {
            // 模拟登录流程
            ast.state = 'running'
            obs.next({ ...ast })

            // 模拟生成二维码
            ast.qrcode = 'https://example.com/qrcode.png'
            ast.message = '请扫描二维码登录'
            obs.next({ ...ast })

            // 模拟登录成功
            const mockAccount = {
                id: '123456',
                screen_name: '测试用户',
                profile_url: 'https://weibo.com/test',
                avatar_hd: 'https://example.com/avatar.jpg',
                description: '测试账号',
                verified: false,
                verified_type: -1,
                followers_count: 100,
                friends_count: 50,
                statuses_count: 200,
                gender: 'm',
                location: '北京',
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z'
            } as any

            // 通过 BehaviorSubject 发射账户信息
            ast.account.next(mockAccount)
            obs.next({ ...ast })

            ast.state = 'success'
            obs.next({ ...ast })
            obs.complete()
        })
    }
}

/**
 * WeiboLoginAstFailingVisitor - 模拟登录失败的访问器
 */
@Injectable()
class WeiboLoginAstFailingVisitor {
    @Handler(WeiboLoginAst)
    visit(ast: WeiboLoginAst): Observable<INode> {
        return new Observable(obs => {
            ast.state = 'running'
            obs.next({ ...ast })

            ast.message = '登录失败：二维码过期'
            ast.state = 'fail'
            ast.error = {
                name: 'Error',
                message: '登录失败：二维码过期',
                stack: 'Error: 登录失败：二维码过期\n    at WeiboLoginAstFailingVisitor.visit'
            }
            obs.next({ ...ast })
            obs.complete()
        })
    }
}

/**
 * WeiboLoginAstNoRetryVisitor - 模拟不可重试错误的访问器
 */
@Injectable()
class WeiboLoginAstNoRetryVisitor {
    @Handler(WeiboLoginAst)
    visit(ast: WeiboLoginAst): Observable<INode> {
        return new Observable(obs => {
            ast.state = 'running'
            obs.next({ ...ast })

            ast.message = '登录失败：账号被封禁'
            ast.state = 'fail'
            ast.error = new NoRetryError('登录失败：账号被封禁')
            obs.next({ ...ast })
            obs.complete()
        })
    }
}

/**
 * 创建编译后的 WeiboLoginAst 测试节点
 */
function createCompiledNode(overrides?: Partial<WeiboLoginAst>): INode {
    const compiler = root.get(Compiler)
    const instance = new WeiboLoginAst()
    Object.assign(instance, overrides)
    return compiler.compile(instance)
}

/**
 * 获取最终结果
 */
function getFinal<T>(obs: Observable<T>): Promise<T> {
    return lastValueFrom(obs)
}

describe('WeiboLoginAst - 微博登录节点', () => {
    let visitor: WeiboLoginAstVisitor
    let failingVisitor: WeiboLoginAstFailingVisitor
    let noRetryVisitor: WeiboLoginAstNoRetryVisitor

    beforeEach(() => {
        visitor = root.get(WeiboLoginAstVisitor)
        failingVisitor = root.get(WeiboLoginAstFailingVisitor)
        noRetryVisitor = root.get(WeiboLoginAstNoRetryVisitor)
    })

    describe('节点定义', () => {
        it('应正确设置节点元数据', () => {
            const node = new WeiboLoginAst()

            expect(node.metadata.class.title).toBe('微博登录')
            expect(node.metadata.class.type).toBe('crawler')
            expect(node.metadata.inputs).toHaveLength(0) // 无输入
            expect(node.metadata.outputs).toHaveLength(1)
            expect(node.metadata.outputs[0].property).toBe('account')
            expect(node.metadata.states).toHaveLength(2)
            expect(node.metadata.states.map(s => s.property)).toContain('qrcode')
            expect(node.metadata.states.map(s => s.property)).toContain('message')
        })

        it('应正确配置错误策略', () => {
            const node = new WeiboLoginAst()

            expect(node.errorStrategy).toBe('abort')
            expect(node.maxRetries).toBe(2)
            expect(node.retryDelay).toBe(5000)
            expect(node.retryBackoff).toBe(1)
        })
    })

    describe('访问器行为', () => {
        it('应正确执行登录流程', async () => {
            const ast = new WeiboLoginAst()
            const compiledAst = createCompiledNode(ast)

            const result = await getFinal(visitor.visit(compiledAst as WeiboLoginAst))

            expect(result.state).toBe('success')
            expect((result as any).qrcode).toBe('https://example.com/qrcode.png')
            expect((result as any).message).toBe('请扫描二维码登录')

            // 验证 BehaviorSubject 发射了账户数据
            const account = await new Promise(resolve => {
                (result as any).account.subscribe(value => resolve(value))
            })

            expect(account).toEqual({
                id: '123456',
                screen_name: '测试用户',
                profile_url: 'https://weibo.com/test',
                avatar_hd: 'https://example.com/avatar.jpg',
                description: '测试账号',
                verified: false,
                verified_type: -1,
                followers_count: 100,
                friends_count: 50,
                statuses_count: 200,
                gender: 'm',
                location: '北京',
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z'
            })
        })

        it('应正确处理登录失败', async () => {
            const ast = new WeiboLoginAst()
            const compiledAst = createCompiledNode(ast)

            const result = await getFinal(failingVisitor.visit(compiledAst as WeiboLoginAst))

            expect(result.state).toBe('fail')
            expect((result as any).message).toBe('登录失败：二维码过期')
            expect(result.error).toBeDefined()
            expect(result.error?.message).toBe('登录失败：二维码过期')
        })

        it('应正确处理不可重试错误', async () => {
            const ast = new WeiboLoginAst()
            const compiledAst = createCompiledNode(ast)

            const result = await getFinal(noRetryVisitor.visit(compiledAst as WeiboLoginAst))

            expect(result.state).toBe('fail')
            expect((result as any).message).toBe('登录失败：账号被封禁')
            expect(result.error).toBeInstanceOf(NoRetryError)
            expect(result.error?.message).toBe('登录失败：账号被封禁')
        })

        it('应正确发射中间状态', async () => {
            const ast = new WeiboLoginAst()
            const compiledAst = createCompiledNode(ast)

            const states: INode[] = []
            const subscription = visitor.visit(compiledAst as WeiboLoginAst).subscribe(state => {
                states.push(state)
            })

            await new Promise(resolve => setTimeout(resolve, 10))

            expect(states).toHaveLength(4)
            expect(states[0].state).toBe('running')
            expect(states[1].state).toBe('running')
            expect(states[1].qrcode).toBe('https://example.com/qrcode.png')
            expect(states[1].message).toBe('请扫描二维码登录')
            expect(states[2].state).toBe('running')
            expect(states[3].state).toBe('success')

            subscription.unsubscribe()
        })
    })

    describe('数据流测试', () => {
        it('应正确处理 BehaviorSubject 的订阅', async () => {
            const ast = new WeiboLoginAst()
            const compiledAst = createCompiledNode(ast)

            const accountValues: any[] = []
            const subscription = (compiledAst as any).account.subscribe(value => {
                accountValues.push(value)
            })

            // 触发访问器，这会发射账户数据
            await getFinal(visitor.visit(compiledAst as WeiboLoginAst))

            await new Promise(resolve => setTimeout(resolve, 10))

            expect(accountValues).toHaveLength(2) // 初始 undefined + 登录成功后的账户数据
            expect(accountValues[0]).toBeUndefined()
            expect(accountValues[1]).toEqual({
                id: '123456',
                screen_name: '测试用户',
                profile_url: 'https://weibo.com/test',
                avatar_hd: 'https://example.com/avatar.jpg',
                description: '测试账号',
                verified: false,
                verified_type: -1,
                followers_count: 100,
                friends_count: 50,
                statuses_count: 200,
                gender: 'm',
                location: '北京',
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z'
            })

            subscription.unsubscribe()
        })
    })

    describe('错误恢复测试', () => {
        it('应正确处理多次失败后成功', async () => {
            // 这个测试验证节点可以被多次执行
            const ast = new WeiboLoginAst()
            const compiledAst = createCompiledNode(ast)

            // 第一次失败
            const failResult = await getFinal(failingVisitor.visit(compiledAst as WeiboLoginAst))
            expect(failResult.state).toBe('fail')

            // 重置状态后再次执行成功
            compiledAst.state = 'pending'
            compiledAst.error = undefined
            compiledAst.qrcode = undefined
            compiledAst.message = undefined

            const successResult = await getFinal(visitor.visit(compiledAst as WeiboLoginAst))
            expect(successResult.state).toBe('success')
            expect((successResult as any).qrcode).toBe('https://example.com/qrcode.png')
        })
    })

    describe('边界情况测试', () => {
        it('应正确处理空账户数据', async () => {
            const ast = new WeiboLoginAst()
            const compiledAst = createCompiledNode(ast)

            // 创建一个发射空账户的访问器
            const emptyVisitor = {
                visit: () => new Observable<INode>(obs => {
                    const node = { ...compiledAst }
                    node.state = 'running'
                    obs.next(node)

                    // 发射 undefined 账户
                    ;(node as any).account.next(undefined)
                    obs.next(node)

                    node.state = 'success'
                    obs.next(node)
                    obs.complete()
                })
            }

            const result = await getFinal(emptyVisitor.visit(compiledAst as WeiboLoginAst))

            expect(result.state).toBe('success')

            const account = await new Promise(resolve => {
                (result as any).account.subscribe(value => resolve(value))
            })

            expect(account).toBeUndefined()
        })

        it('应正确处理并发订阅', async () => {
            const ast = new WeiboLoginAst()
            const compiledAst = createCompiledNode(ast)

            const accountValues1: any[] = []
            const accountValues2: any[] = []

            const sub1 = (compiledAst as any).account.subscribe(value => {
                accountValues1.push(value)
            })

            const sub2 = (compiledAst as any).account.subscribe(value => {
                accountValues2.push(value)
            })

            await getFinal(visitor.visit(compiledAst as WeiboLoginAst))

            await new Promise(resolve => setTimeout(resolve, 10))

            // 两个订阅都应收到相同的数据
            expect(accountValues1).toEqual(accountValues2)
            expect(accountValues1).toHaveLength(2)
            expect(accountValues1[1]?.screen_name).toBe('测试用户')

            sub1.unsubscribe()
            sub2.unsubscribe()
        })
    })
})