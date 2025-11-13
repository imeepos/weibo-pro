import { Injectable } from "@sker/core";
import { Render } from "@sker/workflow";
import { CodeExecutorAst, type CodeLanguage, type ExecutionLog } from "@sker/workflow-ast";
import React, { useState } from "react";
import { Code, Play, Terminal, Clock } from "lucide-react";

const LanguageSelector: React.FC<{
  value: CodeLanguage;
  onChange: (lang: CodeLanguage) => void;
}> = ({ value, onChange }) => {
  return (
    <div className="flex items-center gap-2">
      <Code className="h-3 w-3 text-slate-400" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as CodeLanguage)}
        className="px-2 py-1 rounded bg-slate-700 text-slate-200 text-xs border border-slate-600 hover:bg-slate-600 transition"
      >
        <option value="javascript">JavaScript</option>
        <option value="python">Python</option>
      </select>
    </div>
  );
};

const LogViewer: React.FC<{ logs: ExecutionLog[] }> = ({ logs }) => {
  if (!logs || logs.length === 0) {
    return (
      <div className="text-slate-500 text-xs p-3 bg-slate-900 rounded border border-slate-700">
        暂无执行日志
      </div>
    );
  }

  return (
    <div className="space-y-1 max-h-32 overflow-y-auto bg-slate-900 rounded border border-slate-700 p-2">
      {logs.map((log, index) => (
        <div
          key={index}
          className={`font-mono text-xs ${log.level === 'error'
              ? 'text-red-400'
              : log.level === 'warn'
                ? 'text-yellow-400'
                : 'text-slate-400'
            }`}
        >
          <span className="text-slate-500 mr-2">
            [{log.timestamp.toLocaleTimeString()}]
          </span>
          <span className="uppercase mr-2 text-[10px] text-slate-600">{log.level}</span>
          {log.message}
        </div>
      ))}
    </div>
  );
};

const CodeEditor: React.FC<{
  language: CodeLanguage;
  value: string;
  onChange: (value: string) => void;
}> = ({ language, value, onChange }) => {
  return (
    <div className="relative">
      <div className="absolute top-2 right-2 z-10">
        <span className="text-[10px] text-slate-500 bg-slate-800 px-2 py-1 rounded">
          {language === 'javascript' ? 'JS' : 'PY'}
        </span>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={
          language === 'javascript'
            ? '// 输入 JavaScript 代码\n// 可用变量: context\n// 结果将保存到 result 变量\nresult = context.data.map(x => x * 2);\nconsole.log("处理完成，结果:", result);'
            : '# 输入 Python 代码\n# 可用变量: context\n# 结果将保存到 result 变量\nresult = [x * 2 for x in context["data"]]\nprint("处理完成，结果:", result)'
        }
        className="w-full h-32 p-3 bg-slate-900 text-slate-300 text-xs font-mono border border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
        spellCheck={false}
      />
    </div>
  );
};

const CodeExecutorComponent: React.FC<{ ast: CodeExecutorAst }> = ({ ast }) => {
  const [editingCode, setEditingCode] = useState(ast.code || '');
  const [selectedLang, setSelectedLang] = useState<CodeLanguage>(ast.language || 'javascript');

  const handleLanguageChange = (lang: CodeLanguage) => {
    setSelectedLang(lang);
    ast.language = lang;
  };

  const handleCodeChange = (code: string) => {
    setEditingCode(code);
    ast.code = code;
  };

  const stateBadge = ast.state === 'success'
    ? 'bg-green-900 text-green-300'
    : ast.state === 'fail'
      ? 'bg-red-900 text-red-300'
      : ast.state === 'running'
        ? 'bg-blue-900 text-blue-300'
        : 'bg-slate-700 text-slate-300';

  return (
    <div className="space-y-3 text-xs">
      <div className="flex items-center justify-between">
        <span className="font-medium text-slate-200">代码执行器</span>
        <span className={`px-2 py-0.5 rounded text-[11px] font-medium capitalize ${stateBadge}`}>
          {ast.state}
        </span>
      </div>

      <LanguageSelector value={selectedLang} onChange={handleLanguageChange} />

      <CodeEditor
        language={selectedLang}
        value={editingCode}
        onChange={handleCodeChange}
      />

      <div className="flex items-center gap-2 text-slate-400">
        <Clock className="h-3 w-3" />
        <span>超时: {ast.timeout || 30}秒</span>
      </div>

      {ast.executionTime > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3 text-slate-400" />
            <span className="text-slate-400">执行时间:</span>
            <span className="text-slate-200">{ast.executionTime}ms</span>
          </div>
        </div>
      )}

      {(ast.logs.length > 0 || ast.result !== undefined) && (
        <div className="space-y-2 pt-2 border-t border-slate-700">
          <div className="flex items-center gap-2">
            <Terminal className="h-3 w-3 text-slate-400" />
            <span className="font-medium text-slate-200">执行日志</span>
          </div>

          <LogViewer logs={ast.logs} />

          {ast.result !== undefined && (
            <div className="bg-slate-900 rounded border border-slate-700 p-2">
              <div className="text-xs text-slate-400 mb-1">执行结果:</div>
              <div className="text-slate-200 font-mono text-xs bg-slate-800 p-2 rounded border border-slate-700">
                <pre className="whitespace-pre-wrap">
                  {typeof ast.result === 'object'
                    ? JSON.stringify(ast.result, null, 2)
                    : String(ast.result)}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

@Injectable()
export class CodeExecutorAstRender {
  @Render(CodeExecutorAst)
  render(ast: CodeExecutorAst) {
    return <CodeExecutorComponent ast={ast} />;
  }
}
