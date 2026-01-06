import { Ast, Input, Node, Output, State } from '@sker/workflow';

/**
 * Excel 上传解析节点
 *
 * 功能：上传 Excel 文件并解析为结构化数据
 * 应用场景：批量导入数据、数据分析、表格处理
 */
@Node({
  title: 'Excel 上传',
  type: 'basic',
  errorStrategy: 'fail'
})
export class ExcelUploadAst extends Ast {
  @Input({ title: '文件 URL', defaultValue: '' })
  fileUrl: string = '';

  @Input({ title: '工作表名称', defaultValue: `Sheet1`, type: 'string' })
  sheetName: string = 'Sheet1';

  @Input({ title: '起始行', defaultValue: 1, type: 'number' })
  startRow: number = 1;

  @State({ title: '包含表头' })
  hasHeader: boolean = true;

  @Output({ title: '数据', defaultValue: [] })
  data: Record<string, any>[] = [];

  @Output({ title: '列名', defaultValue: [] })
  columns: string[] = [];

  @Output({ title: '行数', defaultValue: 0 })
  rowCount: number = 0;

  @Output({ title: '行索引', defaultValue: 0 })
  rowIndex: number = 0;

  @Output({ title: '是否首行', defaultValue: false })
  isFirst: boolean = false;

  @Output({ title: '是否末行', defaultValue: false })
  isLast: boolean = false;

  type: 'ExcelUploadAst' = 'ExcelUploadAst';
}
