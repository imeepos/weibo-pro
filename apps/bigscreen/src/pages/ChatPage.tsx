import { useState } from 'react';
import { Send } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: ToolCall[];
}

interface ToolCall {
  tool: string;
  input: Record<string, unknown>;
  output: string;
}

interface SqlResult {
  success: boolean;
  rowCount?: number;
  rows?: Record<string, unknown>[];
  fields?: { name: string; dataTypeID: number }[];
  error?: string;
}

export function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:8089/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
        }),
      });

      const data = await response.json();
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.message,
          toolCalls: data.toolCalls,
        },
      ]);
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderToolCall = (toolCall: ToolCall) => {
    const result: SqlResult = JSON.parse(toolCall.output);

    return (
      <div className="mt-2 rounded-lg border border-gray-700 bg-gray-800 p-3">
        <div className="mb-2 text-sm font-medium text-blue-400">
          SQL 查询
        </div>
        <pre className="mb-2 overflow-x-auto rounded bg-gray-900 p-2 text-xs text-gray-300">
          {toolCall.input.sql as string}
        </pre>

        {result.success ? (
          <div>
            <div className="mb-2 text-xs text-gray-400">
              返回 {result.rowCount} 行
            </div>
            {result.rows && result.rows.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-700">
                      {result.fields?.map((field) => (
                        <th
                          key={field.name}
                          className="px-2 py-1 text-left text-gray-400"
                        >
                          {field.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.slice(0, 10).map((row, i) => (
                      <tr key={i} className="border-b border-gray-800">
                        {result.fields?.map((field) => (
                          <td
                            key={field.name}
                            className="px-2 py-1 text-gray-300"
                          >
                            {String(row[field.name] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {result.rows.length > 10 && (
                  <div className="mt-2 text-xs text-gray-500">
                    显示前 10 行，共 {result.rows.length} 行
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-red-400">错误: {result.error}</div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-screen flex-col bg-gray-900 text-white">
      <div className="border-b border-gray-800 p-4">
        <h1 className="text-xl font-bold">数据库助手</h1>
        <p className="text-sm text-gray-400">使用自然语言查询和操作数据库</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`mb-4 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}
          >
            <div
              className={`inline-block max-w-[80%] rounded-lg p-3 ${
                msg.role === 'user'
                  ? 'bg-blue-600'
                  : 'bg-gray-800'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
              {msg.toolCalls?.map((toolCall, j) => (
                <div key={j}>{renderToolCall(toolCall)}</div>
              ))}
            </div>
          </div>
        ))}
        {loading && (
          <div className="text-left">
            <div className="inline-block rounded-lg bg-gray-800 p-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" />
                <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:0.2s]" />
                <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:0.4s]" />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-gray-800 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="输入你的问题..."
            className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="rounded-lg bg-blue-600 px-4 py-2 hover:bg-blue-700 disabled:opacity-50"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
