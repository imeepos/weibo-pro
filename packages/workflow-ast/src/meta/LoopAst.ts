import { Ast, Input, IS_BUFFER, Node, Output, State } from '@sker/workflow';

@Node({
  title: '循环',
  type: 'control',
  errorStrategy: 'fail'
})
export class LoopAst extends Ast {
  @State({ title: '最大迭代次数' })
  maxIterations = 10;

  @State({ title: '当前迭代' })
  currentIteration = 0;

  @Input({ title: '输入数据', mode: IS_BUFFER, defaultValue: [] })
  items: any[] = [];

  @Input({ title: '继续条件', defaultValue: true })
  shouldContinue = true;

  @Output({ title: '当前项', defaultValue: null })
  currentItem: any = null;

  @Output({ title: '索引', defaultValue: 0 })
  index = 0;

  @Output({ title: '完成', isRouter: true, defaultValue: undefined })
  done: boolean | undefined = undefined;

  type: 'LoopAst' = 'LoopAst';
}
