import { RxNode } from "./types";
import { Observable, Subject } from 'rxjs'

/**
 * 执行器
 */
export class RxExecutor {
    execute<In, Out>(node: RxNode<In, Out>, inputs: Subject<In>): Observable<Out> {
        throw new Error(``)
    }
}