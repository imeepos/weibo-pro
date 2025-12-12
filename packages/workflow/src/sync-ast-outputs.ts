import { BehaviorSubject } from 'rxjs';
import { INode } from './types';
import { ROUTE_SKIPPED } from './types';

/**
 * 将远程执行结果同步到本地 AST 实例的 BehaviorSubject 输出
 *
 * 解决问题：远程 SSE 返回的 JSON 中 BehaviorSubject 被序列化为 { _value: ... }，
 * 本地实例的 BehaviorSubject 没有收到 next() 调用，导致下游节点无法正确响应。
 */
export function syncAstOutputs(localAst: INode, remoteResult: INode): void {
    const outputs = localAst.metadata?.outputs || [];

    for (const output of outputs) {
        const prop = output.property;
        const localValue = (localAst as any)[prop];
        const remoteValue = (remoteResult as any)[prop];

        if (!(localValue instanceof BehaviorSubject)) continue;

        const value = extractBehaviorSubjectValue(remoteValue);
        localValue.next(value);
    }
}

/**
 * 检测值是否是序列化的 BehaviorSubject
 * BehaviorSubject 序列化后会有 closed、observers、isStopped 等特征属性
 */
function isSerializedBehaviorSubject(value: any): boolean {
    return (
        value !== null &&
        typeof value === 'object' &&
        'closed' in value &&
        'observers' in value &&
        'isStopped' in value
    );
}

/**
 * 从远程序列化的 BehaviorSubject 中提取值
 *
 * 关键逻辑：
 * - ROUTE_SKIPPED (Symbol) 在 JSON 序列化时变成 undefined
 * - JSON.stringify 会省略 undefined 值，所以 _value 字段可能不存在
 * - 没有 _value 或 _value 为 undefined 的序列化 BehaviorSubject 表示 ROUTE_SKIPPED
 */
function extractBehaviorSubjectValue(remote: any): any {
    if (remote === null || remote === undefined) {
        return ROUTE_SKIPPED;
    }

    // 检测序列化的 BehaviorSubject
    if (isSerializedBehaviorSubject(remote)) {
        // _value 不存在或为 undefined 表示原值是 ROUTE_SKIPPED
        if (!('_value' in remote) || remote._value === undefined) {
            return ROUTE_SKIPPED;
        }
        return remote._value;
    }

    // 实际的 BehaviorSubject 实例（理论上不会出现，但兼容处理）
    if (remote instanceof BehaviorSubject) {
        return remote.getValue();
    }

    // 普通值直接返回
    return remote;
}
