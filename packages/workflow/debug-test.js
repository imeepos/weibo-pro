import { executeWorkflow } from './src/executor.ts';
import { createWorkflowGraphAst } from './src/ast.ts';
import { TextAreaAst, TextAreaAstVisitor } from './src/TextAreaAst.ts';
import { WorkflowGraphAstVisitor } from './src/WorkflowGraphAstVisitor.ts';
import { Compiler } from './src/compiler.ts';
import { root } from '@sker/core';
import { firstValueFrom } from 'rxjs';
import { toArray } from 'rxjs/operators';
import { globalRuntime } from './src/runtime/index.ts';

async function run() {
  root.get(TextAreaAstVisitor);
  root.get(WorkflowGraphAstVisitor);
  
  globalRuntime.clearEvents();
  globalRuntime.startRecording();
  
  const compiler = root.get(Compiler);
  
  const n1 = compiler.compile(new TextAreaAst());
  n1.id = 'n1';
  n1.input = ['hello'];

  const n2 = compiler.compile(new TextAreaAst());
  n2.id = 'n2';

  const workflow = createWorkflowGraphAst({
    nodes: [n1, n2],
    edges: [{ id: 'e1', from: 'n1', to: 'n2', fromProperty: 'output', toProperty: 'input' }],
    entryNodeIds: ['n1']
  });

  console.log('Workflow:', workflow.id);
  console.log('Nodes:', workflow.nodes.map(n => ({ id: n.id, input: n.input })));
  
  const events = await firstValueFrom(
    executeWorkflow(workflow, {}).pipe(toArray())
  );

  console.log('Events:', events.map(e => ({ type: e.type, id: e.id, data: e.data })));
  console.log('Workflow state:', workflow.state);
}

run().catch(console.error);
