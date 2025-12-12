import { Injectable } from '@sker/core';
import { Handler, setAstError, WorkflowGraphAst } from '@sker/workflow';
import { ResearchPlannerAst } from '@sker/workflow-ast';
import { Observable } from 'rxjs';
import { z } from 'zod';
import { useLlmModel } from './llm-client';

const ResearchPlanSchema = z.object({
  reasoning: z.string().describe('分解策略的推理过程，说明如何确保子问题的正交性'),
  subproblems: z.array(z.string().describe('包含标题、范围、关键问题、方法论的完整研究计划'))
});

@Injectable()
export class ResearchPlannerAstVisitor {

  @Handler(ResearchPlannerAst)
  handler(ast: ResearchPlannerAst, ctx: WorkflowGraphAst) {
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
          setAstError(ast, new Error('请提供研究主题'));
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

        const query = Array.isArray(ast.query)
          ? ast.query.filter(Boolean).join('\n')
          : ast.query;

        const soundbites = Array.isArray(ast.soundbites)
          ? ast.soundbites.filter(Boolean).join('\n')
          : ast.soundbites || '';

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;

        const systemPrompt = `你是首席研究负责人，管理 ${ast.teamSize} 个初级研究员团队。
你的职责是将复杂的研究主题分解为聚焦、可管理的子问题，并分配给团队成员。

当前时间：${currentYear}年${currentMonth}月

<方法>
首先，分析主要研究主题并识别：
- 需要回答的核心研究问题
- 涉及的关键领域/学科
- 不同方面之间的关键依赖关系
- 潜在的知识空白或挑战

然后使用以下正交性和深度原则，将主题分解为 ${ast.teamSize} 个独特、聚焦的子问题：
</方法>

<要求>
正交性要求：
- 每个子问题必须处理主题的根本不同的方面/维度
- 使用不同的分解轴（例如：高层次、时间、方法论、利益相关者、技术层、副作用等）
- 最小化子问题重叠 - 如果两个子问题共享 >20% 的范围，请重新设计它们
- 应用"替换测试"：删除任何单个子问题都应该在理解中产生显著差距

深度要求：
- 每个子问题应需要 15-25 小时的专注研究才能正确解决
- 必须超越表面信息，探索潜在机制、理论或影响
- 应生成需要综合多个来源和原创分析的洞察
- 包括"什么"和"为什么/如何"问题，以确保分析深度

验证检查（请在最终确定分配之前验证）：
- 正交性矩阵：创建 2D 矩阵显示每对子问题之间的重叠 - 目标 <20% 重叠
- 深度评估：每个子问题应有 4-6 层探究（表面 → 机制 → 影响 → 未来方向）
- 覆盖完整性：所有子问题的联合应覆盖主题范围的 90%+
</要求>

<规则>
- 不要在子问题中包含类似"（此子问题是关于...）"的文本
- 使用第二人称描述子问题
- 不要在问题陈述中使用"子问题"一词或引用其他子问题
- 确保每个子问题完整、可执行、有明确的研究方向
</规则>

现在开始分解和分配研究主题。`;

        const userPrompt = soundbites
          ? `研究主题：${query}

<soundbites>
${soundbites}
</soundbites>

请生成 ${ast.teamSize} 个正交的研究子问题。`
          : `研究主题：${query}

请生成 ${ast.teamSize} 个正交的研究子问题。`;

        try {
          const structuredModel = model.withStructuredOutput(ResearchPlanSchema);
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
          ast.subproblems.next(result.subproblems);
          obs.next({ ...ast });

          ast.state = 'success';
          obs.next({ ...ast });
          obs.complete();

        } catch (error) {
          throw new Error(`研究规划失败: ${error instanceof Error ? error.message : '未知错误'}`);
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
