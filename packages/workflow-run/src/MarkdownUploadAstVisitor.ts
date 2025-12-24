import { Injectable } from '@sker/core';
import { Handler, NodeEvent, setAstError } from '@sker/workflow';
import { MarkdownUploadAst, type MarkdownHeading } from '@sker/workflow-ast';
import { Observable, from } from 'rxjs';
import { concatMap, mergeMap } from 'rxjs/operators';
import { marked } from 'marked';

@Injectable()
export class MarkdownUploadAstVisitor {
  @Handler(MarkdownUploadAst)
  handler(
    ast: MarkdownUploadAst,
    input$: Observable<Record<string, unknown>>,
    ctx: Record<string, unknown>
  ): Observable<NodeEvent> {
    return new Observable<NodeEvent>(obs => {
      ast.state = 'running';
      obs.next({ type: 'node_runing', id: ast.id });

      const subscription = input$.pipe(
        concatMap(async (inputData) => {
          ast.emitCount += 1;
          obs.next({ type: 'node_emit', id: ast.id, data: { emitCount: ast.emitCount } });

          if (inputData) {
            Object.keys(inputData).forEach(key => {
              (ast as unknown as Record<string, unknown>)[key] = inputData[key];
            });
          }

          if (!ast.fileUrl) {
            throw new Error('文件 URL 不能为空');
          }

          const response = await fetch(ast.fileUrl);
          if (!response.ok) {
            throw new Error(`文件获取失败: ${response.statusText}`);
          }

          const rawContent = await response.text();
          ast.rawContent = rawContent;

          const htmlContent = await marked(rawContent);
          ast.htmlContent = htmlContent;

          ast.plainText = rawContent
            .replace(/^#{1,6}\s+/gm, '')
            .replace(/\*\*(.+?)\*\*/g, '$1')
            .replace(/\*(.+?)\*/g, '$1')
            .replace(/\[(.+?)\]\(.+?\)/g, '$1')
            .replace(/`{1,3}(.+?)`{1,3}/g, '$1')
            .trim();

          const headings: MarkdownHeading[] = [];
          const headingRegex = /^(#{1,6})\s+(.+)$/gm;
          let match: RegExpExecArray | null;

          while ((match = headingRegex.exec(rawContent)) !== null) {
            const level = match[1]!.length;
            const text = match[2]!.trim();
            const slug = text
              .toLowerCase()
              .replace(/[^\w\u4e00-\u9fa5\s-]/g, '')
              .replace(/\s+/g, '-');

            headings.push({ level, text, slug });
          }

          ast.headings = headings;

          console.log(`[MarkdownUploadAstVisitor] 解析完成，标题数量: ${headings.length}`);

          return [
            {
              type: 'node_emit' as const,
              id: ast.id,
              data: {
                rawContent: ast.rawContent,
                htmlContent: ast.htmlContent,
                plainText: ast.plainText,
                headings: ast.headings
              }
            }
          ];
        }),
        mergeMap((events: NodeEvent[]) => from(events))
      ).subscribe({
        next: (event: NodeEvent) => obs.next(event),
        error: (error) => {
          console.error(`[MarkdownUploadAstVisitor] 解析失败:`, error);
          ast.state = 'fail';
          setAstError(ast, error instanceof Error ? error : new Error(String(error)));
          obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message });
          obs.complete();
        },
        complete: () => {
          ast.state = 'success';
          obs.next({ type: 'node_success', id: ast.id });
          obs.complete();
        }
      });

      return () => {
        subscription.unsubscribe();
        obs.complete();
      };
    });
  }
}
