import { Injectable } from '@sker/core';
import { Handler, NodeEvent, setAstError } from '@sker/workflow';
import { ExcelUploadAst } from '@sker/workflow-ast';
import { Observable, from } from 'rxjs';
import { concatMap, mergeMap } from 'rxjs/operators';
import { ErrorHandlerOperators } from './utils/error-handler.util';
import ExcelJS from 'exceljs';

@Injectable()
export class ExcelUploadAstVisitor {
  @Handler(ExcelUploadAst)
  handler(
    ast: ExcelUploadAst,
    input$: Observable<Record<string, unknown>>,
    ctx: Record<string, unknown>
  ): Observable<NodeEvent> {
    return new Observable<NodeEvent>(obs => {
      ast.state = 'running';
      obs.next({ type: 'node_runing', id: ast.id });

      const subscription = input$
        .pipe(
          concatMap(async inputData => {
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

            console.log(`[ExcelUploadAstVisitor] 开始解析 Excel:`, ast.fileUrl);

            const workbook = new ExcelJS.Workbook();
            const response = await fetch(ast.fileUrl);
            const arrayBuffer = await response.arrayBuffer();
            await workbook.xlsx.load(arrayBuffer);

            let worksheet: ExcelJS.Worksheet | undefined;

            if (ast.sheetName) {
              worksheet = workbook.getWorksheet(ast.sheetName);
              if (!worksheet) {
                throw new Error(`工作表 "${ast.sheetName}" 不存在`);
              }
            } else {
              worksheet = workbook.worksheets[0];
              if (!worksheet) {
                throw new Error('Excel 文件中没有工作表');
              }
              ast.sheetName = worksheet.name;
            }

            const data: Record<string, any>[] = [];
            let columns: string[] = [];

            const startRow = Math.max(1, ast.startRow);
            let headerRow: ExcelJS.Row | undefined;

            if (ast.hasHeader) {
              headerRow = worksheet.getRow(startRow);
              headerRow.eachCell((cell: ExcelJS.Cell, colNumber: number) => {
                const value = cell.value;
                const columnName = value ? String(value) : `Column${colNumber}`;
                columns.push(columnName);
              });

              if (columns.length === 0) {
                const maxCol = worksheet.columnCount;
                for (let i = 1; i <= maxCol; i++) {
                  columns.push(`Column${i}`);
                }
              }
            } else {
              const maxCol = worksheet.columnCount;
              for (let i = 1; i <= maxCol; i++) {
                columns.push(`Column${i}`);
              }
            }

            const dataStartRow = ast.hasHeader ? startRow + 1 : startRow;

            worksheet.eachRow((row: ExcelJS.Row, rowNumber: number) => {
              if (rowNumber < dataStartRow) return;

              const rowData: Record<string, any> = {};
              let hasData = false;

              row.eachCell((cell: ExcelJS.Cell, colNumber: number) => {
                const columnIndex = colNumber - 1;
                const columnName = columns[columnIndex] || `Column${colNumber}`;

                let cellValue: any = cell.value;

                if (cellValue && typeof cellValue === 'object') {
                  if ('result' in cellValue) {
                    cellValue = (cellValue as any).result;
                  } else if ('text' in cellValue) {
                    cellValue = (cellValue as any).text;
                  }
                }

                rowData[columnName] = cellValue ?? '';

                if (cellValue !== null && cellValue !== undefined && cellValue !== '') {
                  hasData = true;
                }
              });

              if (hasData) {
                data.push(rowData);
              }
            });

            ast.data = data;
            ast.columns = columns;
            ast.rowCount = data.length;

            console.log(`[ExcelUploadAstVisitor] 解析完成，共 ${data.length} 行数据`);

            return [
              {
                type: 'node_emit' as const,
                id: ast.id,
                data: {
                  data,
                  columns,
                  rowCount: data.length
                }
              }
            ];
          }),
          ErrorHandlerOperators.createRetryOperator(ast, { logPrefix: '[ExcelUploadAstVisitor]' }),
          ErrorHandlerOperators.createCatchErrorOperator(ast, { logPrefix: '[ExcelUploadAstVisitor]' }),
          mergeMap((events: NodeEvent[]) => from(events))
        )
        .subscribe({
          next: event => obs.next(event),
          error: error => {
            console.error(`[ExcelUploadAstVisitor] 解析失败:`, error);
            ast.state = 'fail';
            setAstError(ast, error instanceof Error ? error : new Error(String(error)));
            obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message });
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
