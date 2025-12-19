import React from 'react';
import { Injectable } from '@sker/core';
import { Render } from '@sker/workflow';
import { EmailD1Ast } from '@sker/workflow-ast';
import { MailIcon, InboxIcon } from 'lucide-react';

const EmailRender: React.FC<{ ast: EmailD1Ast }> = ({ ast }) => {
  return (
    <div className="space-y-3 p-3 max-w-sm">
      {ast.email ? (
        <>
          <div className="p-2 rounded-lg bg-accent/50 border border-border">
            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-1">
              <MailIcon className="size-3" />
              邮箱地址
            </div>
            <div className="text-sm font-mono text-foreground select-all">{ast.email}</div>
          </div>

          {ast.message && (
            <div className="space-y-2">
              <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <InboxIcon className="size-3" />
                收到邮件
              </div>
              <div className="p-2 rounded-lg bg-muted/50 border border-border space-y-1">
                <div className="text-xs font-medium text-foreground">
                  {ast.message.subject || '(无主题)'}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  发件人: {ast.message.from}
                </div>
                <div className="text-xs text-foreground line-clamp-3 mt-1">
                  {ast.message.content}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {new Date(ast.message.receivedAt).toLocaleString('zh-CN')}
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="p-3 text-center text-muted-foreground text-sm">
          等待创建临时邮箱...
        </div>
      )}
    </div>
  );
};

@Injectable()
export class EmailD1AstRender {
  @Render(EmailD1Ast)
  render(ast: EmailD1Ast) {
    return <EmailRender ast={ast} />;
  }
}
