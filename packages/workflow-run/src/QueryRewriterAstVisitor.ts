import { Injectable } from '@sker/core';
import { Handler, setAstError, WorkflowGraphAst } from '@sker/workflow';
import { QueryRewriterAst } from '@sker/workflow-ast';
import { Observable } from 'rxjs';
import { z } from 'zod';
import { useLlmModel } from './llm-client';

const QueryRewriteSchema = z.object({
  reasoning: z.string().describe('查询重写的推理过程'),
  queries: z.array(z.string()).describe('重写后的子查询列表')
});

@Injectable()
export class QueryRewriterAstVisitor {

  @Handler(QueryRewriterAst)
  handler(ast: QueryRewriterAst, ctx: WorkflowGraphAst) {
    return new Observable((obs) => {
      const abortController = new AbortController();

      const run = async () => {
        if (abortController.signal.aborted) {
          ast.state = 'fail';
          setAstError(ast, new Error('工作流已取消'));
          obs.next({ ...ast });
          return;
        }

        if (!ast.query || ast.query.length === 0) {
          ast.state = 'fail';
          setAstError(ast, new Error('请提供原始查询'));
          obs.next({ ...ast });
          obs.complete();
          return;
        }

        ast.state = 'running';
        ast.count += 1;
        obs.next({ ...ast });

        const model = useLlmModel({
          model: ast.model,
          temperature: ast.temperature
        });

        const originalQuery = Array.isArray(ast.query)
          ? ast.query.filter(Boolean).join('\n')
          : ast.query;

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;

        const systemPrompt = `你是一个查询重写专家，参考 node-DeepResearch 的设计理念。

当前时间：${currentYear}年${currentMonth}月

<认知角色>
从以下认知角色重写查询：
1. expert-skeptic（专家怀疑者）：关注边缘案例、反例、例外情况
2. detail-analyst（细节分析师）：深入技术细节、实现机制
3. historical（历史研究者）：追溯演变历史、发展脉络
4. comparative（对比思考者）：对比替代方案、竞品分析
5. temporal（时效性关注者）：关注最新信息（${currentYear}-${currentMonth}）
6. globalizer（全球化视角）：识别权威语言/地区
7. reality-hater（现实怀疑者）：寻找反驳证据、质疑常识
</认知角色>

<规则>
1. 生成 ${ast.teamSize} 个子查询
2. 每个查询简洁、关键词化（2-5个词）
3. 避免模糊表述，确保可验证
4. 必要时使用操作符（+必须包含、-排除）
</规则>

<示例>
输入：宝马二手车价格
输出：
- 二手宝马 维修噩梦 隐藏缺陷
- 宝马各系价格区间 里程对比
- 二手宝马价格趋势 ${currentYear}年
</示例>`;

        const userPrompt = `原始查询：${originalQuery}

请生成 ${ast.teamSize} 个重写查询。`;

        try {
          const structuredModel = model.withStructuredOutput(QueryRewriteSchema);
          const result = await structuredModel.invoke([
            { role: 'system', content: systemPrompt },
            { role: 'human', content: userPrompt }
          ]);

          if (abortController.signal.aborted) {
            ast.state = 'fail';
            setAstError(ast, new Error('工作流已取消'));
            obs.next({ ...ast });
            return;
          }

          ast.reasoning.next(result.reasoning);
          ast.subQueries.next(result.queries);
          obs.next({ ...ast });

          ast.state = 'success';
          obs.next({ ...ast });
          obs.complete();

        } catch (error) {
          throw new Error(`查询重写失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
      };

      run().catch(e => {
        ast.state = 'fail';
        setAstError(ast, e);
        obs.next({ ...ast });
        obs.complete();
      });

      return () => {
        abortController.abort();
        obs.complete();
      };
    });
  }
}
