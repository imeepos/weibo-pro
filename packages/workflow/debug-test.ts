import { executeWorkflow } from './src/executor';
import { createWorkflowGraphAst } from './src/ast';
import { TextAreaAst, TextAreaAstVisitor } from './src/TextAreaAst';
import { WorkflowGraphAstVisitor } from './src/WorkflowGraphAstVisitor';
import { Compiler } from './src/compiler';
import { root } from '@sker/core';

root.get(TextAreaAstVisitor);
root.get(WorkflowGraphAstVisitor);

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

console.log('Starting workflow execution...');
console.log('Initial workflow.id:', workflow.id);
console.log('Initial workflow state:', workflow.state);
console.log('workflow object:', workflow);

executeWorkflow(workflow, {}).subscribe({
  next: (event) => {
    if (event.id === workflow.id) {
      console.log('Event for workflow:', event.type, '| workflow.state:', workflow.state, '| workflow object:', workflow);
    }
  },
  error: (err) => {
    console.error('Error:', err);
  },
  complete: () => {
    console.log('Workflow complete. Final state:', workflow.state);
  }
});
