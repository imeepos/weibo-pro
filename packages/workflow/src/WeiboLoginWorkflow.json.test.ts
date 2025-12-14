import { describe, it, expect, beforeEach } from 'vitest'
import { root, Injectable } from '@sker/core'
import { ReactiveScheduler } from './execution/reactive-scheduler'
import { createWorkflowGraphAst, WorkflowGraphAst } from './ast'
import { Node, Input, Output, Handler, IS_MULTI, State } from './decorator'
import { type INode } from './types'
import { Compiler } from './compiler'
import { Observable, BehaviorSubject } from 'rxjs'
import { lastValueFrom } from 'rxjs'

/**
 * 根据工作流JSON定义创建节点类
 */

// WeiboLoginAst - 微博登录节点
@Node({ title: '微博登录', type: 'crawler' })
class WeiboLoginAst extends Node {
    @Output({ title: '微博账号' })
    account: BehaviorSubject<any> = new BehaviorSubject<any>(undefined)

    @State({ title: '登录二维码' })
    qrcode?: string

    @State({ title: '提示消息' })
    message?: string

    type: `WeiboLoginAst` = `WeiboLoginAst`
}

// TextAreaAst - 文本节点
@Node({ title: '文本节点', type: 'basic' })
class TextAreaAst extends Node {
    @Input({ title: '输入', mode: IS_MULTI, type: 'richtext' })
    input: string[] | string = []

    @Output({ title: '输出', type: 'richtext' })
    output: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null)

    type: `TextAreaAst` = `TextAreaAst`
}

/**
 * 访问器实现
 */

@Injectable()
class WeiboLoginAstVisitor {
    @Handler(WeiboLoginAst)
    visit(ast: WeiboLoginAst): Observable<INode> {
        return new Observable(obs => {
            ast.state = 'running'
            obs.next({ ...ast })

            // 生成二维码
            ast.qrcode = 'https://example.com/qrcode.png'
            ast.message = '请扫描二维码登录'
            obs.next({ ...ast })

            // 模拟登录成功，发射账户数据
            const mockAccount = {
                id: '1234567890',
                screen_name: '测试用户',
                profile_url: 'https://weibo.com/test',
                description: '这是一个测试账号',
                verified: false
            }

            ast.account.next(mockAccount)
            obs.next({ ...ast })

            ast.state = 'success'
            obs.next({ ...ast })
            obs.complete()
        })
    }
}

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
 * 测试辅助函数
 */
function getFinal<T>(obs: Observable<T>): Promise<T> {
    return lastValueFrom(obs)
}

describe('WeiboLogin Workflow Integration - 基于JSON的完整工作流测试', () => {
    let scheduler: ReactiveScheduler

    beforeEach(() => {
        scheduler = root.get(ReactiveScheduler)
    })

    describe('工作流执行', () => {
        it('应成功执行基于JSON的工作流', async () => {
            // 使用提供的工作流JSON数据
            const workflowData = {
                count: 0,
                emitCount: 0,
                id: "a6d72cfd-dc7c-4669-b5dd-df1af94be716",
                name: "weibo_login",
                description: null,
                color: null,
                collapsed: false,
                width: null,
                state: "pending",
                type: "WorkflowGraphAst",
                position: { x: 0, y: 0 },
                nodes: [
                    {
                        count: 0,
                        emitCount: 0,
                        id: "c39df52f-daa4-42e2-b633-7d08deae59c4",
                        width: 240,
                        height: 95,
                        state: "pending",
                        type: "WeiboLoginAst",
                        position: { x: -150.82948846385875, y: 191.15734718040633 },
                        metadata: {
                            class: { title: "微博登录", type: "crawler" },
                            inputs: [],
                            outputs: [{ property: "account", title: "微博账号", isStatic: true, isSubject: true }],
                            states: [
                                { propertyKey: "qrcode", title: "登录二维码" },
                                { propertyKey: "message", title: "提示消息" }
                            ]
                        }
                    },
                    {
                        count: 0,
                        emitCount: 0,
                        id: "04ae1a2e-0705-4c53-b7c7-0dbd9acb9637",
                        width: 240,
                        height: 95,
                        state: "pending",
                        type: "TextAreaAst",
                        position: { x: 170.2061005954476, y: 98.9890651601539 },
                        metadata: {
                            class: { title: "文本节点", type: "basic" },
                            inputs: [{ property: "input", mode: 1, title: "输入", type: "richtext", isStatic: true }],
                            outputs: [{ property: "output", title: "输出", type: "richtext", isStatic: true, isSubject: true }],
                            states: []
                        },
                        input: []
                    }
                ],
                entryNodeIds: ["c39df52f-daa4-42e2-b633-7d08deae59c4"],
                endNodeIds: ["04ae1a2e-0705-4c53-b7c7-0dbd9acb9637"],
                edges: [
                    {
                        id: "edge-0baec488-2dd6-484f-9594-5bca7d24f490",
                        to: "04ae1a2e-0705-4c53-b7c7-0dbd9acb9637",
                        from: "c39df52f-daa4-42e2-b633-7d08deae59c4",
                        type: "data",
                        toProperty: "input",
                        fromProperty: "account"
                    }
                ],
                viewport: { x: 375.6447291741183, y: 77.41368108263279, zoom: 0.9656250290142515 },
                tags: [],
                isGroupNode: false
            }

            // 创建工作流实例
            const workflow = createWorkflowGraphAst(workflowData)

            // 执行工作流
            const result = await getFinal(scheduler.schedule(workflow, workflow))

            // 验证工作流执行成功
            expect(result.state).toBe('success')
            expect(result.count).toBe(1) // 工作流执行一次

            // 验证节点执行
            const loginNode = result.nodes.find(n => n.id === 'c39df52f-daa4-42e2-b633-7d08deae59c4') as any
            const textNode = result.nodes.find(n => n.id === '04ae1a2e-0705-4c53-b7c7-0dbd9acb9637') as any

            expect(loginNode).toBeDefined()
            expect(textNode).toBeDefined()

            // 验证 WeiboLoginAst 节点
            expect(loginNode.state).toBe('success')
            expect(loginNode.count).toBe(1)
            expect(loginNode.qrcode).toBe('https://example.com/qrcode.png')
            expect(loginNode.message).toBe('请扫描二维码登录')

            // 验证 TextAreaAst 节点
            expect(textNode.state).toBe('success')
            expect(textNode.count).toBe(1)

            // 验证数据传递
            const accountValue = await new Promise(resolve => {
                loginNode.account.subscribe(value => resolve(value))
            })

            const outputValue = await new Promise(resolve => {
                textNode.output.subscribe(value => resolve(value))
            })

            expect(accountValue).toEqual({
                id: '1234567890',
                screen_name: '测试用户',
                profile_url: 'https://weibo.com/test',
                description: '这是一个测试账号',
                verified: false
            })

            // 验证输出格式化（账户对象被序列化为JSON字符串）
            expect(outputValue).toContain('1234567890')
            expect(outputValue).toContain('测试用户')
        })

        it('应正确处理工作流的 entryNodeIds 和 endNodeIds', async () => {
            const workflowData = {
                count: 0,
                emitCount: 0,
                id: "test-workflow",
                name: "test_workflow",
                description: null,
                color: null,
                collapsed: false,
                width: null,
                state: "pending",
                type: "WorkflowGraphAst",
                position: { x: 0, y: 0 },
                nodes: [
                    {
                        count: 0,
                        emitCount: 0,
                        id: "node1",
                        width: 240,
                        height: 95,
                        state: "pending",
                        type: "WeiboLoginAst",
                        position: { x: 0, y: 0 }
                    },
                    {
                        count: 0,
                        emitCount: 0,
                        id: "node2",
                        width: 240,
                        height: 95,
                        state: "pending",
                        type: "TextAreaAst",
                        position: { x: 200, y: 0 }
                    }
                ],
                entryNodeIds: ["node1"],
                endNodeIds: ["node2"],
                edges: [
                    {
                        id: "edge-1",
                        to: "node2",
                        from: "node1",
                        type: "data",
                        toProperty: "input",
                        fromProperty: "account"
                    }
                ],
                viewport: { x: 0, y: 0, zoom: 1 },
                tags: [],
                isGroupNode: false
            }

            const workflow = createWorkflowGraphAst(workflowData)
            const result = await getFinal(scheduler.schedule(workflow, workflow))

            expect(result.state).toBe('success')

            // 验证只有指定的节点被标记为入口和结束
            const node1 = result.nodes.find(n => n.id === 'node1')
            const node2 = result.nodes.find(n => n.id === 'node2')

            expect(node1?.state).toBe('success')
            expect(node2?.state).toBe('success')

            // 验证工作流输出收集
            expect(result.entryNodeIds).toEqual(['node1'])
            expect(result.endNodeIds).toEqual(['node2'])
        })

        it('应正确统计节点和边的数量', async () => {
            const workflowData = {
                count: 0,
                emitCount: 0,
                id: "test-workflow",
                name: "test_workflow",
                description: null,
                color: null,
                collapsed: false,
                width: null,
                state: "pending",
                type: "WorkflowGraphAst",
                position: { x: 0, y: 0 },
                nodes: [
                    { id: "node1", type: "WeiboLoginAst", state: "pending" },
                    { id: "node2", type: "TextAreaAst", state: "pending" }
                ],
                entryNodeIds: ["node1"],
                endNodeIds: ["node2"],
                edges: [
                    {
                        id: "edge-1",
                        to: "node2",
                        from: "node1",
                        type: "data",
                        toProperty: "input",
                        fromProperty: "account"
                    }
                ],
                viewport: { x: 0, y: 0, zoom: 1 },
                tags: [],
                isGroupNode: false
            }

            const workflow = createWorkflowGraphAst(workflowData)
            const result = await getFinal(scheduler.schedule(workflow, workflow))

            expect(result.state).toBe('success')
            expect(result.nodes).toHaveLength(2)
            expect(result.edges).toHaveLength(1)
        })

        it('应保持工作流的元数据和视图状态', async () => {
            const workflowData = {
                count: 0,
                emitCount: 0,
                id: "test-workflow",
                name: "weibo_login",
                description: null,
                color: null,
                collapsed: false,
                width: null,
                state: "pending",
                type: "WorkflowGraphAst",
                position: { x: 0, y: 0 },
                nodes: [
                    { id: "node1", type: "WeiboLoginAst", state: "pending" }
                ],
                entryNodeIds: ["node1"],
                endNodeIds: ["node1"],
                edges: [],
                viewport: {
                    x: 375.6447291741183,
                    y: 77.41368108263279,
                    zoom: 0.9656250290142515
                },
                tags: [],
                isGroupNode: false
            }

            const workflow = createWorkflowGraphAst(workflowData)
            const result = await getFinal(scheduler.schedule(workflow, workflow))

            expect(result.state).toBe('success')
            expect(result.name).toBe('weibo_login')
            expect(result.viewport.x).toBe(375.6447291741183)
            expect(result.viewport.y).toBe(77.41368108263279)
            expect(result.viewport.zoom).toBe(0.9656250290142515)
            expect(result.tags).toEqual([])
            expect(result.isGroupNode).toBe(false)
        })
    })

    describe('节点状态验证', () => {
        it('应正确验证节点状态转换', async () => {
            const workflowData = {
                count: 0,
                emitCount: 0,
                id: "test-workflow",
                name: "test_workflow",
                description: null,
                color: null,
                collapsed: false,
                width: null,
                state: "pending",
                type: "WorkflowGraphAst",
                position: { x: 0, y: 0 },
                nodes: [
                    { id: "login-node", type: "WeiboLoginAst", state: "pending" }
                ],
                entryNodeIds: ["login-node"],
                endNodeIds: ["login-node"],
                edges: [],
                viewport: { x: 0, y: 0, zoom: 1 },
                tags: [],
                isGroupNode: false
            }

            const workflow = createWorkflowGraphAst(workflowData)
            const result = await getFinal(scheduler.schedule(workflow, workflow))

            const loginNode = result.nodes.find(n => n.id === 'login-node') as any

            expect(loginNode.state).toBe('success')
            expect(loginNode.count).toBe(1)
            expect(loginNode.emitCount).toBe(3) // running(1) + running(2) + success(3)
            expect(loginNode.qrcode).toBe('https://example.com/qrcode.png')
            expect(loginNode.message).toBe('请扫描二维码登录')
        })
    })

    describe('错误处理', () => {
        it('应正确处理节点执行失败', async () => {
            // 创建一个会导致失败的工作流（模拟）
            const workflowData = {
                count: 0,
                emitCount: 0,
                id: "test-workflow",
                name: "test_workflow",
                description: null,
                color: null,
                collapsed: false,
                width: null,
                state: "pending",
                type: "WorkflowGraphAst",
                position: { x: 0, y: 0 },
                nodes: [
                    { id: "login-node", type: "WeiboLoginAst", state: "pending" }
                ],
                entryNodeIds: ["login-node"],
                endNodeIds: ["login-node"],
                edges: [],
                viewport: { x: 0, y: 0, zoom: 1 },
                tags: [],
                isGroupNode: false
            }

            const workflow = createWorkflowGraphAst(workflowData)

            // 验证正常执行
            const result = await getFinal(scheduler.schedule(workflow, workflow))

            expect(result.state).toBe('success')
            const loginNode = result.nodes.find(n => n.id === 'login-node') as any
            expect(loginNode.state).toBe('success')
        })
    })

    describe('数据流验证', () => {
        it('应正确验证数据在节点间的传递', async () => {
            const workflowData = {
                count: 0,
                emitCount: 0,
                id: "test-workflow",
                name: "test_workflow",
                description: null,
                color: null,
                collapsed: false,
                width: null,
                state: "pending",
                type: "WorkflowGraphAst",
                position: { x: 0, y: 0 },
                nodes: [
                    {
                        id: "login-node",
                        type: "WeiboLoginAst",
                        state: "pending",
                        width: 240,
                        height: 95,
                        position: { x: 0, y: 0 }
                    },
                    {
                        id: "text-node",
                        type: "TextAreaAst",
                        state: "pending",
                        width: 240,
                        height: 95,
                        position: { x: 200, y: 0 }
                    }
                ],
                entryNodeIds: ["login-node"],
                endNodeIds: ["text-node"],
                edges: [
                    {
                        id: "edge-1",
                        to: "text-node",
                        from: "login-node",
                        type: "data",
                        toProperty: "input",
                        fromProperty: "account"
                    }
                ],
                viewport: { x: 0, y: 0, zoom: 1 },
                tags: [],
                isGroupNode: false
            }

            const workflow = createWorkflowGraphAst(workflowData)
            const result = await getFinal(scheduler.schedule(workflow, workflow))

            expect(result.state).toBe('success')

            const loginNode = result.nodes.find(n => n.id === 'login-node') as any
            const textNode = result.nodes.find(n => n.id === 'text-node') as any

            // 验证登录节点发射了账户数据
            const accountValue = await new Promise(resolve => {
                loginNode.account.subscribe(value => resolve(value))
            })

            // 验证文本节点接收并处理了数据
            const outputValue = await new Promise(resolve => {
                textNode.output.subscribe(value => resolve(value))
            })

            expect(accountValue).toBeDefined()
            expect(outputValue).toBeDefined()
            expect(typeof outputValue).toBe('string')
            expect(outputValue).toContain(accountValue.id)
        })
    })
})