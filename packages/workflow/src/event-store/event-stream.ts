import { BehaviorSubject, Observable, combineLatest, interval, from } from 'rxjs';
import { map, switchMap, take, concatMap, delay } from 'rxjs/operators';
import { NodeEvent } from '../execution/events';

/**
 * 工作流事件流（时间旅行核心）
 *
 * 设计哲学：
 * - _events$: 完整事件历史（只增不减）
 * - _replayIndex$: 当前回放位置（-1 = 实时模式）
 * - 通过 combineLatest 实现响应式时间切片
 */
export class WorkflowEventStream {
    /** 完整事件流 */
    private _events$ = new BehaviorSubject<NodeEvent[]>([]);

    /** 回放索引（-1 = 实时模式，显示所有事件） */
    private _replayIndex$ = new BehaviorSubject<number>(-1);

    /** 追加事件 */
    emit(event: NodeEvent): void {
        this._events$.next([...this._events$.value, event]);
    }

    /** 批量追加事件（恢复时使用） */
    restore(events: NodeEvent[]): void {
        this._events$.next(events);
    }

    /** 清空事件 */
    clear(): void {
        this._events$.next([]);
        this._replayIndex$.next(-1);
    }

    /** 获取所有事件 */
    get events(): NodeEvent[] {
        return this._events$.value;
    }

    /** 当前回放索引 */
    get replayIndex(): number {
        return this._replayIndex$.value;
    }

    /** 是否处于回放模式 */
    get isReplaying(): boolean {
        return this._replayIndex$.value >= 0;
    }

    // ========== 时间旅行 ==========

    /** 跳转到指定时间点 */
    jumpTo(index: number): void {
        const max = this._events$.value.length - 1;
        this._replayIndex$.next(Math.min(Math.max(-1, index), max));
    }

    /** 跳转到开始 */
    jumpToStart(): void {
        this.jumpTo(0);
    }

    /** 跳转到结束（实时模式） */
    jumpToEnd(): void {
        this.jumpTo(-1);
    }

    /** 前进一步 */
    stepForward(): void {
        if (this._replayIndex$.value < 0) return;
        this.jumpTo(this._replayIndex$.value + 1);
    }

    /** 后退一步 */
    stepBackward(): void {
        const current = this._replayIndex$.value;
        if (current < 0) {
            this.jumpTo(this._events$.value.length - 2);
        } else if (current > 0) {
            this.jumpTo(current - 1);
        }
    }

    // ========== 响应式查询 ==========

    /** 当前可见事件（支持回放切片） */
    get visibleEvents$(): Observable<NodeEvent[]> {
        return combineLatest([this._events$, this._replayIndex$]).pipe(
            map(([events, index]) => index < 0 ? events : events.slice(0, index + 1))
        );
    }

    /** 获取节点当前状态（响应式） */
    getNodeState$(nodeId: string): Observable<NodeEvent | undefined> {
        return this.visibleEvents$.pipe(
            map(events => {
                for (let i = events.length - 1; i >= 0; i--) {
                    const e = events[i]!;
                    if (e.id === nodeId && e.type !== 'node_emit') return e;
                }
                return undefined;
            })
        );
    }

    /** 获取所有节点的当前状态 */
    get nodeStates$(): Observable<Map<string, NodeEvent>> {
        return this.visibleEvents$.pipe(
            map(events => {
                const states = new Map<string, NodeEvent>();
                for (const event of events) {
                    if (event.id && event.type !== 'node_emit') {
                        states.set(event.id, event);
                    }
                }
                return states;
            })
        );
    }

    /** 获取成功节点 ID 集合 */
    get successNodeIds$(): Observable<Set<string>> {
        return this.visibleEvents$.pipe(
            map(events => new Set(
                events
                    .filter(e => e.type === 'node_success' && e.id)
                    .map(e => e.id!)
            ))
        );
    }

    /** 获取失败节点 ID 集合 */
    get failedNodeIds$(): Observable<Set<string>> {
        return this.visibleEvents$.pipe(
            map(events => {
                const success = new Set<string>();
                const failed = new Set<string>();
                for (const e of events) {
                    if (!e.id) continue;
                    if (e.type === 'node_success') {
                        success.add(e.id);
                        failed.delete(e.id);
                    } else if (e.type === 'node_fail' && !success.has(e.id)) {
                        failed.add(e.id);
                    }
                }
                return failed;
            })
        );
    }

    // ========== 续跑支持 ==========

    /** 获取成功节点 ID 集合（同步） */
    get successNodeIds(): Set<string> {
        return new Set(
            this._events$.value
                .filter(e => e.type === 'node_success' && e.id)
                .map(e => e.id!)
        );
    }

    /** 获取单个节点的所有事件（续跑重放用） */
    getNodeEvents(nodeId: string): NodeEvent[] {
        return this._events$.value.filter(e => e.id === nodeId);
    }

    /** 检查节点是否已成功执行 */
    isNodeSuccess(nodeId: string): boolean {
        return this._events$.value.some(e => e.id === nodeId && e.type === 'node_success');
    }

    // ========== 回放功能 ==========

    /**
     * 自动回放（调试/演示）
     * @param speed 每个事件的间隔（毫秒）
     */
    autoReplay$(speed = 200): Observable<NodeEvent> {
        return from(this._events$.value).pipe(
            concatMap((event, index) => {
                this.jumpTo(index);
                return from([event]).pipe(delay(speed));
            })
        );
    }

    /**
     * 从指定位置开始回放
     */
    replayFrom$(startIndex: number, speed = 200): Observable<NodeEvent> {
        const events = this._events$.value.slice(startIndex);
        return from(events).pipe(
            concatMap((event, index) => {
                this.jumpTo(startIndex + index);
                return from([event]).pipe(delay(speed));
            })
        );
    }

    // ========== 序列化 ==========

    /** 导出为 JSON（持久化） */
    toJSON(): { events: NodeEvent[]; replayIndex: number } {
        return {
            events: this._events$.value,
            replayIndex: this._replayIndex$.value,
        };
    }

    /** 从 JSON 恢复 */
    static fromJSON(json: { events: NodeEvent[]; replayIndex?: number }): WorkflowEventStream {
        const stream = new WorkflowEventStream();
        stream._events$.next(json.events || []);
        stream._replayIndex$.next(json.replayIndex ?? -1);
        return stream;
    }
}
