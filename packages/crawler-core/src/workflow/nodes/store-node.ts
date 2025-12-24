import { Ast, Input, Node, Output } from '@sker/workflow';

@Node({
  title: '存储节点',
  type: 'crawler',
  errorStrategy: 'fail',
  maxRetries: 2
})
export class StoreNodeAst extends Ast {
  @Input({ title: '数据', type: 'any', defaultValue: null })
  data: any = null;

  @Input({ title: '存储类型', type: 'select', defaultValue: 'database' })
  storeType: 'database' | 'json' | 'csv' = 'database';

  @Output({ title: '存储成功' })
  success: boolean = false;

  type: 'StoreNodeAst' = 'StoreNodeAst';
}
