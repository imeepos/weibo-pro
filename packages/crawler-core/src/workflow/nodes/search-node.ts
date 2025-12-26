import { Ast, Input, Node, Output, State } from '@sker/workflow';

@Node({
  title: '搜索节点',
  type: 'crawler',
  errorStrategy: 'retry',
  maxRetries: 3
})
export class SearchNodeAst extends Ast {
  @Input({ title: '关键词', type: 'text', defaultValue: '' })
  keyword: string = '';

  @Input({ title: '页码', type: 'number', defaultValue: 1 })
  page: number = 1;

  @Output({ title: '帖子ID列表' })
  postIds: string[] = [];

  @Output({ title: '是否结束' })
  isEnd: boolean = false;

  @State({ title: '当前页码' })
  currentPage: number = 1;

  type: 'SearchNodeAst' = 'SearchNodeAst';
}
