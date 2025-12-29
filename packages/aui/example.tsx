import { AuiProvider, useAuiNode, useAuiContext } from '@sker/aui';

function Button({ id, label }: { id: string; label: string }) {
  useAuiNode(id, 'Button', { label }, { importance: 'high' });
  return <button>{label}</button>;
}

function Form() {
  useAuiNode('form-1', 'Form', { fields: ['name', 'email'] });

  return (
    <form>
      <Button id="submit-btn" label="提交" />
    </form>
  );
}

function AiAssistant() {
  const context = useAuiContext({ page: 'dashboard' });

  return (
    <div>
      <h3>AI 上下文</h3>
      <pre>{context}</pre>
    </div>
  );
}

export default function App() {
  return (
    <AuiProvider>
      <Form />
      <AiAssistant />
    </AuiProvider>
  );
}
