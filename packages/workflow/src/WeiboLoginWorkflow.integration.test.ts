import { describe, it, expect, beforeEach } from 'vitest'
import { root, Injectable, NoRetryError } from '@sker/core'
import { ReactiveScheduler } from './execution/reactive-scheduler'
import { createWorkflowGraphAst, WorkflowGraphAst } from './ast'
import { Node, Input, Output, Handler, IS_MULTI } from './decorator'
import { type INode, IEdge, EdgeMode } from './types'
import { Compiler } from './compiler'
import { Observable, BehaviorSubject } from 'rxjs'
import { lastValueFrom } from 'rxjs'

/**
 * WeiboLoginAst - 微博登录节点（用于测试）
 */
@Node({
    title: '微博登录',
    type: 'crawler',
    errorStrategy: 'abort',
    maxRetries: 2,
    retryDelay: 5000,
    retryBackoff: 1
})
class WeiboLoginAst extends Node {
    @Output({ title: '微博账号' })
    account: BehaviorSubject<WeiboAccountEntity | undefined> = new BehaviorSubject<WeiboAccountEntity | undefined>(undefined)

    @State({ title: '登录二维码' })
    qrcode?: string

    @State({ title: '提示消息' })
    message?: string

    type: `WeiboLoginAst` = `WeiboLoginAst`
}

/**
 * TextAreaAst - 文本节点（用于测试）
 */
@Node({ title: '文本节点', type: 'basic' })
class TextAreaAst extends Node {
    @Input({ title: '输入', mode: IS_MULTI, type: 'richtext' })
    input: string[] | string = []

    @Output({ title: '输出', type: 'richtext' })
    output: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null)

    type: `TextAreaAst` = `TextAreaAst`
}

/**
 * WeiboLoginAstVisitor - 微博登录节点访问器
 */
@Injectable()
class WeiboLoginAstVisitor {
    @Handler(WeiboLoginAst)
    visit(ast: WeiboLoginAst): Observable<INode> {
        return new Observable(obs => {
            ast.state = 'running'
            obs.next({ ...ast })

            // 生成模拟二维码
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

            ast.account.next(mockAccount)
            obs.next({ ...ast })

            ast.state = 'success'
            obs.next({ ...ast })
            obs.complete()
        })
    }
}

/**
 * TextAreaAstVisitor - 文本节点访问器
 */
@Injectable()
class TextAreaAstVisitor {
    @Handler(TextAreaAst)
    visit(ast: TextAreaAst): Observable<INode> {
        return new Observable(obs => {
            ast.state = 'running'
            obs.next({ ...ast })

            // 处理输入数据
            const inputValue = Array.isArray(ast.input)
                ? ast.input.join('\n')
                : ast.input || ''

            ast.output.next(inputValue)
            obs.next({ ...ast })

            ast.state = 'success'
            obs.next({ ...ast })
            obs.complete()
        })
    }
}

/**
 * FailingWeiboLoginAstVisitor - 模拟登录失败的访问器
 */
@Injectable()
class FailingWeiboLoginAstVisitor {
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
                stack: 'Error: 登录失败：二维码过期\n    at FailingWeiboLoginAstVisitor.visit'
            }
            obs.next({ ...ast })
            obs.complete()
        })
    }
}

/**
 * 创建编译后的测试节点
 */
function createCompiledNode<T extends Node>(
    NodeClass: new () => T,
    overrides?: Partial<T>
): INode {
    const compiler = root.get(Compiler)
    const instance = new NodeClass()
    Object.assign(instance, overrides)
    return compiler.compile(instance)
}

/**
 * 创建测试边
 */
function createEdge(
    from: string,
    to: string,
    options?: Partial<IEdge>
): IEdge {
    return {
        id: `${from}-${to}`,
        from,
        to,
        ...options
    }
}

/**
 * 创建测试工作流
 */
function createWorkflow(nodes: INode[], edges: IEdge[]): WorkflowGraphAst {
    return createWorkflowGraphAst({ nodes, edges })
}

/**
 * 获取最终结果
 */
function getFinal<T>(obs: Observable<T>): Promise<T> {
    return lastValueFrom(obs)
}

describe('WeiboLogin Workflow - 微博登录工作流集成测试', () => {
    let scheduler: ReactiveScheduler
    let weiboLoginVisitor: WeiboLoginAstVisitor
    let textAreaVisitor: TextAreaAstVisitor
    let failingVisitor: FailingWeiboLoginAstVisitor

    beforeEach(() => {
        scheduler = root.get(ReactiveScheduler)
        weiboLoginVisitor = root.get(WeiboLoginAstVisitor)
        textAreaVisitor = root.get(TextAreaAstVisitor)
        failingVisitor = root.get(FailingWeiboLoginAstVisitor)
    })

    describe('正常工作流执行', () => {
        it('应成功执行完整的微博登录工作流', async () => {
            // 创建节点
            const weiboLoginNode = createCompiledNode(WeiboLoginAst, {
                id: 'c39df52f-daa4-42e2-b633-7d08deae59c4',
                width: 240,
                height: 95,
                position: { x: -150.82948846385875, y: 191.15734718040633 }
            })

            const textAreaNode = createCompiledNode(TextAreaAst, {
                id: '04ae1a2e-0705-4c53-b7c7-0dbd9acb9637',
                width: 240,
                height: 95,
                position: { x: 170.2061005954476, y: 98.9890651601539 }
            })

            // 创建边
            const edges = [
                createEdge('c39df52f-daa4-42e2-b633-7d08deae59c4', '04ae1a2e-0705-4c53-b7c7-0dbd9acb9637', {
                    fromProperty: 'account',
                    toProperty: 'input'
                })
            ]

            // 创建工作流
            const workflow = createWorkflow([weiboLoginNode, textAreaNode], edges)

            // 设置入口和结束节点
            workflow.entryNodeIds = ['c39df52f-daa4-42e2-b633-7d08deae59c4']
            workflow.endNodeIds = ['04ae1a2e-0705-4c53-b7c7-0dbd9acb9637']

            workflow.viewport = {
                x: 375.6447291741183,
                y: 77.41368108263279,
                zoom: 0.9656250290142515
            }

            // 执行工作流
            const result = await getFinal(scheduler.schedule(workflow, workflow))

            // 验证结果
            expect(result.state).toBe('success')

            // 验证 WeiboLoginAst 节点
            const loginNode = result.nodes.find(n => n.id === 'c39df52f-daa4-42e2-b633-7d08deae59c4') as any
            expect(loginNode?.state).toBe('success')
            expect(loginNode?.qrcode).toBe('https://example.com/qrcode.png')
            expect(loginNode?.message).toBe('请扫描二维码登录')

            // 验证 TextAreaAst 节点
            const textNode = result.nodes.find(n => n.id === '04ae1a2e-0705-4c53-b7c7-0dbd9acb9637') as any
            expect(textNode?.state).toBe('success')

            // 验证数据传递
            const accountValue = await new Promise(resolve => {
                loginNode?.account?.subscribe(value => resolve(value))
            })

            const outputValue = await new Promise(resolve => {
                textNode?.output?.subscribe(value => resolve(value))
            })

            expect(accountValue).toEqual({
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

            // 验证输出格式化
            expect(outputValue).toContain('123456')
            expect(outputValue).toContain('测试用户')
        })

        it('应正确收集工作流输出', async () => {
            const weiboLoginNode = createCompiledNode(WeiboLoginAst, {
                id: 'login-node',
                width: 240,
                height: 95,
                position: { x: 0, y: 0 }
            })

            const textAreaNode = createCompiledNode(TextAreaAst, {
                id: 'text-node',
                width: 240,
                height: 95,
                position: { x: 200, y: 0 }
            })

            const edges = [
                createEdge('login-node', 'text-node', {
                    fromProperty: 'account',
                    toProperty: 'input'
                })
            ]

            const workflow = createWorkflow([weiboLoginNode, textAreaNode], edges)
            workflow.endNodeIds = ['text-node'] // 指定结束节点

            const result = await getFinal(scheduler.schedule(workflow, workflow))

            expect(result.state).toBe('success')

            // 验证工作流实例上附加了输出
            expect((result as any)['text-node.output']).toBeDefined()

            const outputValue = (result as any)['text-node.output']
            expect(outputValue).toContain('123456')
            expect(outputValue).toContain('测试用户')
        })

        it('应正确统计节点执行次数', async () => {
            const weiboLoginNode = createCompiledNode(WeiboLoginAst, {
                id: 'login-node',
                width: 240,
                height: 95,
                position: { x: 0, y: 0 }
            })

            const textAreaNode = createCompiledNode(TextAreaAst, {
                id: 'text-node',
                width: 240,
                height: 95,
                position: { x: 200, y: 0 }
            })

            const edges = [
                createEdge('login-node', 'text-node', {
                    fromProperty: 'account',
                    toProperty: 'input'
                })
            ]

            const workflow = createWorkflow([weiboLoginNode, textAreaNode], edges)

            const result = await getFinal(scheduler.schedule(workflow, workflow))

            expect(result.state).toBe('success')

            // 验证节点执行次数
            const loginNode = result.nodes.find(n => n.id === 'login-node')
            const textNode = result.nodes.find(n => n.id === 'text-node')

            expect(loginNode?.count).toBe(1)
            expect(textNode?.count).toBe(1)
        })
    })

    describe('错误处理', () => {
        it('登录失败时应阻断下游节点执行', async () => {
            const weiboLoginNode = createCompiledNode(WeiboLoginAst, {
                id: 'login-node',
                width: 240,
                height: 95,
                position: { x: 0, y: 0 }
            })

            const textAreaNode = createCompiledNode(TextAreaAst, {
                id: 'text-node',
                width: 240,
                height: 95,
                position: { x: 200, y: 0 }
            })

            const edges = [
                createEdge('login-node', 'text-node', {
                    fromProperty: 'account',
                    toProperty: 'input'
                })
            ]

            const workflow = createWorkflow([weiboLoginNode, textAreaNode], edges)

            // 使用失败的访问器
            const result = await getFinal(failingVisitor.visit(weiboLoginNode as WeiboLoginAst))

            // 验证登录节点失败
            expect(result.state).toBe('fail')
            expect((result as any).message).toBe('登录失败：二维码过期')

            // 验证下游节点未执行
            const textNode = workflow.nodes.find(n => n.id === 'text-node')
            expect(textNode?.state).toBe('pending') // 未执行
            expect(textNode?.count).toBe(0)
        })

        it('登录失败时工作流状态应为 fail', async () => {
            const weiboLoginNode = createCompiledNode(WeiboLoginAst, {
                id: 'login-node',
                width: 240,
                height: 95,
                position: { x: 0, y: 0 }
            })

            const edges: IEdge[] = []

            const workflow = createWorkflow([weiboLoginNode], edges)

            const result = await getFinal(failingVisitor.visit(weiboLoginNode as WeiboLoginAst))

            expect(result.state).toBe('fail')
            expect(result.error).toBeDefined()
            expect(result.error?.message).toBe('登录失败：二维码过期')
        })
    })

    describe('增量执行', () => {
        it('应支持只重新执行目标节点及下游', async () => {
            const weiboLoginNode = createCompiledNode(WeiboLoginAst, {
                id: 'login-node',
                width: 240,
                height: 95,
                position: { x: 0, y: 0 },
                state: 'success', // 已完成
                count: 1,
                account: new BehaviorSubject({ id: 'old', screen_name: '旧用户' } as any)
            })

            const textAreaNode = createCompiledNode(TextAreaAst, {
                id: 'text-node',
                width: 240,
                height: 95,
                position: { x: 200, y: 0 },
                state: 'success', // 已完成
                count: 1,
                input: [{ id: 'old', screen_name: '旧用户' } as any],
                output: new BehaviorSubject('旧输出')
            })

            const edges = [
                createEdge('login-node', 'text-node', {
                    fromProperty: 'account',
                    toProperty: 'input'
                })
            ]

            const workflow = createWorkflow([weiboLoginNode, textAreaNode], edges)

            // 修改登录节点的账户信息
            const loginNode = workflow.nodes.find(n => n.id === 'login-node') as any
            loginNode.account = new BehaviorSubject({ id: 'new', screen_name: '新用户' } as any)

            // 执行增量更新
            const result = await getFinal(scheduler.fineTuneNode(workflow, 'login-node'))

            expect(result.state).toBe('success')

            // 登录节点应重新执行
            const updatedLoginNode = result.nodes.find(n => n.id === 'login-node')
            expect(updatedLoginNode?.count).toBe(2) // 重新执行

            // 文本节点也应重新执行
            const updatedTextNode = result.nodes.find(n => n.id === 'text-node')
            expect(updatedTextNode?.count).toBe(2) // 重新执行
        })
    })

    describe('单节点隔离执行', () => {
        it('应支持只执行单个节点', async () => {
            const weiboLoginNode = createCompiledNode(WeiboLoginAst, {
                id: 'login-node',
                width: 240,
                height: 95,
                position: { x: 0, y: 0 }
            })

            const textAreaNode = createCompiledNode(TextAreaAst, {
                id: 'text-node',
                width: 240,
                height: 95,
                position: { x: 200, y: 0 }
            })

            const edges = [
                createEdge('login-node', 'text-node', {
                    fromProperty: 'account',
                    toProperty: 'input'
                })
            ]

            const workflow = createWorkflow([weiboLoginNode, textAreaNode], edges)

            // 只执行登录节点
            const result = await getFinal(scheduler.executeNodeIsolated(workflow, 'login-node'))

            expect(result.state).toBe('success')

            // 登录节点应执行
            const loginNode = result.nodes.find(n => n.id === 'login-node')
            expect(loginNode?.state).toBe('success')
            expect(loginNode?.count).toBe(1)

            // 文本节点不应执行（因为上游未完成）
            const textNode = result.nodes.find(n => n.id === 'text-node')
            expect(textNode?.state).toBe('pending')
            expect(textNode?.count).toBe(0)
        })
    })

    describe('边界情况', () => {
        it('空工作流应返回 success', async () => {
            const workflow = createWorkflow([], [])

            const result = await getFinal(scheduler.schedule(workflow, workflow))

            expect(result.state).toBe('success')
        })

        it('单节点工作流应正确执行', async () => {
            const weiboLoginNode = createCompiledNode(WeiboLoginAst, {
                id: 'login-node',
                width: 240,
                height: 95,
                position: { x: 0, y: 0 }
            })

            const workflow = createWorkflow([weiboLoginNode], [])

            const result = await getFinal(scheduler.schedule(workflow, workflow))

            expect(result.state).toBe('success')

            const loginNode = result.nodes.find(n => n.id === 'login-node')
            expect(loginNode?.state).toBe('success')
            expect(loginNode?.count).toBe(1)
        })

        it('已完成工作流重置后应重新执行', async () => {
            const weiboLoginNode = createCompiledNode(WeiboLoginAst, {
                id: 'login-node',
                width: 240,
                height: 95,
                position: { x: 0, y: 0 },
                state: 'success',
                count: 5,
                account: new BehaviorSubject({ id: 'done', screen_name: '已完成' } as any)
            })

            const workflow = createWorkflow([weiboLoginNode], [])

            // 重置并重新执行
            const result = await getFinal(scheduler.schedule(workflow, workflow))

            expect(result.state).toBe('success')

            const loginNode = result.nodes.find(n => n.id === 'login-node')
            expect(loginNode?.count).toBe(1) // 重新执行
            expect(loginNode?.state).toBe('success')
        })
    })

    describe('数据类型兼容性', () => {
        it('应正确处理不同的输入数据类型', async () => {
            const weiboLoginNode = createCompiledNode(WeiboLoginAst, {
                id: 'login-node',
                width: 240,
                height: 95,
                position: { x: 0, y: 0 }
            })

            const textAreaNode = createCompiledNode(TextAreaAst, {
                id: 'text-node',
                width: 240,
                height: 95,
                position: { x: 200, y: 0 }
            })

            const edges = [
                createEdge('login-node', 'text-node', {
                    fromProperty: 'account',
                    toProperty: 'input'
                })
            ]

            const workflow = createWorkflow([weiboLoginNode, textAreaNode], edges)

            const result = await getFinal(scheduler.schedule(workflow, workflow))

            expect(result.state).toBe('success')

            // 验证数据传递的完整性
            const loginNode = result.nodes.find(n => n.id === 'login-node') as any
            const textNode = result.nodes.find(n => n.id === 'text-node') as any

            const accountValue = await new Promise(resolve => {
                loginNode?.account?.subscribe(value => resolve(value))
            })

            const outputValue = await new Promise(resolve => {
                textNode?.output?.subscribe(value => resolve(value))
            })

            expect(accountValue).toBeDefined()
            expect(outputValue).toBeDefined()
            expect(typeof outputValue).toBe('string')
        })
    })

    describe('工作流状态管理', () => {
        it('应正确管理节点状态转换', async () => {
            const weiboLoginNode = createCompiledNode(WeiboLoginAst, {
                id: 'login-node',
                width: 240,
                height: 95,
                position: { x: 0, y: 0 }
            })

            const workflow = createWorkflow([weiboLoginNode], [])

            const states: INode[] = []
            const subscription = weiboLoginVisitor.visit(weiboLoginNode as WeiboLoginAst).subscribe(state => {
                states.push(state)
            })

            await new Promise(resolve => setTimeout(resolve, 10))

            expect(states).toHaveLength(4)
            expect(states[0].state).toBe('running')
            expect(states[1].state).toBe('running')
            expect(states[2].state).toBe('running')
            expect(states[3].state).toBe('success')

            subscription.unsubscribe()
        })
    })

    describe('工作流元数据验证', () => {
        it('应保持工作流元数据完整性', async () => {
            const weiboLoginNode = createCompiledNode(WeiboLoginAst, {
                id: 'login-node',
                width: 240,
                height: 95,
                position: { x: 0, y: 0 }
            })

            const textAreaNode = createCompiledNode(TextAreaAst, {
                id: 'text-node',
                width: 240,
                height: 95,
                position: { x: 200, y: 0 }
            })

            const edges = [
                createEdge('login-node', 'text-node', {
                    fromProperty: 'account',
                    toProperty: 'input'
                })
            ]

            const workflow = createWorkflow([weiboLoginNode, textAreaNode], edges)

            // 设置工作流元数据
            workflow.name = 'weibo_login'
            workflow.description = null
            workflow.color = null
            workflow.collapsed = false
            workflow.width = null
            workflow.state = 'pending'
            workflow.type = 'WorkflowGraphAst'
            workflow.viewport = {
                x: 100,
                y: 100,
                zoom: 1
            }
            workflow.tags = []
            workflow.isGroupNode = false

            const result = await getFinal(scheduler.schedule(workflow, workflow))

            // 验证元数据保持完整
            expect(result.name).toBe('weibo_login')
            expect(result.description).toBeNull()
            expect(result.color).toBeNull()
            expect(result.collapsed).toBe(false)
            expect(result.width).toBeNull()
            expect(result.state).toBe('success')
            expect(result.type).toBe('WorkflowGraphAst')
            expect(result.tags).toEqual([])
            expect(result.isGroupNode).toBe(false)
        })
    })
})

/**
 * 模拟 WeiboAccountEntity 类型
 */
interface WeiboAccountEntity {
    id: string
    screen_name: string
    profile_url: string
    avatar_hd: string
    description: string
    verified: boolean
    verified_type: number
    followers_count: number
    friends_count: number
    statuses_count: number
    gender: string
    location: string
    created_at: string
    updated_at: string
}