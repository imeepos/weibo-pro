import { Injectable } from '@sker/core';
import { Observable } from 'rxjs';
import { executeWorkflow } from '@sker/workflow';
import { WorkflowGraphAst } from '@sker/workflow';

/**
 * Mock WorkflowEventBus for testing
 */
@Injectable()
export class WorkflowEventBus {
  emitNodeSuccess(_nodeId: string, _payload: any, _workflowId: string): void {
    // Mock implementation - does nothing since event listening is commented out
  }
}

/**
 * Mock ReactiveScheduler for testing
 */
@Injectable()
export class ReactiveScheduler {
  schedule(workflow: WorkflowGraphAst, input: any): Observable<WorkflowGraphAst> {
    return new Observable<WorkflowGraphAst>(observer => {
      executeWorkflow(workflow, input).subscribe({
        next: () => {},
        complete: () => {
          observer.next(workflow);
          observer.complete();
        },
        error: (error) => {
          observer.error(error);
        }
      });
    });
  }
}
